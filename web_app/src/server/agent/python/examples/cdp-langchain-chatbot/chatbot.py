import os
import sys
import time
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

# Import CDP Agentkit Langchain Extension.
from cdp_langchain.agent_toolkits import CdpToolkit
from cdp_langchain.utils import CdpAgentkitWrapper

# Configure a file to persist the agent's CDP MPC Wallet Data.
wallet_data_file = "wallet_data.txt"

load_dotenv()


async def process_realtime_input(text_input=None, audio_input=None):
    """Process input using OpenAI's Realtime API."""
    client = AsyncOpenAI()
    modalities = []

    if text_input:
        modalities.append("text")
    if audio_input:
        modalities.append("audio")

    async with client.beta.realtime.connect(
        model="gpt-4o-realtime-preview"
    ) as connection:
        await connection.session.update(session={"modalities": modalities})

        # Create conversation item based on input type
        content = []
        if text_input:
            content.append({"type": "input_text", "text": text_input})
        if audio_input:
            content.append(
                {"type": "input_audio", "audio": audio_input, "sample_rate": 16000}
            )

        await connection.conversation.item.create(
            item={
                "type": "message",
                "role": "user",
                "content": content,
            }
        )
        await connection.response.create()

        response_text = ""
        async for event in connection:
            if event.type == "response.text.delta":
                response_text += event.delta
                print(event.delta, flush=True, end="")

            elif event.type == "response.text.done":
                print()

            elif event.type == "response.done":
                break

        return response_text


def initialize_agent():
    """Initialize the agent with CDP Agentkit."""
    # Initialize LLM.
    llm = ChatOpenAI()

    wallet_data = None
    if os.path.exists(wallet_data_file):
        with open(wallet_data_file) as f:
            wallet_data = f.read()

    # Configure CDP Agentkit Langchain Extension.
    values = {}
    if wallet_data is not None:
        values = {"cdp_wallet_data": wallet_data}

    agentkit = CdpAgentkitWrapper(**values)
    wallet_data = agentkit.export_wallet()
    with open(wallet_data_file, "w") as f:
        f.write(wallet_data)

    cdp_toolkit = CdpToolkit.from_cdp_agentkit_wrapper(agentkit)
    tools = cdp_toolkit.get_tools()

    memory = MemorySaver()
    config = {"configurable": {"thread_id": "CDP Agentkit Chatbot Example!"}}

    return (
        create_react_agent(
            llm,
            tools=tools,
            checkpointer=memory,
            state_modifier=(
                "You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. "
                "You are empowered to interact onchain using your tools. If you ever need funds, you can request "
                "them from the faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet "
                "details and request funds from the user. Before executing your first action, get the wallet details "
                "to see what network you're on. If there is a 5XX (internal) HTTP error code, ask the user to try "
                "again later. If someone asks you to do something you can't do with your currently available tools, "
                "you must say so, and encourage them to implement it themselves using the CDP SDK + Agentkit, "
                "recommend they go to docs.cdp.coinbase.com for more information. Be concise and helpful with your "
                "responses. Refrain from restating your tools' descriptions unless it is explicitly requested."
            ),
        ),
        config,
    )


# Autonomous Mode
def run_autonomous_mode(agent_executor, config, interval=10):
    """Run the agent autonomously with specified intervals."""
    print("Starting autonomous mode...")
    while True:
        try:
            # Provide instructions autonomously
            thought = (
                "Be creative and do something interesting on the blockchain. "
                "Choose an action or set of actions and execute it that highlights your abilities."
            )

            # Run agent in autonomous mode
            for chunk in agent_executor.stream(
                {"messages": [HumanMessage(content=thought)]}, config
            ):
                if "agent" in chunk:
                    print(chunk["agent"]["messages"][0].content)
                elif "tools" in chunk:
                    print(chunk["tools"]["messages"][0].content)
                print("-------------------")

            # Wait before the next action
            time.sleep(interval)

        except KeyboardInterrupt:
            print("Goodbye Agent!")
            sys.exit(0)


# Chat Mode
def run_chat_mode(agent_executor, config):
    """Run the agent interactively based on user input."""
    print("Starting chat mode... Type 'exit' to end.")
    while True:
        try:
            user_input = input("\nPrompt: ")
            if user_input.lower() == "exit":
                break

            # Run agent with the user's input in chat mode
            for chunk in agent_executor.stream(
                {"messages": [HumanMessage(content=user_input)]}, config
            ):
                if "agent" in chunk:
                    print(chunk["agent"]["messages"][0].content)
                elif "tools" in chunk:
                    print(chunk["tools"]["messages"][0].content)
                print("-------------------")

        except KeyboardInterrupt:
            print("Goodbye Agent!")
            sys.exit(0)


# Audio Mode
async def run_audio_mode(agent_executor, config):
    """Run the agent interactively using OpenAI's Realtime API for audio."""
    print("Starting audio mode... Type 'exit' to end or press Enter to speak")

    while True:
        try:
            command = input("\nPress Enter to start speaking (or type 'exit' to end): ")
            if command.lower() == "exit":
                break

            print("Listening... Speak now!")
            # Use OpenAI's Realtime API for audio input
            response_text = await process_realtime_input(audio_input=True)

            # Process the transcribed text through the agent
            for chunk in agent_executor.stream(
                {"messages": [HumanMessage(content=response_text)]}, config
            ):
                if "agent" in chunk:
                    print(chunk["agent"]["messages"][0].content)
                elif "tools" in chunk:
                    print(chunk["tools"]["messages"][0].content)
                print("-------------------")

        except KeyboardInterrupt:
            print("Goodbye Agent!")
            sys.exit(0)


# Mode Selection
def choose_mode():
    """Choose whether to run in autonomous or chat mode based on user input."""
    while True:
        print("\nAvailable modes:")
        print("1. chat    - Interactive chat mode")
        print("2. auto    - Autonomous action mode")
        print("3. audio   - Voice input mode")

        choice = input("\nChoose a mode (enter number or name): ").lower().strip()
        if choice in ["1", "chat"]:
            return "chat"
        elif choice in ["2", "auto"]:
            return "auto"
        elif choice in ["3", "audio"]:
            return "audio"
        print("Invalid choice. Please try again.")


async def main():
    """Start the chatbot agent."""
    agent_executor, config = initialize_agent()

    mode = choose_mode()
    if mode == "chat":
        run_chat_mode(agent_executor=agent_executor, config=config)
    elif mode == "auto":
        run_autonomous_mode(agent_executor=agent_executor, config=config)
    elif mode == "audio":
        await run_audio_mode(agent_executor=agent_executor, config=config)


if __name__ == "__main__":
    print("Starting Agent...")
    asyncio.run(main())

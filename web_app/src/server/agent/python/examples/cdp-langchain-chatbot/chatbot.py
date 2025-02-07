import os
import sys
import time

import sounddevice as sd
import soundfile as sf
import numpy as np
from pathlib import Path

from dotenv import load_dotenv

from langchain_core.messages import HumanMessage
from langchain_openai import (
    ChatOpenAI,
)
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

# Import CDP Agentkit Langchain Extension.
from cdp_langchain.agent_toolkits import CdpToolkit
from cdp_langchain.utils import CdpAgentkitWrapper
from langchain.agents import load_tools
from langchain.document_loaders.generic import GenericLoader

# Configure a file to persist the agent's CDP MPC Wallet Data.
wallet_data_file = "wallet_data.txt"  # Wallet data is saved here. Can I use Privy or has to be coinbase?

# Audio configuration
SAMPLE_RATE = 16000  # Hz
CHANNELS = 1
TEMP_AUDIO_FILE = "temp_recording.wav"

load_dotenv()


def record_audio(duration=5):
    """Record audio from microphone."""
    print(f"\nRecording for {duration} seconds... Speak now!")

    # Record audio
    recording = sd.rec(
        int(duration * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype=np.float32,
    )
    sd.wait()  # Wait until recording is finished

    # Save to temporary file
    sf.write(TEMP_AUDIO_FILE, recording, SAMPLE_RATE)
    print("Recording finished!")
    return TEMP_AUDIO_FILE


def transcribe_audio(audio_file):
    """Transcribe audio using Whisper."""
    model = "gpt-4o-realtime-preview-2024-12-17"
    result = model.transcribe(audio_file)

    return result["text"]


def initialize_agent():
    """Initialize the agent with CDP Agentkit."""
    # Initialize LLM. # GAIA node not working well with tools
    # llm = ChatOpenAI(
    #     model="Llama-3-8B-Instruct",
    #     api_key=os.getenv("GAIA_API_KEY"),
    #     base_url="https://0x46c513cb9063f606948c07bba87cf9bd6001f3f0.gaia.domains/v1",
    # )
    llm = ChatOpenAI()

    wallet_data = None

    if os.path.exists(wallet_data_file):
        with open(wallet_data_file) as f:
            wallet_data = f.read()

    # Configure CDP Agentkit Langchain Extension.
    values = {}
    if wallet_data is not None:
        # If there is a persisted agentic wallet, load it and pass to the CDP Agentkit Wrapper.
        values = {"cdp_wallet_data": wallet_data}

    agentkit = CdpAgentkitWrapper(**values)

    # persist the agent's CDP MPC Wallet Data.
    wallet_data = agentkit.export_wallet()
    with open(wallet_data_file, "w") as f:
        f.write(wallet_data)

    # Initialize CDP Agentkit Toolkit and get tools.
    cdp_toolkit = CdpToolkit.from_cdp_agentkit_wrapper(agentkit)
    tools = cdp_toolkit.get_tools()

    # Store buffered conversation history in memory.
    memory = MemorySaver()
    config = {"configurable": {"thread_id": "CDP Agentkit Chatbot Example!"}}

    # Create ReAct Agent using the LLM and CDP Agentkit tools.
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


# Audio Chat Mode
def run_audio_mode(agent_executor, config):
    """Run the agent interactively based on audio input."""
    print(
        "Starting audio mode... Type 'exit' to end or press Enter to start recording."
    )

    # Create directory for temporary audio files if it doesn't exist
    Path(TEMP_AUDIO_FILE).parent.mkdir(parents=True, exist_ok=True)

    while True:
        try:
            command = input(
                "\nPress Enter to start recording (or type 'exit' to end): "
            )
            if command.lower() == "exit":
                break

            # Record and transcribe audio
            audio_file = record_audio()
            transcribed_text = transcribe_audio(audio_file)
            print(f"\nTranscribed: {transcribed_text}")

            # Run agent with the transcribed input
            for chunk in agent_executor.stream(
                {"messages": [HumanMessage(content=transcribed_text)]}, config
            ):
                if "agent" in chunk:
                    print(chunk["agent"]["messages"][0].content)
                elif "tools" in chunk:
                    print(chunk["tools"]["messages"][0].content)
                print("-------------------")

            # Clean up temporary audio file
            try:
                os.remove(audio_file)
            except:
                pass

        except KeyboardInterrupt:
            print("Goodbye Agent!")
            # Clean up temporary audio file
            try:
                os.remove(TEMP_AUDIO_FILE)
            except:
                pass
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


def main():
    """Start the chatbot agent."""
    agent_executor, config = initialize_agent()

    mode = choose_mode()
    if mode == "chat":
        run_chat_mode(agent_executor=agent_executor, config=config)
    elif mode == "auto":
        run_autonomous_mode(agent_executor=agent_executor, config=config)
    elif mode == "audio":
        run_audio_mode(agent_executor=agent_executor, config=config)


if __name__ == "__main__":
    print("Starting Agent...")
    main()

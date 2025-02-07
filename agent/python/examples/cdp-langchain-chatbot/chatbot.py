import os
import sys
import time
import asyncio
import base64
import numpy as np
from textual import events
from textual.app import App, ComposeResult
from textual.widgets import Static, RichLog
from textual.reactive import reactive
from textual.containers import Container

from dotenv import load_dotenv
from openai import AsyncOpenAI
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

# Import CDP Agentkit Langchain Extension.
from cdp_langchain.agent_toolkits import CdpToolkit
from cdp_langchain.utils import CdpAgentkitWrapper

# Import audio utilities
from audio_util import AudioPlayerAsync, SAMPLE_RATE, CHANNELS

# Configure a file to persist the agent's CDP MPC Wallet Data.
wallet_data_file = "wallet_data.txt"

load_dotenv()


class AudioStatusIndicator(Static):
    """A widget that shows the current audio recording status."""

    is_recording = reactive(False)
    connection_status = reactive("Connecting to OpenAI...")
    last_error = reactive("")

    def render(self) -> str:
        if self.last_error:
            return f"❌ Error: {self.last_error}"

        status = (
            "🔴 Recording... (Press K to stop)"
            if self.is_recording
            else "⚪ Press K to start recording (Q to quit)"
        )
        return f"{self.connection_status}\n{status}"


class AudioChatApp(App):
    CSS = """
    Screen {
        background: #1a1b26;
    }

    Container {
        border: double rgb(91, 164, 91);
    }

    #bottom-pane {
        width: 100%;
        height: 82%;
        border: round rgb(205, 133, 63);
        content-align: center middle;
    }

    #status-indicator {
        height: 3;
        content-align: center middle;
        background: #2a2b36;
        border: solid rgb(91, 164, 91);
        margin: 1 1;
    }

    Static {
        color: white;
    }
    """

    def __init__(self, agent_executor, config):
        super().__init__()
        self.agent_executor = agent_executor
        self.config = config
        self.client = AsyncOpenAI()
        self.audio_player = AudioPlayerAsync()
        self.should_send_audio = asyncio.Event()
        self.connected = asyncio.Event()
        self.connection = None

    def compose(self) -> ComposeResult:
        with Container():
            yield AudioStatusIndicator(id="status-indicator")
            yield RichLog(id="bottom-pane", wrap=True, highlight=True, markup=True)

    async def on_mount(self) -> None:
        self.run_worker(self.handle_realtime_connection())
        self.run_worker(self.send_mic_audio())

    async def handle_realtime_connection(self) -> None:
        status_indicator = self.query_one(AudioStatusIndicator)
        bottom_pane = self.query_one("#bottom-pane", RichLog)

        try:
            if not os.getenv("OPENAI_API_KEY"):
                status_indicator.last_error = "OPENAI_API_KEY not found in environment"
                return

            status_indicator.connection_status = "Connecting to OpenAI..."
            bottom_pane.write("[yellow]Initializing connection...[/yellow]\n")

            async with self.client.beta.realtime.connect(
                model="gpt-4o-realtime-preview"
            ) as conn:
                bottom_pane.write(
                    "[yellow]Setting up audio configuration...[/yellow]\n"
                )
                await conn.session.update(
                    session={
                        "audio": {"sample_rate": SAMPLE_RATE},
                        "turn_detection": {"type": "server_vad"},
                    }
                )

                self.connection = conn
                self.connected.set()
                status_indicator.connection_status = "Connected ✓"
                bottom_pane.write("[green]Connected to OpenAI API[/green]\n")

                acc_text = ""
                async for event in conn:
                    bottom_pane.write(f"[dim]Event: {event.type}[/dim]\n")

                    if event.type == "response.text.delta":
                        acc_text += event.delta
                        bottom_pane.clear()
                        bottom_pane.write("[blue]Transcription:[/blue]\n")
                        bottom_pane.write(acc_text + "\n")

                    elif event.type == "response.text.done":
                        if acc_text.strip():  # Only process if we have text
                            bottom_pane.write("\n[green]Agent Response:[/green]\n")
                            # Process through agent
                            for chunk in self.agent_executor.stream(
                                {"messages": [HumanMessage(content=acc_text)]},
                                self.config,
                            ):
                                if "agent" in chunk:
                                    bottom_pane.write(
                                        chunk["agent"]["messages"][0].content
                                    )
                                    bottom_pane.write("\n-------------------\n")
                            acc_text = ""  # Reset for next interaction
        except Exception as e:
            error_msg = f"Connection error: {str(e)}"
            status_indicator.last_error = error_msg
            bottom_pane.write(f"[red]{error_msg}[/red]\n")

    async def send_mic_audio(self) -> None:
        import sounddevice as sd

        bottom_pane = self.query_one("#bottom-pane", RichLog)

        # Wait for connection to be established
        try:
            await asyncio.wait_for(self.connected.wait(), timeout=10.0)
            if not self.connection:
                bottom_pane.write("[red]Error: Could not establish connection[/red]\n")
                return
        except asyncio.TimeoutError:
            bottom_pane.write("[red]Error: Connection timeout[/red]\n")
            return

        sent_audio = False
        read_size = int(SAMPLE_RATE * 0.02)

        stream = sd.InputStream(
            channels=CHANNELS,
            samplerate=SAMPLE_RATE,
            dtype="int16",
        )
        stream.start()

        status_indicator = self.query_one(AudioStatusIndicator)

        try:
            while True:
                if stream.read_available < read_size:
                    await asyncio.sleep(0)
                    continue

                if self.should_send_audio.is_set():
                    status_indicator.is_recording = True
                    data, _ = stream.read(read_size)

                    if not sent_audio:
                        bottom_pane.write(
                            "[yellow]Starting new recording session...[/yellow]\n"
                        )
                        await self.connection.send({"type": "response.cancel"})
                        sent_audio = True

                    # Send audio data in the correct format for the API
                    await self.connection.send(
                        {
                            "type": "input_audio_buffer.append",
                            "audio": base64.b64encode(data).decode("utf-8"),
                        }
                    )
                else:
                    if sent_audio:
                        bottom_pane.write("[yellow]Processing recording...[/yellow]\n")
                        # Signal end of audio input
                        await self.connection.send(
                            {"type": "input_audio_buffer.commit"}
                        )
                        await self.connection.send({"type": "response.create"})
                        sent_audio = False
                    status_indicator.is_recording = False

                await asyncio.sleep(0)
        except Exception as e:
            print(f"Error in send_mic_audio: {e}")
        finally:
            stream.stop()
            stream.close()

    async def on_key(self, event: events.Key) -> None:
        """Handle key press events."""
        if event.key == "q":
            self.exit()
            return

        if event.key == "k":
            status_indicator = self.query_one(AudioStatusIndicator)
            if status_indicator.is_recording:
                self.should_send_audio.clear()
                status_indicator.is_recording = False
            else:
                self.should_send_audio.set()
                status_indicator.is_recording = True


def test_microphone():
    """Test microphone by launching the audio chat app briefly."""
    agent_executor, config = initialize_agent()
    app = AudioChatApp(agent_executor, config)
    app.run()
    return True


def initialize_agent():
    """Initialize the agent with CDP Agentkit."""
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

    state_modifier = (
        "You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. "
        "You are empowered to interact onchain using your tools. If you ever need funds, you can request "
        "them from the faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet "
        "details and request funds from the user. Before executing your first action, get the wallet details "
        "to see what network you're on. If there is a 5XX (internal) HTTP error code, ask the user to try "
        "again later. If someone asks you to do something you can't do with your currently available tools, "
        "you must say so, and encourage them to implement it themselves using the CDP SDK + Agentkit, "
        "recommend they go to docs.cdp.coinbase.com for more information. Be concise and helpful with your "
        "responses. Refrain from restating your tools' descriptions unless it is explicitly requested."
    )

    return (
        create_react_agent(
            llm, tools=tools, checkpointer=memory, state_modifier=state_modifier
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
                "Choose an action or set of actions and execute it."
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


async def run_audio_mode(agent_executor, config):
    """Run the agent interactively using OpenAI's Realtime API for audio."""
    print("Starting audio mode... Press K to start/stop recording, Q to quit")
    app = AudioChatApp(agent_executor, config)
    await app.run_async()


# Mode Selection
def choose_mode():
    """Choose whether to run in autonomous or chat mode based on user input."""
    while True:
        print("\nAvailable modes:")
        print("1. chat    - Interactive chat mode")
        print("2. auto    - Autonomous action mode")
        print("3. audio   - Voice input mode")
        print("4. test    - Test microphone")

        choice = input("\nChoose a mode (enter number or name): ").lower().strip()
        if choice in ["1", "chat"]:
            return "chat"
        elif choice in ["2", "auto"]:
            return "auto"
        elif choice in ["3", "audio"]:
            return "audio"
        elif choice in ["4", "test"]:
            test_microphone()
            continue
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

from __future__ import annotations

import os
import sys
import time

import base64
import asyncio
from typing import Any, cast
from typing_extensions import override

from textual import events
from audio_util import CHANNELS, SAMPLE_RATE, AudioPlayerAsync
from textual.app import App, ComposeResult
from textual.widgets import Button, Static, RichLog
from textual.reactive import reactive
from textual.containers import Container

from openai import AsyncOpenAI
from openai.types.beta.realtime.session import Session
from openai.resources.beta.realtime.realtime import AsyncRealtimeConnection

from dotenv import load_dotenv
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


class SessionDisplay(Static):
    """A widget that shows the current session ID."""

    session_id = reactive("")

    @override
    def render(self) -> str:
        return f"Session ID: {self.session_id}" if self.session_id else "Connecting..."


class AudioStatusIndicator(Static):
    """A widget that shows the current audio recording status."""

    is_recording = reactive(False)

    @override
    def render(self) -> str:
        status = (
            "🔴 Recording... (Press K to stop)"
            if self.is_recording
            else "⚪ Press K to start recording (Q to quit)"
        )
        return status


class AudioChatApp(App):
    CSS = """
        Screen {
            background: #1a1b26;  /* Dark blue-grey background */
        }

        Container {
            border: double rgb(91, 164, 91);
        }

        Horizontal {
            width: 100%;
        }

        #input-container {
            height: 5;  /* Explicit height for input container */
            margin: 1 1;
            padding: 1 2;
        }

        Input {
            width: 80%;
            height: 3;  /* Explicit height for input */
        }

        Button {
            width: 20%;
            height: 3;  /* Explicit height for button */
        }

        #bottom-pane {
            width: 100%;
            height: 82%;  /* Reduced to make room for session display */
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

        #session-display {
            height: 3;
            content-align: center middle;
            background: #2a2b36;
            border: solid rgb(91, 164, 91);
            margin: 1 1;
        }

        Static {
            color: white;
        }

        .blockchain-response {
            background: #2a2b36;
            border-left: solid rgb(91, 164, 91);
            padding: 1;
        }
        
        .assistant-response {
            background: #2a2b36;
            border-left: solid rgb(205, 133, 63);
            padding: 1;
        }
    """

    client: AsyncOpenAI
    should_send_audio: asyncio.Event
    audio_player: AudioPlayerAsync
    last_audio_item_id: str | None
    connection: AsyncRealtimeConnection | None
    session: Session | None
    connected: asyncio.Event

    def __init__(self, agent_executor, config):
        super().__init__()
        self.agent_executor = agent_executor
        self.config = config
        self.client = AsyncOpenAI()
        self.audio_player = AudioPlayerAsync()
        self.last_audio_item_id = None
        self.should_send_audio = asyncio.Event()
        self.connected = asyncio.Event()
        self.connection = None
        self.conversation_context = []  # Track conversation history

    def is_blockchain_request(self, text: str) -> bool:
        """Detect if the request needs CDP tools."""
        keywords = [
            "blockchain",
            "wallet",
            "token",
            "nft",
            "transfer",
            "balance",
            "deploy",
            "contract",
            "eth",
            "transaction",
            "faucet",
            "funds",
            "network",
            "address",
        ]
        return any(keyword in text.lower() for keyword in keywords)

    @override
    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        with Container():
            yield SessionDisplay(id="session-display")
            yield AudioStatusIndicator(id="status-indicator")
            yield RichLog(id="bottom-pane", wrap=True, highlight=True, markup=True)

    async def on_mount(self) -> None:
        self.run_worker(self.handle_realtime_connection())
        self.run_worker(self.send_mic_audio())

    async def handle_realtime_connection(self) -> None:
        bottom_pane = self.query_one("#bottom-pane", RichLog)
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                if retry_count > 0:
                    bottom_pane.write(
                        f"[yellow]Retrying connection (attempt {retry_count + 1}/{max_retries})...[/yellow]\n"
                    )
                    await asyncio.sleep(2)  # Wait before retry
                else:
                    bottom_pane.write("[yellow]Connecting to OpenAI API...[/yellow]\n")

                async with self.client.beta.realtime.connect(
                    model="gpt-4o-realtime-preview"
                ) as conn:
                    self.connection = conn
                    self.connected.set()

                    # Show connection status
                    bottom_pane.write("[green]Connected to OpenAI API[/green]\n")
                    bottom_pane.write("Ready to record. Press K to start, Q to quit.\n")

                    await conn.session.update(
                        session={"turn_detection": {"type": "server_vad"}}
                    )

                    acc_items: dict[str, Any] = {}

                    async for event in conn:
                        if event.type == "session.created":
                            self.session = event.session
                            session_display = self.query_one(SessionDisplay)
                            assert event.session.id is not None
                            session_display.session_id = event.session.id
                            continue

                        if event.type == "session.updated":
                            self.session = event.session
                            continue

                        if event.type == "response.audio.delta":
                            if event.item_id != self.last_audio_item_id:
                                self.audio_player.reset_frame_count()
                                self.last_audio_item_id = event.item_id

                            bytes_data = base64.b64decode(event.delta)
                            self.audio_player.add_data(bytes_data)
                            continue

                        if event.type == "response.audio_transcript.delta":
                            # Reset accumulated items if this is a new recording session
                            if event.item_id not in acc_items:
                                acc_items.clear()
                                acc_items[event.item_id] = event.delta
                            else:
                                acc_items[event.item_id] = (
                                    acc_items[event.item_id] + event.delta
                                )

                            # Clear and update the entire content because RichLog otherwise treats each delta as a new line
                            bottom_pane = self.query_one("#bottom-pane", RichLog)
                            bottom_pane.clear()
                            bottom_pane.write(acc_items[event.item_id])
                            continue

                        if event.type == "response.text.done":
                            if acc_items[event.item_id].strip():
                                bottom_pane = self.query_one("#bottom-pane", RichLog)
                                transcribed_text = acc_items[event.item_id]

                                # Display transcribed text
                                bottom_pane.write("\n[blue]Transcribed Text:[/blue]\n")
                                bottom_pane.write(f"{transcribed_text}\n")

                                # Store user message in context
                                self.conversation_context.append(
                                    {"role": "user", "content": transcribed_text}
                                )

                                if self.is_blockchain_request(transcribed_text):
                                    # Use CDP agent for blockchain operations
                                    bottom_pane.write(
                                        "\n[yellow]Detected blockchain request, using CDP agent:[/yellow]\n"
                                    )
                                    try:
                                        cdp_response = ""
                                        for chunk in self.agent_executor.stream(
                                            {
                                                "messages": [
                                                    HumanMessage(
                                                        content=transcribed_text
                                                    )
                                                ]
                                            },
                                            self.config,
                                        ):
                                            if "agent" in chunk:
                                                response_text = chunk["agent"][
                                                    "messages"
                                                ][0].content
                                                cdp_response += response_text
                                                bottom_pane.write(response_text)
                                            elif "tools" in chunk:
                                                tool_text = chunk["tools"]["messages"][
                                                    0
                                                ].content
                                                bottom_pane.write(
                                                    f"\n[yellow]Using Tool:[/yellow] {tool_text}\n"
                                                )

                                        # Store CDP response in context
                                        self.conversation_context.append(
                                            {
                                                "role": "assistant",
                                                "content": cdp_response,
                                                "agent": "cdp",
                                            }
                                        )

                                        # Share CDP response with voice agent through conversation
                                        from openai.types.beta.realtime.conversation_item_param import (
                                            ConversationItemParam,
                                        )
                                        from openai.types.beta.realtime.conversation_item_content_param import (
                                            ConversationItemContentParam,
                                        )

                                        response_text = (
                                            "I've processed your blockchain request. Here's what happened: "
                                            + cdp_response
                                            + "\nWould you like me to explain anything about what was done?"
                                        )

                                        await conn.conversation.item.create(
                                            item=ConversationItemParam(
                                                role="assistant",
                                                content=[
                                                    ConversationItemContentParam(
                                                        type="text", text=response_text
                                                    )
                                                ],
                                            )
                                        )

                                        bottom_pane.write("\n-------------------\n")
                                    except Exception as e:
                                        error_msg = f"\n[red]Error processing blockchain request: {str(e)}[/red]\n"
                                        bottom_pane.write(error_msg)
                                        bottom_pane.write("\n-------------------\n")

                                        # Share error with voice agent through conversation
                                        error_text = (
                                            "I encountered an error while processing your blockchain request: "
                                            + str(e)
                                            + "\nWould you like to try again?"
                                        )

                                        await conn.conversation.item.create(
                                            item=ConversationItemParam(
                                                role="assistant",
                                                content=[
                                                    ConversationItemContentParam(
                                                        type="text", text=error_text
                                                    )
                                                ],
                                            )
                                        )
                                else:
                                    # Let the voice agent handle non-blockchain requests
                                    bottom_pane.write(
                                        "\n[green]Assistant Response:[/green]\n"
                                    )
                                    # The response will come through the normal realtime API flow
                            continue

                    # If we get here, connection was successful
                    return

            except asyncio.TimeoutError:
                retry_count += 1
                if retry_count >= max_retries:
                    bottom_pane.write(
                        "[red]Connection timed out after multiple attempts. Please check your internet connection and try again.[/red]\n"
                    )
                    await asyncio.sleep(2)  # Give user time to read the message
                    self.exit()
                else:
                    # Reset connection state before retry
                    self.connection = None
                    self.connected.clear()
                    continue

            except Exception as e:
                retry_count += 1
                if retry_count >= max_retries:
                    bottom_pane.write(
                        f"[red]Connection error after multiple attempts: {str(e)}[/red]\n"
                    )
                    await asyncio.sleep(2)  # Give user time to read the message
                    self.exit()
                else:
                    # Reset connection state before retry
                    self.connection = None
                    self.connected.clear()
                    continue

    async def _get_connection(self) -> AsyncRealtimeConnection:
        await self.connected.wait()
        assert self.connection is not None
        return self.connection

    async def send_mic_audio(self) -> None:
        import sounddevice as sd  # type: ignore

        sent_audio = False

        device_info = sd.query_devices()
        print(device_info)

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
                if not self.should_send_audio.is_set():
                    sent_audio = False  # Reset flag when not recording
                    await asyncio.sleep(0)
                    continue

                if stream.read_available < read_size:
                    await asyncio.sleep(0)
                    continue

                status_indicator.is_recording = True
                data, _ = stream.read(read_size)

                connection = await self._get_connection()
                if not sent_audio:
                    # Clear previous transcription when starting new recording
                    bottom_pane = self.query_one("#bottom-pane", RichLog)
                    bottom_pane.clear()

                    # Cancel any previous response and start fresh
                    asyncio.create_task(connection.send({"type": "response.cancel"}))
                    sent_audio = True

                await connection.input_audio_buffer.append(
                    audio=base64.b64encode(cast(Any, data)).decode("utf-8")
                )

                await asyncio.sleep(0)
        except KeyboardInterrupt:
            pass
        finally:
            stream.stop()
            stream.close()

    async def on_key(self, event: events.Key) -> None:
        """Handle key press events."""
        if event.key == "enter":
            self.query_one(Button).press()
            return

        if event.key == "q":
            self.exit()
            return

        if event.key == "k":
            status_indicator = self.query_one(AudioStatusIndicator)
            if status_indicator.is_recording:
                self.should_send_audio.clear()
                status_indicator.is_recording = False

                # When stopping recording, ensure the audio buffer is committed and response is created
                conn = await self._get_connection()
                await conn.input_audio_buffer.commit()
                await conn.response.create()
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

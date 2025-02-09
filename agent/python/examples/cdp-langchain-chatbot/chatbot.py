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
from textual.widgets import Button, Static, RichLog, Input
from textual.reactive import reactive
from textual.containers import Container

from openai import AsyncOpenAI
from openai.types.beta.realtime.conversation_item_param import ConversationItemParam
from openai.types.beta.realtime.conversation_item_content_param import (
    ConversationItemContentParam,
)
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
            background: #1a1b26;
            layers: base overlay;
        }

        Container {
            height: 100%;
            border: double rgb(91, 164, 91);
        }

        #main-container {
            width: 100%;
            height: 1fr;  /* Take remaining space */
            margin: 1 1;
            layout: grid;
            grid-size: 2;  /* Two columns */
            background: #1a1b26;
        }

        #audio-section {
            width: 100%;
            height: 100%;
            border: round rgb(205, 133, 63);
            margin-right: 1;
            overflow-y: auto;
            background: #1a1b26;
        }

        #cdp-section {
            width: 100%;
            height: 100%;
            border: round rgb(91, 164, 91);
            margin-left: 1;
            overflow-y: auto;
            background: #1a1b26;
        }

        #input-container {
            width: 100%;
            height: auto;
            dock: bottom;
            layout: horizontal;
            background: #2a2b36;
            border: solid rgb(91, 164, 91);
            margin: 1 1;
            padding: 1 2;
            layer: overlay;
        }

        #message-input {
            width: 85%;
            height: 3;
            dock: left;
            margin-right: 1;
            background: #1a1b26;
            color: white;
            border: solid rgb(91, 164, 91);
        }

        #send-button {
            width: 15%;
            height: 3;
            dock: right;
            background: rgb(91, 164, 91);
            color: white;
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
        audio_log = self.query_one("#audio-log", RichLog)
        cdp_log = self.query_one("#cdp-log", RichLog)

        # Log to both sections for transparency
        audio_log.write("\n[blue]Checking text for blockchain keywords...[/blue]\n")
        cdp_log.write("\n[blue]Checking text for blockchain keywords...[/blue]\n")

        # Check each keyword and log matches
        matched_keywords = []
        for keyword in keywords:
            if keyword in text.lower():
                matched_keywords.append(keyword)

        is_blockchain = len(matched_keywords) > 0
        if is_blockchain:
            msg = f"\n[green]Found blockchain keywords: {', '.join(matched_keywords)}[/green]\n"
            audio_log.write(msg)
            cdp_log.write(msg)
        else:
            msg = "\n[yellow]No blockchain keywords found[/yellow]\n"
            audio_log.write(msg)
            cdp_log.write(msg)

        return is_blockchain

    async def handle_cdp_request(self, text: str) -> None:
        """Handle CDP agent requests independently of the realtime API connection."""
        cdp_log = self.query_one("#cdp-log", RichLog)
        audio_log = self.query_one("#audio-log", RichLog)
        # Notify audio section that CDP processing is starting
        audio_log.write(
            "\n[yellow]Processing blockchain request in CDP section...[/yellow]\n"
        )
        # Start CDP processing
        cdp_log.write("\n[yellow]===== CDP Agent Processing =====\n")
        cdp_log.write("Request: " + text + "\n")
        cdp_log.write("Initializing CDP agent...[/yellow]\n")

        try:
            # Show agent initialization and debug info
            cdp_log.write("[green]CDP Agent initialized successfully[/green]\n")
            cdp_log.write("[yellow]Processing request through CDP agent...[/yellow]\n")
            cdp_log.write(f"[blue]Request text: {text}[/blue]\n")
            cdp_log.write("[blue]Agent config: " + str(self.config) + "[/blue]\n")
            cdp_log.refresh()

            cdp_response = ""
            chunk_count = 0

            # Process agent response
            cdp_log.write("\n[yellow]Starting CDP Agent Stream[/yellow]\n")
            cdp_log.write(f"Input text: {text}\n")
            cdp_log.refresh()

            try:
                # Create a message that forces tool usage
                prompt = (
                    f"Use your CDP tools to handle this blockchain request: {text}\n"
                    "Remember to ALWAYS start with get_wallet_details before any other operation.\n"
                    "Show me the actual results of using the tools."
                )

                async for chunk in self.agent_executor.stream(
                    {"messages": [HumanMessage(content=prompt)]},
                    self.config,
                ):
                    chunk_count += 1
                    cdp_log.write(f"\n[blue]Processing chunk {chunk_count}:[/blue]\n")
                    cdp_log.write(f"Raw chunk: {chunk}\n")
                    cdp_log.refresh()

                    if "agent" in chunk:
                        response_text = chunk["agent"]["messages"][0].content
                        cdp_response += response_text
                        cdp_log.write("[green]Agent Response:[/green]\n")
                        cdp_log.write(response_text + "\n")
                        cdp_log.write(f"Full response so far: {cdp_response}\n")
                        cdp_log.refresh()
                    elif "tools" in chunk:
                        tool_data = chunk["tools"]
                        tool_name = tool_data.get("tool", "unknown")
                        tool_input = tool_data.get("tool_input", {})
                        tool_output = tool_data.get("output", "No output")

                        cdp_log.write(f"\n[yellow]Using Tool: {tool_name}[/yellow]\n")
                        cdp_log.write(f"Tool input: {tool_input}\n")
                        cdp_log.write(f"Tool output: {tool_output}\n")
                        cdp_log.refresh()

                        # Add tool result to response
                        tool_result = f"\nTool {tool_name} result: {tool_output}"
                        cdp_response += tool_result
                    else:
                        cdp_log.write(f"[blue]Other chunk type:[/blue] {chunk}\n")
                        cdp_log.refresh()

                if chunk_count == 0:
                    cdp_log.write("[red]Warning: No chunks received from agent[/red]\n")
                    cdp_log.refresh()
            except Exception as e:
                cdp_log.write(
                    f"[red]Error in agent stream: {type(e)} - {str(e)}[/red]\n"
                )
                cdp_log.write(f"Traceback: {e.__traceback__}\n")
                cdp_log.refresh()
                raise  # Re-raise to be caught by outer try/except

            # Show completion status
            cdp_log.write("\n[green]CDP processing completed[/green]\n")
            cdp_log.write(f"Total chunks processed: {chunk_count}\n")

            # Store CDP response in context
            self.conversation_context.append(
                {
                    "role": "assistant",
                    "content": cdp_response,
                    "agent": "cdp",
                }
            )
            cdp_log.write("\n[blue]CDP response added to conversation context[/blue]\n")

            # Notify audio section that CDP processing is complete
            audio_log.write(
                "\n[green]CDP processing complete. See CDP section for details.[/green]\n"
            )

            cdp_log.write("\n[yellow]===== End CDP Agent Processing =====\n")

        except Exception as e:
            error_msg = f"\n[red]Error processing blockchain request:[/red]\n"
            cdp_log.write(error_msg)
            cdp_log.write(f"Error type: {type(e)}\n")
            cdp_log.write(f"Error message: {str(e)}\n")
            cdp_log.write("\n[yellow]===== End CDP Agent Processing =====\n")

            # Notify audio section of error
            audio_log.write(
                "\n[red]Error in CDP processing. See CDP section for details.[/red]\n"
            )

    async def handle_message(self, message: str) -> None:
        """Handle text messages from the input field."""
        if not message.strip():
            return

        # Get log panes
        audio_log = self.query_one("#audio-log", RichLog)
        cdp_log = self.query_one("#cdp-log", RichLog)

        # Display user message in audio section
        audio_log.write("\n[blue]User:[/blue]\n")
        audio_log.write(f"{message}\n")

        try:
            connection = await self._get_connection()

            # Check for blockchain keywords (this will show debug output)
            audio_log.write("\n[yellow]Checking for blockchain keywords...[/yellow]\n")
            audio_log.refresh()
            is_blockchain = self.is_blockchain_request(message)
            audio_log.refresh()

            if is_blockchain:
                # For blockchain requests, just process in CDP section
                audio_log.write("\n[yellow]Processing in CDP section...[/yellow]\n")
                audio_log.refresh()

                # Start CDP processing in background without affecting audio
                asyncio.create_task(self.handle_cdp_request(message))
            else:
                # For non-blockchain requests, let the audio agent handle it normally
                await connection.response.create(
                    response={
                        "conversation": "auto",
                        "modalities": ["text", "audio"],
                        "instructions": message,
                    }
                )

        except Exception as e:
            error_msg = f"\n[red]Error: {str(e)}[/red]\n"
            audio_log.write(error_msg)
            cdp_log.write(error_msg)

    async def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press events."""
        if event.button.id == "send-button":
            input_field = self.query_one("#message-input", Input)
            message = input_field.value
            await self.handle_message(message)
            input_field.value = ""  # Clear input after sending

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle input submission events."""
        if event.input.id == "message-input":
            message = event.input.value
            await self.handle_message(message)
            event.input.value = ""  # Clear input after sending

    @override
    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        with Container():
            yield SessionDisplay(id="session-display")
            yield AudioStatusIndicator(id="status-indicator")
            with Container(id="input-container"):
                yield Input(placeholder="Type a message...", id="message-input")
                yield Button("Send", id="send-button", variant="primary")
            with Container(id="main-container"):
                with Container(id="audio-section"):
                    yield RichLog(
                        id="audio-log", wrap=True, highlight=True, markup=True
                    )
                with Container(id="cdp-section"):
                    yield RichLog(id="cdp-log", wrap=True, highlight=True, markup=True)

    async def on_mount(self) -> None:
        # Show CDP agent initialization status
        cdp_log = self.query_one("#cdp-log", RichLog)
        cdp_log.write("[yellow]===== CDP Agent Status =====\n")
        cdp_log.write("Agent Type: CDP (Coinbase Developer Platform) AgentKit\n")
        cdp_log.write(
            "Wallet Data: "
            + (
                "Loaded from file"
                if os.path.exists(wallet_data_file)
                else "New wallet will be created"
            )
            + "\n"
        )
        cdp_log.write("Status: Ready for blockchain operations\n")
        cdp_log.write(
            "Supported operations: wallet, tokens, NFTs, contracts, transactions\n"
        )
        cdp_log.write("===== End CDP Agent Status =====\n\n")

        self.run_worker(self.handle_realtime_connection())
        self.run_worker(self.send_mic_audio())

    async def handle_realtime_connection(self) -> None:
        audio_log = self.query_one("#audio-log", RichLog)
        max_retries = 99
        retry_count = 0

        while retry_count < max_retries:
            try:
                if retry_count > 0:
                    audio_log.write(
                        f"[yellow]Retrying connection (attempt {retry_count + 1}/{max_retries})...[/yellow]\n"
                    )
                    await asyncio.sleep(2)  # Wait before retry
                else:
                    audio_log.write("[yellow]Connecting to OpenAI API...[/yellow]\n")

                async with self.client.beta.realtime.connect(
                    model="gpt-4o-realtime-preview"
                ) as conn:
                    self.connection = conn
                    self.connected.set()

                    # Show connection status
                    audio_log.write("[green]Connected to OpenAI API[/green]\n")
                    audio_log.write("Ready to record. Press K to start, Q to quit.\n")

                    await conn.session.update(
                        session={
                            "turn_detection": {"type": "server_vad"},
                            "instructions": (
                                "You are an AI assistant with blockchain capabilities through the CDP (Coinbase Developer Platform) AgentKit. "
                                "When users ask about blockchain operations like checking balances, deploying contracts, or transferring tokens, "
                                "acknowledge their request and let them know you'll process it using the CDP tools. "
                                "For non-blockchain requests, respond normally. Be concise and helpful. "
                                "If you detect a blockchain request, let the user know you're passing it to the CDP agent for processing."
                            ),
                            "voice": "alloy",
                            "temperature": 0.8,
                        }
                    )

                    acc_items: dict[str, Any] = {}

                    async for event in conn:
                        # Debug: Log all event types and content
                        # audio_log.write(f"\n[yellow]===== Event =====\n")
                        # audio_log.write(f"Type: {event.type}\n")

                        # Log event-specific attributes
                        # if event.type == "response.text.delta":
                        #     audio_log.write(f"Delta: {event.delta}\n")
                        # elif event.type == "response.audio.delta":
                        #     audio_log.write("Audio delta received\n")
                        # elif event.type == "response.audio_transcript.delta":
                        #     audio_log.write(
                        #         "\n[yellow]Audio Transcript Event[/yellow]\n"
                        #     )
                        #     audio_log.write(f"Delta: {event.delta}\n")
                        #     audio_log.write(f"Item ID: {event.item_id}\n")
                        #     audio_log.write("Accumulating transcript...\n")
                        #     audio_log.refresh()
                        # elif event.type == "session.created":
                        #     audio_log.write(f"Session: {event.session}\n")
                        # elif event.type == "session.updated":
                        #     audio_log.write(f"Session: {event.session}\n")
                        # elif event.type == "response.text.done":
                        #     audio_log.write(f"Item ID: {event.item_id}\n")
                        # elif event.type == "input_audio_buffer.committed":
                        #     audio_log.write("\n[yellow]Audio Buffer Event[/yellow]\n")
                        #     audio_log.write("[green]Audio buffer committed[/green]\n")
                        #     audio_log.write("Creating response...\n")
                        #     audio_log.refresh()
                        # elif event.type == "input_audio_buffer.speech_started":
                        #     audio_log.write("\n[yellow]Audio Buffer Event[/yellow]\n")
                        #     audio_log.write(
                        #         "[green]Speech started - recording...[/green]\n"
                        #     )
                        #     audio_log.refresh()
                        # elif event.type == "input_audio_buffer.speech_stopped":
                        #     audio_log.write("\n[yellow]Audio Buffer Event[/yellow]\n")
                        #     audio_log.write(
                        #         "[green]Speech stopped - processing...[/green]\n"
                        #     )
                        #     audio_log.write("Waiting for transcription...\n")
                        #     audio_log.refresh()
                        # elif event.type == "response.created":
                        #     audio_log.write("\n[yellow]Response Event[/yellow]\n")
                        #     audio_log.write(
                        #         "[green]Response created - starting processing[/green]\n"
                        #     )
                        #     audio_log.refresh()
                        # elif event.type == "response.done":
                        #     audio_log.write("\n[yellow]Response Event[/yellow]\n")
                        #     audio_log.write("[green]Response completed[/green]\n")
                        #     audio_log.write("Checking accumulated items...\n")
                        #     audio_log.write(f"Current items: {acc_items}\n")
                        #     audio_log.refresh()
                        # elif event.type == "conversation.created":
                        #     audio_log.write("\n[yellow]Conversation Event[/yellow]\n")
                        #     audio_log.write("[green]New conversation created[/green]\n")
                        #     audio_log.refresh()
                        # elif event.type == "conversation_item.created":
                        #     audio_log.write("\n[yellow]Conversation Event[/yellow]\n")
                        #     audio_log.write(
                        #         "[green]New conversation item created[/green]\n"
                        #     )
                        #     audio_log.write(
                        #         f"Item ID: {event.item_id if hasattr(event, 'item_id') else 'N/A'}\n"
                        #     )
                        #     audio_log.refresh()
                        # elif event.type == "conversation_item.truncated":
                        #     audio_log.write("\n[yellow]Conversation Event[/yellow]\n")
                        #     audio_log.write(
                        #         "[blue]Conversation item truncated[/blue]\n"
                        #     )
                        #     audio_log.refresh()
                        # elif event.type == "conversation_item.deleted":
                        #     audio_log.write("\n[yellow]Conversation Event[/yellow]\n")
                        #     audio_log.write("[blue]Conversation item deleted[/blue]\n")
                        #     audio_log.refresh()

                        # audio_log.write("=================\n")
                        audio_log.refresh()

                        if event.type == "session.created":
                            self.session = event.session
                            session_display = self.query_one(SessionDisplay)
                            assert event.session.id is not None
                            session_display.session_id = event.session.id
                            continue

                        if event.type == "session.updated":
                            self.session = event.session
                            continue

                        if event.type == "response.text.delta":
                            # Show assistant's response as it comes in
                            audio_log = self.query_one("#audio-log", RichLog)
                            # audio_log.write(event.delta)
                            continue

                        if event.type == "response.audio.delta":
                            if event.item_id != self.last_audio_item_id:
                                self.audio_player.reset_frame_count()
                                self.last_audio_item_id = event.item_id

                            bytes_data = base64.b64decode(event.delta)
                            self.audio_player.add_data(bytes_data)
                            continue

                        if event.type == "response.audio_transcript.delta":
                            # Debug: Show transcription event details
                            audio_log = self.query_one("#audio-log", RichLog)
                            # audio_log.write("\n[yellow]Transcription Event[/yellow]\n")
                            # audio_log.write(f"Item ID: {event.item_id}\n")
                            # audio_log.write(f"Delta: {event.delta}\n")
                            audio_log.refresh()

                            # Reset accumulated items if this is a new recording session
                            if event.item_id not in acc_items:
                                # audio_log.write(
                                #     "[blue]New recording session - clearing items[/blue]\n"
                                # )
                                acc_items.clear()
                                acc_items[event.item_id] = event.delta
                            else:
                                # audio_log.write(
                                #     "[blue]Appending to existing session[/blue]\n"
                                # )
                                acc_items[event.item_id] = (
                                    acc_items[event.item_id] + event.delta
                                )

                            # Show current state
                            # audio_log.write("\n[green]Current State:[/green]\n")
                            # audio_log.write(f"Accumulated items: {acc_items}\n")
                            # audio_log.write(
                            #     f"Current transcript: {acc_items[event.item_id]}\n"
                            # )
                            # audio_log.refresh()

                            # # Update display
                            # audio_log.write("\n[blue]Transcript so far:[/blue]\n")
                            # audio_log.write(acc_items[event.item_id])
                            continue

                        if event.type == "response.audio_transcript.done":
                            if acc_items[event.item_id].strip():
                                audio_log = self.query_one("#audio-log", RichLog)
                                transcribed_text = acc_items[event.item_id]

                                # First show the transcribed text
                                audio_log.write("\n[blue]Agent:[/blue]\n")
                                audio_log.write(f"{transcribed_text}\n")
                                audio_log.refresh()

                                # Store user message in context
                                self.conversation_context.append(
                                    {"role": "user", "content": transcribed_text}
                                )

                                # Check for blockchain keywords (this will show debug output)
                                audio_log.write(
                                    "\n[yellow]Checking for blockchain keywords...[/yellow]\n"
                                )
                                audio_log.refresh()
                                is_blockchain = self.is_blockchain_request(
                                    transcribed_text
                                )
                                audio_log.refresh()

                                # Now clear and show the conversation fresh
                                audio_log.clear()
                                audio_log.write("\n[blue]Agent:[/blue]\n")
                                audio_log.write(f"{transcribed_text}\n")

                                if is_blockchain:
                                    # For blockchain requests, just process in CDP section
                                    audio_log.write(
                                        "\n[yellow]Processing in CDP section...[/yellow]\n"
                                    )
                                    audio_log.refresh()

                                    # Start CDP processing in background without affecting audio
                                    asyncio.create_task(
                                        self.handle_cdp_request(transcribed_text)
                                    )
                                    continue
                                else:
                                    # Let the voice agent handle non-blockchain requests
                                    audio_log.write(
                                        "\n[green]Assistant:[/green] (Processing response...)\n"
                                    )
                                    # The response will come through the normal realtime API flow
                            continue

                    # If we get here, connection was successful
                    return

            except asyncio.TimeoutError:
                retry_count += 1
                if retry_count >= max_retries:
                    audio_log.write(
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
                    audio_log.write(
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
                    # Start new recording without clearing history
                    audio_log = self.query_one("#audio-log", RichLog)
                    audio_log.write("\n[blue]Starting new recording...[/blue]\n")

                    # Start new recording
                    audio_log.write(
                        "\n[yellow]Starting New Recording Session[/yellow]\n"
                    )
                    audio_log.write("Ready for new audio input\n")
                    audio_log.refresh()
                    sent_audio = True

                try:
                    # Debug: Log audio buffer operation
                    # audio_log = self.query_one("#audio-log", RichLog)
                    # audio_log.write("\n[yellow]Audio Buffer Operation[/yellow]\n")
                    # audio_log.write(f"Buffer size: {len(data)} bytes\n")
                    # audio_log.refresh()

                    # Use proper audio buffer append method
                    await connection.input_audio_buffer.append(
                        audio=base64.b64encode(cast(Any, data)).decode("utf-8")
                    )

                    # audio_log.write(
                    #     "[green]Audio buffer appended successfully[/green]\n" #Too many writes happening
                    # )
                    audio_log.refresh()
                except Exception as e:
                    audio_log.write(
                        f"\n[red]Error appending to audio buffer: {str(e)}[/red]\n"
                    )
                    audio_log.refresh()
                    # Don't raise the error - let the loop continue to try again

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

                # When stopping recording, check if we're in the middle of CDP processing
                audio_log = self.query_one("#audio-log", RichLog)
                audio_log.write("\n[yellow]Stopping recording...[/yellow]\n")
                audio_log.refresh()
            else:
                self.should_send_audio.set()
                status_indicator.is_recording = True


def initialize_agent():
    """Initialize the agent with CDP Agentkit."""
    print("\n[yellow]Initializing CDP Agent...[/yellow]")

    print("Creating LLM instance...")
    llm = ChatOpenAI()

    print("Loading wallet data...")
    wallet_data = None
    if os.path.exists(wallet_data_file):
        print(f"Found existing wallet data at {wallet_data_file}")
        with open(wallet_data_file) as f:
            wallet_data = f.read()
    else:
        print("No existing wallet data found, will create new wallet")

    # Configure CDP Agentkit Langchain Extension.
    print("Configuring CDP Agentkit...")
    values = {}
    if wallet_data is not None:
        values = {"cdp_wallet_data": wallet_data}
        print("Using existing wallet data")
    else:
        print("Starting with fresh wallet")

    print("Creating CDP Agentkit wrapper...")
    agentkit = CdpAgentkitWrapper(**values)

    print("Exporting wallet data...")
    wallet_data = agentkit.export_wallet()
    with open(wallet_data_file, "w") as f:
        f.write(wallet_data)
    print(f"Wallet data saved to {wallet_data_file}")

    print("Creating CDP toolkit and loading tools...")
    cdp_toolkit = CdpToolkit.from_cdp_agentkit_wrapper(agentkit)
    tools = cdp_toolkit.get_tools()
    print(f"Loaded {len(tools)} CDP tools")
    print("Available tools:", [tool.name for tool in tools])

    print("Setting up agent memory and config...")
    memory = MemorySaver()
    config = {
        "configurable": {
            "thread_id": "CDP Agentkit Chatbot Example!",
            "tools": [tool.name for tool in tools],
            "verbose": True,
        }
    }

    state_modifier = (
        "You are a blockchain agent with access to CDP (Coinbase Developer Platform) tools. "
        "IMPORTANT: You must ALWAYS use your tools when handling blockchain requests. "
        "Here's how to handle requests:\n"
        "1. For ANY blockchain-related request, FIRST use get_wallet_details to check the network.\n"
        "2. If you need funds, use request_faucet_funds on base-sepolia network.\n"
        "3. For each action, explicitly state which tool you're using and why.\n"
        "4. If you encounter errors, provide clear explanations and retry if appropriate.\n"
        "5. If asked to do something beyond your tools' capabilities, explain what you can't do "
        "and suggest using the CDP SDK (docs.cdp.coinbase.com).\n\n"
        "Remember:\n"
        "- ALWAYS use tools for blockchain operations - don't just describe what could be done\n"
        "- Start with get_wallet_details for ANY blockchain interaction\n"
        "- Be direct and clear about what you're doing\n"
        "- Show the actual results from your tool usage"
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

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, StopCircle } from "lucide-react";

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInput("");
      setIsRecording(false);
      setAudioUrl(null);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (input.trim() || audioUrl) {
      const newMessage = {
        role: "user",
        content: input.trim() || "Audio message",
      };
      setMessages((prev) => [...prev, newMessage]);
      setInput("");

      try {
        // Show loading state
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Thinking..." },
        ]);

        const response = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, newMessage],
            audioUrl,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Remove loading message and add actual response
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: data.response },
        ]);
      } catch (error) {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      } finally {
        setAudioUrl(null);
      }
    }
  };

  // Add this to your ChatbotModal component
const processAudioForAPI = async (audioBlob: Blob): Promise<string> => {
  try {
    // Create FormData and append audio file
    const formData = new FormData()
    formData.append('audio', audioBlob)
    
    // Upload to your temporary storage or convert to base64
    const response = await fetch('/api/upload-audio', {
      method: 'POST',
      body: formData
    })
    
    const { url } = await response.json()
    return url
  } catch (error) {
    console.error('Error processing audio:', error)
    throw error
  }
}

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" })
        const localAudioUrl = URL.createObjectURL(audioBlob)
        setAudioUrl(localAudioUrl)
        
        try {
          const apiAudioUrl = await processAudioForAPI(audioBlob)
          handleSendMessage()
        } catch (error) {
          console.error('Error processing audio:', error)
        }
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Trading Assistant</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${
                  message.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className={`inline-block p-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {message.content}
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button onClick={handleSendMessage}>
                <Send size={20} />
              </Button>
              {!isRecording ? (
                <Button onClick={handleStartRecording}>
                  <Mic size={20} />
                </Button>
              ) : (
                <Button onClick={handleStopRecording} variant="destructive">
                  <StopCircle size={20} />
                </Button>
              )}
            </div>
            {audioUrl && (
              <audio src={audioUrl} controls className="mt-2 w-full" />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

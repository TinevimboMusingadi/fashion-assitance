"use client";

import { useState, useRef, useEffect } from "react";
import { AgentLogBlock } from "./agent-log-block";

interface Message {
  role: "user" | "assistant";
  content: string;
  logs?: string[];
  images?: string[];
}

interface ChatProps {
  onImageUrl?: (url: string) => void;
}

export function Chat({ onImageUrl }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingLogs, setStreamingLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setStreamingLogs([]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let response = "";
      const collectedLogs: string[] = [];
      const collectedImages: string[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6)) as {
                type?: string;
                message?: string;
                response?: string;
                error?: string;
                imageUrl?: string;
              };
              if (data.type === "log" && data.message) {
                collectedLogs.push(data.message);
                setStreamingLogs([...collectedLogs]);
              } else if (data.type === "image" && data.imageUrl) {
                collectedImages.push(data.imageUrl);
                onImageUrl?.(data.imageUrl);
              } else if (data.type === "done" && data.response) {
                response = data.response;
              } else if (data.type === "error" && data.error) {
                throw new Error(data.error);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response || "No response received.",
          logs: collectedLogs.length > 0 ? collectedLogs : undefined,
          images: collectedImages.length > 0 ? collectedImages : undefined,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
      setStreamingLogs([]);
    }
  };

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      {/* Messages */}
      <div className="flex-1 min-h-[280px] overflow-y-auto space-y-3 rounded-xl border border-border bg-card/50 p-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted text-center text-sm">
              Ask for outfit suggestions, search your wardrobe, or plan what to
              wear based on the weather.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
                m.role === "user"
                  ? "bg-accent text-foreground rounded-br-md"
                  : "bg-border/40 text-foreground rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {m.content}
              </p>
              {m.role === "assistant" && m.logs && m.logs.length > 0 && (
                <AgentLogBlock logs={m.logs} generatedImages={m.images} />
              )}
            </div>
          </div>
        ))}

        {/* Streaming state */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-border/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-silver [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-silver [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-silver [animation-delay:300ms]" />
                </div>
                <span className="text-muted text-xs">
                  {streamingLogs.length > 0
                    ? streamingLogs[streamingLogs.length - 1]
                    : "Thinking..."}
                </span>
              </div>
              {streamingLogs.length > 1 && (
                <div className="mt-2 max-h-20 overflow-y-auto scrollbar-thin">
                  <ul className="space-y-px text-[11px] font-mono text-muted/70">
                    {streamingLogs.slice(0, -1).map((log, i) => (
                      <li key={i} className="truncate">{log}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What should I wear today?"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-silver/50 focus:outline-none focus:ring-1 focus:ring-silver/30 transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95 disabled:opacity-30 disabled:active:scale-100"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}

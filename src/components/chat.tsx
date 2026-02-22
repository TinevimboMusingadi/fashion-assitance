"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  onImageUrl?: (url: string) => void;
}

export function Chat({ onImageUrl }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollLogsToBottom = () => {
    logsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollLogsToBottom();
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setLogs([]);

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
      const newLogs: string[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  type?: string;
                  message?: string;
                  response?: string;
                  error?: string;
                };
                if (data.type === "log" && data.message) {
                  newLogs.push(data.message);
                  setLogs([...newLogs]);
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
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response || "No response received." },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
      setLogs([]);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 overflow-y-auto space-y-4 rounded-lg border border-border bg-card p-4">
        {messages.length === 0 && (
          <p className="text-muted text-center text-sm">
            Ask for outfit suggestions, search your wardrobe, or plan what to
            wear based on the weather.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-accent text-foreground"
                  : "bg-border/50 text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-border/50 px-3 py-2">
              <span className="text-muted text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {logs.length > 0 && (
        <div
          ref={logsRef}
          className="max-h-24 overflow-y-auto rounded border border-border bg-card/50 px-3 py-2"
        >
          <p className="text-muted mb-1 text-xs font-medium">Agent logs</p>
          <ul className="text-muted space-y-0.5 text-xs">
            {logs.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What should I wear today?"
          className="flex-1 rounded border border-border bg-card px-4 py-2 text-foreground placeholder:text-muted focus:border-silver focus:outline-none focus:ring-1 focus:ring-silver"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-silver/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-silver/30 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

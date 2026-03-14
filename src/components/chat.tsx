"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AgentLogBlock } from "./agent-log-block";
import { useAuth } from "@/lib/firebase/auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  logs?: string[];
  images?: string[];
}

interface ChatProps {
  onImageUrl?: (url: string) => void;
  sessionId?: string | null;
}

export function Chat({ onImageUrl, sessionId }: ChatProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingLogs, setStreamingLogs] = useState<string[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingLogs]);

  const loadHistory = useCallback(async () => {
    if (!sessionId || !token) {
      setMessages([]);
      setHistoryLoaded(true);
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Message[];
        setMessages(data);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoaded(true);
    }
  }, [sessionId, token]);

  useEffect(() => {
    setHistoryLoaded(false);
    loadHistory();
  }, [loadHistory]);

  const saveMessage = async (msg: Message) => {
    if (!sessionId || !token) return;
    try {
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msg),
      });
    } catch {
      // non-critical
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(userMsg);
    setLoading(true);
    setStreamingLogs([]);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `HTTP ${res.status}`,
        );
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

      const assistantMsg: Message = {
        role: "assistant",
        content: response || "No response received.",
        logs: collectedLogs.length > 0 ? collectedLogs : undefined,
        images: collectedImages.length > 0 ? collectedImages : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessage(assistantMsg);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      const errMsg: Message = { role: "assistant", content: `Error: ${msg}` };
      setMessages((prev) => [...prev, errMsg]);
      await saveMessage(errMsg);
    } finally {
      setLoading(false);
      setStreamingLogs([]);
    }
  };

  if (!historyLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[300px] flex-col sm:min-h-[400px]">
      <div className="flex-1 min-h-[200px] overflow-y-auto space-y-2 rounded-xl border border-border bg-card/50 p-3 scrollbar-thin sm:min-h-[280px] sm:space-y-3 sm:p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted text-center text-xs sm:text-sm px-2">
              Ask for outfit suggestions, search your wardrobe, or plan what to
              wear based on the weather.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const isOutfitReply =
            m.role === "assistant" && m.images && m.images.length > 0;
          const bubble = (
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 sm:max-w-[88%] sm:px-4 sm:py-2.5 ${
                m.role === "user"
                  ? "bg-accent text-foreground rounded-br-md"
                  : "bg-border/40 text-foreground rounded-bl-md"
              }`}
            >
              {isOutfitReply && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {m.images!.map((url, idx) => (
                    <a
                      key={`${url}-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-border bg-card transition-transform duration-150 hover:scale-[1.03]"
                    >
                      <img
                        src={url}
                        alt={`Generated outfit ${idx + 1}`}
                        className="h-20 w-auto max-w-[120px] object-cover sm:h-24 sm:max-w-[140px]"
                      />
                    </a>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                {m.content}
              </p>
              {m.role === "assistant" && m.logs && m.logs.length > 0 && (
                <AgentLogBlock logs={m.logs} generatedImages={m.images} />
              )}
            </div>
          );

          return (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {isOutfitReply ? (
                <div className="max-w-[92%] rounded-2xl bg-gradient-to-r from-silver/30 via-foreground/20 to-silver/30 p-[1.5px] shadow-[0_0_18px_rgba(148,163,184,0.45)] sm:max-w-[88%]">
                  {bubble}
                </div>
              ) : (
                bubble
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-border/40 px-3 py-2 sm:max-w-[88%] sm:px-4 sm:py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-silver [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-silver [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-silver [animation-delay:300ms]" />
                </div>
                <span className="text-muted text-[10px] sm:text-xs truncate max-w-[180px] sm:max-w-none">
                  {streamingLogs.length > 0
                    ? streamingLogs[streamingLogs.length - 1]
                    : "Thinking..."}
                </span>
              </div>
              {streamingLogs.length > 1 && (
                <div className="mt-2 max-h-20 overflow-y-auto scrollbar-thin">
                  <ul className="space-y-px text-[11px] font-mono text-muted/70">
                    {streamingLogs.slice(0, -1).map((log, i) => (
                      <li key={i} className="truncate">
                        {log}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-1.5 sm:mt-3 sm:gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What should I wear today?"
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-silver/50 focus:outline-none focus:ring-1 focus:ring-silver/30 transition-colors sm:px-4 sm:py-2.5 sm:text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95 disabled:opacity-30 disabled:active:scale-100 sm:h-[42px] sm:w-[42px]"
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

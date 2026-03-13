"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionListProps {
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export function SessionList({
  activeSessionId,
  onSelect,
  onNewChat,
}: SessionListProps) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions((await res.json()) as Session[]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Chats
        </span>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-foreground/10 hover:text-foreground transition-colors"
          title="New chat"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted">No conversations yet</p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              const date = new Date(s.updatedAt);
              const timeStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted hover:bg-card hover:text-foreground"
                  }`}
                >
                  <p className="truncate text-xs font-medium">{s.title}</p>
                  <p className="mt-0.5 text-[10px] opacity-60">{timeStr}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

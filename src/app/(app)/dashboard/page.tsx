"use client";

import { useState, useEffect, useCallback } from "react";
import { Chat } from "@/components/chat";
import { OutfitGallery } from "@/components/outfit-gallery";
import { SessionList } from "@/components/session-list";
import { useAuth } from "@/lib/firebase/auth-context";

function Clock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-muted/60 text-xs font-mono tabular-nums">
      {time || "--:--:--"}
    </div>
  );
}

export default function DashboardPage() {
  const { user, token, signOut } = useAuth();
  const [outfitImageUrls, setOutfitImageUrls] = useState<string[]>([]);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [galleryKey, setGalleryKey] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);

  const handleNewImage = useCallback((url: string) => {
    setOutfitImageUrls((prev) => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
    setActivePreview(url);
    setGalleryKey((k) => k + 1);
  }, []);

  const handleNewChat = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        setActiveSessionId(data.id);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!token) return;
    const createInitialSession = async () => {
      try {
        const res = await fetch("/api/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const sessions = (await res.json()) as { id: string }[];
          if (sessions.length > 0) {
            setActiveSessionId(sessions[0].id);
          } else {
            await handleNewChat();
          }
        }
      } catch {
        // silent
      }
    };
    createInitialSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const displayUrl =
    activePreview ??
    outfitImageUrls[outfitImageUrls.length - 1] ??
    null;

  useEffect(() => {
    setPreviewImageError(false);
  }, [displayUrl]);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="relative border-b border-border/60 px-6 py-3.5">
        <div className="absolute inset-0 bg-gradient-to-r from-card via-background to-card opacity-60" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-foreground"
              >
                <path
                  d="M20.38 3.46 16 2 12 5.5 8 2 3.62 3.46l.18 6.04L12 22l8.2-12.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Dripcheck
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/wardrobe"
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-silver transition-colors hover:border-silver/40 hover:text-foreground"
            >
              Wardrobe
            </a>
            <Clock />
            <div className="flex items-center gap-2 border-l border-border/60 pl-4">
              <span className="text-xs text-muted truncate max-w-[120px]">
                {user?.displayName ?? user?.email ?? ""}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-md px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-0 min-h-0 overflow-hidden">
        {/* Session sidebar */}
        <aside className="w-[200px] flex-shrink-0 border-r border-border/40 bg-card/30">
          <SessionList
            activeSessionId={activeSessionId}
            onSelect={(id) => setActiveSessionId(id)}
            onNewChat={handleNewChat}
          />
        </aside>

        {/* Chat panel */}
        <section className="flex flex-1 flex-col min-w-0 border-r border-border/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
              Chat
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <Chat
              key={activeSessionId}
              onImageUrl={handleNewImage}
              sessionId={activeSessionId}
            />
          </div>
        </section>

        {/* Right panel */}
        <section className="flex w-[340px] flex-shrink-0 flex-col gap-5 overflow-y-auto p-5 scrollbar-thin">
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              Outfit Preview
            </h2>
            {outfitImageUrls.length > 1 && (
              <div className="mb-3 flex gap-2">
                {outfitImageUrls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePreview(url)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      displayUrl === url
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Outfit {i + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              {displayUrl ? (
                previewImageError ? (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-border"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                    <p className="text-muted text-xs">
                      Image failed to load
                    </p>
                  </div>
                ) : (
                  <img
                    src={displayUrl}
                    alt="Generated outfit"
                    className="h-full w-full rounded-xl object-cover transition-opacity"
                    onError={() => setPreviewImageError(true)}
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 text-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <p className="text-muted text-xs">
                    Generated outfit images will appear here
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              Past Outfits
            </h2>
            <OutfitGallery
              refreshKey={galleryKey}
              onSelect={(url) => setActivePreview(url)}
              activeUrl={displayUrl}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

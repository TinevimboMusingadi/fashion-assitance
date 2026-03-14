"use client";

import { useState, useEffect, useCallback } from "react";
import { Chat } from "@/components/chat";
import { OutfitGallery } from "@/components/outfit-gallery";
import { SessionList } from "@/components/session-list";
import { GettingStarted } from "@/components/getting-started";
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
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [mobileOutfitOpen, setMobileOutfitOpen] = useState(false);
  const [desktopSessionsCollapsed, setDesktopSessionsCollapsed] =
    useState(false);
  const [desktopOutfitCollapsed, setDesktopOutfitCollapsed] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(true);

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
    <main className="flex h-screen flex-col overflow-hidden min-h-[100dvh]">
      <header className="relative shrink-0 border-b border-border/60 px-3 py-2.5 sm:px-6 sm:py-3.5">
        <div className="absolute inset-0 bg-gradient-to-r from-card via-background to-card opacity-60" />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/10 sm:h-8 sm:w-8">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-foreground sm:w-4 sm:h-4"
              >
                <path
                  d="M20.38 3.46 16 2 12 5.5 8 2 3.62 3.46l.18 6.04L12 22l8.2-12.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Dripcheck
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="/wardrobe"
              className="rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-silver transition-colors hover:border-silver/40 hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
            >
              Wardrobe
            </a>
            <div className="hidden sm:block">
              <Clock />
            </div>
            <div className="flex items-center gap-1.5 border-l border-border/60 pl-2 sm:gap-2 sm:pl-4">
              <span className="max-w-[80px] truncate text-[10px] text-muted sm:max-w-[120px] sm:text-xs">
                {user?.displayName ?? user?.email ?? ""}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-md px-1.5 py-0.5 text-[10px] text-muted hover:text-foreground transition-colors sm:px-2 sm:py-1 sm:text-[11px]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-0 min-h-0 overflow-hidden">
        {/* Session sidebar - hidden on small screens */}
        <aside
          className={`hidden w-[180px] flex-shrink-0 border-r border-border/40 bg-card/30 lg:w-[200px] ${
            desktopSessionsCollapsed ? "" : "md:flex"
          }`}
        >
          <SessionList
            activeSessionId={activeSessionId}
            onSelect={(id) => {
              setActiveSessionId(id);
              setMobileSessionsOpen(false);
            }}
            onNewChat={handleNewChat}
          />
        </aside>

        {/* Chat panel */}
        <section className="flex flex-1 flex-col min-w-0 border-r border-border/40 p-3 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
              <h2 className="text-[10px] font-medium uppercase tracking-wider text-muted sm:text-xs">
                Chat
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setDesktopSessionsCollapsed((prev) => !prev)
                }
                className="hidden rounded-lg border border-border bg-card p-2 text-muted hover:text-foreground md:inline-flex lg:mr-1"
                aria-label={
                  desktopSessionsCollapsed
                    ? "Show chat sessions"
                    : "Hide chat sessions"
                }
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="6" height="16" rx="1.5" />
                  <rect x="11" y="4" width="10" height="16" rx="1.5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setMobileSessionsOpen(true)}
                className="lg:hidden rounded-lg border border-border bg-card p-2 text-muted hover:text-foreground"
                aria-label="Open chat sessions"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMobileOutfitOpen(true)}
                className="lg:hidden rounded-lg border border-border bg-card p-2 text-muted hover:text-foreground"
                aria-label="Open outfit preview"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNewChat}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted hover:text-foreground"
              >
                New chat
              </button>
            </div>
          </div>

          {showGettingStarted && (
            <div className="mb-3 lg:hidden">
              <GettingStarted
                onNewChat={handleNewChat}
                onDismiss={() => setShowGettingStarted(false)}
              />
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <Chat
              key={activeSessionId}
              onImageUrl={handleNewImage}
              sessionId={activeSessionId}
            />
          </div>
        </section>

        {/* Right panel - hidden on small/medium, visible on large */}
        <section
          className={`hidden w-full flex-col gap-4 overflow-y-auto border-l border-border/40 bg-card/20 p-4 scrollbar-thin lg:w-[320px] lg:min-w-[280px] xl:w-[340px] xl:min-w-[340px] ${
            desktopOutfitCollapsed ? "" : "lg:flex"
          }`}
        >
          {showGettingStarted && (
            <div className="mb-4">
              <GettingStarted
                onNewChat={handleNewChat}
                onDismiss={() => setShowGettingStarted(false)}
              />
            </div>
          )}

          <div className="relative">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
              Outfit Preview
            </h2>
            <button
              type="button"
              onClick={() =>
                setDesktopOutfitCollapsed((prev) => !prev)
              }
              className="absolute right-0 top-0 hidden rounded-md border border-border bg-card p-1.5 text-[10px] text-muted hover:text-foreground lg:inline-flex"
              aria-label={
                desktopOutfitCollapsed
                  ? "Show outfit panel"
                  : "Hide outfit panel"
              }
            >
              {desktopOutfitCollapsed ? "Show" : "Hide"}
            </button>
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
            <div className="rounded-2xl bg-gradient-to-r from-silver/40 via-foreground/15 to-silver/40 p-[1.5px] shadow-[0_0_20px_rgba(148,163,184,0.35)]">
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[0.9rem] bg-card">
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

      {/* Mobile: Sessions drawer */}
      {mobileSessionsOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-label="Chat sessions"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileSessionsOpen(false)}
            aria-label="Close"
          />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] flex flex-col border-r border-border bg-card shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Chats</span>
              <button
                type="button"
                onClick={() => setMobileSessionsOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SessionList
                activeSessionId={activeSessionId}
                onSelect={(id) => {
                  setActiveSessionId(id);
                  setMobileSessionsOpen(false);
                }}
                onNewChat={() => {
                  handleNewChat();
                  setMobileSessionsOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Outfit panel drawer */}
      {mobileOutfitOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-label="Outfit preview"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOutfitOpen(false)}
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-[400px] flex flex-col bg-card shadow-xl overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Outfit</span>
              <button
                type="button"
                onClick={() => setMobileOutfitOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                  Preview
                </h2>
                {outfitImageUrls.length > 1 && (
                  <div className="mb-2 flex gap-2">
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
                        <p className="text-muted text-xs">Image failed to load</p>
                      </div>
                    ) : (
                      <img
                        src={displayUrl}
                        alt="Generated outfit"
                        className="h-full w-full object-cover"
                        onError={() => setPreviewImageError(true)}
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-6 text-center">
                      <p className="text-muted text-xs">
                        Generated outfit images will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                  Past Outfits
                </h2>
                <OutfitGallery
                  refreshKey={galleryKey}
                  onSelect={(url) => setActivePreview(url)}
                  activeUrl={displayUrl}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";

export interface ParsedItem {
  name: string;
  category: string;
  imagePath: string;
}

function parseClothingItems(logs: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const seen = new Set<string>();
  for (const log of logs) {
    const match = log.match(
      /\[IMG]\s+(.+?)\s+\((\w+)\)\s+->\s+(.+)/
    );
    if (match) {
      const [, name, category, rawPath] = match;
      if (seen.has(name)) continue;
      seen.add(name);
      const relative = rawPath
        .replace(/\\/g, "/")
        .replace(/^.*?data\//, "");
      items.push({ name, category, imagePath: relative });
    }
  }
  return items;
}

function imageUrlFor(relativePath: string): string {
  return `/api/image?path=${encodeURIComponent(relativePath)}`;
}

interface AgentLogBlockProps {
  logs: string[];
  generatedImages?: string[];
}

export function AgentLogBlock({ logs, generatedImages }: AgentLogBlockProps) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const items = parseClothingItems(logs);
  const toolCalls = logs.filter((l) => l.startsWith("Calling tool:"));

  useEffect(() => {
    if (logs.length === 0) return;
    let cancelled = false;
    fetch("/api/summarize-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSummary((data as { summary?: string }).summary ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [logs]);

  if (logs.length === 0) return null;

  const summaryText = summary ?? `Agent used ${toolCalls.length} tool${toolCalls.length !== 1 ? "s" : ""}`;

  return (
    <>
      <div className="mt-2 rounded-md border border-border/60 bg-background/40">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
        >
          <svg
            className={`h-3 w-3 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
          <span className="text-silver">{summaryText}</span>
        </button>

        {open && (
          <div className="border-t border-border/40 px-3 py-2">
            {items.length > 0 && (
              <div className="mb-2">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Selected items
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setLightbox(imageUrlFor(item.imagePath))}
                      className="group flex flex-col items-center gap-1"
                    >
                      <div className="h-10 w-10 overflow-hidden rounded border border-border bg-card transition-all group-hover:border-silver">
                        <img
                          src={imageUrlFor(item.imagePath)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="max-w-[60px] truncate text-[9px] text-muted group-hover:text-foreground">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {generatedImages && generatedImages.length > 0 && (
              <div className="mb-2">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                  Generated outfits
                </p>
                <div className="flex gap-2">
                  {generatedImages.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(url)}
                      className="group flex flex-col items-center gap-1"
                    >
                      <div className="h-14 w-11 overflow-hidden rounded border border-border bg-card transition-all group-hover:border-silver">
                        <img
                          src={url}
                          alt={`Outfit ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="text-[9px] text-muted">
                        Outfit {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-32 overflow-y-auto scrollbar-thin">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">
                Raw logs
              </p>
              <ul className="space-y-px text-[11px] font-mono leading-relaxed text-muted">
                {logs.map((log, i) => (
                  <li key={i} className="break-all">
                    {log}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[85vh] max-w-[85vw]">
            <img
              src={lightbox}
              alt="Preview"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground hover:bg-accent"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

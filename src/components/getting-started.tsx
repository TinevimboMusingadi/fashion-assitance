"use client";

import { useState } from "react";

interface GettingStartedProps {
  onNewChat?: () => void;
  onDismiss?: () => void;
}

const STEPS = [
  { dot: "bg-green-500/90", text: "Start a new chat and ask for outfit ideas.", pulse: true },
  {
    dot: "bg-silver/80",
    text: (
      <>
        Upload 1–2 full-body base photos in{" "}
        <a href="/wardrobe" className="text-foreground underline-offset-2 hover:underline transition-colors">
          Wardrobe
        </a>
        .
      </>
    ),
    pulse: false,
  },
  {
    dot: "bg-silver/60",
    text: (
      <>
        Add your clothes in Wardrobe and click <span className="font-medium">Re-index</span> to update the catalog.
      </>
    ),
    pulse: false,
  },
  {
    dot: "bg-silver/60",
    text: "Generate an outfit and see it in the preview panel.",
    pulse: false,
  },
];

export function GettingStarted({ onNewChat, onDismiss }: GettingStartedProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const handleDismiss = () => {
    setHidden(true);
    onDismiss?.();
  };

  const handleNewChat = () => {
    onNewChat?.();
  };

  return (
    <div
      className="rounded-xl border border-border/70 bg-card/60 p-3 text-left shadow-sm sm:p-4 animate-fadeInUp"
      style={{ animationFillMode: "forwards" }}
    >
      <div className="mb-2 flex items-start justify-between gap-2 animate-fadeInUp" style={{ animationDelay: "0.05s", animationFillMode: "forwards", opacity: 0 }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs">
            Getting started
          </p>
          <p className="mt-1 text-xs text-muted sm:text-[13px]">
            A quick guide to make the most of Dripcheck.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Dismiss getting started"
        >
          <span className="block h-3 w-3 text-xs leading-none sm:h-3.5 sm:w-3.5">×</span>
        </button>
      </div>

      <ul className="space-y-1.5 text-[11px] text-muted sm:text-xs">
        {STEPS.map((step, i) => (
          <li
            key={i}
            className="animate-fadeInUp flex items-start gap-1.5"
            style={{
              animationDelay: `${0.1 + i * 0.08}s`,
              animationFillMode: "forwards",
              opacity: 0,
            }}
          >
            <span
              className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle ${step.dot} ${step.pulse ? "animate-gentlePulse" : ""}`}
            />
            <span>{typeof step.text === "string" ? step.text : step.text}</span>
          </li>
        ))}
      </ul>

      <div
        className="mt-3 flex flex-wrap gap-2 animate-fadeInUp"
        style={{ animationDelay: "0.45s", animationFillMode: "forwards", opacity: 0 }}
      >
        <button
          type="button"
          onClick={handleNewChat}
          disabled={!onNewChat}
          className="rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-medium text-background transition-all duration-200 hover:scale-105 hover:bg-foreground/95 active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 disabled:bg-accent disabled:text-muted sm:px-3.5 sm:text-xs focus:outline-none focus:ring-2 focus:ring-silver/40 focus:ring-offset-2 focus:ring-offset-background"
        >
          Start a new chat
        </button>
        <a
          href="/wardrobe"
          className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted transition-all duration-200 hover:scale-105 hover:bg-card hover:text-foreground active:scale-[0.98] sm:px-3.5 sm:text-xs focus:outline-none focus:ring-2 focus:ring-silver/40 focus:ring-offset-2 focus:ring-offset-background"
        >
          Open wardrobe
        </a>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

interface IndexStepProps {
  onComplete: () => void;
  onBack: () => void;
}

export function IndexStep({ onComplete, onBack }: IndexStepProps) {
  const { token } = useAuth();
  const [indexing, setIndexing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIndex = async () => {
    if (!token) return;
    setIndexing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/index", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { indexed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Indexing failed");
      setResult(
        `Successfully indexed ${data.indexed ?? 0} clothing items with AI vision!`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Indexing failed");
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Index your wardrobe
        </h2>
        <p className="mt-1 text-sm text-muted">
          AI will analyze each item and classify it by color, style, and occasion
        </p>
      </div>

      <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl border border-border/60 bg-card/50">
        {indexing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
            <span className="text-xs text-muted">Analyzing...</span>
          </div>
        ) : result ? (
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-green-500"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        )}
      </div>

      {result && (
        <p className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
          {result}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-border px-6 py-2.5 text-sm text-foreground transition-colors hover:bg-card"
        >
          Back
        </button>
        <div className="flex-1" />
        {!result ? (
          <button
            type="button"
            onClick={handleIndex}
            disabled={indexing}
            className="rounded-xl bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-40"
          >
            {indexing ? "Indexing..." : "Start indexing"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="rounded-xl bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90"
          >
            Go to dashboard
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Chat } from "@/components/chat";

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
    <div className="text-silver text-sm font-mono tabular-nums">
      {time || "--:--:--"}
    </div>
  );
}

export default function Home() {
  const [outfitImageUrl, setOutfitImageUrl] = useState<string | null>(null);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            Fashion Assistant
          </h1>
          <Clock />
        </div>
      </header>

      <div className="flex flex-1 gap-6 p-6">
        <section className="flex flex-1 flex-col min-w-0">
          <div className="mb-4">
            <h2 className="text-muted text-sm font-medium">Chat</h2>
          </div>
          <div className="flex-1 min-h-[400px]">
            <Chat onImageUrl={setOutfitImageUrl} />
          </div>
        </section>

        <section className="w-80 flex-shrink-0">
          <div className="mb-4">
            <h2 className="text-muted text-sm font-medium">Outfit Preview</h2>
          </div>
          <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-card">
            {outfitImageUrl ? (
              <img
                src={outfitImageUrl}
                alt="Generated outfit"
                className="max-h-full max-w-full rounded-lg object-cover"
              />
            ) : (
              <p className="text-muted px-4 text-center text-sm">
                Generated outfit images will appear here.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

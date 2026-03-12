"use client";

import { useState, useEffect, useCallback } from "react";

interface GalleryRecord {
  id: string;
  imageUrl: string;
  createdAt: string;
  outfitItems: { name: string; category: string }[];
}

interface OutfitGalleryProps {
  refreshKey?: number;
  onSelect?: (url: string) => void;
  activeUrl?: string | null;
}

export function OutfitGallery({ refreshKey, onSelect, activeUrl }: OutfitGalleryProps) {
  const [records, setRecords] = useState<GalleryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/generated-images");
      if (res.ok) {
        const data = (await res.json()) as GalleryRecord[];
        setRecords(Array.isArray(data) ? data.reverse() : []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <span className="text-xs text-muted">Loading gallery...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/60">
        <span className="text-xs text-muted">No outfits generated yet</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
      {records.map((rec) => {
        const isActive = activeUrl === rec.imageUrl;
        const date = new Date(rec.createdAt);
        const timeStr = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const itemNames = rec.outfitItems
          .map((i) => i.name)
          .slice(0, 2)
          .join(", ");

        return (
          <button
            key={rec.id}
            type="button"
            onClick={() => onSelect?.(rec.imageUrl)}
            className={`group flex-shrink-0 transition-all ${
              isActive ? "scale-[1.02]" : "hover:scale-[1.02]"
            }`}
          >
            <div
              className={`h-28 w-20 overflow-hidden rounded-lg border-2 transition-colors ${
                isActive
                  ? "border-foreground/60"
                  : "border-border group-hover:border-silver/50"
              }`}
            >
              <img
                src={rec.imageUrl}
                alt={`Outfit from ${dateStr}`}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-1 max-w-[80px] truncate text-center text-[9px] text-muted">
              {dateStr} {timeStr}
            </p>
            {itemNames && (
              <p className="max-w-[80px] truncate text-center text-[8px] text-muted/60">
                {itemNames}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

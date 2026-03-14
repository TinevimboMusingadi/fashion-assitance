"use client";

import { useEffect, useState } from "react";

const PICKED_ITEMS = [
  { src: "/assets/baggjean.jpg", alt: "Jeans" },
  { src: "/assets/socks.jpg", alt: "Socks" },
  { src: "/assets/greysweater1977.jpg", alt: "Grey sweater 1977" },
  { src: "/assets/bluesweater.jpg", alt: "Blue sweater" },
] as const;

const GENERATED_OUTFITS = ["/assets/outfit.png", "/assets/outfit2.png"] as const;
const ROTATE_MS = 3500;

export function LandingIllustration() {
  const [generatedIndex, setGeneratedIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setGeneratedIndex((i) => (i + 1) % GENERATED_OUTFITS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-6 flex w-full flex-col items-center gap-6 rounded-2xl border border-border/60 bg-card/40 p-5 sm:mt-8 sm:p-6 md:p-7">
      <div className="flex w-full flex-col items-center justify-between gap-6 sm:flex-row">
        {/* 1. Base photo */}
        <div className="flex flex-col items-center gap-2 text-xs text-muted md:text-sm">
          <div className="relative h-36 w-28 overflow-hidden rounded-xl border border-border/70 bg-card md:h-40 md:w-32">
            <img
              src="/assets/me.jpeg"
              alt="Base photo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-medium text-[12px] text-foreground">
            1. Your base photo
          </span>
          <span className="max-w-[140px] text-[11px] md:text-xs">
            Upload a full-body image once during onboarding.
          </span>
        </div>

        <div className="hidden h-px flex-1 bg-gradient-to-r from-border via-silver/50 to-border sm:block" />

        {/* 2. Picked outfit pieces (jeans, socks, grey sweater, blue sweater) */}
        <div className="flex flex-col items-center gap-2 text-xs text-muted md:text-sm">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {PICKED_ITEMS.map((item) => (
              <div
                key={item.src}
                className="h-24 w-20 overflow-hidden rounded-lg border border-border/70 bg-card sm:h-24 sm:w-20"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          <span className="font-medium text-[12px] text-foreground">
            2. Picked outfit pieces
          </span>
          <span className="max-w-[170px] text-[11px] md:text-xs">
            The agent picks tops, bottoms, shoes and extras from your wardrobe.
          </span>
        </div>

        <div className="hidden h-px flex-1 bg-gradient-to-r from-border via-silver/50 to-border sm:block" />

        {/* 3. Generated outfit (rotating) */}
        <div className="flex flex-col items-center gap-2 text-xs text-muted md:text-sm">
          <div className="relative h-36 w-28 overflow-hidden rounded-xl border border-border/70 bg-card md:h-40 md:w-32">
            {GENERATED_OUTFITS.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Generated outfit ${i + 1}`}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: i === generatedIndex ? 1 : 0,
                  zIndex: i === generatedIndex ? 1 : 0,
                }}
              />
            ))}
          </div>
          <span className="font-medium text-[11px] text-foreground">
            3. Generated outfit
          </span>
          <span className="max-w-[140px] text-[11px]">
            See yourself wearing the outfit before you put it on.
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface WelcomeStepProps {
  onNext: () => void;
  userName?: string;
}

const PICKED_ITEMS = [
  { src: "/assets/baggjean.jpg", alt: "Jeans" },
  { src: "/assets/socks.jpg", alt: "Socks" },
  { src: "/assets/greysweater1977.jpg", alt: "Grey sweater 1977" },
  { src: "/assets/bluesweater.jpg", alt: "Blue sweater" },
] as const;

const GENERATED_OUTFITS = ["/assets/outfit.png", "/assets/outfit2.png"] as const;
const ROTATE_MS = 3500;

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
  const [generatedIndex, setGeneratedIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setGeneratedIndex((i) => (i + 1) % GENERATED_OUTFITS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:items-stretch lg:gap-14">
      {/* Left: text + steps */}
      <div className="flex flex-1 flex-col items-center gap-6 lg:items-start">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/10">
          <svg
            width="28"
            height="28"
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

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
            {userName ? `Welcome, ${userName}!` : "Welcome to Dripcheck!"}
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted lg:mx-0">
            Upload a base photo, add your clothes, and let AI show you exactly
            how your outfits will look on you.
          </p>
        </div>

        <div className="relative grid w-full max-w-sm gap-3 text-left lg:max-w-md">
          {[
            { step: "1", label: "Upload your full-body base photo" },
            { step: "2", label: "Add your clothing items by category" },
            { step: "3", label: "Ask the agent to pick and render an outfit" },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-foreground">
                {item.step}
              </div>
              <span className="text-sm text-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onNext}
          className="mt-2 rounded-xl bg-foreground px-10 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
        >
          Get started
        </button>
      </div>

      {/* Right: illustrated flow */}
      <div className="mt-4 flex flex-1 flex-col items-center gap-6 rounded-2xl border border-border/60 bg-card/40 p-5 lg:mt-0 lg:p-6">
        <div className="flex w-full flex-col items-center justify-between gap-6 sm:flex-row">
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
              Full-body image you upload during onboarding.
            </span>
          </div>

          <div className="hidden h-px flex-1 bg-gradient-to-r from-border via-silver/50 to-border sm:block" />

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
              See yourself wearing the outfit before you get dressed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

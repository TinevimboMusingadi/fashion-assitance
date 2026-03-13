"use client";

interface WelcomeStepProps {
  onNext: () => void;
  userName?: string;
}

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
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
        <h1 className="text-2xl font-bold text-foreground">
          {userName ? `Welcome, ${userName}!` : "Welcome to Dripcheck!"}
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
          Let&apos;s set up your digital wardrobe. This takes just a few
          minutes and will help AI style your outfits perfectly.
        </p>
      </div>

      <div className="grid w-full max-w-sm gap-3 text-left">
        {[
          { step: "1", label: "Upload your full-body photos" },
          { step: "2", label: "Add your clothing items by category" },
          { step: "3", label: "AI indexes and classifies your wardrobe" },
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
        className="rounded-xl bg-foreground px-10 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
      >
        Get started
      </button>
    </div>
  );
}

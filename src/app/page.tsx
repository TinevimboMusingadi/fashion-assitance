import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground">
              <path d="M20.38 3.46 16 2 12 5.5 8 2 3.62 3.46l.18 6.04L12 22l8.2-12.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Dripcheck
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              AI-powered fashion assistant
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
              Your wardrobe,
              <br />
              <span className="bg-gradient-to-r from-silver via-foreground to-silver bg-clip-text text-transparent">
                reimagined by AI
              </span>
            </h1>
            <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted">
              Upload your clothes, and let AI plan your outfits based on
              weather, style, and what you wore this week. See yourself
              wearing the outfit before you put it on.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-foreground px-8 py-3.5 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border px-8 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-card active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>

          {/* Features */}
          <div className="grid gap-4 pt-12 sm:grid-cols-3">
            {[
              {
                title: "Index your wardrobe",
                desc: "Upload photos of your clothes and AI categorizes them automatically",
                icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
              },
              {
                title: "AI outfit planning",
                desc: "Get daily outfit suggestions based on weather and your style history",
                icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
              },
              {
                title: "Virtual try-on",
                desc: "See yourself wearing the suggested outfit before getting dressed",
                icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border/60 bg-card/50 p-5 text-left"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mb-3 text-silver"
                >
                  <path d={feature.icon} />
                </svg>
                <h3 className="mb-1 text-sm font-medium text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4 text-center">
        <p className="text-xs text-muted/60">
          Dripcheck &middot; Built with Next.js, Gemini AI, and Firebase
        </p>
      </footer>
    </div>
  );
}

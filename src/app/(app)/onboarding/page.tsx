"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { PhotoUploadStep } from "@/components/onboarding/photo-upload-step";
import { WardrobeUploadStep } from "@/components/onboarding/wardrobe-upload-step";
import { IndexStep } from "@/components/onboarding/index-step";

const STEPS = ["welcome", "photos", "wardrobe", "index"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [step, setStep] = useState<Step>("welcome");

  const currentIndex = STEPS.indexOf(step);

  const goNext = () => {
    const next = STEPS[currentIndex + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = STEPS[currentIndex - 1];
    if (prev) setStep(prev);
  };

  const handleComplete = async () => {
    if (token) {
      try {
        await fetch("/api/user/onboarding-complete", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // non-critical
      }
    }
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8 flex justify-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 w-12 rounded-full transition-colors ${
                i <= currentIndex ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>

        {step === "welcome" && (
          <WelcomeStep
            onNext={goNext}
            userName={user?.displayName ?? undefined}
          />
        )}
        {step === "photos" && (
          <PhotoUploadStep onNext={goNext} onBack={goBack} />
        )}
        {step === "wardrobe" && (
          <WardrobeUploadStep onNext={goNext} onBack={goBack} />
        )}
        {step === "index" && (
          <IndexStep onComplete={handleComplete} onBack={goBack} />
        )}
      </div>
    </div>
  );
}

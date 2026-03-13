import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { db } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.collection("users").doc(auth.uid).set(
    { onboardingComplete: true },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}

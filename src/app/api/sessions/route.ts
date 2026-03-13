import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { db } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await db
    .collection("users")
    .doc(auth.uid)
    .collection("sessions")
    .orderBy("updatedAt", "desc")
    .limit(30)
    .get();

  const sessions = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const ref = db
    .collection("users")
    .doc(auth.uid)
    .collection("sessions")
    .doc();

  await ref.set({
    title: "New chat",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id, title: "New chat", createdAt: now });
}

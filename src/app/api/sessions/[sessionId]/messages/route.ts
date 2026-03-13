import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { db } from "@/lib/firebase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const snap = await db
    .collection("users")
    .doc(auth.uid)
    .collection("sessions")
    .doc(sessionId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  const messages = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  return NextResponse.json(messages);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json();
  const { role, content, logs, images } = body as {
    role: string;
    content: string;
    logs?: string[];
    images?: string[];
  };

  const now = new Date().toISOString();

  const msgRef = db
    .collection("users")
    .doc(auth.uid)
    .collection("sessions")
    .doc(sessionId)
    .collection("messages")
    .doc();

  await msgRef.set({
    role,
    content,
    logs: logs ?? [],
    images: images ?? [],
    createdAt: now,
  });

  const sessionRef = db
    .collection("users")
    .doc(auth.uid)
    .collection("sessions")
    .doc(sessionId);

  const titleUpdate =
    role === "user" && content.length > 0
      ? { title: content.slice(0, 60), updatedAt: now }
      : { updatedAt: now };

  await sessionRef.update(titleUpdate);

  return NextResponse.json({ id: msgRef.id });
}

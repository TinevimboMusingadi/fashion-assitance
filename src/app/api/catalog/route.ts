import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { getUserWardrobe } from "@/lib/indexing/engine";

export async function GET(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const catalog = await getUserWardrobe(auth.uid);
  return NextResponse.json(catalog);
}

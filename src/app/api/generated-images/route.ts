import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import {
  getGeneratedImages,
  getGeneratedImageById,
} from "@/lib/memory/generated-images-store";

export async function GET(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const record = await getGeneratedImageById(auth.uid, id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  }

  const records = await getGeneratedImages(auth.uid);
  return NextResponse.json(records);
}

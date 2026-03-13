import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { getUserPersonPhotos, indexPersonPhotos } from "@/lib/indexing/engine";

export async function GET(request: Request) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photos = await getUserPersonPhotos(auth.uid);
  return NextResponse.json(photos);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const entries = Array.from(formData.entries());
    const photos: { filename: string; buffer: Buffer; mimeType: string }[] = [];

    for (const [, value] of entries) {
      if (value instanceof File) {
        photos.push({
          filename: value.name,
          buffer: Buffer.from(await value.arrayBuffer()),
          mimeType: value.type || "image/png",
        });
      }
    }

    if (photos.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const result = await indexPersonPhotos(auth.uid, photos);
    return NextResponse.json({ uploaded: result.length, photos: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/lib/storage/gcs-client";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request: NextRequest) {
  const storagePath = request.nextUrl.searchParams.get("path");
  if (!storagePath?.trim()) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const bucketType = storagePath.includes("/wardrobe/")
    ? ("wardrobes" as const)
    : storagePath.includes("/generated/")
      ? ("generated" as const)
      : ("profiles" as const);

  const ext = storagePath
    .toLowerCase()
    .slice(storagePath.lastIndexOf("."));
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";

  try {
    const buffer = await downloadFile(bucketType, storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

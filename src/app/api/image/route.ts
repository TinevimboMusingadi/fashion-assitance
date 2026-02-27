import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";

const DATA_DIR = join(process.cwd(), "data");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request: NextRequest) {
  const pathParam = request.nextUrl.searchParams.get("path");
  if (!pathParam?.trim()) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const decodedPath = decodeURIComponent(pathParam).replace(/^\/+/, "");
  const resolved = resolve(join(DATA_DIR, decodedPath));

  if (!resolved.startsWith(resolve(DATA_DIR))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  const ext = decodedPath.toLowerCase().slice(decodedPath.lastIndexOf("."));
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";

  try {
    const buffer = await readFile(resolved);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

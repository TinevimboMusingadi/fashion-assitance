import { NextResponse } from "next/server";
import {
  getGeneratedImages,
  getGeneratedImageById,
} from "@/lib/memory/generated-images-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const record = await getGeneratedImageById(id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  }

  const records = await getGeneratedImages();
  return NextResponse.json(records);
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import {
  indexClothesFromUploads,
  type IndexableItem,
} from "@/lib/indexing/engine";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is required for indexing" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const items: IndexableItem[] = [];
    const entries = Array.from(formData.entries());

    for (const [key, value] of entries) {
      if (value instanceof File) {
        const category = (formData.get(`category_${key}`) as string) ?? "top";
        const buffer = Buffer.from(await value.arrayBuffer());
        items.push({
          filename: value.name,
          buffer,
          mimeType: value.type || "image/png",
          category: category as IndexableItem["category"],
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 },
      );
    }

    const catalog = await indexClothesFromUploads(auth.uid, items, apiKey);
    return NextResponse.json({ indexed: catalog.length, catalog });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Indexing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { indexClothes } from "@/lib/indexing/engine";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is required for indexing" },
      { status: 500 }
    );
  }

  try {
    const catalog = await indexClothes(apiKey);
    return NextResponse.json({ indexed: catalog.length, catalog });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Indexing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

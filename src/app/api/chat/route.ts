import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { runAgent } from "@/lib/agent/orchestrator";

async function getCatalog() {
  try {
    const path = join(process.cwd(), "data", "catalog.json");
    const data = await readFile(path, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message as string;
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const catalog = await getCatalog();

    const response = await runAgent(message, catalog);
    return NextResponse.json({ response });
  } catch (e) {
    const err = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

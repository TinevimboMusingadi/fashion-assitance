import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const path = join(process.cwd(), "data", "catalog.json");
    const data = await readFile(path, "utf-8");
    const catalog = JSON.parse(data);
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json([]);
  }
}

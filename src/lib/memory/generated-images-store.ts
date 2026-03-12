/**
 * Server-side store for generated outfit images.
 * Persists a log of every image the generator produces, including
 * which clothing items and person photo were used.
 */

import type { GeneratedImageRecord } from "@/lib/types";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const STORE_FILE = join(DATA_DIR, "generated-images.json");

export async function getGeneratedImages(): Promise<GeneratedImageRecord[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function appendGeneratedImage(
  record: GeneratedImageRecord,
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const records = await getGeneratedImages();
  records.push(record);
  await writeFile(STORE_FILE, JSON.stringify(records, null, 2));
}

export async function getGeneratedImageById(
  id: string,
): Promise<GeneratedImageRecord | null> {
  const records = await getGeneratedImages();
  return records.find((r) => r.id === id) ?? null;
}

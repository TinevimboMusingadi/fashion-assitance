/**
 * Server-side weekly outfit memory store.
 * Uses JSON file in data/ directory. For production, replace with Firestore.
 */

import type { WeeklyOutfitLog } from "@/lib/types";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const LOG_FILE = join(DATA_DIR, "weekly-log.json");

interface StoredLog {
  weekKey: string;
  logs: WeeklyOutfitLog[];
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function isNewWeek(current: Date, storedWeekKey: string): boolean {
  return getWeekKey(current) !== storedWeekKey;
}

export async function getWeeklyLog(): Promise<WeeklyOutfitLog[]> {
  try {
    const raw = await readFile(LOG_FILE, "utf-8");
    const data = JSON.parse(raw) as StoredLog;
    if (isNewWeek(new Date(), data.weekKey)) {
      return [];
    }
    return data.logs;
  } catch {
    return [];
  }
}

export async function appendToWeeklyLog(
  date: string,
  outfitIds: string[]
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const now = new Date();
  const weekKey = getWeekKey(now);

  let logs: WeeklyOutfitLog[] = [];
  try {
    const raw = await readFile(LOG_FILE, "utf-8");
    const data = JSON.parse(raw) as StoredLog;
    if (data.weekKey === weekKey) {
      logs = data.logs;
    }
  } catch {
    logs = [];
  }

  const existing = logs.find((l) => l.date === date);
  const ids = [...new Set([...(existing?.outfitIds ?? []), ...outfitIds])];
  if (existing) {
    existing.outfitIds = ids;
  } else {
    logs.push({ date, outfitIds: ids });
  }
  logs.sort((a, b) => a.date.localeCompare(b.date));

  await writeFile(LOG_FILE, JSON.stringify({ weekKey, logs }, null, 2));
}

export async function resetWeeklyLogIfNewWeek(): Promise<boolean> {
  try {
    const raw = await readFile(LOG_FILE, "utf-8");
    const data = JSON.parse(raw) as StoredLog;
    if (isNewWeek(new Date(), data.weekKey)) {
      await writeFile(LOG_FILE, JSON.stringify({ weekKey: getWeekKey(new Date()), logs: [] }));
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

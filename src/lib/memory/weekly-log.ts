/**
 * Weekly outfit memory - tracks what was worn Mon-Sun.
 * Resets every Sunday.
 */

import type { WeeklyOutfitLog } from "@/lib/types";

const MEMORY_KEY = "fashion_assistant_weekly_log";

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

export interface MemoryStore {
  getWeeklyLog(): Promise<WeeklyOutfitLog[]>;
  appendToLog(date: string, outfitIds: string[]): Promise<void>;
  resetIfNewWeek(): Promise<boolean>;
}

export function createLocalMemoryStore(): MemoryStore {
  return {
    async getWeeklyLog(): Promise<WeeklyOutfitLog[]> {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(MEMORY_KEY);
        if (raw) {
          try {
            const data = JSON.parse(raw) as {
              weekKey: string;
              logs: WeeklyOutfitLog[];
            };
            if (isNewWeek(new Date(), data.weekKey)) {
              return [];
            }
            return data.logs;
          } catch {
            return [];
          }
        }
      }
      return [];
    },

    async appendToLog(date: string, outfitIds: string[]): Promise<void> {
      if (typeof window !== "undefined") {
        const now = new Date();
        const weekKey = getWeekKey(now);
        const raw = localStorage.getItem(MEMORY_KEY);
        let logs: WeeklyOutfitLog[] = [];
        if (raw) {
          try {
            const data = JSON.parse(raw) as { weekKey: string; logs: WeeklyOutfitLog[] };
            if (data.weekKey === weekKey) {
              logs = data.logs;
            }
          } catch {
            logs = [];
          }
        }
        const existing = logs.find((l) => l.date === date);
        const ids = [...new Set([...(existing?.outfitIds ?? []), ...outfitIds])];
        if (existing) {
          existing.outfitIds = ids;
        } else {
          logs.push({ date, outfitIds: ids });
        }
        logs.sort((a, b) => a.date.localeCompare(b.date));
        localStorage.setItem(
          MEMORY_KEY,
          JSON.stringify({ weekKey, logs })
        );
      }
    },

    async resetIfNewWeek(): Promise<boolean> {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(MEMORY_KEY);
        if (raw) {
          try {
            const data = JSON.parse(raw) as { weekKey: string };
            if (isNewWeek(new Date(), data.weekKey)) {
              localStorage.removeItem(MEMORY_KEY);
              return true;
            }
          } catch {
            return false;
          }
        }
      }
      return false;
    },
  };
}

/**
 * Server-side weekly outfit memory store.
 * Reads/writes Firestore: users/{uid}/weeklyLog/{weekKey}
 */

import type { WeeklyOutfitLog } from "@/lib/types";
import { db } from "@/lib/firebase/admin";

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export async function getWeeklyLog(uid: string): Promise<WeeklyOutfitLog[]> {
  const weekKey = getWeekKey(new Date());
  const docRef = db
    .collection("users")
    .doc(uid)
    .collection("weeklyLog")
    .doc(weekKey);
  const snap = await docRef.get();
  if (!snap.exists) return [];
  const data = snap.data();
  return Array.isArray(data?.logs) ? data.logs : [];
}

export async function appendToWeeklyLog(
  uid: string,
  date: string,
  outfitIds: string[],
): Promise<void> {
  const weekKey = getWeekKey(new Date());
  const docRef = db
    .collection("users")
    .doc(uid)
    .collection("weeklyLog")
    .doc(weekKey);

  const snap = await docRef.get();
  let logs: WeeklyOutfitLog[] = [];
  if (snap.exists) {
    const data = snap.data();
    logs = Array.isArray(data?.logs) ? data.logs : [];
  }

  const existing = logs.find((l) => l.date === date);
  const ids = Array.from(new Set([...(existing?.outfitIds ?? []), ...outfitIds]));
  if (existing) {
    existing.outfitIds = ids;
  } else {
    logs.push({ date, outfitIds: ids });
  }
  logs.sort((a, b) => a.date.localeCompare(b.date));

  await docRef.set({ weekKey, logs }, { merge: true });
}

export async function resetWeeklyLogIfNewWeek(uid: string): Promise<boolean> {
  const weekKey = getWeekKey(new Date());
  const docRef = db
    .collection("users")
    .doc(uid)
    .collection("weeklyLog")
    .doc(weekKey);

  const snap = await docRef.get();
  if (!snap.exists) return false;
  const data = snap.data();
  if (data?.weekKey !== weekKey) {
    await docRef.set({ weekKey, logs: [] });
    return true;
  }
  return false;
}

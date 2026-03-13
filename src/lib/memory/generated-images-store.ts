/**
 * Server-side store for generated outfit images.
 * Reads/writes Firestore: users/{uid}/generatedImages/{genId}
 */

import type { GeneratedImageRecord } from "@/lib/types";
import { db } from "@/lib/firebase/admin";

function userGenCol(uid: string) {
  return db.collection("users").doc(uid).collection("generatedImages");
}

export async function getGeneratedImages(
  uid: string,
): Promise<GeneratedImageRecord[]> {
  const snap = await userGenCol(uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GeneratedImageRecord);
}

export async function appendGeneratedImage(
  uid: string,
  record: GeneratedImageRecord,
): Promise<void> {
  await userGenCol(uid).doc(record.id).set(record);
}

export async function getGeneratedImageById(
  uid: string,
  id: string,
): Promise<GeneratedImageRecord | null> {
  const snap = await userGenCol(uid).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as GeneratedImageRecord;
}

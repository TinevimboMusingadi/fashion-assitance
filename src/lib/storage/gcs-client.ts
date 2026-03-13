/**
 * Google Cloud Storage client for Dripcheck.
 * Handles uploading/downloading wardrobe images, generated outfits, and profile photos.
 */

import { Storage } from "@google-cloud/storage";

const BUCKET_WARDROBES = process.env.GCS_BUCKET_WARDROBES ?? "dripcheck-wardrobes";
const BUCKET_GENERATED = process.env.GCS_BUCKET_GENERATED ?? "dripcheck-generated";
const BUCKET_PROFILES = process.env.GCS_BUCKET_PROFILES ?? "dripcheck-profiles";

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (_storage) return _storage;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  _storage = credPath
    ? new Storage({ keyFilename: credPath })
    : new Storage();
  return _storage;
}

export type BucketType = "wardrobes" | "generated" | "profiles";

function bucketName(type: BucketType): string {
  switch (type) {
    case "wardrobes": return BUCKET_WARDROBES;
    case "generated": return BUCKET_GENERATED;
    case "profiles": return BUCKET_PROFILES;
  }
}

function userPath(uid: string, type: BucketType, filename: string): string {
  const subdir = type === "wardrobes" ? "wardrobe"
    : type === "generated" ? "generated"
    : "photos";
  return `users/${uid}/${subdir}/${filename}`;
}

export async function uploadFile(
  uid: string,
  type: BucketType,
  filename: string,
  data: Buffer,
  contentType: string = "image/png",
): Promise<{ storagePath: string; publicUrl: string }> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName(type));
  const storagePath = userPath(uid, type, filename);
  const file = bucket.file(storagePath);

  await file.save(data, { contentType, resumable: false });

  const publicUrl = `https://storage.googleapis.com/${bucketName(type)}/${storagePath}`;
  return { storagePath, publicUrl };
}

export async function getSignedUrl(
  type: BucketType,
  storagePath: string,
  expiresInMinutes: number = 60,
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName(type));
  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

export async function downloadFile(
  type: BucketType,
  storagePath: string,
): Promise<Buffer> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName(type));
  const file = bucket.file(storagePath);
  const [contents] = await file.download();
  return contents;
}

export async function deleteFile(
  type: BucketType,
  storagePath: string,
): Promise<void> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName(type));
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}

export async function listFiles(
  uid: string,
  type: BucketType,
): Promise<string[]> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName(type));
  const prefix = `users/${uid}/`;
  const [files] = await bucket.getFiles({ prefix });
  return files.map((f) => f.name);
}

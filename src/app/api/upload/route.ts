import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { uploadFile, type BucketType } from "@/lib/storage/gcs-client";
import { db } from "@/lib/firebase/admin";
import type { ClothingCategory, ClothingMetadata } from "@/lib/types";

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const bucket = (formData.get("bucket") as string) ?? "wardrobes";
    const categoryField =
      (formData.get("category") as string | null) ??
      (formData.get("category_file") as string | null) ??
      "top";

    const results: {
      filename: string;
      publicUrl: string;
      storagePath: string;
    }[] = [];

    const entries = Array.from(formData.entries());
    for (const [key, value] of entries) {
      if (!(value instanceof File)) continue;

      const buffer = Buffer.from(await value.arrayBuffer());
      const { storagePath, publicUrl } = await uploadFile(
        auth.uid,
        bucket as BucketType,
        value.name,
        buffer,
        value.type || "image/png",
      );
      results.push({ filename: value.name, publicUrl, storagePath });

      // When uploading wardrobe items, also create a basic Firestore record
      if (bucket === "wardrobes") {
        const fileKey = key;
        const perFileCategory =
          (formData.get(`category_${fileKey}`) as string | null) ??
          categoryField;
        const category = (perFileCategory || "top") as ClothingCategory;

        const baseName = value.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim();
        const id = value.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_");

        const meta: ClothingMetadata = {
          id,
          name: baseName || "Untitled item",
          category,
          subCategory: undefined,
          color: "unknown",
          colors: [],
          occasion: ["casual"],
          style: [],
          imageUrl: publicUrl,
          storagePath,
          createdAt: new Date().toISOString(),
          tags: [],
        };

        await db
          .collection("users")
          .doc(auth.uid)
          .collection("wardrobe")
          .doc(id)
          .set(meta, { merge: true });
      }
    }

    return NextResponse.json({ uploaded: results.length, files: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

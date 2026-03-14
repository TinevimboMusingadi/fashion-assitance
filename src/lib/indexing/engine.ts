/**
 * Indexing engine - uses Gemini Vision to classify garments.
 * Stores metadata in Firestore and images in GCS.
 */

import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/firebase/admin";
import { uploadFile } from "@/lib/storage/gcs-client";
import type {
  ClothingMetadata,
  ClothingCategory,
  PersonPhotoMetadata,
} from "@/lib/types";

interface GeminiClassification {
  name: string;
  color: string;
  colors: string[];
  occasion: string[];
  style: string[];
  tags?: string[];
}

async function classifyWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  category: ClothingCategory,
  apiKey: string,
): Promise<GeminiClassification> {
  const base64 = imageBuffer.toString("base64");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Look at this clothing image. The category is: ${category}.
Return ONLY valid JSON, no other text:
{
  "name": "descriptive name of the garment",
  "color": "primary color",
  "colors": ["primary", "secondary if any"],
  "occasion": ["casual"|"formal"|"business"|"athletic"|"party"|"beach"|"evening"],
  "style": ["2-3 style descriptors"],
  "tags": ["relevant keywords"]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ],
  });

  const text = (response as { text?: string }).text;
  if (!text) {
    return {
      name: "Unknown garment",
      color: "unknown",
      colors: [],
      occasion: ["casual"],
      style: [],
      tags: [],
    };
  }

  const cleaned = text
    .replace(/```json\s?/g, "")
    .replace(/```\s?/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as GeminiClassification;
  } catch {
    return {
      name: "Unknown garment",
      color: "unknown",
      colors: [],
      occasion: ["casual"],
      style: [],
      tags: [],
    };
  }
}

export interface IndexableItem {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  category: ClothingCategory;
}

export interface IndexablePersonPhoto {
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

export async function indexClothesFromUploads(
  uid: string,
  items: IndexableItem[],
  apiKey: string,
): Promise<ClothingMetadata[]> {
  const wardrobeCol = db
    .collection("users")
    .doc(uid)
    .collection("wardrobe");
  const catalog: ClothingMetadata[] = [];
  const now = new Date().toISOString();

  function inferSubCategory(
    category: ClothingCategory,
    name: string,
    style: string[],
    tags?: string[],
  ): string | undefined {
    const haystack = [
      name.toLowerCase(),
      ...style.map((s) => s.toLowerCase()),
      ...(tags ?? []).map((t) => t.toLowerCase()),
    ].join(" ");

    if (category === "bottom") {
      if (haystack.match(/\b(jeans?|denim)\b/)) return "jeans";
      if (haystack.match(/\b(cargo|utility)\b/)) return "cargo pants";
      if (haystack.match(/\b(chinos?|khakis?)\b/)) return "chinos";
      if (haystack.match(/\b(shorts?)\b/)) return "shorts";
      if (haystack.match(/\b(track|jogger|sweatpants?)\b/)) {
        return "track pants";
      }
      if (haystack.match(/\b(leggings?)\b/)) return "leggings";
      return "other bottoms";
    }

    if (category === "top" || category === "outerwear") {
      if (haystack.match(/\b(t[- ]?shirt|tee|graphic tee)\b/)) {
        return "t-shirt";
      }
      if (haystack.match(/\b(tank|singlet|camisole)\b/)) {
        return "tank top";
      }
      if (haystack.match(/\b(hoodie|hooded)\b/)) return "hoodie";
      if (haystack.match(/\b(sweater|jumper|knit)\b/)) return "sweater";
      if (haystack.match(/\b(cardigan)\b/)) return "cardigan";
      if (haystack.match(/\b(shirt|button[- ]?down|oxford)\b/)) {
        return "shirt";
      }
      if (haystack.match(/\b(blouse)\b/)) return "blouse";
      return "other tops";
    }

    return undefined;
  }

  for (const item of items) {
    const classification = await classifyWithGemini(
      item.buffer,
      item.mimeType,
      item.category,
      apiKey,
    );

    const { storagePath, publicUrl } = await uploadFile(
      uid,
      "wardrobes",
      item.filename,
      item.buffer,
      item.mimeType,
    );

    const id = item.filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const subCategory = inferSubCategory(
      item.category,
      classification.name,
      Array.isArray(classification.style) ? classification.style : [],
      classification.tags,
    );

    const meta: ClothingMetadata = {
      id,
      name: classification.name,
      category: item.category,
      color: classification.color ?? "unknown",
      colors: Array.isArray(classification.colors)
        ? classification.colors
        : [],
      occasion: (classification.occasion ?? []).filter((o) =>
        [
          "casual",
          "formal",
          "business",
          "athletic",
          "party",
          "beach",
          "evening",
        ].includes(o),
      ) as ClothingMetadata["occasion"],
      style: Array.isArray(classification.style)
        ? classification.style
        : [],
      imageUrl: publicUrl,
      storagePath,
      createdAt: now,
      tags: classification.tags,
    };

    if (subCategory) {
      (meta as ClothingMetadata).subCategory = subCategory;
    }

    await wardrobeCol.doc(id).set(meta);
    catalog.push(meta);
  }

  return catalog;
}

export async function indexPersonPhotos(
  uid: string,
  photos: IndexablePersonPhoto[],
): Promise<PersonPhotoMetadata[]> {
  const result: PersonPhotoMetadata[] = [];
  for (const photo of photos) {
    const { storagePath, publicUrl } = await uploadFile(
      uid,
      "profiles",
      photo.filename,
      photo.buffer,
      photo.mimeType,
    );
    const id = photo.filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    result.push({ id, path: storagePath, imageUrl: publicUrl });
  }

  await db
    .collection("users")
    .doc(uid)
    .set({ personPhotos: result }, { merge: true });

  return result;
}

export async function getUserWardrobe(
  uid: string,
): Promise<ClothingMetadata[]> {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("wardrobe")
    .get();
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as ClothingMetadata,
  );
}

export async function getUserPersonPhotos(
  uid: string,
): Promise<PersonPhotoMetadata[]> {
  const userDoc = await db.collection("users").doc(uid).get();
  const data = userDoc.data();
  return Array.isArray(data?.personPhotos) ? data.personPhotos : [];
}

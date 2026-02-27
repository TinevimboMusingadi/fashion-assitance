/**
 * Indexing engine - scans data/ folder and uses Gemini to classify each garment.
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, resolve, extname, basename, relative } from "path";
import { GoogleGenAI } from "@google/genai";
import type {
  ClothingMetadata,
  ClothingCategory,
  PersonPhotoMetadata,
} from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data");
const CATALOG_PATH = join(DATA_DIR, "catalog.json");

const FOLDER_TO_CATEGORY: Record<string, ClothingCategory> = {
  "baggy jeans": "bottom",
  "bottom and kaggle": "bottom",
  shorts: "bottom",
  sweaters: "top",
  sneakers: "shoes",
  slides: "shoes",
  socks: "socks",
};

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const SKIP_FILES = new Set(["catalog.json", "weekly-log.json", "person-photos.json"]);
const PERSON_PHOTOS_PATH = join(DATA_DIR, "person-photos.json");

function isImageFile(name: string): boolean {
  return IMAGE_EXTS.has(extname(name).toLowerCase());
}

function pathToId(relativePath: string): string {
  return relativePath
    .replace(/[/\\]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

async function listPersonPhotos(): Promise<PersonPhotoMetadata[]> {
  const meDir = join(DATA_DIR, "me");
  const result: PersonPhotoMetadata[] = [];
  try {
    const files = await readdir(meDir);
    for (const file of files) {
      if (!isImageFile(file)) continue;
      const relativePath = `me/${file}`.replace(/\\/g, "/");
      const id = pathToId(relativePath);
      result.push({
        id,
        path: relativePath,
        imageUrl: `/api/image?path=${encodeURIComponent(relativePath)}`,
      });
    }
  } catch {
    // data/me/ may not exist
  }
  return result;
}

async function listClothingImages(): Promise<{ path: string; category: ClothingCategory }[]> {
  const result: { path: string; category: ClothingCategory }[] = [];
  const entries = await readdir(DATA_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_FILES.has(entry.name)) continue;
    if (!entry.isDirectory()) continue;

    const folderName = entry.name.toLowerCase();
    if (folderName === "me") continue;

    const category = FOLDER_TO_CATEGORY[folderName];
    if (!category) continue;

    const folderPath = join(DATA_DIR, entry.name);
    const files = await readdir(folderPath);

    for (const file of files) {
      if (!isImageFile(file)) continue;
      const fullPath = resolve(join(folderPath, file));
      result.push({
        path: fullPath,
        category,
      });
    }
  }

  return result;
}

interface GeminiClassification {
  name: string;
  color: string;
  colors: string[];
  occasion: string[];
  style: string[];
  tags?: string[];
}

async function classifyWithGemini(
  imagePath: string,
  category: ClothingCategory,
  apiKey: string
): Promise<GeminiClassification> {
  const buffer = await readFile(imagePath);
  const base64 = buffer.toString("base64");
  const ext = extname(imagePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Look at this clothing image. The folder suggests category: ${category}.
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
      {
        inlineData: {
          mimeType: mime,
          data: base64,
        },
      },
    ],
  });

  const text = (response as { text?: string }).text;
  if (!text) {
    return {
      name: basename(imagePath, extname(imagePath)),
      color: "unknown",
      colors: [],
      occasion: ["casual"],
      style: [],
      tags: [],
    };
  }

  const cleaned = text.replace(/```json\s?/g, "").replace(/```\s?/g, "").trim();
  try {
    return JSON.parse(cleaned) as GeminiClassification;
  } catch {
    return {
      name: basename(imagePath, extname(imagePath)),
      color: "unknown",
      colors: [],
      occasion: ["casual"],
      style: [],
      tags: [],
    };
  }
}

export async function indexClothes(apiKey: string): Promise<ClothingMetadata[]> {
  const [clothingImages, personPhotos] = await Promise.all([
    listClothingImages(),
    listPersonPhotos(),
  ]);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PERSON_PHOTOS_PATH, JSON.stringify(personPhotos, null, 2));

  const catalog: ClothingMetadata[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < clothingImages.length; i++) {
    const { path: fullPath, category } = clothingImages[i];
    const relativePath = relative(DATA_DIR, fullPath).replace(/\\/g, "/");
    const id = pathToId(relativePath);

    const classification = await classifyWithGemini(fullPath, category, apiKey);

    catalog.push({
      id,
      name: classification.name,
      category,
      color: classification.color ?? "unknown",
      colors: Array.isArray(classification.colors) ? classification.colors : [],
      occasion: (classification.occasion ?? []).filter((o) =>
        ["casual", "formal", "business", "athletic", "party", "beach", "evening"].includes(o)
      ) as ClothingMetadata["occasion"],
      style: Array.isArray(classification.style) ? classification.style : [],
      imageUrl: `/api/image?path=${encodeURIComponent(relativePath)}`,
      createdAt: now,
      tags: classification.tags,
    });
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  return catalog;
}

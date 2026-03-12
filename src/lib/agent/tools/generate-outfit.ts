/**
 * Generate Full Outfit Tool - Renders user wearing the selected outfit.
 * Uses Nano Banana (Gemini 3.1 Flash Image) for virtual try-on.
 */

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join, resolve } from "path";
import { GoogleGenAI } from "@google/genai";
import type { ClothingMetadata } from "@/lib/types";
import { appendGeneratedImage } from "@/lib/memory/generated-images-store";

const DATA_DIR = join(process.cwd(), "data");
const GENERATED_DIR = join(DATA_DIR, "generated");
const PERSON_PHOTOS_PATH = join(DATA_DIR, "person-photos.json");

function parseImagePath(urlOrPath: string): string | null {
  if (!urlOrPath?.trim()) return null;
  if (urlOrPath.startsWith("/api/image?path=")) {
    const match = urlOrPath.match(/path=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return urlOrPath.replace(/^\/+/, "");
}

function pathToFileSystem(pathParam: string): string {
  const clean = pathParam.replace(/^data\/?/, "");
  return resolve(join(DATA_DIR, clean));
}

async function getDefaultPersonImage(): Promise<string> {
  try {
    const raw = await readFile(PERSON_PHOTOS_PATH, "utf-8");
    const photos = JSON.parse(raw) as { path: string }[];
    if (Array.isArray(photos) && photos.length > 0) {
      const first = photos[0];
      const fsPath = resolve(join(DATA_DIR, first.path));
      return fsPath;
    }
  } catch {
    // Fallback to directory scan
  }
  const meDir = join(DATA_DIR, "me");
  try {
    const files = await readdir(meDir);
    const image = files.find((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (image) return join(meDir, image);
  } catch {
    // No person photos
  }
  return "";
}

async function loadImageAsBase64(filePath: string): Promise<{ data: string; mime: string }> {
  const buffer = await readFile(filePath);
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
  const mime = [".jpg", ".jpeg"].includes(ext) ? "image/jpeg" : "image/png";
  return { data: buffer.toString("base64"), mime };
}

export type LogCallback = (message: string) => void;

export interface GenerateOutfitInput {
  basePhotoUrl?: string;
  outfit: {
    tops: ClothingMetadata[];
    bottoms: ClothingMetadata[];
    shoes?: ClothingMetadata[];
    accessories?: ClothingMetadata[];
    socks?: ClothingMetadata[];
  };
}

export interface GenerateOutfitResult {
  imageUrls: string[];
  success: boolean;
  message?: string;
  /** @deprecated Use imageUrls[0] instead. Kept for backward compat. */
  imageUrl: string;
}

async function generateSingleOutfit(
  ai: InstanceType<typeof GoogleGenAI>,
  personImg: { data: string; mime: string },
  personPath: string,
  outfitItems: ClothingMetadata[],
  label: string,
  sendLog: LogCallback,
): Promise<{ imageUrl: string; success: boolean; message?: string }> {
  const outfitImages: { data: string; mime: string; name: string }[] = [];
  for (const item of outfitItems) {
    const p = parseImagePath(item.imageUrl);
    if (p) {
      const fp = pathToFileSystem(p);
      sendLog(`  [IMG] ${item.name} (${item.category}) -> ${fp}`);
      outfitImages.push({ ...(await loadImageAsBase64(fp)), name: item.name });
    }
  }

  if (outfitImages.length === 0) {
    sendLog(`  [SKIP] ${label}: no valid images found for items`);
    return { imageUrl: "", success: false, message: "No valid item images" };
  }

  const itemList = outfitImages.map((img) => img.name).join(", ");
  const prompt = [
    "Create a photorealistic full-body fashion photo of the person in the",
    "first image wearing EXACTLY these clothing items:",
    itemList + ".",
    "The person should be standing in a neutral pose.",
    "Preserve the person's face and body accurately.",
    "Combine the outfit pieces naturally. Professional e-commerce style.",
  ].join(" ");

  sendLog(`  [PROMPT] ${prompt.slice(0, 120)}...`);
  sendLog(`  [MODEL] Sending 1 person photo + ${outfitImages.length} clothing images`);

  const contents: object[] = [
    { text: prompt },
    { inlineData: { mimeType: personImg.mime, data: personImg.data } },
    ...outfitImages.map((img) => ({
      inlineData: { mimeType: img.mime, data: img.data },
    })),
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "3:4", imageSize: "2K" },
    },
  });

  const parts = (response as { candidates?: { content?: { parts?: unknown[] } }[] })
    ?.candidates?.[0]?.content?.parts ?? [];
  let imageBase64: string | null = null;

  for (const part of parts) {
    const p = part as { inlineData?: { data?: string; mimeType?: string } };
    if (p?.inlineData?.data) {
      imageBase64 = p.inlineData.data;
      break;
    }
  }

  if (!imageBase64) {
    sendLog(`  [FAIL] ${label}: model returned no image`);
    return { imageUrl: "", success: false, message: "No image generated" };
  }

  await mkdir(GENERATED_DIR, { recursive: true });
  const timestamp = Date.now();
  const filename = `outfit-${timestamp}.png`;
  const outPath = join(GENERATED_DIR, filename);
  await writeFile(outPath, Buffer.from(imageBase64, "base64"));
  sendLog(`  [SAVED] ${outPath}`);

  const relativePath = `generated/${filename}`;
  const imageUrl = `/api/image?path=${encodeURIComponent(relativePath)}`;

  await appendGeneratedImage({
    id: `gen-${timestamp}`,
    imageUrl,
    filePath: relativePath,
    createdAt: new Date().toISOString(),
    outfitItems: outfitItems.map((item) => ({
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl,
    })),
    personPhoto: personPath,
    prompt,
  });
  sendLog(`  [STORED] Record saved to generated-images.json`);

  return { imageUrl, success: true, message: `Generated: ${label}` };
}

export async function generateOutfitImage(
  input: GenerateOutfitInput,
  sendLog: LogCallback = () => {},
): Promise<GenerateOutfitResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      imageUrl: "",
      imageUrls: [],
      success: false,
      message: "GEMINI_API_KEY required for image generation",
    };
  }

  const { tops, bottoms, shoes, accessories, socks } = input.outfit;
  const sharedItems = [
    ...bottoms,
    ...(shoes ?? []),
    ...(accessories ?? []),
    ...(socks ?? []),
  ].filter((i) => i?.imageUrl);

  const validTops = tops.filter((i) => i?.imageUrl);
  if (validTops.length === 0 && sharedItems.length === 0) {
    return {
      imageUrl: "",
      imageUrls: [],
      success: false,
      message: "No outfit items with images provided",
    };
  }

  let personPath = input.basePhotoUrl
    ? pathToFileSystem(parseImagePath(input.basePhotoUrl) ?? "")
    : await getDefaultPersonImage();

  if (!personPath) {
    return {
      imageUrl: "",
      imageUrls: [],
      success: false,
      message: "No person/base photo found. Add images to data/me/",
    };
  }

  sendLog(`[GENERATE] Person photo: ${personPath}`);
  sendLog(`[GENERATE] Tops: ${validTops.map((t) => t.name).join(", ") || "none"}`);
  sendLog(`[GENERATE] Shared items: ${sharedItems.map((i) => `${i.name} (${i.category})`).join(", ") || "none"}`);

  try {
    const personImg = await loadImageAsBase64(personPath);
    const ai = new GoogleGenAI({ apiKey });
    const imageUrls: string[] = [];

    if (validTops.length <= 1) {
      sendLog("[GENERATE] Single outfit - 1 image generation call");
      const allItems = [...validTops, ...sharedItems];
      const res = await generateSingleOutfit(
        ai, personImg, personPath, allItems, "Outfit", sendLog,
      );
      if (res.success) imageUrls.push(res.imageUrl);
      else {
        return { imageUrl: "", imageUrls: [], success: false, message: res.message };
      }
    } else {
      sendLog(`[GENERATE] ${validTops.length} tops found -> generating ${validTops.length} separate outfit images`);
      for (let i = 0; i < validTops.length; i++) {
        const top = validTops[i];
        const label = `Outfit ${i + 1}: ${top.name}`;
        sendLog(`[GENERATE] --- ${label} ---`);
        const items = [top, ...sharedItems];
        const res = await generateSingleOutfit(
          ai, personImg, personPath, items, label, sendLog,
        );
        if (res.success) imageUrls.push(res.imageUrl);
        else sendLog(`  [WARN] ${label} generation failed: ${res.message}`);
      }
    }

    if (imageUrls.length === 0) {
      return {
        imageUrl: "",
        imageUrls: [],
        success: false,
        message: "All outfit image generations failed",
      };
    }

    sendLog(`[GENERATE] Done. ${imageUrls.length} outfit image(s) created.`);
    return {
      imageUrl: imageUrls[0],
      imageUrls,
      success: true,
      message: `Generated ${imageUrls.length} outfit image(s)`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    sendLog(`[GENERATE] ERROR: ${msg}`);
    return {
      imageUrl: "",
      imageUrls: [],
      success: false,
      message: msg,
    };
  }
}

export const GENERATE_OUTFIT_SCHEMA = {
  name: "generate_outfit_image",
  description:
    "Generate a photo of the user wearing the suggested outfit. " +
    "Requires base photo of user and selected clothing items. " +
    "Use after plan_outfit or when user wants to visualize an outfit.",
  parameters: {
    type: "object",
    properties: {
      basePhotoUrl: {
        type: "string",
        description: "URL or path to user's base/standalone photo",
      },
      outfit: {
        type: "object",
        description: "Selected outfit from plan_outfit or search_clothes",
        properties: {
          tops: { type: "array", items: { type: "object" } },
          bottoms: { type: "array", items: { type: "object" } },
          shoes: { type: "array", items: { type: "object" } },
          accessories: { type: "array", items: { type: "object" } },
          socks: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
};

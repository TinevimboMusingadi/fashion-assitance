/**
 * Generate Full Outfit Tool - Renders user wearing the selected outfit.
 * Uses Nano Banana (Gemini 3.1 Flash Image) for virtual try-on.
 */

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join, resolve } from "path";
import { GoogleGenAI } from "@google/genai";
import type { ClothingMetadata } from "@/lib/types";

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
  imageUrl: string;
  success: boolean;
  message?: string;
}

export async function generateOutfitImage(
  input: GenerateOutfitInput
): Promise<GenerateOutfitResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      imageUrl: "",
      success: false,
      message: "GEMINI_API_KEY required for image generation",
    };
  }

  const allItems = [
    ...input.outfit.tops,
    ...input.outfit.bottoms,
    ...(input.outfit.shoes ?? []),
    ...(input.outfit.accessories ?? []),
    ...(input.outfit.socks ?? []),
  ].filter((i) => i?.imageUrl);

  if (allItems.length === 0) {
    return {
      imageUrl: "",
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
      success: false,
      message: "No person/base photo found. Add images to data/me/",
    };
  }

  try {
    const personImg = await loadImageAsBase64(personPath);
    const outfitImages: { data: string; mime: string }[] = [];
    for (const item of allItems.slice(0, 10)) {
      const p = parseImagePath(item.imageUrl);
      if (p) {
        const fp = pathToFileSystem(p);
        outfitImages.push(await loadImageAsBase64(fp));
      }
    }

    const prompt = `Create a photorealistic full-body fashion photo of the person in the first image wearing the outfit shown in the reference clothing images. The person should be standing in a neutral pose. Preserve the person's face and body accurately. Combine the outfit pieces naturally. Professional e-commerce style.`;

    const contents: object[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType: personImg.mime,
          data: personImg.data,
        },
      },
      ...outfitImages.map((img) => ({
        inlineData: { mimeType: img.mime, data: img.data },
      })),
    ];

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "2K",
        },
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
      return {
        imageUrl: "",
        success: false,
        message: "No image generated",
      };
    }

    await mkdir(GENERATED_DIR, { recursive: true });
    const filename = `outfit-${Date.now()}.png`;
    const outPath = join(GENERATED_DIR, filename);
    await writeFile(outPath, Buffer.from(imageBase64, "base64"));

    const relativePath = `generated/${filename}`;
    return {
      imageUrl: `/api/image?path=${encodeURIComponent(relativePath)}`,
      success: true,
      message: "Outfit image generated",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return {
      imageUrl: "",
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

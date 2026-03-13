/**
 * Generate Full Outfit Tool - Renders user wearing the selected outfit.
 * Uses Gemini 3.1 Flash Image Preview for virtual try-on.
 * Stores generated images in GCS and metadata in Firestore.
 */

import { GoogleGenAI } from "@google/genai";
import type { ClothingMetadata } from "@/lib/types";
import { appendGeneratedImage } from "@/lib/memory/generated-images-store";
import { uploadFile, downloadFile } from "@/lib/storage/gcs-client";
import { getUserPersonPhotos } from "@/lib/indexing/engine";

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
  /** @deprecated Use imageUrls[0] instead. */
  imageUrl: string;
}

async function loadImageAsBase64FromUrl(
  url: string,
): Promise<{ data: string; mime: string }> {
  const resp = await fetch(url);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const ct = resp.headers.get("content-type") ?? "image/png";
  return { data: buffer.toString("base64"), mime: ct };
}

async function loadImageFromStorageOrUrl(
  imageUrl: string,
  storagePath?: string,
): Promise<{ data: string; mime: string }> {
  if (storagePath) {
    try {
      const bucketType = storagePath.includes("/wardrobe/")
        ? "wardrobes" as const
        : storagePath.includes("/generated/")
          ? "generated" as const
          : "profiles" as const;
      const buffer = await downloadFile(bucketType, storagePath);
      const ext = storagePath.toLowerCase().slice(storagePath.lastIndexOf("."));
      const mime = [".jpg", ".jpeg"].includes(ext)
        ? "image/jpeg"
        : "image/png";
      return { data: buffer.toString("base64"), mime };
    } catch {
      // Fall through to URL fetch
    }
  }
  return loadImageAsBase64FromUrl(imageUrl);
}

async function generateSingleOutfit(
  ai: InstanceType<typeof GoogleGenAI>,
  personImg: { data: string; mime: string },
  personPhotoRef: string,
  outfitItems: ClothingMetadata[],
  label: string,
  uid: string,
  sendLog: LogCallback,
): Promise<{ imageUrl: string; success: boolean; message?: string }> {
  const outfitImages: { data: string; mime: string; name: string }[] = [];
  for (const item of outfitItems) {
    if (item.imageUrl) {
      sendLog(`  [IMG] ${item.name} (${item.category})`);
      const img = await loadImageFromStorageOrUrl(
        item.imageUrl,
        item.storagePath,
      );
      outfitImages.push({ ...img, name: item.name });
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
  sendLog(
    `  [MODEL] Sending 1 person photo + ${outfitImages.length} clothing images`,
  );

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

  const parts =
    (
      response as {
        candidates?: { content?: { parts?: unknown[] } }[];
      }
    )?.candidates?.[0]?.content?.parts ?? [];
  let imageBase64: string | null = null;

  for (const part of parts) {
    const p = part as {
      inlineData?: { data?: string; mimeType?: string };
    };
    if (p?.inlineData?.data) {
      imageBase64 = p.inlineData.data;
      break;
    }
  }

  if (!imageBase64) {
    sendLog(`  [FAIL] ${label}: model returned no image`);
    return { imageUrl: "", success: false, message: "No image generated" };
  }

  const timestamp = Date.now();
  const filename = `outfit-${timestamp}.png`;
  const buffer = Buffer.from(imageBase64, "base64");

  const { storagePath, publicUrl } = await uploadFile(
    uid,
    "generated",
    filename,
    buffer,
    "image/png",
  );
  sendLog(`  [SAVED] ${storagePath}`);

  await appendGeneratedImage(uid, {
    id: `gen-${timestamp}`,
    imageUrl: publicUrl,
    filePath: storagePath,
    storagePath,
    createdAt: new Date().toISOString(),
    outfitItems: outfitItems.map((item) => ({
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl,
    })),
    personPhoto: personPhotoRef,
    prompt,
  });
  sendLog(`  [STORED] Record saved to Firestore`);

  const viewUrl = `/api/image?path=${encodeURIComponent(storagePath)}`;

  return {
    imageUrl: viewUrl,
    success: true,
    message: `Generated: ${label}`,
  };
}

export async function generateOutfitImage(
  input: GenerateOutfitInput,
  uid: string,
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

  // Resolve base photo:
  // 1) Prefer explicit input.basePhotoUrl (could be an external URL)
  // 2) Otherwise fall back to the first stored person photo for this user.
  let basePhotoUrl = input.basePhotoUrl;
  let baseStoragePath: string | undefined;
  if (!basePhotoUrl) {
    const photos = await getUserPersonPhotos(uid);
    if (photos.length > 0) {
      const first = photos[0];
      baseStoragePath = first.path;
      basePhotoUrl = first.imageUrl;
      sendLog(
        `[GENERATE] Using default base photo from profile: ${first.path ?? first.imageUrl}`,
      );
    }
  }

  const personPhotoRef = baseStoragePath ?? basePhotoUrl ?? "";
  let personImg: { data: string; mime: string };
  if (basePhotoUrl || baseStoragePath) {
    sendLog(
      `[GENERATE] Person photo: ${baseStoragePath ?? basePhotoUrl ?? "unknown"}`,
    );
    personImg = await loadImageFromStorageOrUrl(
      basePhotoUrl ?? "",
      baseStoragePath,
    );
  } else {
    return {
      imageUrl: "",
      imageUrls: [],
      success: false,
      message:
        "No person/base photo found. Please upload or set a base photo in your wardrobe.",
    };
  }

  sendLog(
    `[GENERATE] Tops: ${validTops.map((t) => t.name).join(", ") || "none"}`,
  );
  sendLog(
    `[GENERATE] Shared items: ${sharedItems.map((i) => `${i.name} (${i.category})`).join(", ") || "none"}`,
  );

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imageUrls: string[] = [];

    if (validTops.length <= 1) {
      sendLog("[GENERATE] Single outfit - 1 image generation call");
      const allItems = [...validTops, ...sharedItems];
      const res = await generateSingleOutfit(
        ai,
        personImg,
        personPhotoRef,
        allItems,
        "Outfit",
        uid,
        sendLog,
      );
      if (res.success) {
        imageUrls.push(res.imageUrl);
      } else {
        return {
          imageUrl: "",
          imageUrls: [],
          success: false,
          message: res.message,
        };
      }
    } else {
      sendLog(
        `[GENERATE] ${validTops.length} tops found -> generating ${validTops.length} separate outfit images`,
      );
      for (let i = 0; i < validTops.length; i++) {
        const top = validTops[i];
        const label = `Outfit ${i + 1}: ${top.name}`;
        sendLog(`[GENERATE] --- ${label} ---`);
        const items = [top, ...sharedItems];
        const res = await generateSingleOutfit(
          ai,
          personImg,
          personPhotoRef,
          items,
          label,
          uid,
          sendLog,
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

/**
 * Gemini agent orchestrator with tool execution.
 */

import { GoogleGenAI } from "@google/genai";
import {
  searchClothes,
  planOutfit,
  generateOutfitImage,
  CLOTH_SEARCH_SCHEMA,
  PLAN_OUTFIT_SCHEMA,
  GENERATE_OUTFIT_SCHEMA,
} from "./tools";
import type { ClothingMetadata, WeeklyOutfitLog } from "@/lib/types";
import type { GenerateOutfitInput, PlanOutfitResult } from "./tools";
import { getWeather, formatWeatherForAgent } from "@/lib/weather/client";
import {
  getWeeklyLog,
  appendToWeeklyLog,
  resetWeeklyLogIfNewWeek,
} from "@/lib/memory/server-store";

const DEFAULT_LAT = -33.8688;
const DEFAULT_LON = 18.4793;

export type LogCallback = (message: string) => void;
export type ImageUrlCallback = (url: string) => void;

function toGeminiToolSchema(schema: { name: string; description: string; parameters: object }) {
  return {
    name: schema.name,
    description: schema.description,
    parameters: schema.parameters,
  };
}

export async function runAgent(
  userMessage: string,
  catalog: ClothingMetadata[],
  onLog?: LogCallback,
  onImageUrl?: ImageUrlCallback
): Promise<string> {
  await resetWeeklyLogIfNewWeek();
  const weeklyLog = await getWeeklyLog();
  const weather = await getWeather(DEFAULT_LAT, DEFAULT_LON);
  const weatherContext = formatWeatherForAgent(weather);

  const functionDeclarations = [
    toGeminiToolSchema(CLOTH_SEARCH_SCHEMA),
    toGeminiToolSchema(PLAN_OUTFIT_SCHEMA),
    toGeminiToolSchema(GENERATE_OUTFIT_SCHEMA),
  ];

  const systemPrompt = `You are a personal fashion assistant. You help the user pick outfits based on their wardrobe.
Current weather context: ${weatherContext}
The user's weekly outfit log (what they've worn): ${JSON.stringify(weeklyLog)}
When suggesting outfits, consider the weather and avoid repeating recently worn items.
You have access to: search_clothes, plan_outfit, generate_outfit_image.

IMPORTANT: When the user asks what to wear, or when you suggest an outfit, you MUST:
1. Call plan_outfit to get the outfit suggestion.
2. Then IMMEDIATELY call generate_outfit_image with that outfit (pass the full outfit from plan_outfit, including tops, bottoms, shoes, etc). Do not skip this step.
The user wants to SEE themselves wearing the outfit. Always generate the image when suggesting what to wear.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Please set GEMINI_API_KEY in your environment. " +
        "Get a key at https://aistudio.google.com/apikey"
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const config = {
    tools: [{ functionDeclarations }],
  };

  const contents = [
    { role: "user", parts: [{ text: systemPrompt + "\n\nUser: " + userMessage }] },
  ];

  onLog?.("Processing your request...");

  if (!catalog.length) {
    return (
      "Your wardrobe catalog is empty. Click **Index Wardrobe** in the header " +
      "to scan and index your clothes from the data/ folder, then ask again."
    );
  }

  let response: unknown;
  try {
    response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents,
    config,
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "API error";
    return `Something went wrong: ${msg}. Check your GEMINI_API_KEY and try again.`;
  }

  let iterations = 0;
  const maxIterations = 8;
  let lastOutfitResult: PlanOutfitResult | null = null;
  let lastImageError: string | null = null;
  let imageGenerated = false;

  function extractText(res: unknown): string {
    const r = res as { text?: string; candidates?: { content?: { parts?: { text?: string }[] } }[] };
    if (r?.text?.trim()) return r.text.trim();
    const parts = r?.candidates?.[0]?.content?.parts ?? [];
    const textParts = parts
      .filter((p) => p?.text)
      .map((p) => (p as { text: string }).text)
      .join(" ")
      .trim();
    return textParts || "";
  }

  while (iterations < maxIterations) {
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      const text = extractText(response);
      if (lastOutfitResult && !imageGenerated && onImageUrl) {
        onLog?.("Generating outfit image...");
        const genResult = await generateOutfitImage({
          outfit: lastOutfitResult,
        });
        if (
          genResult &&
          typeof genResult === "object" &&
          (genResult as { imageUrl?: string }).imageUrl
        ) {
          imageGenerated = true;
          onImageUrl((genResult as { imageUrl: string }).imageUrl);
        } else if (genResult && typeof genResult === "object" && "message" in genResult) {
          lastImageError = (genResult as { message?: string }).message ?? null;
        }
      }
      if (text) return text;
      if (lastOutfitResult) {
        const items = [
          ...lastOutfitResult.tops.map((t) => t.name),
          ...lastOutfitResult.bottoms.map((b) => b.name),
          ...(lastOutfitResult.shoes ?? []).map((s) => s.name),
          ...(lastOutfitResult.socks ?? []).map((s) => s.name),
        ].filter(Boolean);
        const imgNote = items.length && !imageGenerated
          ? `\n\n(Image: ${lastImageError ?? "generation failed - run Index Wardrobe to index data/me/ photos"})`
          : "";
        return (
          `I suggest wearing: ${items.join(", ")}. ` +
          (lastOutfitResult.reason ?? "") +
          imgNote
        );
      }
      return "I couldn't generate a response. Try indexing your wardrobe first (Index Wardrobe button), and ensure you have photos in data/me/.";
    }

    const functionCall = functionCalls[0] as { name: string; args?: Record<string, unknown> };
    const { name, args = {} } = functionCall;
    onLog?.(`Calling tool: ${name}...`);

    let result: unknown;

    switch (name) {
      case "search_clothes":
        result = await searchClothes(catalog, args as Parameters<typeof searchClothes>[1]);
        break;
      case "plan_outfit":
        result = await planOutfit(
          catalog,
          weather,
          weeklyLog,
          (args ?? {}) as Parameters<typeof planOutfit>[3]
        );
        break;
      case "generate_outfit_image": {
        const genInput = (args ?? {}) as GenerateOutfitInput;
        if (
          lastOutfitResult &&
          (!genInput.outfit?.tops?.length || !genInput.outfit?.tops?.[0]?.imageUrl)
        ) {
          genInput.outfit = lastOutfitResult;
        }
        const genResult = await generateOutfitImage(genInput);
        result = genResult;
        if (
          genResult &&
          typeof genResult === "object" &&
          "imageUrl" in genResult &&
          (genResult as { imageUrl?: string }).imageUrl
        ) {
          lastImageError = null;
          imageGenerated = true;
          onImageUrl?.((genResult as { imageUrl: string }).imageUrl);
        } else if (genResult && typeof genResult === "object" && "message" in genResult) {
          lastImageError = (genResult as { message?: string }).message ?? "Image generation failed";
        }
        break;
      }
      default:
        result = { error: `Unknown tool: ${name}` };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (name === "plan_outfit" && result && typeof result === "object") {
      lastOutfitResult = result as PlanOutfitResult;
      const outfit = result as { tops?: { id: string }[]; bottoms?: { id: string }[] };
      const ids = [
        ...(outfit.tops?.map((t) => t.id) ?? []),
        ...(outfit.bottoms?.map((b) => b.id) ?? []),
      ];
      if (ids.length > 0) {
        await appendToWeeklyLog(today, ids);
      }
    }

    (contents as object[]).push({
      role: "model",
      parts: [{ functionCall: { name, args } }],
    });
    (contents as object[]).push({
      role: "user",
      parts: [{ functionResponse: { name, response: result } }],
    });

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API error";
      if (lastOutfitResult) {
        const items = [
          ...lastOutfitResult.tops.map((t) => t.name),
          ...lastOutfitResult.bottoms.map((b) => b.name),
        ].filter(Boolean);
        return `I suggest: ${items.join(", ")}. (API error during follow-up: ${msg})`;
      }
      return `Error: ${msg}`;
    }

    iterations++;
  }

  return "I reached the maximum number of steps. Please try again.";
}

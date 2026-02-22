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
import { getWeather, formatWeatherForAgent } from "@/lib/weather/client";
import {
  getWeeklyLog,
  appendToWeeklyLog,
  resetWeeklyLogIfNewWeek,
} from "@/lib/memory/server-store";

const DEFAULT_LAT = -33.8688;
const DEFAULT_LON = 18.4793;

export type LogCallback = (message: string) => void;

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
  onLog?: LogCallback
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
Be concise and helpful.`;

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

  let response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents,
    config,
  });

  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      const text = (response as { text?: string }).text;
      return text ?? "I couldn't generate a response.";
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
      case "generate_outfit_image":
        result = await generateOutfitImage((args ?? {}) as Parameters<typeof generateOutfitImage>[0]);
        break;
      default:
        result = { error: `Unknown tool: ${name}` };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (name === "plan_outfit" && result && typeof result === "object") {
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

    response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config,
    });

    iterations++;
  }

  return "I reached the maximum number of steps. Please try again.";
}

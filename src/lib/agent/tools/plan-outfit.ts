/**
 * Plan Outfit Tool - Suggests outfit based on weather, wardrobe, and memory.
 */

import type { ClothingMetadata, WeeklyOutfitLog } from "@/lib/types";
import { searchClothes } from "./cloth-search";
import type { WeatherData } from "@/lib/weather/client";

export interface PlanOutfitInput {
  occasion?: string;
  weatherContext?: string;
  excludeWornThisWeek?: boolean;
}

export interface PlanOutfitResult {
  tops: ClothingMetadata[];
  bottoms: ClothingMetadata[];
  shoes?: ClothingMetadata[];
  socks?: ClothingMetadata[];
  accessories?: ClothingMetadata[];
  reason?: string;
}

export async function planOutfit(
  catalog: ClothingMetadata[],
  weather: WeatherData,
  weeklyLog: WeeklyOutfitLog[],
  input: PlanOutfitInput
): Promise<PlanOutfitResult> {
  const wornIds = new Set(
    weeklyLog.flatMap((entry) => entry.outfitIds)
  );

  const isCold = weather.temperature < 18;
  const isHot = weather.temperature > 28;
  const isWet = weather.precipitation > 0 || weather.condition === "rainy";

  const occasion = input.occasion ?? "casual";

  let tops = await searchClothes(catalog, {
    category: "top",
    occasion,
    limit: 5,
  });

  let bottoms = await searchClothes(catalog, {
    category: "bottom",
    occasion,
    limit: 5,
  });

  let shoes = await searchClothes(catalog, {
    category: "shoes",
    occasion,
    limit: 3,
  });

  let socks = await searchClothes(catalog, {
    category: "socks",
    limit: 2,
  });

  const accessories = await searchClothes(catalog, {
    category: "accessory",
    occasion,
    limit: 3,
  });

  if (input.excludeWornThisWeek) {
    const filterWorn = <T extends { id: string }>(items: T[]) =>
      items.filter((i) => !wornIds.has(i.id));
    tops = filterWorn(tops);
    bottoms = filterWorn(bottoms);
    shoes = filterWorn(shoes);
    socks = filterWorn(socks);
  }

  const pickFirst = <T>(arr: T[]): T | undefined => arr[0];
  const pickFirstN = <T>(arr: T[], n: number): T[] => arr.slice(0, n);

  const result: PlanOutfitResult = {
    tops: pickFirstN(tops, 2),
    bottoms: pickFirstN(bottoms, 1),
    shoes: pickFirst(shoes) ? [pickFirst(shoes)!] : [],
    socks: pickFirst(socks) ? [pickFirst(socks)!] : [],
    accessories: pickFirstN(accessories, 1),
    reason: `Weather: ${weather.temperature}°C, ${weather.condition}. Occasion: ${occasion}.`,
  };

  return result;
}

export const PLAN_OUTFIT_SCHEMA = {
  name: "plan_outfit",
  description:
    "Plan an outfit based on current weather, occasion, and wardrobe. " +
    "Uses weekly memory to avoid suggesting recently worn items.",
  parameters: {
    type: "object",
    properties: {
      occasion: {
        type: "string",
        description: "Occasion: casual, formal, business, athletic, etc.",
      },
      weatherContext: {
        type: "string",
        description: "Optional additional weather context from user",
      },
      excludeWornThisWeek: {
        type: "boolean",
        description: "Exclude clothes worn this week (default true)",
      },
    },
  },
};

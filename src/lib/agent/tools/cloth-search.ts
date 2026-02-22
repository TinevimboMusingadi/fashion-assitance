/**
 * Cloth Search Tool - Mini search engine for the clothing catalog.
 * Searches by text query, color, occasion, and category.
 */

import type { ClothingMetadata } from "@/lib/types";

export interface ClothSearchInput {
  query?: string;
  color?: string;
  category?: string;
  occasion?: string;
  limit?: number;
}

export async function searchClothes(
  catalog: ClothingMetadata[],
  input: ClothSearchInput
): Promise<ClothingMetadata[]> {
  const { query, color, category, occasion, limit = 10 } = input;

  let results = [...catalog];

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q) ||
        item.colors.some((c) => c.toLowerCase().includes(q)) ||
        item.occasion.some((o) => o.toLowerCase().includes(q)) ||
        item.style.some((s) => s.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  if (color && color.trim()) {
    const c = color.toLowerCase().trim();
    results = results.filter(
      (item) =>
        item.color.toLowerCase().includes(c) ||
        item.colors.some((col) => col.toLowerCase().includes(c))
    );
  }

  if (category && category.trim()) {
    const cat = category.toLowerCase().trim();
    results = results.filter(
      (item) => item.category.toLowerCase() === cat || item.category === cat
    );
  }

  if (occasion && occasion.trim()) {
    const occ = occasion.toLowerCase().trim();
    results = results.filter((item) =>
      item.occasion.some((o) => o.toLowerCase().includes(occ))
    );
  }

  return results.slice(0, limit);
}

export const CLOTH_SEARCH_SCHEMA = {
  name: "search_clothes",
  description:
    "Search the clothing catalog by query, color, category, or occasion. " +
    "Use when the user wants to find specific clothes, browse wardrobe, " +
    "or when planning an outfit.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Free text search (name, style, tags)",
      },
      color: {
        type: "string",
        description: "Filter by color (e.g., blue, black, white)",
      },
      category: {
        type: "string",
        description: "Filter by category: top, bottom, dress, shoes, etc.",
      },
      occasion: {
        type: "string",
        description: "Filter by occasion: casual, formal, business, etc.",
      },
      limit: {
        type: "number",
        description: "Max results (default 10)",
      },
    },
  },
};

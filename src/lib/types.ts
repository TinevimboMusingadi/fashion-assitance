/**
 * Clothing item metadata schema for the fashion assistant catalog.
 * Stored alongside images in cloud storage (e.g., GCS).
 */

export type ClothingCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "accessory"
  | "socks"
  | "bag";

export type Occasion =
  | "casual"
  | "formal"
  | "business"
  | "athletic"
  | "party"
  | "beach"
  | "evening";

export interface ClothingMetadata {
  id: string;
  name: string;
  category: ClothingCategory;
  /**
   * Finer-grained grouping within a category, e.g.
   * bottom -> jeans / chinos / track-pants, top -> t-shirt / hoodie.
   */
  subCategory?: string;
  color: string;
  colors: string[];
  occasion: Occasion[];
  style: string[];
  imageUrl: string;
  storagePath?: string;
  createdAt: string;
  tags?: string[];
}

export interface OutfitSuggestion {
  tops: ClothingMetadata[];
  bottoms: ClothingMetadata[];
  shoes?: ClothingMetadata[];
  accessories?: ClothingMetadata[];
  socks?: ClothingMetadata[];
}

export interface WeeklyOutfitLog {
  date: string;
  outfitIds: string[];
}

export interface PersonPhotoMetadata {
  id: string;
  path: string;
  imageUrl: string;
}

export interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  filePath: string;
  storagePath?: string;
  createdAt: string;
  outfitItems: {
    name: string;
    category: string;
    imageUrl: string;
  }[];
  personPhoto: string;
  prompt: string;
}

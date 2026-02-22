/**
 * Local storage client for development.
 * Reads from data/ directory; can be populated with sample clothes.
 */

import type { ClothingMetadata } from "../types";
import type { StorageClient } from "./client";

const DATA_DIR = "data";

export function createLocalStorageClient(): StorageClient {
  return {
    async listClothes(): Promise<ClothingMetadata[]> {
      // In dev, read from local JSON or empty array
      try {
        const res = await fetch("/api/catalog");
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
      } catch {
        // Fallback: empty catalog
      }
      return [];
    },

    async getClothingMetadata(_id: string): Promise<ClothingMetadata | null> {
      return null;
    },

    async getImageUrl(path: string): Promise<string> {
      return `/api/storage/${encodeURIComponent(path)}`;
    },

    async putGeneratedImage(
      path: string,
      _data: Buffer | Blob
    ): Promise<string> {
      return `/generated/${path}`;
    },
  };
}

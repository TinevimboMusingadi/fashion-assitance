/**
 * Storage client interface for clothing catalog and generated images.
 * Implementations: GCS (production) or local filesystem (development).
 */

import type { ClothingMetadata } from "../types";

export interface StorageClient {
  listClothes(category?: string): Promise<ClothingMetadata[]>;
  getClothingMetadata(id: string): Promise<ClothingMetadata | null>;
  getImageUrl(path: string): Promise<string>;
  putGeneratedImage(path: string, data: Buffer | Blob): Promise<string>;
}

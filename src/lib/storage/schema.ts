/**
 * Storage bucket structure and metadata schema.
 *
 * GCS Bucket Layout:
 *   /clothes/{category}/{id}.jpg
 *   /clothes/{category}/{id}.metadata.json
 *   /generated/{timestamp}-{outfitId}.jpg
 *   /memory/weekly-log.json
 *   /memory/generated-images.json
 *   /user/base-photo.jpg
 */

export const STORAGE_PATHS = {
  clothes: "clothes",
  tops: "clothes/tops",
  bottoms: "clothes/bottoms",
  shoes: "clothes/shoes",
  accessories: "clothes/accessories",
  socks: "clothes/socks",
  generated: "generated",
  memory: "memory",
  userBasePhoto: "user/base-photo.jpg",
  weeklyLog: "memory/weekly-log.json",
  generatedImagesLog: "memory/generated-images.json",
} as const;

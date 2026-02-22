# Fashion Assistant

A personal fashion assistance agent that helps you pick outfits based on your wardrobe, weather, and preferences.

## Features

- **Cloth Search**: Search your clothing catalog by color, category, occasion
- **Plan Outfit**: Get outfit suggestions based on weather and weekly memory
- **Generate Outfit Image**: (Placeholder) Visualize you wearing suggested outfits via Imagen
- **Weekly Memory**: Tracks what you wore; resets every Sunday
- **Weather Integration**: Outfit suggestions consider current weather (Open-Meteo)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_key
   ```
   Get a key at [Google AI Studio](https://aistudio.google.com/apikey).

3. Add clothes to `data/catalog.json` (see types in `src/lib/types.ts` for schema).

4. Run the dev server:
   ```bash
   npm run dev
   ```

## Tech Stack

- Next.js 14, TypeScript, Tailwind CSS
- Gemini 2.0 Flash (agent + tools)
- Open-Meteo (weather)
- Local file storage (data/); production: GCS, Firestore

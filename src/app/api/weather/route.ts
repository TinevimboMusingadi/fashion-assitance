import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather/client";

const DEFAULT_LAT = -33.8688;
const DEFAULT_LON = 18.4793;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "") || DEFAULT_LAT;
  const lon = parseFloat(searchParams.get("lon") ?? "") || DEFAULT_LON;

  try {
    const weather = await getWeather(lat, lon);
    return NextResponse.json(weather);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

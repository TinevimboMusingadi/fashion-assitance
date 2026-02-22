import { NextRequest, NextResponse } from "next/server";

/**
 * Placeholder endpoint for generated outfit images.
 * In production, this would serve images from GCS or return Imagen output.
 */
export async function GET(request: NextRequest) {
  const outfit = request.nextUrl.searchParams.get("outfit") ?? "";
  return NextResponse.json({
    message: "Outfit image generation placeholder",
    outfit,
    note: "Wire up Imagen/virtual-try-on API for real images.",
  });
}

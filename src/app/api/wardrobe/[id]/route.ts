import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/verify-token";
import { db } from "@/lib/firebase/admin";
import type { ClothingCategory } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await verifyAuthToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      category?: ClothingCategory;
      subCategory?: string | null;
      tags?: string[];
    };

    const update: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim();
    }
    if (typeof body.category === "string") {
      update.category = body.category as ClothingCategory;
    }
    if (body.subCategory === null) {
      update.subCategory = null;
    } else if (typeof body.subCategory === "string") {
      update.subCategory = body.subCategory.trim() || null;
    }
    if (Array.isArray(body.tags)) {
      update.tags = body.tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: true });
    }

    await db
      .collection("users")
      .doc(auth.uid)
      .collection("wardrobe")
      .doc(id)
      .set(update, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


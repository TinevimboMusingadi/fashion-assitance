/**
 * Server-side helper to verify Firebase ID tokens from request headers.
 */

import { adminAuth } from "./admin";

export interface AuthResult {
  uid: string;
  email?: string;
}

export async function verifyAuthToken(
  request: Request,
): Promise<AuthResult | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: Request,
): Promise<AuthResult> {
  const result = await verifyAuthToken(request);
  if (!result) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return result;
}

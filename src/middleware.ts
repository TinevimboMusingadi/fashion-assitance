/**
 * Next.js middleware for route protection.
 * Checks for a Firebase session cookie / token on protected routes.
 *
 * In production, Firebase ID tokens are verified server-side. For the
 * middleware layer (Edge Runtime), we check for the presence of the
 * auth cookie set by the client after sign-in.
 */

import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon", "/assets/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next();
  }

  const session = request.cookies.get("__session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

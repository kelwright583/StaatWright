import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 deprecated the middleware file convention. The deprecated
// middleware was intercepting every admin navigation, calling getUser(),
// and its broken cookie handling caused the session to appear invalid —
// redirecting authenticated users back to login on every click.
//
// Auth protection is now handled entirely client-side by the admin
// layout's onAuthStateChange listener. Server components read cookies
// directly via lib/supabase/server.ts.
//
// TODO: migrate to the Next.js 16 "proxy" convention when ready.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

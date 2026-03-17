import { NextResponse, type NextRequest } from "next/server";

// Auth protection is handled in app/admin/layout.tsx
export async function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

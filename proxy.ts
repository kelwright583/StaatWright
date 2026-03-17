import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Create response once so refreshed auth cookies can be set on it
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — critical for cookie hand-off to browser
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Protect all /admin/* routes except /admin/login
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Redirect authenticated users away from login — preserve auth cookies on redirect
  if (pathname === "/admin/login" && user) {
    const redirectResponse = NextResponse.redirect(new URL("/admin/dashboard", request.url));
    response.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie.name, cookie.value)
    );
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

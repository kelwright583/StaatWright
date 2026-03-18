import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug: log every admin request (remove after fixing)
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  const hasSupabaseCookies = cookieNames.some(
    (n) => n.startsWith("sb-") && n.includes("auth")
  );
  console.log("[middleware]", pathname, "| cookies:", cookieNames.length, "| sb-auth:", hasSupabaseCookies);

  // Create a response that we can attach refreshed cookies to
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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

  // Refresh the session – this validates the token and writes refreshed cookies to response
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[middleware]", pathname, "| user:", user ? user.email : "null");

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      console.log("[middleware] REDIRECT to login – no user");
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

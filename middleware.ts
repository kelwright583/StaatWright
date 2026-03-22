import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verify the session server-side — getUser() validates the JWT with Supabase auth server
  // getSession() must NOT be used here; it doesn't validate the token and returns null in production
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect admin routes (except the login page itself)
  const isAdminPath =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  // Protect bookkeeper routes (except the login page itself)
  const isBookkeeperPath =
    pathname.startsWith("/bookkeeper") &&
    !pathname.startsWith("/bookkeeper/login");

  if (!user) {
    if (isAdminPath) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isBookkeeperPath) {
      return NextResponse.redirect(new URL("/bookkeeper/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/bookkeeper/:path*"],
};

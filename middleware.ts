import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — keeps the JWT alive in cookies
  await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname } = request.nextUrl;

  // Protect admin routes (except the login page itself)
  const isAdminPath = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  // Protect bookkeeper routes (except the login page itself)
  const isBookkeeperPath = pathname.startsWith("/bookkeeper") && !pathname.startsWith("/bookkeeper/login");

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

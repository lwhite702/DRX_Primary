import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || "";
  const isMarketingDomain = host.includes("deelrxcrm.com");
  const isAppDomain = host.includes("deelrxcrm.app");

  // Domain routing logic
  if (
    isMarketingDomain &&
    pathname !== "/" &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/login")
  ) {
    // Redirect app routes on marketing domain to app domain
    const url = request.nextUrl.clone();
    url.host = "deelrxcrm.app";
    return NextResponse.redirect(url);
  }

  if (isAppDomain && pathname === "/") {
    // Redirect home page on app domain to marketing domain
    const url = request.nextUrl.clone();
    url.host = "deelrxcrm.com";
    return NextResponse.redirect(url);
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/api/auth",
    "/privacy",
    "/terms",
    "/accessibility",
    "/monitoring",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect to login if not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
      if (pathname.startsWith("/api/")) {
        // If API route has Authorization header, let it pass (endpoint validation)
        if (request.headers.get("authorization")) {
          return response;
        }
        return NextResponse.json(
          { error: "Middleware Unauthorized" },
          { status: 401 },
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Redirect to dashboard if authenticated and on login page
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

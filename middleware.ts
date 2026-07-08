import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSafeReturnPath } from "@/lib/utils/auth-redirect";

const AUTH_REQUIRED_PREFIXES = ["/my-listings", "/sell", "/admin"];

const AUTH_EXEMPT_PREFIXES = ["/login", "/signup", "/auth", "/update-password"];

function shouldBypassRouteProtection(request: NextRequest) {
  // Next.js 16 Server Actions POST to the current route — never redirect these.
  if (request.method === "POST") {
    return true;
  }

  if (
    request.headers.get("next-action") ||
    request.headers.get("x-action-id") ||
    request.headers.get("x-action-revalidated")
  ) {
    return true;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.startsWith("multipart/form-data") ||
    contentType === "application/x-www-form-urlencoded"
  ) {
    return true;
  }

  if (request.headers.get("rsc") === "1" || request.headers.has("next-router-state-tree")) {
    return true;
  }

  return false;
}

function isAuthExemptPath(pathname: string) {
  return AUTH_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function withSessionCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  return target;
}

export async function middleware(request: NextRequest) {
  if (shouldBypassRouteProtection(request)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthExempt = isAuthExemptPath(pathname);
  const isAuthRoute =
    pathname.startsWith("/profile/") ||
    AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isAuthExempt) {
    const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

    if (isLoginRoute && user?.email_confirmed_at) {
      const authMode = request.nextUrl.searchParams.get("mode");
      if (authMode !== "recover") {
        const destination = request.nextUrl.clone();
        destination.pathname = getSafeReturnPath(request.nextUrl.searchParams.get("next"));
        destination.search = "";
        return withSessionCookies(response, NextResponse.redirect(destination));
      }
    }

    return response;
  }

  if (isAuthRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return withSessionCookies(response, NextResponse.redirect(loginUrl));
  }

  if (isAuthRoute && user && !user.email_confirmed_at) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("reason", "verify-email");
    return withSessionCookies(response, NextResponse.redirect(loginUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

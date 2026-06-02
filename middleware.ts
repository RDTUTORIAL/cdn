import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SECRET } from "@/lib/auth";

const COOKIE_NAME = "cdn_token";

const protectedPaths = [
  "/dashboard",
  "/files",
  "/trash",
  "/starred",
  "/analytics",
  "/settings",
  "/api-keys",
  "/users",
];

function getSafeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthenticated = await verifyAuth(request);

  // Redirect root
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already logged in and visiting login page, redirect to dashboard
  if (pathname === "/login" && isAuthenticated) {
    const redirect = getSafeRedirect(request.nextUrl.searchParams.get("redirect"));
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // Protect authenticated routes
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|f/).*)"],
};

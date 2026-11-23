import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/** Coarse safety net only; pages and actions still enforce their own authorization. */
export function middleware(request: NextRequest) {
  if (SESSION_COOKIES.some(name => request.cookies.has(name))) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/docs/:path*", "/folders/:path*"],
};

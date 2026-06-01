import { NextResponse, type NextRequest } from "next/server";

const privateCacheControl = "no-store, max-age=0";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    response.headers.set("Cache-Control", privateCacheControl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

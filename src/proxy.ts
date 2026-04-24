import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("gia_auth_token");
  const pathname = request.nextUrl.pathname;
  
  const isAuthPage = pathname === "/login";
  // Si quisiéramos rutas públicas:
  // const isPublicPage = pathname.startsWith("/public");

  // Si no hay token y no está en login, redirigir a login
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay token y trata de ir a login o a la raíz vacía, mandar al dashboard
  if (token && (isAuthPage || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - pattern matching public files (e.g. .svg, .png)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};

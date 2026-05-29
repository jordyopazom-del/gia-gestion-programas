import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get("gia_auth_token");
  const token = tokenCookie?.value;
  
  // Validar si el token es descifrable y contiene un RUT válido
  const rut = token ? decrypt(token) : null;
  const hasValidSession = !!rut;
  
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login";

  // Si no hay sesión válida y no está en login, redirigir a login
  if (!hasValidSession && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay sesión válida y trata de ir a login o a la raíz vacía, mandar al dashboard
  if (hasValidSession && (isAuthPage || pathname === "/")) {
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

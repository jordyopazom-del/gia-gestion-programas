"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export async function loginAction(rut: string, pass: string) {
  try {
    const rutClean = rut.trim().toLowerCase();
    
    // Fallback de SuperAdmin (en caso de que no haya DB o se pierdan credenciales)
    const ADMIN_RUT = process.env.ADMIN_RUT;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const isMockAuth = ADMIN_RUT && ADMIN_PASSWORD && rutClean === ADMIN_RUT && pass === ADMIN_PASSWORD;

    let isAuthenticated = isMockAuth;

    if (!isAuthenticated) {
      // Validar contra la base de datos si no es superadmin
      const result = await sql`SELECT * FROM gia_usuarios WHERE rut = ${rutClean}`;
      const user = result[0];

      if (!user) {
        return { error: "Credenciales incorrectas" };
      }

      isAuthenticated = verifyPassword(pass, user.password);
    }

    if (!isAuthenticated) {
      return { error: "Credenciales incorrectas" };
    }

    const cookieStore = await cookies();

    cookieStore.set("gia_auth_token", rutClean, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 horas de turno
      path: "/",
      sameSite: "strict",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error en login:", error);
    return { error: "Error interno del servidor" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("gia_auth_token");
}

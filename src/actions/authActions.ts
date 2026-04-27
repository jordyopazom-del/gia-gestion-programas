"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function loginAction(rut: string, pass: string) {
  try {
    // Normalizar RUT: Quitar puntos, guiones y espacios para la comparación
    const rutLimpio = rut.replace(/[^0-9kK]/g, "");
    if (rutLimpio.length < 2) return { error: "RUT inválido" };
    
    // Reconstruir formato estándar (cuerpo-dv) para la DB
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    const rutStandar = `${cuerpo}-${dv}`;
    
    // Fallback de SuperAdmin
    const ADMIN_RUT = process.env.ADMIN_RUT;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const isMockAuth = ADMIN_RUT && ADMIN_PASSWORD && rutStandar === ADMIN_RUT && pass === ADMIN_PASSWORD;

    let isAuthenticated = isMockAuth;
    let mustChange = false;

    if (!isAuthenticated) {
      const result = await sql`SELECT * FROM gia_usuarios WHERE rut = ${rutStandar}`;
      const user = result[0];

      if (!user) {
        return { error: "Credenciales incorrectas" };
      }

      isAuthenticated = verifyPassword(pass, user.password);
      mustChange = user.debe_cambiar_password || false;
    }

    if (!isAuthenticated) {
      return { error: "Credenciales incorrectas" };
    }

    const cookieStore = await cookies();

    cookieStore.set("gia_auth_token", rutStandar, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 horas de turno
      path: "/",
      sameSite: "strict",
    });

    return { success: true, mustChangePassword: mustChange };
  } catch (error: any) {
    console.error("Error en login:", error);
    return { error: "Error interno del servidor" };
  }
}

export async function cambiarPasswordAction(nuevaPass: string) {
  try {
    const cookieStore = await cookies();
    const rut = cookieStore.get("gia_auth_token")?.value;
    if (!rut) return { error: "No autorizado" };

    const hashedPassword = hashPassword(nuevaPass);
    await sql`
      UPDATE gia_usuarios 
      SET password = ${hashedPassword}, debe_cambiar_password = FALSE 
      WHERE rut = ${rut}
    `;

    return { success: true };
  } catch (error) {
    return { error: "Error al actualizar contraseña" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("gia_auth_token");
}

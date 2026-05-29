"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { encrypt, getSession } from "@/lib/auth";

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
    const encryptedRut = await encrypt(rutStandar);

    cookieStore.set("gia_auth_token", encryptedRut, {
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

export async function cambiarPasswordAction(nuevaPass: string, pregunta: string, respuesta: string) {
  try {
    const session = await getSession();
    const rut = session?.rut;
    
    if (!rut) {
      console.error("[cambiarPassword] Cookie/Sesión gia_auth_token no encontrada o inválida");
      return { error: "Sesión no válida. Vuelve a iniciar sesión." };
    }

    console.log("[cambiarPassword] Procesando para RUT:", rut);

    const hashedPassword = hashPassword(nuevaPass);
    const respuestaLimpia = respuesta.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const hashedRespuesta = hashPassword(respuestaLimpia);

    console.log("[cambiarPassword] Hash generado OK, actualizando DB...");

    await sql`
      UPDATE gia_usuarios 
      SET 
        password = ${hashedPassword}, 
        pregunta_seguridad = ${pregunta},
        respuesta_seguridad = ${hashedRespuesta},
        debe_cambiar_password = FALSE 
      WHERE rut = ${rut}
    `;

    console.log("[cambiarPassword] DB actualizada OK");
    return { success: true };
  } catch (error: any) {
    console.error("[cambiarPassword] ERROR:", error?.message || error);
    return { error: `Error interno: ${error?.message || "desconocido"}` };
  }
}

export async function getPreguntaAction(rut: string) {
  try {
    // Normalizar RUT para la búsqueda
    const rutLimpio = rut.replace(/[^0-9kK]/g, "");
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    const rutStandar = `${cuerpo}-${dv}`;

    const res = await sql`SELECT pregunta_seguridad FROM gia_usuarios WHERE rut = ${rutStandar}`;
    if (res.length === 0) return { error: "Usuario no encontrado" };
    if (!res[0].pregunta_seguridad) return { error: "El usuario no tiene configurada una pregunta de seguridad. Contacte al Administrador." };

    return { success: true, pregunta: res[0].pregunta_seguridad };
  } catch (error) {
    return { error: "Error al buscar usuario" };
  }
}

export async function resetPasswordAction(rut: string, respuesta: string, nuevaPass: string) {
  try {
    const rutLimpio = rut.replace(/[^0-9kK]/g, "");
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    const rutStandar = `${cuerpo}-${dv}`;

    const res = await sql`SELECT respuesta_seguridad FROM gia_usuarios WHERE rut = ${rutStandar}`;
    if (res.length === 0) return { error: "Usuario no encontrado" };

    const respuestaLimpia = respuesta.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isValid = verifyPassword(respuestaLimpia, res[0].respuesta_seguridad);

    if (!isValid) return { error: "Respuesta incorrecta" };

    const hashedPassword = hashPassword(nuevaPass);
    await sql`UPDATE gia_usuarios SET password = ${hashedPassword} WHERE rut = ${rutStandar}`;

    return { success: true };
  } catch (error) {
    return { error: "Error al resetear contraseña" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("gia_auth_token");
}

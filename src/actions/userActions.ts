"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/password";

export type UserRole = "ADMINISTRADOR" | "ADMINISTRATIVO" | "REFERENTE" | "CLINICO";

export type UserProfile = {
  rut: string;
  nombre: string;
  email?: string;
  profesion: string;
  rol: UserRole;
};

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rut = cookieStore.get("gia_auth_token")?.value;

  if (!rut) return null;

  try {
    const result = await sql`SELECT rut, nombre, email, profesion, rol FROM gia_usuarios WHERE rut = ${rut}`;
    return result[0] as UserProfile;
  } catch (error) {
    console.error("Error obteniendo usuario actual:", error);
    return null;
  }
}

export async function listarUsuarios() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    const result = await sql`SELECT rut, nombre, email, profesion, rol FROM gia_usuarios ORDER BY nombre ASC`;
    return { success: true, data: result as unknown as UserProfile[] };
  } catch (error) {
    return { error: "Error de base de datos" };
  }
}

export async function crearUsuario(data: UserProfile & { password?: string }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    const hashedPassword = hashPassword(data.password || "cesfam123");
    await sql`
      INSERT INTO gia_usuarios (rut, nombre, email, profesion, rol, password, debe_cambiar_password)
      VALUES (${data.rut}, ${data.nombre}, ${data.email || ''}, ${data.profesion}, ${data.rol}, ${hashedPassword}, TRUE)
      ON CONFLICT (rut) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        email = EXCLUDED.email,
        profesion = EXCLUDED.profesion,
        rol = EXCLUDED.rol,
        password = EXCLUDED.password,
        debe_cambiar_password = TRUE
    `;
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    console.error("Error creando usuario:", error);
    return { error: "Error al guardar usuario" };
  }
}

export async function eliminarUsuario(rut: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    await sql`DELETE FROM gia_usuarios WHERE rut = ${rut}`;
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    return { error: "Error al eliminar" };
  }
}

// SOLICITUDES DE ACCESO
export async function solicitarAcceso(data: { rut: string, nombre: string, email: string, profesion: string }) {
  try {
    // Verificar si ya existe el usuario o la solicitud
    const existe = await sql`SELECT 1 FROM gia_usuarios WHERE rut = ${data.rut} UNION SELECT 1 FROM gia_solicitudes_acceso WHERE rut = ${data.rut}`;
    if (existe.length > 0) {
      return { error: "Ya existe un usuario o una solicitud pendiente para este RUT" };
    }

    await sql`
      INSERT INTO gia_solicitudes_acceso (rut, nombre, email, profesion)
      VALUES (${data.rut}, ${data.nombre}, ${data.email.toLowerCase().trim()}, ${data.profesion})
    `;
    return { success: true };
  } catch (error) {
    console.error("Error en solicitarAcceso:", error);
    return { error: "Error al enviar solicitud" };
  }
}

export async function listarSolicitudes() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    const result = await sql`SELECT * FROM gia_solicitudes_acceso WHERE estado = 'PENDIENTE' ORDER BY fecha_solicitud DESC`;
    return { success: true, data: result };
  } catch (error) {
    return { error: "Error al cargar solicitudes" };
  }
}

export async function procesarSolicitud(id: number, accion: 'APROBAR' | 'RECHAZAR', rol?: UserRole) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    if (accion === 'RECHAZAR') {
      await sql`UPDATE gia_solicitudes_acceso SET estado = 'RECHAZADO' WHERE id = ${id}`;
    } else {
      const solicitud = await sql`SELECT * FROM gia_solicitudes_acceso WHERE id = ${id}`;
      if (solicitud.length === 0) return { error: "Solicitud no encontrada" };

      const { rut, nombre, email, profesion } = solicitud[0];
      const defaultPass = hashPassword("cesfam123");

      await sql.begin(async (sql) => {
        await sql`INSERT INTO gia_usuarios (rut, nombre, email, profesion, rol, password, debe_cambiar_password) VALUES (${rut}, ${nombre}, ${email}, ${profesion}, ${rol || 'CLINICO'}, ${defaultPass}, TRUE)`;
        await sql`UPDATE gia_solicitudes_acceso SET estado = 'APROBADO' WHERE id = ${id}`;
      });
    }
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    return { error: "Error al procesar solicitud" };
  }
}

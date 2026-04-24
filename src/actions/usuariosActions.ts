"use server";

import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";

export async function getUsuarios() {
  try {
    const usuarios = await sql`SELECT rut, nombre, profesion, rol FROM gia_usuarios ORDER BY nombre ASC`;
    return { success: true, data: usuarios };
  } catch (error: any) {
    console.error("Error obteniendo usuarios:", error);
    return { success: false, error: "No se pudieron obtener los usuarios" };
  }
}

export async function crearUsuario(formData: FormData) {
  try {
    const rut = formData.get("rut") as string;
    const nombre = formData.get("nombre") as string;
    const profesion = formData.get("profesion") as string;
    const rol = formData.get("rol") as string;
    const password = formData.get("password") as string;

    if (!rut || !nombre || !password) {
      return { success: false, error: "RUT, nombre y contraseña son requeridos" };
    }

    const rutClean = rut.trim().toLowerCase();
    const hashedPassword = hashPassword(password);

    console.time("crearUsuario_db");
    await sql`
      INSERT INTO gia_usuarios (rut, nombre, profesion, rol, password)
      VALUES (${rutClean}, ${nombre}, ${profesion || null}, ${rol || 'CLINICO'}, ${hashedPassword})
    `;
    console.timeEnd("crearUsuario_db");

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Error creando usuario:", error);
    if (error.code === '23505') { // Postgres unique violation
        return { success: false, error: "El RUT ya está registrado" };
    }
    return { success: false, error: "Error al crear el usuario. Revisa si se han inicializado las tablas de DB." };
  }
}

export async function eliminarUsuario(rut: string) {
  try {
    await sql`DELETE FROM gia_usuarios WHERE rut = ${rut}`;
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Error eliminando usuario:", error);
    return { success: false, error: "Error al eliminar usuario" };
  }
}

import { cache } from "react";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type UserRole = "ADMINISTRADOR" | "ADMINISTRATIVO" | "REFERENTE" | "CLINICO" | "INACTIVO";

export type UserProfile = {
  rut: string;
  nombre: string;
  email?: string;
  profesion: string;
  rol: UserRole;
  accesos?: string[];
  referencias?: string[];
};

// cache() de React deduplica esta función dentro de una misma petición HTTP.
// Si layout.tsx y page.tsx llaman ambos a getCurrentUser(), la consulta SQL
// se ejecuta UNA sola vez y el resultado se reutiliza automáticamente.
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const session = await getSession();
  const rut = session?.rut;

  if (!rut) return null;

  try {
    const result = await sql`SELECT rut, nombre, email, profesion, rol, accesos, referencias FROM gia_usuarios WHERE rut = ${rut}`;
    return result[0] as UserProfile;
  } catch (error) {
    console.error("Error obteniendo usuario actual:", error);
    return null;
  }
});

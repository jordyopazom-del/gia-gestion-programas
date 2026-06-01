"use server";

import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/auth";

export type UserRole = "ADMINISTRADOR" | "ADMINISTRATIVO" | "REFERENTE" | "CLINICO" | "INACTIVO";

export type UserProfile = {
  rut: string;
  nombre: string;
  email?: string;
  profesion: string;
  rol: UserRole;
  accesos?: string[];
};

export async function getCurrentUser() {
  const session = await getSession();
  const rut = session?.rut;

  if (!rut) return null;

  try {
    const result = await sql`SELECT rut, nombre, email, profesion, rol, accesos FROM gia_usuarios WHERE rut = ${rut}`;
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
    const result = await sql`
      SELECT rut, nombre, email, profesion, rol, accesos 
      FROM gia_usuarios 
      WHERE UPPER(nombre) != 'MIGRACION SISTEMA' 
        AND UPPER(nombre) != 'MIGRACIÓN SISTEMA'
        AND UPPER(nombre) != 'ADMINISTRADOR MAESTRO'
      ORDER BY nombre ASC
    `;
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
    const cleanRut = data.rut.replace(/[^0-9kK]/g, "");
    if (cleanRut.length < 2) return { error: "RUT inválido" };
    const cuerpo = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    const rutStandar = `${cuerpo}-${dv}`;

    const cleanNombre = data.nombre.toUpperCase().trim();
    const cleanEmail = (data.email || '').toLowerCase().trim();
    const cleanProfesion = data.profesion.toUpperCase().trim();

    const hashedPassword = hashPassword(data.password || "cesfam123");
    await sql`
      INSERT INTO gia_usuarios (rut, nombre, email, profesion, rol, password, debe_cambiar_password, accesos)
      VALUES (${rutStandar}, ${cleanNombre}, ${cleanEmail}, ${cleanProfesion}, ${data.rol}, ${hashedPassword}, TRUE, ${data.accesos || []})
      ON CONFLICT (rut) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        email = EXCLUDED.email,
        profesion = EXCLUDED.profesion,
        rol = EXCLUDED.rol,
        password = EXCLUDED.password,
        debe_cambiar_password = TRUE,
        accesos = EXCLUDED.accesos
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
  } catch (error: any) {
    if (error.code === "23503") {
      return { error: "REFERENCED_ERROR" };
    }
    return { error: "Error al eliminar" };
  }
}

export async function desactivarUsuario(rut: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    await sql`UPDATE gia_usuarios SET rol = 'INACTIVO' WHERE rut = ${rut}`;
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    return { error: "Error al desactivar el acceso" };
  }
}

// SOLICITUDES DE ACCESO
export async function solicitarAcceso(data: { rut: string, nombre: string, email: string, profesion: string }) {
  try {
    const cleanRut = data.rut.replace(/[^0-9kK]/g, "");
    if (cleanRut.length < 2) return { error: "RUT inválido" };
    const cuerpo = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    const rutStandar = `${cuerpo}-${dv}`;

    const cleanNombre = data.nombre.toUpperCase().trim();
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanProfesion = data.profesion.toUpperCase().trim();

    // Verificar si ya existe el usuario o la solicitud
    const existe = await sql`SELECT 1 FROM gia_usuarios WHERE rut = ${rutStandar} UNION SELECT 1 FROM gia_solicitudes_acceso WHERE rut = ${rutStandar}`;
    if (existe.length > 0) {
      return { error: "Ya existe un usuario o una solicitud pendiente para este RUT" };
    }

    await sql`
      INSERT INTO gia_solicitudes_acceso (rut, nombre, email, profesion)
      VALUES (${rutStandar}, ${cleanNombre}, ${cleanEmail}, ${cleanProfesion})
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
        await sql`INSERT INTO gia_usuarios (rut, nombre, email, profesion, rol, password, debe_cambiar_password, accesos) VALUES (${rut}, ${nombre}, ${email}, ${profesion}, ${rol || 'CLINICO'}, ${defaultPass}, TRUE, ARRAY[]::TEXT[])`;
        await sql`UPDATE gia_solicitudes_acceso SET estado = 'APROBADO' WHERE id = ${id}`;
      });
    }
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    return { error: "Error al procesar solicitud" };
  }
}

function cleanName(name: string | null | undefined): string {
  if (!name) return "SIN REGISTRO";
  const clean = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove tildes
    .replace(/\s+/g, " ")            // remove multiple spaces
    .replace(/\s*\(MIGRADO\)\s*/gi, "") // remove (Migrado) suffix if any
    .trim();

  // Mapeos específicos manuales del CESFAM
  const equivalencias: Record<string, string> = {
    "ANA M TORRES": "ANA MARIA TORRES VIDAL",
    "ANA MARIA TORRES": "ANA MARIA TORRES VIDAL",
    "DANIELAULLOA": "DANIELA ULLOA",
    "KLGA VICTORIA FUENTEALBA": "VICTORIA FUENTEALBA",
  };

  return equivalencias[clean] || clean;
}

export async function obtenerProfesionalesMigrados() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  // Traspaso automático de registros de Maria Jesus Ortiz a Jordy (currentUser)
  try {
    const adminRut = currentUser.rut;

    const mariaUser = await sql`
      SELECT rut FROM gia_usuarios 
      WHERE nombre ILIKE '%MARIA JESUS ORTIZ%' OR nombre ILIKE '%MARIA J. ORTIZ%' OR nombre ILIKE '%MARIA J Ortiz%'
      LIMIT 1
    `;
    
    if (mariaUser.length > 0) {
      const mariaRut = mariaUser[0].rut;
      
      await sql`
        UPDATE gia_empam
        SET 
          profesional_rut = ${adminRut},
          data_clinica = jsonb_set(COALESCE(data_clinica, '{}'::jsonb), '{profesional_original}', '"MARIA JESUS ORTIZ"'::jsonb)
        WHERE profesional_rut = ${mariaRut}
      `;
      
      await sql`
        UPDATE gia_respiratorio
        SET 
          profesional_rut = ${adminRut},
          data_clinica = jsonb_set(COALESCE(data_clinica, '{}'::jsonb), '{profesional_original}', '"MARIA JESUS ORTIZ"'::jsonb)
        WHERE profesional_rut = ${mariaRut}
      `;
      
      await sql`
        UPDATE gia_mujer_pap
        SET 
          profesional_rut = ${adminRut},
          observaciones = COALESCE(observaciones, '') || ' (Migrado de Maria Jesus Ortiz)'
        WHERE profesional_rut = ${mariaRut}
      `;
    }

    await sql`
      UPDATE gia_empam
      SET profesional_rut = ${adminRut}
      WHERE (
        data_clinica->>'profesional_original' ILIKE '%MARIA JESUS ORTIZ%' 
        OR data_clinica->>'profesional_original' ILIKE '%MARIA J%ORTIZ%'
      ) AND profesional_rut IN (SELECT rut FROM gia_usuarios WHERE nombre = 'MIGRACIÓN SISTEMA')
    `;
  } catch (e) {
    console.error("Error en la migración de Maria Jesus Ortiz:", e);
  }

  try {
    const result = await sql`
      SELECT 
        data_clinica->>'profesional_original' as profesional_original, 
        COUNT(*)::int as cantidad
      FROM gia_empam
      WHERE data_clinica->>'profesional_original' IS NOT NULL
        AND profesional_rut IN (SELECT rut FROM gia_usuarios WHERE nombre = 'MIGRACIÓN SISTEMA')
      GROUP BY data_clinica->>'profesional_original'
    `;

    const aggregated: Record<string, number> = {};
    result.forEach((row: any) => {
      const clean = cleanName(row.profesional_original);
      aggregated[clean] = (aggregated[clean] || 0) + row.cantidad;
    });

    const data = Object.entries(aggregated).map(([profesional_original, cantidad]) => ({
      profesional_original,
      cantidad
    })).sort((a, b) => b.cantidad - a.cantidad);

    return { success: true, data };
  } catch (error) {
    console.error("Error obteniendo profesionales migrados:", error);
    return { error: "Error de base de datos" };
  }
}

export async function vincularProfesionalMigrado(nombreOriginalClean: string, nuevoRut: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    const result = await sql`
      SELECT DISTINCT data_clinica->>'profesional_original' as raw_name
      FROM gia_empam
      WHERE data_clinica->>'profesional_original' IS NOT NULL
        AND profesional_rut IN (SELECT rut FROM gia_usuarios WHERE nombre = 'MIGRACIÓN SISTEMA')
    `;

    const targetClean = cleanName(nombreOriginalClean);
    const matchingRawNames = result
      .map((row: any) => row.raw_name)
      .filter((raw: string) => cleanName(raw) === targetClean);

    if (matchingRawNames.length === 0) {
      return { success: true };
    }

    await sql`
      UPDATE gia_empam
      SET profesional_rut = ${nuevoRut}
      WHERE data_clinica->>'profesional_original' IN (${matchingRawNames})
        AND profesional_rut IN (SELECT rut FROM gia_usuarios WHERE nombre = 'MIGRACIÓN SISTEMA')
    `;

    revalidatePath("/admin/usuarios");
    revalidatePath("/empam");
    return { success: true };
  } catch (error) {
    console.error("Error al vincular profesional:", error);
    return { error: "Error de base de datos" };
  }
}

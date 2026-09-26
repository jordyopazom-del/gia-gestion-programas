"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoCaso = "POST_HOSPITALIZADO" | "POLICONSULTANTE";
export type EstadoCaso = "PENDIENTE" | "CONTACTADO" | "VDI_PROGRAMADA" | "CERRADO";

export type GestionCasoInput = {
  rut_paciente: string;
  tipo: TipoCaso;
  fecha_alta?: string | null;   // YYYY-MM-DD — solo POST_HOSPITALIZADO
  diagnostico_alta?: string | null;
  observaciones?: string | null;
};

export type GestionCaso = {
  id: number;
  rut_paciente: string;
  nombre_completo: string;
  sector: string;
  telefono: string | null;
  categoria: string | null;
  tipo: TipoCaso;
  fecha_alta: string | null;
  diagnostico_alta: string | null;
  estado: EstadoCaso;
  observaciones: string | null;
  profesional_nombre: string | null;
  fecha_registro: string;
};

// ─── Inicializar Tabla (llamado desde dbInit) ──────────────────────────────

export async function initGestionCasosTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS gia_gestion_casos (
      id               SERIAL PRIMARY KEY,
      rut_paciente     TEXT NOT NULL REFERENCES gia_pacientes(rut) ON DELETE CASCADE,
      tipo             TEXT NOT NULL CHECK (tipo IN ('POST_HOSPITALIZADO','POLICONSULTANTE')),
      fecha_alta       DATE,
      diagnostico_alta TEXT,
      estado           TEXT NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE','CONTACTADO','VDI_PROGRAMADA','CERRADO')),
      observaciones    TEXT,
      profesional_rut  TEXT REFERENCES gia_usuarios(rut),
      fecha_registro   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

// ─── Ingresar Caso ─────────────────────────────────────────────────────────

export async function ingresarCasoGestion(input: GestionCasoInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  // Validación: POST_HOSPITALIZADO requiere fecha de alta
  if (input.tipo === "POST_HOSPITALIZADO" && !input.fecha_alta) {
    return { error: "La Fecha de Alta es obligatoria para casos Post-Hospitalizado." };
  }

  // Verificar que el paciente existe en el padrón
  const paciente = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${input.rut_paciente} AND estado = 'ACTIVO'`;
  if (paciente.length === 0) {
    return { error: "Paciente no encontrado o inactivo en el padrón." };
  }

  // Evitar duplicados activos del mismo tipo para el mismo paciente
  const duplicado = await sql`
    SELECT id FROM gia_gestion_casos
    WHERE rut_paciente = ${input.rut_paciente}
      AND tipo = ${input.tipo}
      AND estado NOT IN ('CERRADO')
    LIMIT 1
  `;
  if (duplicado.length > 0) {
    return { error: `El paciente ya tiene un caso activo de tipo "${input.tipo === "POST_HOSPITALIZADO" ? "Post-Hospitalizado" : "Policonsultante"}". Cierre el anterior antes de ingresar uno nuevo.` };
  }

  try {
    await sql`
      INSERT INTO gia_gestion_casos
        (rut_paciente, tipo, fecha_alta, diagnostico_alta, observaciones, profesional_rut)
      VALUES
        (
          ${input.rut_paciente},
          ${input.tipo},
          ${input.fecha_alta ?? null},
          ${input.diagnostico_alta ?? null},
          ${input.observaciones ?? null},
          ${user.rut}
        )
    `;
    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al ingresar caso de gestión:", error);
    return { error: "Error de base de datos al registrar el caso." };
  }
}

// ─── Obtener Casos Activos (para la tab) ──────────────────────────────────

export async function obtenerCasosGestion(): Promise<GestionCaso[]> {
  try {
    const result = await sql`
      SELECT
        gc.id,
        gc.rut_paciente,
        p.nombre_completo,
        p.sector,
        p.telefono,
        e.categoria,
        gc.tipo,
        gc.fecha_alta::text      AS fecha_alta,
        gc.diagnostico_alta,
        gc.estado,
        gc.observaciones,
        u.nombre                 AS profesional_nombre,
        gc.fecha_registro::text  AS fecha_registro
      FROM gia_gestion_casos gc
      JOIN  gia_pacientes p  ON p.rut = gc.rut_paciente
      LEFT JOIN (
        SELECT DISTINCT ON (rut_paciente) rut_paciente, categoria
        FROM gia_ecicep
        ORDER BY rut_paciente, fecha_atencion DESC, id DESC
      ) e ON e.rut_paciente = gc.rut_paciente
      LEFT JOIN gia_usuarios u ON u.rut = gc.profesional_rut
      WHERE gc.estado <> 'CERRADO'
      ORDER BY
        -- Post-Hospitalizados primero, luego por urgencia (fecha_alta más antigua primero)
        CASE gc.tipo WHEN 'POST_HOSPITALIZADO' THEN 0 ELSE 1 END,
        gc.fecha_alta ASC NULLS LAST,
        gc.fecha_registro ASC
    `;
    return result as GestionCaso[];
  } catch (error) {
    console.error("Error al obtener casos de gestión:", error);
    return [];
  }
}

// ─── Actualizar Estado de un Caso ─────────────────────────────────────────

export async function actualizarEstadoCaso(id: number, estado: EstadoCaso) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  try {
    await sql`
      UPDATE gia_gestion_casos
      SET estado = ${estado}
      WHERE id = ${id}
    `;
    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar estado de caso:", error);
    return { error: "Error al actualizar el estado." };
  }
}

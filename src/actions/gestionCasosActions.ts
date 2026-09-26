"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoCaso = "POST_HOSPITALIZADO" | "POLICONSULTANTE" | "DERIVACION_CLINICA";
export type EstadoCaso = "PENDIENTE_ASIGNACION" | "EN_SEGUIMIENTO" | "CERRADO";

export type GestionCasoInput = {
  rut_paciente: string;
  tipo: TipoCaso;
  fecha_alta?: string | null;   // YYYY-MM-DD — solo POST_HOSPITALIZADO
  diagnostico_alta?: string | null;
  estamento_solicitado?: string | null;
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
  estamento_solicitado: string | null;
  gestor_asignado_rut: string | null;
  gestor_asignado_nombre: string | null;
  fecha_asignacion: string | null;
  observaciones: string | null;
  profesional_nombre: string | null;
  fecha_registro: string;
  fecha_cierre?: string | null;
  motivo_cierre?: string | null;
};

export type ProfesionalAsignable = {
  rut: string;
  nombre: string;
  rol: string;
};

// ─── Obtener Lista de Profesionales del CESFAM ──────────────────────────────

export async function obtenerProfesionalesAsignables(): Promise<ProfesionalAsignable[]> {
  try {
    const rows = await sql`
      SELECT rut, nombre, rol 
      FROM gia_usuarios 
      WHERE activo = true 
      ORDER BY nombre ASC
    `;
    return rows as unknown as ProfesionalAsignable[];
  } catch (err) {
    console.error("Error al obtener profesionales asignables:", err);
    return [];
  }
}

// ─── Ingresar Caso ─────────────────────────────────────────────────────────

export async function ingresarCasoGestion(input: GestionCasoInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  if (input.tipo === "POST_HOSPITALIZADO" && !input.fecha_alta) {
    return { error: "La Fecha de Alta es obligatoria para casos Post-Hospitalizado." };
  }

  const paciente = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${input.rut_paciente} AND estado = 'ACTIVO'`;
  if (paciente.length === 0) {
    return { error: "Paciente no encontrado o inactivo en el padrón." };
  }

  const duplicado = await sql`
    SELECT id FROM gia_gestion_casos
    WHERE rut_paciente = ${input.rut_paciente}
      AND tipo = ${input.tipo}
      AND estado NOT IN ('CERRADO')
    LIMIT 1
  `;
  if (duplicado.length > 0) {
    return { error: `El paciente ya tiene un caso activo de este tipo. Cierre el anterior antes de ingresar uno nuevo.` };
  }

  try {
    await sql`
      INSERT INTO gia_gestion_casos
        (rut_paciente, tipo, fecha_alta, diagnostico_alta, estamento_solicitado, observaciones, profesional_rut, estado)
      VALUES
        (
          ${input.rut_paciente},
          ${input.tipo},
          ${input.fecha_alta ?? null},
          ${input.diagnostico_alta ?? null},
          ${input.estamento_solicitado ?? null},
          ${input.observaciones ?? null},
          ${user.rut},
          'PENDIENTE_ASIGNACION'
        )
    `;
    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al ingresar caso de gestión:", error);
    return { error: "Error de base de datos al registrar el caso." };
  }
}

// ─── Ingreso Múltiple de Casos ──────────────────────────────────────────────

export async function ingresarCasosMultiples(inputs: GestionCasoInput[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  if (!inputs || inputs.length === 0) return { error: "La lista está vacía." };

  let insertados = 0;
  let errores: string[] = [];

  for (const input of inputs) {
    try {
      const paciente = await sql`SELECT rut, nombre_completo FROM gia_pacientes WHERE rut = ${input.rut_paciente} AND estado = 'ACTIVO'`;
      if (paciente.length === 0) {
        errores.push(`${input.rut_paciente}: Paciente no encontrado o inactivo.`);
        continue;
      }

      const duplicado = await sql`
        SELECT id FROM gia_gestion_casos
        WHERE rut_paciente = ${input.rut_paciente}
          AND tipo = ${input.tipo}
          AND estado NOT IN ('CERRADO')
        LIMIT 1
      `;
      if (duplicado.length > 0) {
        errores.push(`${paciente[0].nombre_completo}: Ya tiene un caso activo de tipo ${input.tipo}.`);
        continue;
      }

      await sql`
        INSERT INTO gia_gestion_casos
          (rut_paciente, tipo, fecha_alta, diagnostico_alta, estamento_solicitado, observaciones, profesional_rut, estado)
        VALUES
          (
            ${input.rut_paciente},
            ${input.tipo},
            ${input.fecha_alta ?? null},
            ${input.diagnostico_alta ?? null},
            ${input.estamento_solicitado ?? null},
            ${input.observaciones ?? null},
            ${user.rut},
            'PENDIENTE_ASIGNACION'
          )
      `;
      insertados++;
    } catch (err: any) {
      console.error(`Error insertando caso para ${input.rut_paciente}:`, err);
      errores.push(`${input.rut_paciente}: Error de base de datos.`);
    }
  }

  if (insertados > 0) {
    revalidatePath("/ecicep");
  }

  return { success: true, insertados, errores };
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
        gc.fecha_alta::text             AS fecha_alta,
        gc.diagnostico_alta,
        gc.estado,
        gc.estamento_solicitado,
        gc.gestor_asignado_rut,
        gestor.nombre                   AS gestor_asignado_nombre,
        gc.fecha_asignacion::text       AS fecha_asignacion,
        gc.observaciones,
        u.nombre                        AS profesional_nombre,
        gc.fecha_registro::text         AS fecha_registro,
        gc.fecha_cierre::text           AS fecha_cierre,
        gc.motivo_cierre
      FROM gia_gestion_casos gc
      JOIN gia_pacientes p ON p.rut = gc.rut_paciente
      LEFT JOIN (
        SELECT DISTINCT ON (rut_paciente) rut_paciente, categoria
        FROM gia_ecicep
        ORDER BY rut_paciente, fecha_atencion DESC, id DESC
      ) e ON e.rut_paciente = gc.rut_paciente
      LEFT JOIN gia_usuarios u ON u.rut = gc.profesional_rut
      LEFT JOIN gia_usuarios gestor ON gestor.rut = gc.gestor_asignado_rut
      WHERE gc.estado <> 'CERRADO'
      ORDER BY
        -- 1. Casos post-hosp pendientes primero por urgencia de 48h
        CASE WHEN gc.tipo = 'POST_HOSPITALIZADO' AND gc.estado = 'PENDIENTE_ASIGNACION' THEN 0 ELSE 1 END,
        -- 2. Pendientes de asignación antes que los ya asignados
        CASE WHEN gc.estado = 'PENDIENTE_ASIGNACION' THEN 0 ELSE 1 END,
        gc.fecha_alta ASC NULLS LAST,
        gc.fecha_registro ASC
    `;
    return result as unknown as GestionCaso[];
  } catch (error) {
    console.error("Error al obtener casos de gestión:", error);
    return [];
  }
}

// ─── Tomar Caso (Autogestión por el usuario actual) ─────────────────────────

export async function tomarCaso(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  try {
    await sql`
      UPDATE gia_gestion_casos
      SET 
        gestor_asignado_rut = ${user.rut},
        fecha_asignacion = CURRENT_TIMESTAMP,
        estado = 'EN_SEGUIMIENTO'
      WHERE id = ${id}
    `;
    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al tomar caso:", error);
    return { error: "Error al tomar el caso." };
  }
}

// ─── Asignar Gestor a un Caso (Derivación entre pares o Referente) ─────────

export async function asignarGestorCaso(id: number, gestor_rut: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  try {
    await sql`
      UPDATE gia_gestion_casos
      SET 
        gestor_asignado_rut = ${gestor_rut},
        fecha_asignacion = CURRENT_TIMESTAMP,
        estado = 'EN_SEGUIMIENTO'
      WHERE id = ${id}
    `;
    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al asignar gestor al caso:", error);
    return { error: "Error al asignar gestor." };
  }
}

// ─── Cerrar Caso ───────────────────────────────────────────────────────────

export async function cerrarCaso(id: number, motivo_cierre: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  try {
    await sql`
      UPDATE gia_gestion_casos
      SET 
        estado = 'CERRADO',
        fecha_cierre = CURRENT_TIMESTAMP,
        motivo_cierre = ${motivo_cierre}
      WHERE id = ${id}
    `;
    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al cerrar caso:", error);
    return { error: "Error al cerrar el caso." };
  }
}

"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type AgendaRow = {
  rut: string;
  nombre: string;
  hora: string;
  profesional: string;
  prestacion: string;
};

export type Oportunidad = AgendaRow & {
  empam_estado: string; // VENCIDO, AL DIA, SIN REGISTRO
  empam_fecha?: string;
  cv_estado: string;
  respiratorio_estado: string;
  estado_rescate: string;
  telefono?: string;
};

export async function uploadAgendaDiaria(rows: AgendaRow[], fecha: string) {
  try {
    // Limpiar agenda previa para esa fecha
    await sql`DELETE FROM gia_agendas_diarias WHERE fecha_agenda = ${fecha}`;

    if (rows.length === 0) return { success: true, count: 0 };

    // Normalizar RUTs y preparar datos para inserción masiva
    const rowsToInsert = rows.map(row => ({
      fecha_agenda: fecha,
      rut: row.rut.replace(/\./g, ""), // Quitar puntos para normalizar
      nombre: row.nombre.toUpperCase().trim(),
      hora: row.hora.trim().replace(".", ":"), // Corregir posibles puntos en horas
      profesional: row.profesional.trim(),
      prestacion: row.prestacion.trim()
    }));

    // Inserción masiva usando la sintaxis oficial de postgres.js
    await sql`
      INSERT INTO gia_agendas_diarias ${sql(rowsToInsert, 'fecha_agenda', 'rut', 'nombre', 'hora', 'profesional', 'prestacion')}
    `;

    revalidatePath("/oportunidad");
    return { success: true, count: rowsToInsert.length };
  } catch (error: any) {
    console.error("Error al subir agenda:", error);
    return { error: `Error DB: ${error.message || "Error desconocido"}` };
  }
}

export async function getOportunidadesHoy(fecha: string) {
  try {
    // Cruce de agenda con EMPAM y otros programas
    // Nota: El intervalo de 1 año para EMPAM es el estándar en Chile para >65 años
    const data = await sql`
      WITH ultimos_empam AS (
        SELECT rut_paciente as rut, MAX(fecha_atencion) as fecha_evaluacion 
        FROM gia_empam 
        GROUP BY rut_paciente
      )
      SELECT 
        a.rut, a.nombre, a.hora, a.profesional, a.prestacion, a.estado_rescate,
        u.fecha_evaluacion as empam_fecha,
        p.telefono,
        CASE 
          WHEN u.fecha_evaluacion IS NULL THEN 'SIN REGISTRO'
          WHEN u.fecha_evaluacion < (CURRENT_DATE - INTERVAL '1 year') THEN 'VENCIDO'
          ELSE 'AL DIA'
        END as empam_estado
      FROM gia_agendas_diarias a
      LEFT JOIN ultimos_empam u ON a.rut = u.rut
      LEFT JOIN gia_pacientes p ON (p.rut || '-' || UPPER(p.dv)) = UPPER(REPLACE(a.rut, '.', ''))
      WHERE a.fecha_agenda = ${fecha}
      ORDER BY a.hora ASC
    `;

    return { success: true, data: data as unknown as Oportunidad[] };
  } catch (error) {
    console.error("Error al obtener oportunidades:", error);
    return { error: "Error al cruzar datos de oportunidad" };
  }
}

export async function marcarRescatado(rut: string, fecha: string) {
  try {
    await sql`
      UPDATE gia_agendas_diarias 
      SET estado_rescate = 'RESCATADO' 
      WHERE rut = ${rut} AND fecha_agenda = ${fecha}
    `;
    revalidatePath("/oportunidad");
    return { success: true };
  } catch (error) {
    return { error: "Error al actualizar estado" };
  }
}

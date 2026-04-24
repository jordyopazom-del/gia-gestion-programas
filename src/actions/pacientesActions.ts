"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type PacienteData = {
  rut: string;
  dv: string;
  nombre_completo: string;
  fecha_nacimiento: string | null;
  sexo: string;
  sector: string;
  telefono: string;
  direccion: string;
  es_pad: boolean;
};

export async function syncPadronMaestro(pacientes: PacienteData[]) {
  if (!pacientes || pacientes.length === 0) return { error: "No hay pacientes para procesar" };

  try {
    // Para no saturar con miles de pacientes, usamos la sintaxis optimizada bulk insert
    // y hacemos ON CONFLICT do update de todos los campos
    await sql`
      INSERT INTO gia_pacientes ${sql(pacientes, 'rut', 'dv', 'nombre_completo', 'fecha_nacimiento', 'sexo', 'sector', 'telefono', 'direccion', 'es_pad')}
      ON CONFLICT (rut) DO UPDATE SET 
        nombre_completo = EXCLUDED.nombre_completo,
        fecha_nacimiento = EXCLUDED.fecha_nacimiento,
        sexo = EXCLUDED.sexo,
        sector = EXCLUDED.sector,
        telefono = EXCLUDED.telefono,
        direccion = EXCLUDED.direccion,
        es_pad = EXCLUDED.es_pad,
        fecha_actualizacion = CURRENT_TIMESTAMP
    `;
    
    revalidatePath("/directorio");
    return { success: true, count: pacientes.length };
  } catch (error: any) {
    console.error("Error al sincronizar el padrón:", error);
    return { error: error.message };
  }
}

export async function getDirectorioCompleto() {
  try {
    const result = await sql`SELECT * FROM gia_pacientes ORDER BY nombre_completo ASC`;
    return result as any[];
  } catch (error) {
    console.error("Error obteniendo el directorio:", error);
    return [];
  }
}

export async function egresarPaciente(rut: string, motivo: string) {
  try {
    await sql`
      UPDATE gia_pacientes 
      SET estado = 'EGRESADO', 
          motivo_egreso = ${motivo}, 
          fecha_egreso = CURRENT_TIMESTAMP 
      WHERE rut = ${rut}
    `;
    revalidatePath("/directorio");
    revalidatePath("/empam");
    return { success: true };
  } catch (error: any) {
    console.error("Error al egresar paciente:", error);
    return { error: error.message };
  }
}

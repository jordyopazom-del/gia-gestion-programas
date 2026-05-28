"use server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "./userActions";

export async function getMujerDashboardData() {
  try {
    const result = await sql`
      WITH UltimoPap AS (
        SELECT rut_paciente, fecha_pap, resultado,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_pap DESC) as rn
        FROM gia_mujer_pap
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, p.sector, p.telefono, p.direccion,
        p.estado, p.motivo_egreso, p.fecha_egreso, p.es_pad,
        pap.fecha_pap as ultima_fecha_pap,
        pap.resultado as ultimo_resultado_pap
      FROM gia_pacientes p
      LEFT JOIN UltimoPap pap ON p.rut = pap.rut_paciente AND pap.rn = 1
      WHERE p.sexo = 'FEMENINO'
      ORDER BY p.nombre_completo ASC
    `;
    return { data: result as any[] };
  } catch (error: any) {
    console.error("Error al obtener datos Programa Mujer:", error);
    return { error: "Error de conexión con la base de datos." };
  }
}

export async function guardarPap(data: { rut_paciente: string, fecha_pap: string, resultado: string, observaciones?: string }) {
  try {
    const user = await getCurrentUser();
    const profesional_rut = user ? user.rut : '12345678-5';

    await sql`
      INSERT INTO gia_mujer_pap (rut_paciente, fecha_pap, resultado, profesional_rut, observaciones)
      VALUES (${data.rut_paciente}, ${data.fecha_pap}, ${data.resultado}, ${profesional_rut}, ${data.observaciones || ''})
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar PAP:", error);
    return { error: "Error de base de datos al guardar el PAP." };
  }
}

export async function buscarPacienteMujerPorRut(rutInput: string) {
  const cleanRut = rutInput.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleanRut.length < 2) return { error: "RUT inválido" };
  
  const rutNum = cleanRut.slice(0, -1);
  
  try {
    const rows = await sql`SELECT * FROM gia_pacientes WHERE rut = ${rutNum}`;
    if (rows.length === 0) return { error: "Paciente no encontrado en el padrón." };
    
    const p = rows[0];
    if (p.sexo !== 'FEMENINO') {
      return { error: "El paciente encontrado no corresponde al sexo femenino." };
    }
    
    return { data: p };
  } catch (error: any) {
    console.error("Error al buscar paciente mujer:", error);
    return { error: "Error de conexión con la base de datos." };
  }
}

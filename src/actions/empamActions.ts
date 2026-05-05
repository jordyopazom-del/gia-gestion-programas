"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PacienteData } from "./pacientesActions";
import { getCurrentUser } from "./userActions";

export async function buscarPacientePorRut(rutInput: string) {
  const cleanRut = rutInput.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleanRut.length < 2) return { error: "RUT inválido" };
  
  const rutNum = cleanRut.slice(0, -1);
  
  try {
    const rows = await sql`SELECT * FROM gia_pacientes WHERE rut = ${rutNum}`;
    if (rows.length === 0) return { error: "Paciente no encontrado en el padrón interconectado." };
    
    // Check if the patient is < 65 years old
    const p = rows[0] as PacienteData;
    let age = 0;
    if (p.fecha_nacimiento) {
      const birth = new Date(p.fecha_nacimiento);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    if (age > 0 && age < 65) {
      return { error: `Bloqueo de Seguridad: El paciente tiene ${age} años. El registro de EMPAM es exclusivo para población de 65 años o más.`, data: null };
    }

    return { error: null, data: p, age };
  } catch (error) {
    console.error(error);
    return { error: "Error interno al buscar el paciente." };
  }
}

export type EmpamSubmission = {
  rut_paciente: string;
  fecha_atencion: string; // YYYY-MM-DD
  resultado_efam: string;
  data_clinica: any; // Barthel, yesavage, etc
  motivo_egreso?: string;
};

export async function saveEmpamRecord(data: EmpamSubmission) {
  // Obtener usuario actual para firmar el registro clínico
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada. Vuelva a Iniciar Sesión." };
  
  const userRut = user.rut;

  try {
    const motivo = data.motivo_egreso || 'ACTIVO';
    await sql`
      INSERT INTO gia_empam (rut_paciente, fecha_atencion, resultado_efam, profesional_rut, data_clinica, motivo_egreso)
      VALUES (${data.rut_paciente}, ${data.fecha_atencion}, ${data.resultado_efam}, ${userRut}, ${data.data_clinica}, ${motivo})
    `;
    revalidatePath("/empam");
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar EMPAM:", error);
    return { error: "Error de base de datos al intentar guardar el registro." };
  }
}

export async function getEmpamDashboardData() {
  try {
    // Cruza el Padrón de Pacientes Totales (sólo mayores de 65)
    // Con su registro MÁS RECIENTE de gia_empam.
    const result = await sql`
      WITH UltimoEmpam AS (
        SELECT rut_paciente, fecha_atencion, resultado_efam, profesional_rut, data_clinica,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_atencion DESC) as rn
        FROM gia_empam
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, p.fecha_nacimiento, p.sector, p.telefono, p.direccion,
        p.estado, p.motivo_egreso, p.fecha_egreso,
        e.fecha_atencion as ultima_atencion,
        e.resultado_efam,
        e.profesional_rut,
        u.nombre as profesional_nombre,
        e.data_clinica
      FROM gia_pacientes p
      LEFT JOIN UltimoEmpam e ON p.rut = e.rut_paciente AND e.rn = 1
      LEFT JOIN gia_usuarios u ON e.profesional_rut = u.rut
      WHERE p.fecha_nacimiento IS NOT NULL
        AND DATE_PART('year', AGE(CURRENT_DATE, p.fecha_nacimiento::DATE)) >= 65
      ORDER BY p.nombre_completo ASC
    `;
    return result;
  } catch (error) {
    console.error("Error obteniendo Dashboard EMPAM:", error);
    return [];
  }
}

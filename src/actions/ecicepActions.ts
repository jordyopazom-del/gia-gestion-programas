"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PacienteData } from "./pacientesActions";
import { getCurrentUser } from "./userActions";

export async function buscarPacienteParaEcicep(rutInput: string) {
  const cleanRut = rutInput.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleanRut.length < 2) return { error: "RUT inválido" };
  
  const rutNum = cleanRut.slice(0, -1);
  
  try {
    const rows = await sql`SELECT * FROM gia_pacientes WHERE rut = ${rutNum}`;
    if (rows.length === 0) return { error: "Paciente no encontrado en el padrón interconectado." };
    
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

    const ultimaEval = await sql`
      SELECT * FROM gia_ecicep 
      WHERE rut_paciente = ${rutNum} 
      ORDER BY fecha_atencion DESC, id DESC 
      LIMIT 1
    `;

    if (age < 15) {
      return { error: `Bloqueo de Seguridad: El paciente tiene ${age} años. La estratificación ECICEP es exclusiva para población de 15 años o más.`, data: p, age, evaluacion: ultimaEval[0] || null };
    }

    return { error: null, data: p, age, evaluacion: ultimaEval[0] || null };
  } catch (error) {
    console.error(error);
    return { error: "Error interno al buscar el paciente." };
  }
}

export type EcicepSubmission = {
  rut_paciente: string;
  fecha_atencion: string; // YYYY-MM-DD
  categoria: string; // G1, G2, G3
  diagnosticos: string[];
  polifarmacia: boolean;
  funcionalidad: string;
  deterioro_cognitivo: boolean;
  riesgo_social: boolean;
  hospitalizacion_reciente: boolean;
  consultas_urgencia: number;
  gestor_rut?: string;
  observaciones?: string;
  cita_medico?: string;
  cita_enfermero?: string;
  cita_nutri?: string;
  cita_kine?: string;
  data_clinica?: any;
  profesional_rut?: string;
};

export async function saveEcicepRecord(data: EcicepSubmission) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada. Vuelva a Iniciar Sesión." };
  
  const userRut = data.profesional_rut || user.rut;

  try {
    const profQuery = await sql`SELECT nombre FROM gia_usuarios WHERE rut = ${userRut}`;
    const profNombre = profQuery.length > 0 ? profQuery[0].nombre : "Clínico Registrador";
    
    let creador = { rut: userRut, nombre: profNombre };
    
    // Find the latest active record within last 12 months (365 days)
    const prev = await sql`
      SELECT e.profesional_rut, e.data_clinica, u.nombre as profesional_nombre
      FROM gia_ecicep e
      LEFT JOIN gia_usuarios u ON e.profesional_rut = u.rut
      WHERE e.rut_paciente = ${data.rut_paciente}
        AND e.fecha_atencion >= CURRENT_DATE - INTERVAL '365 days'
      ORDER BY e.fecha_atencion DESC, e.id DESC
      LIMIT 1
    `;
    
    if (prev.length > 0) {
      const prevData = prev[0].data_clinica || {};
      if (prevData.creador) {
        creador = prevData.creador;
      } else {
        creador = {
          rut: prev[0].profesional_rut,
          nombre: prev[0].profesional_nombre || "Clínico Registrador"
        };
      }
    }

    const payloadDataClinica = {
      plan: data.data_clinica?.plan || [],
      seguimiento_telefonico: data.data_clinica?.seguimiento_telefonico || false,
      creador
    };

    await sql`
      INSERT INTO gia_ecicep (
        rut_paciente, 
        fecha_atencion, 
        categoria, 
        diagnosticos, 
        polifarmacia, 
        funcionalidad, 
        deterioro_cognitivo, 
        riesgo_social, 
        hospitalizacion_reciente, 
        consultas_urgencia, 
        gestor_rut, 
        observaciones, 
        cita_medico,
        cita_enfermero,
        cita_nutri,
        cita_kine,
        data_clinica, 
        profesional_rut
      )
      VALUES (
        ${data.rut_paciente}, 
        ${data.fecha_atencion}, 
        ${data.categoria}, 
        ${data.diagnosticos}, 
        ${data.polifarmacia}, 
        ${data.funcionalidad}, 
        ${data.deterioro_cognitivo}, 
        ${data.riesgo_social}, 
        ${data.hospitalizacion_reciente}, 
        ${data.consultas_urgencia}, 
        ${data.gestor_rut || null}, 
        ${data.observaciones || null}, 
        ${data.cita_medico || null},
        ${data.cita_enfermero || null},
        ${data.cita_nutri || null},
        ${data.cita_kine || null},
        ${sql.json(payloadDataClinica)}, 
        ${userRut}
      )
    `;

    revalidatePath("/ecicep");
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar ECICEP:", error);
    return { error: "Error de base de datos al intentar guardar la evaluación ECICEP." };
  }
}

export async function getEcicepDashboardData() {
  try {
    const result = await sql`
      WITH UltimoEcicep AS (
        SELECT *,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_atencion DESC, id DESC) as rn
        FROM gia_ecicep
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, p.fecha_nacimiento, p.sector, p.telefono, p.direccion,
        p.estado, p.motivo_egreso, p.fecha_egreso,
        e.fecha_atencion as ultima_atencion,
        e.categoria,
        e.diagnosticos,
        e.polifarmacia,
        e.funcionalidad,
        e.deterioro_cognitivo,
        e.riesgo_social,
        e.hospitalizacion_reciente,
        e.consultas_urgencia,
        e.gestor_rut,
        e.observaciones,
        e.cita_medico,
        e.cita_enfermero,
        e.cita_nutri,
        e.cita_kine,
        e.data_clinica,
        u.nombre as profesional_nombre,
        g.nombre as gestor_nombre
      FROM gia_pacientes p
      LEFT JOIN UltimoEcicep e ON p.rut = e.rut_paciente AND e.rn = 1
      LEFT JOIN gia_usuarios u ON e.profesional_rut = u.rut
      LEFT JOIN gia_usuarios g ON e.gestor_rut = g.rut
      WHERE p.estado = 'ACTIVO'
        AND p.fecha_nacimiento IS NOT NULL
        AND DATE_PART('year', AGE(CURRENT_DATE, p.fecha_nacimiento::DATE)) >= 15
        AND (p.estado_registro = 'OFICIAL' OR e.fecha_atencion IS NOT NULL)
      ORDER BY p.nombre_completo ASC
    `;
    return result;
  } catch (error) {
    console.error("Error obteniendo Dashboard ECICEP:", error);
    return [];
  }
}

export async function obtenerClinicosActivos() {
  try {
    const result = await sql`
      SELECT rut, nombre, profesion 
      FROM gia_usuarios 
      WHERE rol != 'INACTIVO' 
        AND UPPER(nombre) != 'MIGRACION SISTEMA' 
        AND UPPER(nombre) != 'MIGRACIÓN SISTEMA'
      ORDER BY nombre ASC
    `;
    return { success: true, data: result };
  } catch (error) {
    console.error("Error al obtener clínicos activos:", error);
    return { error: "Error de base de datos al listar clínicos." };
  }
}

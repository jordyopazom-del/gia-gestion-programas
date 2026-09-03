"use server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "./userActions";

export async function getMujerDashboardData() {
  try {
    const result = await sql`
      WITH UltimoPap AS (
        SELECT rut_paciente, fecha_pap, resultado, tipo_examen, adecuacion_muestra,
               motivo_insatisfactoria, fecha_resultado, derivado_upc, fecha_derivacion_upc,
               codigo_lab, periodicidad_meses, fecha_proximo_control,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_pap DESC) as rn
        FROM gia_mujer_pap
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, p.sector, p.telefono, p.direccion,
        p.estado, p.motivo_egreso, p.fecha_egreso, p.es_pad,
        p.histerectomizada, TO_CHAR(p.fecha_histerectomia, 'YYYY-MM-DD') as fecha_histerectomia, p.causa_histerectomia,
        TO_CHAR(pap.fecha_pap, 'YYYY-MM-DD') as ultima_fecha_pap,
        pap.resultado as ultimo_resultado_pap,
        pap.tipo_examen as ultimo_tipo_examen,
        pap.adecuacion_muestra as ultima_adecuacion_muestra,
        pap.motivo_insatisfactoria as ultimo_motivo_insatisfactoria,
        TO_CHAR(pap.fecha_resultado, 'YYYY-MM-DD') as ultima_fecha_resultado,
        pap.derivado_upc as ultimo_derivado_upc,
        TO_CHAR(pap.fecha_derivacion_upc, 'YYYY-MM-DD') as ultima_fecha_derivacion_upc,
        pap.codigo_lab as ultimo_codigo_lab,
        pap.periodicidad_meses as ultima_periodicidad_meses,
        TO_CHAR(pap.fecha_proximo_control, 'YYYY-MM-DD') as ultima_fecha_proximo_control
      FROM gia_pacientes p
      LEFT JOIN UltimoPap pap ON p.rut = pap.rut_paciente AND pap.rn = 1
      WHERE p.sexo = 'FEMENINO'
        AND p.estado = 'ACTIVO'
        AND (p.estado_registro = 'OFICIAL' OR pap.fecha_pap IS NOT NULL)
      ORDER BY p.nombre_completo ASC
    `;
    return { data: result as any[] };
  } catch (error: any) {
    console.error("Error al obtener datos Programa Mujer:", error);
    return { error: "Error de conexión con la base de datos." };
  }
}

export async function obtenerProfesionalesMatroneria() {
  try {
    const users = await sql`
      SELECT rut, nombre, profesion, rol 
      FROM gia_usuarios 
      WHERE rol != 'INACTIVO'
      ORDER BY nombre ASC
    `;
    return { success: true, profesionales: users as any[] };
  } catch (error: any) {
    console.error("Error al obtener lista de profesionales:", error);
    return { error: "Error de base de datos al cargar profesionales." };
  }
}

export async function guardarPap(data: { 
  rut_paciente: string, 
  fecha_pap: string, 
  resultado: string, 
  observaciones?: string,
  tipo_examen?: string,
  adecuacion_muestra?: string,
  motivo_insatisfactoria?: string,
  fecha_resultado?: string,
  derivado_upc?: boolean,
  fecha_derivacion_upc?: string,
  codigo_lab?: string,
  periodicidad_meses?: number,
  fecha_proximo_control?: string,
  profesional_rut?: string
}) {
  try {
    const user = await getCurrentUser();
    const profesional_rut = data.profesional_rut || (user ? user.rut : '12345678-5');

    await sql`
      INSERT INTO gia_mujer_pap (
        rut_paciente, fecha_pap, resultado, profesional_rut, observaciones,
        tipo_examen, adecuacion_muestra, motivo_insatisfactoria, fecha_resultado,
        derivado_upc, fecha_derivacion_upc, codigo_lab, periodicidad_meses, fecha_proximo_control
      )
      VALUES (
        ${data.rut_paciente}, ${data.fecha_pap}, ${data.resultado}, ${profesional_rut}, ${data.observaciones || ''},
        ${data.tipo_examen || 'PAP'}, ${data.adecuacion_muestra || 'SATISFACTORIA'}, ${data.motivo_insatisfactoria || null},
        ${data.fecha_resultado || null}, ${data.derivado_upc || false}, ${data.fecha_derivacion_upc || null},
        ${data.codigo_lab || null}, ${data.periodicidad_meses || 36}, ${data.fecha_proximo_control || null}
      )
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar PAP/VPH:", error);
    return { error: "Error de base de datos al guardar el examen de tamizaje." };
  }
}

export async function actualizarResultadoPap(data: {
  rut_paciente: string;
  codigo_lab: string;
  resultado: string;
  adecuacion_muestra: string;
  motivo_insatisfactoria?: string;
  fecha_resultado: string;
  derivado_upc: boolean;
  periodicidad_meses: number;
  fecha_proximo_control?: string;
}) {
  try {
    await sql`
      UPDATE gia_mujer_pap
      SET 
        codigo_lab = ${data.codigo_lab},
        resultado = ${data.resultado},
        adecuacion_muestra = ${data.adecuacion_muestra},
        motivo_insatisfactoria = ${data.motivo_insatisfactoria || null},
        fecha_resultado = ${data.fecha_resultado},
        derivado_upc = ${data.derivado_upc},
        periodicidad_meses = ${data.periodicidad_meses},
        fecha_proximo_control = ${data.fecha_proximo_control || null}
      WHERE rut_paciente = ${data.rut_paciente} AND resultado = 'PENDIENTE'
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar PAP PENDIENTE:", error);
    return { error: "Error al registrar el resultado en la base de datos." };
  }
}

export async function guardarHisterectomia(data: {
  rut_paciente: string;
  histerectomizada: boolean;
  fecha_histerectomia?: string;
  causa_histerectomia?: string;
}) {
  try {
    await sql`
      UPDATE gia_pacientes
      SET 
        histerectomizada = ${data.histerectomizada},
        fecha_histerectomia = ${data.fecha_histerectomia || null},
        causa_histerectomia = ${data.causa_histerectomia || null},
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE rut = ${data.rut_paciente}
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar histerectomía:", error);
    return { error: "Error de base de datos al actualizar antecedentes de histerectomía." };
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

export async function buscarPacientesMujerSugerencias(query: string) {
  const clean = query.trim();
  if (clean.length < 2) return { data: [] };

  const cleanRut = clean.replace(/[^0-9kK]/g, "").toUpperCase();
  const rutPattern = `%${cleanRut}%`;
  const namePattern = `%${clean.toUpperCase()}%`;

  try {
    const rows = await sql`
      SELECT 
        rut, dv, nombre_completo, TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        sector, telefono, histerectomizada, TO_CHAR(fecha_histerectomia, 'YYYY-MM-DD') as fecha_histerectomia, causa_histerectomia
      FROM gia_pacientes
      WHERE sexo = 'FEMENINO'
        AND estado = 'ACTIVO'
        AND (
          (LENGTH(${cleanRut}) >= 2 AND rut ILIKE ${rutPattern})
          OR nombre_completo ILIKE ${namePattern}
        )
      ORDER BY nombre_completo ASC
      LIMIT 8
    `;
    return { data: rows as any[] };
  } catch (error: any) {
    console.error("Error buscando sugerencias paciente mujer:", error);
    return { error: "Error en la búsqueda", data: [] };
  }
}

export async function getHistorialExamenesPaciente(rut: string) {
  try {
    const result = await sql`
      SELECT 
        m.id, 
        TO_CHAR(m.fecha_pap, 'YYYY-MM-DD') as fecha_pap, 
        m.resultado, 
        m.tipo_examen, 
        m.adecuacion_muestra, 
        m.motivo_insatisfactoria, 
        TO_CHAR(m.fecha_resultado, 'YYYY-MM-DD') as fecha_resultado, 
        m.derivado_upc, 
        TO_CHAR(m.fecha_derivacion_upc, 'YYYY-MM-DD') as fecha_derivacion_upc,
        m.observaciones,
        m.profesional_rut,
        u.nombre as profesional_nombre,
        m.codigo_lab,
        m.periodicidad_meses,
        TO_CHAR(m.fecha_proximo_control, 'YYYY-MM-DD') as fecha_proximo_control
      FROM gia_mujer_pap m
      LEFT JOIN gia_usuarios u ON m.profesional_rut = u.rut
      WHERE m.rut_paciente = ${rut}
      ORDER BY m.fecha_pap DESC
    `;
    return { success: true, examenes: result as any[] };
  } catch (error: any) {
    console.error("Error al obtener historial de exámenes CaCu:", error);
    return { error: "Error de base de datos al obtener el historial de exámenes." };
  }
}


export async function getEmbarazadasData() {
  try {
    const result = await sql`
      WITH EmbarazoActivo AS (
        SELECT id, rut, TO_CHAR(fum, 'YYYY-MM-DD') as fum, TO_CHAR(fpp, 'YYYY-MM-DD') as fpp,
               TO_CHAR(fecha_ultimo_control, 'YYYY-MM-DD') as fecha_ultimo_control, 
               TO_CHAR(fecha_proximo_control, 'YYYY-MM-DD') as fecha_proximo_control,
               estado_nutricional, observaciones, estado
        FROM gia_mujer_embarazos
        WHERE estado = 'EMBARAZO'
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, 
        p.sector, p.telefono, p.direccion,
        p.estado, p.es_pad,
        e.id as embarazo_id,
        e.fum, e.fpp, e.fecha_ultimo_control, e.fecha_proximo_control,
        e.estado_nutricional, e.observaciones, e.estado as estado_embarazo
      FROM gia_pacientes p
      INNER JOIN EmbarazoActivo e ON p.rut = e.rut
      WHERE p.sexo = 'FEMENINO'
      ORDER BY p.nombre_completo ASC
    `;
    return { data: result as any[] };
  } catch (error: any) {
    console.error("Error al obtener datos de Embarazadas:", error);
    return { error: "Error de conexión con la base de datos." };
  }
}

export async function ingresarEmbarazo(data: {
  rut_paciente: string,
  fum: string,
  fpp: string,
  fecha_ultimo_control?: string,
  fecha_proximo_control?: string,
  estado_nutricional?: string,
  observaciones?: string
}) {
  try {
    await sql`
      INSERT INTO gia_mujer_embarazos (
        rut, fum, fpp, fecha_ultimo_control, fecha_proximo_control,
        estado_nutricional, observaciones, estado
      )
      VALUES (
        ${data.rut_paciente}, ${data.fum}, ${data.fpp}, 
        ${data.fecha_ultimo_control || null}, ${data.fecha_proximo_control || null},
        ${data.estado_nutricional || null}, ${data.observaciones || null}, 'EMBARAZO'
      )
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar Embarazo:", error);
    return { error: "Error de base de datos al guardar el embarazo." };
  }
}

export async function cambiarEstadoEmbarazo(id: number, nuevoEstado: string) {
  try {
    await sql`
      UPDATE gia_mujer_embarazos
      SET estado = ${nuevoEstado}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar estado del embarazo:", error);
    return { error: "Error al actualizar estado del embarazo." };
  }
}

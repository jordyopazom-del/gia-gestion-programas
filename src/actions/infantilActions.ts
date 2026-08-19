"use server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "./userActions";

export async function getInfantilDashboardData() {
  try {
    const result = await sql`
      WITH UltimoControl AS (
        SELECT rut_paciente, 
               ultimo_control_medico, ultimo_control_enfermera, ultimo_control_nutri, ultimo_control_dental,
               proximo_control, estamento_proximo_control, es_naneas, es_caso_social, condicion_especial,
               estado_nutricional, dsm_resultado, tipo_evaluacion_dsm, dsm_detalle, estado_programa, observaciones,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_registro DESC) as rn
        FROM gia_infantil
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, 
        p.sector, p.telefono, p.direccion, p.estado, p.motivo_egreso, p.fecha_egreso, 
        p.es_pad,
        inf.es_naneas, inf.es_caso_social,
        -- Extraer edad en años y meses para frontend
        EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento)) as edad_anios,
        EXTRACT(MONTH FROM age(CURRENT_DATE, p.fecha_nacimiento)) as edad_meses,
        EXTRACT(DAY FROM age(CURRENT_DATE, p.fecha_nacimiento)) as edad_dias,
        
        TO_CHAR(inf.ultimo_control_medico, 'YYYY-MM-DD') as ultimo_control_medico,
        TO_CHAR(inf.ultimo_control_enfermera, 'YYYY-MM-DD') as ultimo_control_enfermera,
        TO_CHAR(inf.ultimo_control_nutri, 'YYYY-MM-DD') as ultimo_control_nutri,
        TO_CHAR(inf.ultimo_control_dental, 'YYYY-MM-DD') as ultimo_control_dental,
        TO_CHAR(inf.proximo_control, 'YYYY-MM-DD') as proximo_control,
        inf.estamento_proximo_control,
        inf.condicion_especial,
        inf.estado_nutricional,
        inf.dsm_resultado,
        inf.tipo_evaluacion_dsm,
        inf.dsm_detalle,
        inf.estado_programa,
        inf.observaciones
      FROM gia_pacientes p
      LEFT JOIN UltimoControl inf ON p.rut = inf.rut_paciente AND inf.rn = 1
      WHERE p.estado = 'ACTIVO' 
        AND p.estado_registro = 'OFICIAL'
        -- Solo traer infantes y a los que cumplen 10 años en el año actual (egresados del año)
        AND EXTRACT(YEAR FROM p.fecha_nacimiento) >= (EXTRACT(YEAR FROM CURRENT_DATE) - 10)
      ORDER BY p.nombre_completo ASC
    `;
    
    return { data: result as any[] };
  } catch (error: any) {
    console.error("Error al obtener datos Programa Infantil:", error);
    return { error: "Error de conexión con la base de datos." };
  }
}

export async function guardarControlInfantil(data: { 
  rut_paciente: string, 
  ultimo_control_medico?: string | null,
  ultimo_control_enfermera?: string | null,
  ultimo_control_nutri?: string | null,
  ultimo_control_dental?: string | null,
  atencion_hoy?: boolean,
  proximo_control?: string | null,
  estamento_proximo_control?: string | null,
  es_naneas?: boolean,
  es_caso_social?: boolean,
  condicion_especial?: string | null,
  estado_nutricional?: string | null,
  dsm_resultado?: string | null,
  tipo_evaluacion_dsm?: string | null,
  dsm_detalle?: any,
  estado_programa?: string | null,
  observaciones?: string | null
}) {
  try {
    const user = await getCurrentUser();
    const profesional_rut = user ? user.rut : '12345678-5';
    const profesion = user ? (user.profesion || '').toUpperCase() : '';

    const hoy = new Date().toISOString().split('T')[0];
    
    let uMedico = data.ultimo_control_medico || null;
    let uEnfermera = data.ultimo_control_enfermera || null;
    let uNutri = data.ultimo_control_nutri || null;
    let uDental = data.ultimo_control_dental || null;

    if (data.atencion_hoy) {
      if (profesion.includes('MEDIC') || profesion.includes('MÉDIC')) uMedico = hoy;
      else if (profesion.includes('ENFERMER')) uEnfermera = hoy;
      else if (profesion.includes('NUTRI')) uNutri = hoy;
      else if (profesion.includes('ODONT') || profesion.includes('DENTIS')) uDental = hoy;
    }

    await sql`
      INSERT INTO gia_infantil (
        rut_paciente, 
        ultimo_control_medico, ultimo_control_enfermera, ultimo_control_nutri, ultimo_control_dental,
        proximo_control, estamento_proximo_control, es_naneas, es_caso_social, condicion_especial,
        estado_nutricional, dsm_resultado, tipo_evaluacion_dsm, dsm_detalle, estado_programa, observaciones,
        profesional_rut
      )
      VALUES (
        ${data.rut_paciente}, 
        ${uMedico}, ${uEnfermera}, 
        ${uNutri}, ${uDental},
        ${data.proximo_control || null}, ${data.estamento_proximo_control || null}, 
        ${data.es_naneas || false}, ${data.es_caso_social || false}, ${data.condicion_especial || null},
        ${data.estado_nutricional || null}, ${data.dsm_resultado || null}, ${data.tipo_evaluacion_dsm || null}, 
        ${data.dsm_detalle ? sql.json(data.dsm_detalle) : null},
        ${data.estado_programa || 'ACTIVO'}, ${data.observaciones || ''},
        ${profesional_rut}
      )
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar Control Infantil:", error);
    return { error: "Error de base de datos al guardar el control infantil." };
  }
}


export async function buscarPacienteInfantilPorRut(rutInput: string) {
  const cleanRut = rutInput.replace(/[^0-9kK]/g, "").toUpperCase();
  if (cleanRut.length < 2) return { error: "RUT inválido" };
  
  const rutNum = cleanRut.slice(0, -1);
  
  try {
    const rows = await sql`
      WITH UltimoControl AS (
        SELECT rut_paciente, 
               ultimo_control_medico, ultimo_control_enfermera, ultimo_control_nutri, ultimo_control_dental,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_registro DESC) as rn
        FROM gia_infantil
      )
      SELECT p.*,
        EXTRACT(YEAR FROM age(CURRENT_DATE, p.fecha_nacimiento)) as edad_anios,
        EXTRACT(MONTH FROM age(CURRENT_DATE, p.fecha_nacimiento)) as edad_meses,
        EXTRACT(DAY FROM age(CURRENT_DATE, p.fecha_nacimiento)) as edad_dias,
        TO_CHAR(inf.ultimo_control_medico, 'YYYY-MM-DD') as hist_medico,
        TO_CHAR(inf.ultimo_control_enfermera, 'YYYY-MM-DD') as hist_enfermera,
        TO_CHAR(inf.ultimo_control_nutri, 'YYYY-MM-DD') as hist_nutri,
        TO_CHAR(inf.ultimo_control_dental, 'YYYY-MM-DD') as hist_dental
      FROM gia_pacientes p
      LEFT JOIN UltimoControl inf ON p.rut = inf.rut_paciente AND inf.rn = 1
      WHERE p.rut = ${rutNum}
    `;
    if (rows.length === 0) return { error: "Paciente no encontrado en el padrón." };
    
    const p = rows[0];
    
    return { data: p };
  } catch (error: any) {
    console.error("Error al buscar paciente infantil:", error);
    return { error: "Error de conexión con la base de datos." };
  }
}

export async function registrarNspInfantil(data: {
  rut_paciente: string;
  fecha_nsp: string;
  estamento: string;
}) {
  try {
    const user = await getCurrentUser();
    const profesional_rut = user ? user.rut : '12345678-5';

    const res = await buscarPacienteInfantilPorRut(data.rut_paciente);
    if (res.error || !res.data) throw new Error(res.error || "Paciente no encontrado");
    
    const p = res.data;

    await sql`
      INSERT INTO gia_infantil (
        rut_paciente, 
        ultimo_control_medico, ultimo_control_enfermera, ultimo_control_nutri, ultimo_control_dental,
        proximo_control, estamento_proximo_control, es_naneas, es_caso_social, condicion_especial,
        estado_nutricional, dsm_resultado, tipo_evaluacion_dsm, dsm_detalle, 
        estado_programa, observaciones,
        profesional_rut, fecha_registro
      )
      VALUES (
        ${data.rut_paciente}, 
        ${p.hist_medico || null}, ${p.hist_enfermera || null}, 
        ${p.hist_nutri || null}, ${p.hist_dental || null},
        ${p.proximo_control || null}, ${p.estamento_proximo_control || null}, 
        ${p.es_naneas || false}, ${p.es_caso_social || false}, ${p.condicion_especial || null},
        ${p.estado_nutricional || null}, ${p.dsm_resultado || null}, ${p.tipo_evaluacion_dsm || null}, 
        ${p.dsm_detalle ? sql.json(p.dsm_detalle) : null},
        'INASISTENTE', ${'NSP ' + data.estamento},
        ${profesional_rut}, ${data.fecha_nsp}
      )
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al registrar NSP Infantil:", error);
    return { error: "Error de base de datos al registrar inasistencia." };
  }
}

export async function editarPacienteInfantilAdmin(data: {
  rut_paciente: string;
  dsm_resultado?: string | null;
  estado_nutricional?: string | null;
  es_naneas?: boolean;
  es_caso_social?: boolean;
  condicion_especial?: string | null;
  proximo_control?: string | null;
  estamento_proximo_control?: string | null;
  observaciones?: string | null;
}) {
  try {
    // Obtenemos el ID del último registro para actualizarlo y no alterar historiales
    const rows = await sql`
      SELECT id FROM gia_infantil 
      WHERE rut_paciente = ${data.rut_paciente} 
      ORDER BY fecha_registro DESC 
      LIMIT 1
    `;
    
    if (rows.length === 0) {
      // Si no tiene registros previos, usamos la misma funcion de guardar para crear uno vacio
      return await guardarControlInfantil({
        rut_paciente: data.rut_paciente,
        dsm_resultado: data.dsm_resultado,
        estado_nutricional: data.estado_nutricional,
        es_naneas: data.es_naneas,
        es_caso_social: data.es_caso_social,
        condicion_especial: data.condicion_especial,
        proximo_control: data.proximo_control,
        estamento_proximo_control: data.estamento_proximo_control,
        observaciones: data.observaciones
      });
    }
    
    const lastId = rows[0].id;
    
    await sql`
      UPDATE gia_infantil
      SET 
        dsm_resultado = ${data.dsm_resultado ?? null},
        estado_nutricional = ${data.estado_nutricional ?? null},
        es_naneas = ${data.es_naneas ?? false},
        es_caso_social = ${data.es_caso_social ?? false},
        condicion_especial = ${data.condicion_especial ?? null},
        proximo_control = ${data.proximo_control ?? null},
        estamento_proximo_control = ${data.estamento_proximo_control ?? null},
        observaciones = ${data.observaciones ?? null}
      WHERE id = ${lastId}
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Error al editar paciente infantil:", error);
    return { error: "Error de base de datos al editar paciente." };
  }
}

"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getRespiratorioData() {
  try {
    const rows = await sql`
      SELECT 
        p.*,
        r_last.id as ficha_id,
        r_last.diagnostico,
        r_last.nivel_control,
        r_last.data_clinica,
        r_last.cita_medico,
        r_last.cita_kine,
        r_last.cita_espiro,
        r_last.observaciones,
        r_last.motivo_egreso as estado_programa,
        COALESCE(
          (SELECT fecha_atencion FROM gia_respiratorio WHERE rut_paciente = p.rut AND tipo_atencion = 'CONTROL MÉDICO' ORDER BY fecha_atencion DESC LIMIT 1),
          r_last.cita_medico
        ) as last_med,
        COALESCE(
          (SELECT fecha_atencion FROM gia_respiratorio WHERE rut_paciente = p.rut AND tipo_atencion = 'CONTROL KINESIOLÓGICO' ORDER BY fecha_atencion DESC LIMIT 1),
          r_last.cita_kine
        ) as last_kin,
        COALESCE(
          (SELECT fecha_atencion FROM gia_respiratorio WHERE rut_paciente = p.rut AND tipo_atencion = 'ESPIROMETRÍA' ORDER BY fecha_atencion DESC LIMIT 1),
          r_last.cita_espiro
        ) as last_esp,
        r_last.fecha_atencion as ultima_atencion_global,
        u.nombre as profesional_nombre
      FROM gia_pacientes p
      INNER JOIN LATERAL (
        SELECT * FROM gia_respiratorio 
        WHERE rut_paciente = p.rut 
        ORDER BY id DESC 
        LIMIT 1
      ) r_last ON true
      LEFT JOIN gia_usuarios u ON r_last.profesional_rut = u.rut
      WHERE p.estado = 'ACTIVO'
      ORDER BY p.nombre_completo ASC
    `;
    return rows;
  } catch (error) {
    console.error("Error al obtener datos respiratorios:", error);
    return [];
  }
}

export async function buscarPacienteRespiratorio(rut: string) {
  try {
    // Limpiar RUT (quitar puntos, guiones y quedarnos solo con el cuerpo)
    const cleanRut = rut.split('-')[0].replace(/\./g, "").trim();
    const rows = await sql`SELECT * FROM gia_pacientes WHERE rut = ${cleanRut}`;
    
    if (rows.length === 0) return { error: "Paciente no encontrado en el padrón interconectado." };
    
    const p = rows[0];
    
    // Obtener última ficha respiratoria
    const fRows = await sql`
      SELECT * FROM gia_respiratorio 
      WHERE rut_paciente = ${p.rut} 
      ORDER BY fecha_atencion DESC, id DESC 
      LIMIT 1
    `;
    
    return { error: null, data: p, ficha: fRows[0] || null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function guardarAtencionRespiratoria(data: any) {
  try {
    await sql`
      INSERT INTO gia_respiratorio (
        rut_paciente, 
        fecha_atencion, 
        tipo_atencion,
        diagnostico, 
        nivel_control, 
        cita_medico, 
        cita_kine, 
        cita_espiro, 
        profesional_rut,
        es_pad,
        es_inasistente,
        observaciones,
        data_clinica
      ) VALUES (
        ${data.rut_paciente}, 
        ${data.fecha_atencion}, 
        ${data.tipo_atencion},
        ${data.diagnostico}, 
        ${data.nivel_control}, 
        ${data.cita_medico || null}, 
        ${data.cita_kine || null}, 
        ${data.cita_espiro || null}, 
        ${data.profesional_rut},
        ${data.es_pad || false},
        ${data.es_inasistente || false},
        ${data.observaciones || ''},
        ${JSON.stringify(data.data_clinica || {})}
      )
    `;

    // Sincronizar PAD en el maestro si es necesario
    if (data.es_pad !== undefined) {
      await sql`UPDATE gia_pacientes SET es_pad = ${data.es_pad} WHERE rut = ${data.rut_paciente}`;
    }

    revalidatePath("/respiratorio");
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar atención respiratoria:", error);
    return { success: false, error: error.message };
  }
}

export async function updateDiagnosticoControl(id: number, diagnostico: string, nivelControl: string, dataClinica?: any, observaciones?: string) {
  try {
    if (dataClinica !== undefined && observaciones !== undefined) {
      await sql`
        UPDATE gia_respiratorio 
        SET diagnostico = ${diagnostico.toUpperCase()}, 
            nivel_control = ${nivelControl.toUpperCase()},
            data_clinica = ${JSON.stringify(dataClinica)},
            observaciones = ${observaciones}
        WHERE id = ${id}
      `;
    } else if (dataClinica !== undefined) {
      await sql`
        UPDATE gia_respiratorio 
        SET diagnostico = ${diagnostico.toUpperCase()}, 
            nivel_control = ${nivelControl.toUpperCase()},
            data_clinica = ${JSON.stringify(dataClinica)}
        WHERE id = ${id}
      `;
    } else if (observaciones !== undefined) {
      await sql`
        UPDATE gia_respiratorio 
        SET diagnostico = ${diagnostico.toUpperCase()}, 
            nivel_control = ${nivelControl.toUpperCase()},
            observaciones = ${observaciones}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE gia_respiratorio 
        SET diagnostico = ${diagnostico.toUpperCase()}, 
            nivel_control = ${nivelControl.toUpperCase()}
        WHERE id = ${id}
      `;
    }
    revalidatePath("/respiratorio");
    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar diagnóstico:", error);
    return { success: false, error: error.message };
  }
}

export async function egresarPacienteRespiratorio(data: { ficha_id: number, motivo: string, fecha: string, observaciones: string, profesional_rut: string }) {
  try {
    // 1. Obtener datos de la ficha actual para no perder info
    const rows = await sql`SELECT * FROM gia_respiratorio WHERE id = ${data.ficha_id}`;
    if (rows.length === 0) throw new Error("Ficha no encontrada");
    const old = rows[0];

    // 2. Insertar un nuevo registro que marque el egreso
    await sql`
      INSERT INTO gia_respiratorio (
        rut_paciente, 
        fecha_atencion, 
        tipo_atencion,
        diagnostico, 
        nivel_control, 
        profesional_rut,
        motivo_egreso,
        observaciones,
        data_clinica
      ) VALUES (
        ${old.rut_paciente}, 
        ${data.fecha}, 
        'EGRESO DEL PROGRAMA',
        ${old.diagnostico}, 
        ${old.nivel_control}, 
        ${data.profesional_rut},
        ${data.motivo},
        ${data.observaciones},
        ${JSON.stringify({ ...old.data_clinica, fecha_egreso: data.fecha })}
      )
    `;

    revalidatePath("/respiratorio");
    return { success: true };
  } catch (error: any) {
    console.error("Error al egresar paciente:", error);
    return { success: false, error: error.message };
  }
}

export async function togglePadStatus(rut: string, currentStatus: boolean) {
  try {
    const newStatus = !currentStatus;
    // Actualizar en el maestro de pacientes
    await sql`UPDATE gia_pacientes SET es_pad = ${newStatus} WHERE rut = ${rut}`;
    // Actualizar en la última ficha respiratoria para que se vea en el listado
    await sql`
      UPDATE gia_respiratorio 
      SET es_pad = ${newStatus} 
      WHERE id = (
        SELECT id FROM gia_respiratorio 
        WHERE rut_paciente = ${rut} 
        ORDER BY fecha_atencion DESC, id DESC 
        LIMIT 1
      )
    `;
    revalidatePath("/respiratorio");
    return { success: true };
  } catch (error: any) {
    console.error("Error al cambiar estado PAD:", error);
    return { success: false, error: error.message };
  }
}

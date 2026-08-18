import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS gia_infantil (
        id SERIAL PRIMARY KEY,
        rut_paciente TEXT REFERENCES gia_pacientes(rut) ON DELETE CASCADE,
        ultimo_control_medico DATE,
        ultimo_control_enfermera DATE,
        ultimo_control_nutri DATE,
        ultimo_control_dental DATE,
        proximo_control DATE,
        estamento_proximo_control TEXT,
        es_naneas BOOLEAN DEFAULT FALSE,
        es_caso_social BOOLEAN DEFAULT FALSE,
        condicion_especial TEXT,
        estado_nutricional TEXT,
        dsm_resultado TEXT,
        tipo_evaluacion_dsm TEXT,
        dsm_detalle JSONB,
        estado_programa TEXT DEFAULT 'ACTIVO',
        observaciones TEXT,
        profesional_rut TEXT REFERENCES gia_usuarios(rut),
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await sql`ALTER TABLE gia_infantil ADD COLUMN IF NOT EXISTS dsm_detalle JSONB`;
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({ 
      success: true, 
      message: "Tabla gia_infantil creada exitosamente (o ya existía)." 
    });
  } catch (error: any) {
    console.error("Error al crear tabla gia_infantil:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

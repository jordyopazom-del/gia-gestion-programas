import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Eliminar registros duplicados dejando solo el más reciente por RUT
    const deleted = await sql`
      DELETE FROM gia_mujer_embarazos
      WHERE id NOT IN (
        SELECT MAX(id) FROM gia_mujer_embarazos
        WHERE estado = 'EMBARAZO'
        GROUP BY rut
      )
      AND estado = 'EMBARAZO'
      RETURNING id, rut
    `;

    // Agregar restricción única para que nunca más pase
    try {
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS gia_mujer_embarazos_rut_activo_unique
        ON gia_mujer_embarazos (rut)
        WHERE estado = 'EMBARAZO'
      `;
    } catch (e: any) {
      // si ya existe, ok
    }

    return NextResponse.json({ success: true, eliminados: deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

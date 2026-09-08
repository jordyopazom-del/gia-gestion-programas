import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nomina = searchParams.get("numero");

    if (!nomina) {
      // Si no se pasa número, lista las nóminas que existen
      const nominas = await sql`
        SELECT numero_nomina, COUNT(*) as cantidad, MIN(fecha_envio_nomina) as fecha
        FROM gia_mujer_pap
        WHERE numero_nomina IS NOT NULL
        GROUP BY numero_nomina
        ORDER BY fecha DESC
      `;
      return NextResponse.json({ nominas });
    }

    // Resetea la nómina indicada
    const resultado = await sql`
      UPDATE gia_mujer_pap
      SET numero_nomina = NULL, fecha_envio_nomina = NULL
      WHERE numero_nomina = ${nomina}
      RETURNING id, rut_paciente
    `;
    return NextResponse.json({ 
      success: true, 
      message: `Nómina ${nomina} reseteada. ${resultado.length} registros restaurados a "pendiente".`,
      registros: resultado 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

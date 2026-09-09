import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await sql`SELECT COUNT(*) as total FROM gia_infantil`;
    const totalAntes = Number(count.rows[0].total);
    await sql`DELETE FROM gia_infantil`;
    const countDespues = await sql`SELECT COUNT(*) as total FROM gia_infantil`;
    return NextResponse.json({ 
      success: true, 
      message: "Módulo Infantil reiniciado correctamente.",
      registros_eliminados: totalAntes,
      registros_restantes: Number(countDespues.rows[0].total)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

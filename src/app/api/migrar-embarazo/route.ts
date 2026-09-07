import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    await sql`ALTER TABLE gia_mujer_embarazos ADD COLUMN profesional_rut VARCHAR(20);`;
    return NextResponse.json({ success: true, message: "Migración profesional_rut exitosa" });
  } catch (error: any) {
    if (error.code === '42701') {
      return NextResponse.json({ success: true, message: "La columna ya existe" });
    }
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

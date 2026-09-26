import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await sql.begin(async (sql) => {
      await sql`UPDATE gia_usuarios SET profesion = 'KINESIÓLOGO(A)' WHERE profesion ILIKE '%KINE%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'TERAPEUTA OCUPACIONAL' WHERE profesion ILIKE '%TERAP%' OR profesion ILIKE '%OCUPACIONAL%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'ENFERMERA(O)' WHERE profesion ILIKE '%ENFERMER%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'INGENIERO(A) / TI' WHERE profesion ILIKE '%INFORM%' OR profesion ILIKE '%ING%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'MATRONA / MATRÓN' WHERE profesion ILIKE '%MATRON%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'PSICÓLOGO(A)' WHERE profesion ILIKE '%PSICOL%' OR profesion ILIKE '%PSICÓL%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'ODONTÓLOGO(A)' WHERE profesion ILIKE '%ODONT%' OR profesion ILIKE '%DENTIST%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'TRABAJADOR(A) SOCIAL' WHERE profesion ILIKE '%SOCIAL%' OR profesion ILIKE '%ASISTENTE%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'NUTRICIONISTA' WHERE profesion ILIKE '%NUTRI%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'MÉDICO' WHERE profesion ILIKE '%MEDIC%' OR profesion ILIKE '%MÉDIC%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'TENS' WHERE profesion ILIKE '%TENS%'`;
      await sql`UPDATE gia_usuarios SET profesion = 'ADMINISTRATIVO' WHERE profesion ILIKE '%ADMIN%'`;
    });
    return NextResponse.json({ success: true, message: "Profesiones normalizadas exitosamente" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

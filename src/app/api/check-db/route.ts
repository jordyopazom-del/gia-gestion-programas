import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const res = await sql`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'gia_mujer_embarazos'`;
    const constraints = await sql`SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'gia_mujer_embarazos'::regclass`;
    return NextResponse.json({ columns: res, constraints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { sql } from "@vercel/postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  try {
    const result = await sql`
      SELECT id, rut_paciente, fecha_atencion, categoria 
      FROM gia_ecicep 
      ORDER BY id DESC 
      LIMIT 5;
    `;
    console.log(result.rows);
  } catch (e) {
    console.error(e);
  }
}

main();

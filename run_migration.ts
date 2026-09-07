import { sql } from "./src/lib/db";
async function run() {
  try {
    await sql`ALTER TABLE gia_mujer_embarazos ADD COLUMN alto_riesgo_obstetrico BOOLEAN DEFAULT false;`;
    console.log("Migration added ARO");
  } catch(e) {
    console.error(e);
  }
}
run();

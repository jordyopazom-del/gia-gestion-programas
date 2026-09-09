import { sql } from "./src/lib/db";
async function run() {
  await sql`
    ALTER TABLE gia_infantil
    ADD COLUMN IF NOT EXISTS prox_control_medico VARCHAR(7),
    ADD COLUMN IF NOT EXISTS prox_control_enfermera VARCHAR(7),
    ADD COLUMN IF NOT EXISTS prox_control_nutri VARCHAR(7),
    ADD COLUMN IF NOT EXISTS prox_control_dental VARCHAR(7);
  `;
  console.log("Migration executed!");
  process.exit(0);
}
run();

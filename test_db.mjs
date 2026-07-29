import { sql } from "./src/lib/db.js";

async function run() {
  try {
    const res = await sql`SELECT * FROM gia_usuarios WHERE email = 'jordyopazom@gmail.com'`;
    console.log("DB RESULT:", res);
  } catch(e) {
    console.log("DB ERROR:", e);
  }
  process.exit(0);
}
run();

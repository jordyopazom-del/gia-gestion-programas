import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/jopazo/Mis proyectos IA/gia-gestion-programas/.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function run() {
  await sql`
    ALTER TABLE gia_infantil 
    ADD COLUMN en_sala_estimulacion BOOLEAN DEFAULT FALSE;
  `;
  console.log("Column added");
  process.exit(0);
}
run().catch(console.error);

import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/jopazo/Mis proyectos IA/gia-gestion-programas/.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function run() {
  const columns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'gia_pacientes'
  `;
  console.log(columns.map(c => c.column_name));
  process.exit(0);
}
run().catch(console.error);

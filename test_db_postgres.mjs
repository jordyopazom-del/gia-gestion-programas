import postgres from 'postgres';

const sql = postgres('postgresql://postgres:NcmpOjPIgaXyqPgHmhkARYDkKQzneHAq@shortline.proxy.rlwy.net:18107/railway');

async function run() {
  try {
    const users = await sql`SELECT * FROM gia_usuarios WHERE email = 'jordyopazom@gmail.com'`;
    console.log("DB RESULT:", users);
  } catch(e) {
    console.log("DB ERROR:", e);
  }
  process.exit(0);
}
run();

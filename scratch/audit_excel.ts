import * as XLSX from 'xlsx';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
  const workbook = XLSX.readFile(filePath);
  
  let totalRows = 0;
  let sinRut = 0;
  let duplicadosExcel = 0;
  let ignoradosPadron = 0;
  let rutsUnicosProcesados = new Set();
  
  for (const sheetName of workbook.SheetNames) {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    totalRows += data.length;
    
    for (const row of data as any[]) {
      const rawRut = row['Rut'] || row['RUT'] || row['rut'] || Object.values(row).find(v => typeof v === 'string' && v.includes('-'));
      if (!rawRut) {
        sinRut++;
        continue;
      }
      
      const cleanRutStr = String(rawRut).replace(/\./g, '').trim().toUpperCase();
      const parts = cleanRutStr.split('-');
      const rutNum = parseInt(parts[0]);
      if (isNaN(rutNum)) {
        sinRut++;
        continue;
      }

      // Check DB
      const existingPaciente = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${rutNum}`;
      if (existingPaciente.length === 0) {
        ignoradosPadron++;
      } else {
        rutsUnicosProcesados.add(rutNum);
      }
    }
  }
  
  console.log(`Auditoría Excel:`);
  console.log(`- Total de filas con algún dato (sheet_to_json): ${totalRows}`);
  console.log(`- Filas saltadas por no tener un RUT válido: ${sinRut}`);
  console.log(`- Filas ignoradas por no existir en el Padrón: ${ignoradosPadron}`);
  console.log(`- RUTs Únicos que sí estaban en Padrón: ${rutsUnicosProcesados.size}`);
  
  const empams = await sql`SELECT count(*) FROM gia_empam WHERE profesional_rut = '99999999-9'`;
  console.log(`- Atenciones que logramos inyectar (Migración Real): ${empams[0].count}`);
  await sql.end();
}
run();

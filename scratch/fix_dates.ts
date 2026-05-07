import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function excelNumberToMonthYear(val: string): string {
  const num = parseInt(val, 10);
  if (!isNaN(num) && num > 40000 && num < 50000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  return val;
}

async function fix() {
  console.log('🔧 Iniciando corrección de fechas seriales de Excel...');
  const rows = await sql`SELECT id, data_clinica FROM gia_respiratorio`; // Sacamos la condición WHERE para ver si pilla algo
  
  let fixes = 0;

  for (const row of rows) {
    let changed = false;
    let dataCli: any = {};
    
    try {
      dataCli = typeof row.data_clinica === 'string' ? JSON.parse(row.data_clinica) : (row.data_clinica || {});
    } catch(e) {
      continue;
    }
    
    // Función helper interna
    const cleanAndCheck = (val: any) => {
      if (!val) return null;
      const str = val.toString().trim();
      if (/^\d+$/.test(str)) {
         return excelNumberToMonthYear(str);
      }
      return null;
    };

    // Fix Médico
    const fixedMed = cleanAndCheck(dataCli.proximo_medico_label);
    if (fixedMed) { dataCli.proximo_medico_label = fixedMed; changed = true; }
    
    // Fix Kine
    const fixedKin = cleanAndCheck(dataCli.proximo_kine_label);
    if (fixedKin) { dataCli.proximo_kine_label = fixedKin; changed = true; }

    // Fix Espiro
    const fixedEsp = cleanAndCheck(dataCli.proximo_espiro_label);
    if (fixedEsp) { dataCli.proximo_espiro_label = fixedEsp; changed = true; }

    if (changed) {
      await sql`UPDATE gia_respiratorio SET data_clinica = ${JSON.stringify(dataCli)} WHERE id = ${row.id}`;
      fixes++;
    }
  }

  console.log(`✅ Corrección terminada. Se arreglaron ${fixes} registros.`);
  process.exit(0);
}

fix();

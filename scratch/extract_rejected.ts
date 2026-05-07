import * as XLSX from 'xlsx';
import { sql } from '../src/lib/db';
import * as path from 'path';
import * as fs from 'fs';

async function extractRejected() {
  console.log('🔍 Buscando pacientes que no pasaron el Sello de Seguridad...');
  
  const excelPath = path.join(process.cwd(), 'respiratorio_data.xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  const rejected: any[] = [];

  for (const row of data) {
    const rawRut = row['RUT']?.toString() || '';
    if (!rawRut) continue;

    const cleanRut = rawRut.split('-')[0].replace(/\./g, '').trim();
    
    // Verificar si está en el Padrón
    const [paciente] = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${cleanRut}`;

    if (!paciente) {
      rejected.push({
        'RUT ORIGINAL': rawRut,
        'NOMBRE EN EXCEL': row['Nombre completo'] || row['Nombre'] || 'Sin nombre',
        'DIAGNOSTICO': row['Diagnostico'],
        'OBSERVACION': 'No encontrado en Padrón Maestro (Probablemente no inscrito o RUT erróneo)'
      });
    }
  }

  // Crear nuevo Excel con los rechazados
  const ws = XLSX.utils.json_to_sheet(rejected);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rechazados');

  const outputPath = path.join(process.cwd(), 'RECHAZADOS_MIGRACION_RESPIRATORIO.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log(`✅ Reporte generado: ${rejected.length} pacientes rechazados.`);
  console.log(`📂 Ubicación: ${outputPath}`);
}

extractRejected().catch(console.error);

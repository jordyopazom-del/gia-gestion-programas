import * as XLSX from 'xlsx';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);
const filePath = '/Users/jopazo/Downloads/Corte percápita abril 2026.xlsx';

function excelDateToISO(excelDate: number): string | null {
  if (!excelDate || isNaN(excelDate)) return null;
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
}

async function run() {
  try {
    console.log("1. Leyendo Excel...");
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Leídas ${rows.length} filas del archivo.`);

    // 2. Obtener pacientes existentes en BD (RUTs son numéricos puros)
    console.log("2. Consultando pacientes existentes en la base de datos...");
    const existentes = await sql`SELECT rut FROM gia_pacientes`;
    const setExistentes = new Set(existentes.map(p => p.rut.trim().toUpperCase()));
    console.log(`Pacientes locales en BD: ${setExistentes.size}`);

    // 3. Filtrar los faltantes y prepararlos
    const faltantes: any[] = [];
    for (const row of rows) {
      const run = row.RUN;
      if (!run) continue;

      const runStr = String(run).trim().toUpperCase();
      const dv = String(row.DV).trim().toUpperCase();

      // Comparación de RUT puro (numérico)
      if (!setExistentes.has(runStr)) {
        const nombre_completo = `${row.NOMBRES || ''} ${row.APELLIDO_PATERNO || ''} ${row.APELLIDO_MATERNO || ''}`.trim().replace(/\s+/g, ' ').toUpperCase();
        const fecha_nacimiento = excelDateToISO(row.FECHA_NACIMIENTO);
        
        let sexo = 'MASCULINO';
        if (row.GENERO === 'MUJER') sexo = 'FEMENINO';

        faltantes.push({
          rut: runStr, // Solo números
          dv,
          nombre_completo,
          fecha_nacimiento,
          sexo,
          sector: 'SIN SECTOR',
          estado: 'ACTIVO',
          estado_registro: 'PROVISORIO'
        });
      }
    }

    console.log(`\nBrecha identificada: ${faltantes.length} pacientes de FONASA no están en el aplicativo.`);

    if (faltantes.length === 0) {
      console.log("No hay pacientes nuevos que importar.");
      process.exit(0);
    }

    // 4. Insertar en lotes masivos a los faltantes
    console.log(`3. Insertando ${faltantes.length} pacientes faltantes como PROVISORIOS (lotes de 1000)...`);
    
    const tamanoLote = 1000;
    for (let i = 0; i < faltantes.length; i += tamanoLote) {
      const lote = faltantes.slice(i, i + tamanoLote);
      
      const values = lote.map(p => [
        p.rut,
        p.dv,
        p.nombre_completo,
        p.fecha_nacimiento,
        p.sexo,
        p.sector,
        p.estado,
        p.estado_registro
      ]);

      await sql`
        INSERT INTO gia_pacientes (rut, dv, nombre_completo, fecha_nacimiento, sexo, sector, estado, estado_registro)
        VALUES ${sql(values)}
        ON CONFLICT (rut) DO NOTHING
      `;
      
      console.log(`   Progreso: ${Math.min(i + tamanoLote, faltantes.length)}/${faltantes.length} procesados.`);
    }

    console.log("\n¡Importación completada con éxito!");
    process.exit(0);
  } catch (error) {
    console.error("Error crítico durante la importación:", error);
    process.exit(1);
  }
}

run();

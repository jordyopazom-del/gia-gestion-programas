import * as XLSX from 'xlsx';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

// Helpers para parsear
function parseRut(rutRaw: any): string {
  if (!rutRaw) return "";
  return String(rutRaw).replace(/[^0-9Kk]/g, "").toUpperCase();
}

function parseFecha(fechaRaw: any): Date {
  if (!fechaRaw) return new Date();
  const s = String(fechaRaw).trim();
  if (s.length === 8 && !s.includes('-') && !s.includes('/')) {
    const y = parseInt(s.substring(0, 4));
    const m = parseInt(s.substring(4, 6)) - 1;
    const d = parseInt(s.substring(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  return new Date();
}

async function migrate() {
  console.log('🚀 Iniciando Carga Masiva ECICEP (En Lotes)...');
  
  const users = await sql`SELECT rut, nombre FROM gia_usuarios WHERE nombre ILIKE '%MIGRACI%' LIMIT 1`;
  let profRut = '';
  let profNombre = 'MIGRACIÓN SISTEMA';
  if (users.length > 0) {
    profRut = users[0].rut;
    profNombre = users[0].nombre;
  } else {
    const admin = await sql`SELECT rut, nombre FROM gia_usuarios WHERE rol = 'ADMIN' LIMIT 1`;
    if (admin.length > 0) {
      profRut = admin[0].rut;
      profNombre = admin[0].nombre;
    } else {
      throw new Error("No se encontró usuario para asociar los registros.");
    }
  }

  console.log(`Usando usuario para registro: ${profNombre} (${profRut})`);

  // Limpiar registros de migraciones anteriores
  await sql`DELETE FROM gia_ecicep WHERE data_clinica->>'migrado' = 'true'`;
  console.log('🧹 Limpieza previa completada.');

  const workbook = XLSX.readFile('./scratch/REPORTE_ESTRATIFICACION_ESTAB_CESFAM_FUTRONO.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`📊 Leyendo ${rows.length} filas del archivo Excel...`);

  // Precargar lista de RUTs existentes en padrón para verificar localmente y no ahogar la BD
  console.log("Cargando padrón de pacientes activos...");
  const pacientesQuery = await sql`SELECT rut FROM gia_pacientes`;
  const padronSet = new Set(pacientesQuery.map(p => p.rut));
  console.log(`✅ Padrón cargado (${padronSet.size} pacientes).`);

  let successCount = 0;
  let skippedCount = 0;
  let notFoundPadron = 0;

  const batchSize = 1000;
  let currentBatch: any[] = [];

  const dataClinicaTemplate = {
    plan: [],
    seguimiento_telefonico: false,
    creador: { rut: profRut, nombre: profNombre },
    migrado: true
  };

  const insertBatch = async (batch: any[]) => {
    if (batch.length === 0) return;
    try {
      await sql`
        INSERT INTO gia_ecicep ${sql(batch, 
          'rut_paciente', 
          'fecha_atencion', 
          'categoria', 
          'diagnosticos', 
          'polifarmacia', 
          'funcionalidad', 
          'deterioro_cognitivo', 
          'riesgo_social', 
          'hospitalizacion_reciente', 
          'consultas_urgencia', 
          'observaciones',
          'data_clinica', 
          'profesional_rut'
        )}
      `;
      successCount += batch.length;
    } catch (e: any) {
      console.error(`Error al insertar lote:`, e.message);
      skippedCount += batch.length;
    }
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rutNum = parseRut(row['RUT']);

    if (!rutNum) {
      skippedCount++;
      continue;
    }

    if (!padronSet.has(rutNum)) {
      notFoundPadron++;
      continue;
    }

    const categoria = row['ESTRATIFICACION_RIESGO_ACTUAL'] || 'G0';
    const fechaAtencion = parseFecha(row['FECHA_ACT_ESTRATIFICACION']);

    currentBatch.push({
      rut_paciente: rutNum,
      fecha_atencion: fechaAtencion,
      categoria: categoria,
      diagnosticos: [],
      polifarmacia: false,
      funcionalidad: "Desconocido (Pendiente de Evaluar)",
      deterioro_cognitivo: false,
      riesgo_social: false,
      hospitalizacion_reciente: false,
      consultas_urgencia: 0,
      observaciones: 'Carga Inicial Masiva 2026',
      data_clinica: dataClinicaTemplate,
      profesional_rut: profRut
    });

    if (currentBatch.length >= batchSize) {
      await insertBatch(currentBatch);
      console.log(`Lote procesado: ${successCount} registros...`);
      currentBatch = [];
    }
  }

  // Insertar los restantes
  if (currentBatch.length > 0) {
    await insertBatch(currentBatch);
  }

  console.log('----------------------------------------------------');
  console.log(`✅ Registros insertados con éxito: ${successCount}`);
  console.log(`⚠️  Pacientes no encontrados en Padrón (omitidos): ${notFoundPadron}`);
  console.log(`❌ Filas inválidas/Errores (omitidos): ${skippedCount}`);
  console.log('----------------------------------------------------');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Error fatal durante la migración:', e);
  process.exit(1);
});


import * as XLSX from 'xlsx';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function migrar() {
  console.log('🚀 Iniciando migración de Tarjetero Adulto Mayor...');

  try {
    const filePath = '/Users/jopazo/Downloads/tarjetero adulto mayor.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📊 Procesando ${data.length} registros...`);

    let pacientesCreados = 0;
    let atencionesCreadas = 0;

    for (const row of data as any[]) {
      const rawRut = row['RUT'];
      if (!rawRut) continue;

      // 1. Limpiar y separar RUT
      const cleanRutStr = String(rawRut).replace(/\./g, '').trim();
      const parts = cleanRutStr.split('-');
      const rutNum = parseInt(parts[0]);
      const dv = parts[1] || '';

      if (isNaN(rutNum)) continue;

      // 2. Procesar Datos del Paciente
      const nombre = row['Columna 1']?.toUpperCase() || 'SIN NOMBRE';
      const direccion = row['DIRECCION'] || '';
      const telefono = row['TELEFONO'] || '';
      const sexo = row['SEXO']?.toUpperCase() || '';
      
      // Estimar fecha de nacimiento para el dashboard (hoy - edad)
      const edadStr = String(row['EDAD'] || '65');
      const edadNum = parseInt(edadStr.replace(/\D/g, '')) || 65;
      const fechaNacimiento = new Date();
      fechaNacimiento.setFullYear(fechaNacimiento.getFullYear() - edadNum);

      // UPSERT Paciente
      const existingPaciente = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${rutNum}`;
      if (existingPaciente.length === 0) {
        await sql`
          INSERT INTO gia_pacientes (rut, dv, nombre_completo, direccion, telefono, sexo, fecha_nacimiento, sector)
          VALUES (${rutNum}, ${dv}, ${nombre}, ${direccion}, ${telefono}, ${sexo}, ${fechaNacimiento.toISOString().split('T')[0]}, 'SECTOR GENERAL')
        `;
        pacientesCreados++;
      }

      // 3. Procesar Atención EMPAM
      let resultado = row['RESULTADO '] || row['RESULTADO'] || 'PENDIENTE';
      
      // Normalización de resultado EFAM
      const resUpper = String(resultado).toUpperCase();
      if (resUpper.includes('SIN RIESGO')) resultado = 'Autovalente sin riesgo';
      else if (resUpper.includes('CON RIESGO')) resultado = 'Autovalente con riesgo';
      else if (resUpper.includes('RIESGO DE DEPENDENCIA')) resultado = 'Riesgo de Dependencia';
      else if (resUpper.includes('DEPENDENCIA LEVE')) resultado = 'Dependencia leve';
      else if (resUpper.includes('DEPENDENCIA MODERADA')) resultado = 'Dependencia moderada';
      else if (resUpper.includes('DEPENDENCIA SEVERA')) resultado = 'Dependencia severa';

      const fechaRaw = row['FECHA DE APLICACION EMPAM '];
      
      // Solo migramos si hay una fecha de atención válida
      if (fechaRaw && resultado !== 'PENDIENTE' && resultado !== 'PENDIENTE ') {
        let fechaAtencion: string = '';
        
        if (typeof fechaRaw === 'number') {
          // Es un número de Excel
          const date = XLSX.SSF.parse_date_code(fechaRaw);
          fechaAtencion = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        } else {
          // Intentar parsear string o usar Date
          const d = new Date(fechaRaw);
          if (!isNaN(d.getTime())) {
            fechaAtencion = d.toISOString().split('T')[0];
          }
        }

        if (fechaAtencion) {
          // Verificar si ya existe esta atención exacta
          const existingAtencion = await sql`
            SELECT id FROM gia_empam 
            WHERE rut_paciente = ${rutNum} AND fecha_atencion = ${fechaAtencion}
          `;

          if (existingAtencion.length === 0) {
            const dataClinica = {
              migrado: true,
              profesional_original: row['PROFESIONAL '] || '',
              estado_excel: row['ESTADO EMPAM'] || '',
              proximo_empam: row['PROXIMO EMPAM'] || ''
            };

            await sql`
              INSERT INTO gia_empam (rut_paciente, fecha_atencion, resultado_efam, profesional_rut, data_clinica, motivo_egreso)
              VALUES (${rutNum}, ${fechaAtencion}, ${resultado}, '12345678-5', ${sql.json(dataClinica)}, 'ACTIVO')
            `;
            atencionesCreadas++;
          }
        }
      }
    }

    console.log('\n✅ Migración completada con éxito.');
    console.log(`🆕 Pacientes nuevos: ${pacientesCreados}`);
    console.log(`📋 Atenciones migradas: ${atencionesCreadas}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await sql.end();
  }
}

migrar();

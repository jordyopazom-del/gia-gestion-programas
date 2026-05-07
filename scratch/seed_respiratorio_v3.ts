
import { sql } from '../src/lib/db';

async function seedV3() {
  console.log('💉 Iniciando Simulación de Estados (Semáforo)...');

  await sql`DELETE FROM gia_respiratorio`;

  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const patients = [
    {
      nombre: 'ANA MORALES VERA',
      rut: 44444444,
      last_med: '2024-04-10',
      last_kin: '2024-05-01',
      last_esp: '2024-01-15',
      next_med: { mes: 'AGOSTO 2026', date: '2026-08-01' },
      next_kin: { mes: 'SEPTIEMBRE 2026', date: '2026-09-01' },
      next_esp: { mes: 'ENERO 2027', date: '2027-01-01' }
    },
    {
      nombre: 'JUAN PEREZ SOTO',
      rut: 11111111,
      last_med: '2024-03-20',
      last_kin: '2024-02-15',
      last_esp: '2023-11-10',
      next_med: { mes: 'OCTUBRE 2026', date: '2026-10-01' },
      next_kin: { mes: 'MAYO 2026', date: '2026-05-10' }, // PROXIMO (En 5 dias)
      next_esp: { mes: 'JUNIO 2026', date: '2026-06-01' }
    },
    {
      nombre: 'MARIA GONZALEZ LARA',
      rut: 22222222,
      last_med: '2023-12-01',
      last_kin: '2023-11-20',
      last_esp: '2023-05-01',
      next_med: { mes: 'MARZO 2026', date: '2026-03-01' }, // VENCIDO
      next_kin: { mes: 'ABRIL 2026', date: '2026-04-01' }, // VENCIDO
      next_esp: { mes: 'MAYO 2025', date: '2025-05-01' }  // VENCIDO
    },
    {
      nombre: 'PEDRO TAPIA RUIZ',
      rut: 33333333,
      last_med: '2024-01-05',
      last_kin: '2024-01-10',
      last_esp: null,
      next_med: { mes: null, date: null },
      next_kin: { mes: null, date: null },
      next_esp: { mes: null, date: null }
    }
  ];

  // Necesitamos insertar los registros históricos para que aparezcan en la columna de "Ultimas Atenciones"
  // Para fines de simulación, insertaremos records de cada actividad para cada paciente
  
  for (const p of patients) {
    // Insertar registros pasados para llenar el historial
    if (p.last_med) {
        await sql`INSERT INTO gia_respiratorio (rut_paciente, fecha_atencion, tipo_atencion, diagnostico, nivel_control, profesional_rut, motivo_egreso) 
                  VALUES (${p.rut}, ${p.last_med}, 'CONTROL MÉDICO', 'ASMA', 'CONTROLADO', '16805719-9', 'INACTIVO')`;
    }
    if (p.last_kin) {
        await sql`INSERT INTO gia_respiratorio (rut_paciente, fecha_atencion, tipo_atencion, diagnostico, nivel_control, profesional_rut, motivo_egreso) 
                  VALUES (${p.rut}, ${p.last_kin}, 'CONTROL KINESIOLÓGICO', 'ASMA', 'CONTROLADO', '16805719-9', 'INACTIVO')`;
    }
    if (p.last_esp) {
        await sql`INSERT INTO gia_respiratorio (rut_paciente, fecha_atencion, tipo_atencion, diagnostico, nivel_control, profesional_rut, motivo_egreso) 
                  VALUES (${p.rut}, ${p.last_esp}, 'ESPIROMETRÍA', 'ASMA', 'CONTROLADO', '16805719-9', 'INACTIVO')`;
    }

    // El registro ACTUAL (Activo) que tiene las citaciones a futuro
    await sql`
      INSERT INTO gia_respiratorio (
        rut_paciente, fecha_atencion, tipo_atencion, diagnostico, nivel_control,
        cita_medico, cita_kine, cita_espiro, profesional_rut, motivo_egreso, data_clinica
      ) VALUES (
        ${p.rut}, ${formatDate(now)}, 'ACTUALIZACIÓN SISTEMA', 'REVISIÓN', 'CONTROLADO',
        ${p.next_med.date}, ${p.next_kin.date}, ${p.next_esp.date}, '16805719-9', 'ACTIVO',
        ${JSON.stringify({
          proximo_medico_label: p.next_med.mes,
          proximo_kine_label: p.next_kin.mes,
          proximo_espiro_label: p.next_esp.mes,
          profesional_nombre: 'ADMINISTRADOR'
        })}
      )
    `;
  }

  console.log('✅ Simulación de Semáforo Lista.');
  process.exit(0);
}

seedV3().catch(console.error);

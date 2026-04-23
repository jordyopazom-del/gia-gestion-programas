"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { syncPadronMaestro, PacienteData } from "@/actions/pacientesActions";
import { UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";

export default function CargaPadron({ onRefresh }: { onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info", msg: string } | null>(null);

  const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: "info", msg: "Procesando " + file.name + "..." });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Mapeo flexible: Busca coincidencias parciales en los nombres de columna
      const findValue = (row: any, keywords: string[]) => {
        const foundKey = Object.keys(row).find(k => 
          keywords.some(keyword => k.toLowerCase().includes(keyword.toLowerCase()))
        );
        const val = foundKey ? row[foundKey] : "";
        return val !== null && val !== undefined ? val : "";
      };

      const pacientesTratados: PacienteData[] = jsonData.map((row: any) => {
        const rutCompleto = String(findValue(row, ["rut", "run"])).trim();
        const split = rutCompleto.split("-");
        const rutNum = split[0]?.replace(/\./g, "") || "";
        let dvStr = split[1] || "";
        if (!dvStr) {
           const valDv = findValue(row, ["dv", "digito", "dígito"]);
           if (valDv) dvStr = String(valDv).trim();
        }
        
        const nombres = findValue(row, ["nombres", "nombre"]);
        const paterno = findValue(row, ["pat"]);
        const materno = findValue(row, ["mat"]);
        const fullNameStr = findValue(row, ["completo"]);
        
        const fullName = fullNameStr ? String(fullNameStr) : `${nombres} ${paterno} ${materno}`.trim();

        const rawNacimiento = findValue(row, ["nacimiento", "fecha"]);
        let birthStr = "";
        
        if (typeof rawNacimiento === 'number') {
          const date = XLSX.SSF.parse_date_code(rawNacimiento);
          birthStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        } else {
          birthStr = String(rawNacimiento || "").trim();
          if (birthStr && birthStr.includes("/")) {
            const parts = birthStr.split("/");
            if (parts.length === 3) birthStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else if (birthStr) {
            const d = new Date(birthStr);
            if (!isNaN(d.getTime())) birthStr = d.toISOString().split('T')[0];
          }
        }

        const padStr = String(findValue(row, ["pad"])).toUpperCase();
        const esPad = padStr === "SI" || padStr === "TRUE" || padStr === "1";

        return {
          rut: rutNum,
          dv: dvStr,
          nombre_completo: fullName,
          fecha_nacimiento: birthStr || null,
          sexo: String(findValue(row, ["sexo", "genero"])).trim().toUpperCase() || "SIN REGISTRO",
          sector: String(findValue(row, ["sector"])).trim() || "SIN SECTOR",
          telefono: String(findValue(row, ["telefono", "fono"])).trim(),
          direccion: String(findValue(row, ["direccion", "domicilio"])).trim(),
          es_pad: esPad
        };
      }).filter(p => p.rut); // Solo pacientes que realmente tengan RUT

      // Depurar Excel: Eliminar pacientes duplicados (ej: atenciones múltiples) para que la base de datos no choque
      const mapaUnicos = new Map<string, PacienteData>();
      pacientesTratados.forEach(p => mapaUnicos.set(p.rut, p));
      const pacientesUnicos = Array.from(mapaUnicos.values());

      if (pacientesUnicos.length === 0) {
        setStatus({ type: "error", msg: "No se encontraron filas con RUT válido." });
        setLoading(false);
        return;
      }

      const chunkSize = 2000;
      for (let i = 0; i < pacientesUnicos.length; i += chunkSize) {
        const chunk = pacientesUnicos.slice(i, i + chunkSize);
        setStatus({ type: "info", msg: `Sincronizando lote (${i} a ${i + chunk.length}) de ${pacientesUnicos.length} pacientes únicos...` });
        
        const result = await syncPadronMaestro(chunk);
        if (result.error) {
          throw new Error(`Error en el lote: ${result.error}`);
        }
      }
      
      setStatus({ type: "success", msg: `¡Éxito! Los ${pacientesUnicos.length} pacientes han sido sincronizados correctamente.` });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setStatus({ type: "error", msg: `Fallo de Procesamiento: ${err.message || 'Verifique el formato o tamaño'}` });
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 flex flex-col justify-center items-center text-center transition-colors hover:bg-slate-100">
      <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600">
        {loading ? <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div> : <UploadCloud size={28} />}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Carga Masiva de Padrón</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">
        Selecciona tu archivo Excel (mensual) con los pacientes. El sistema buscará las columnas RUT, NOMBRES, APELLIDOS y SECTOR.
      </p>
      
      <label className={`cursor-pointer rounded-lg bg-white px-4 py-2 border border-slate-300 shadow-sm font-medium text-slate-700 hover:bg-slate-50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        Examinar Archivos
        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={processFile} disabled={loading} />
      </label>

      {status && (
        <div className={`mt-4 flex items-center text-sm px-4 py-2 rounded-lg ${
          status.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
          status.type === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {status.type === 'success' ? <CheckCircle size={16} className="mr-2" /> :
           status.type === 'error' ? <AlertTriangle size={16} className="mr-2" /> : null}
          {status.msg}
        </div>
      )}
    </div>
  );
}

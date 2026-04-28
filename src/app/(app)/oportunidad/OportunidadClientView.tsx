"use client";

import { useState, useEffect } from "react";
import { uploadAgendaDiaria, getOportunidadesHoy, marcarRescatado, Oportunidad, AgendaRow } from "@/actions/agendaActions";
import { Calendar, Upload, Search, User, Clock, AlertCircle, CheckCircle2, ChevronRight, FileSpreadsheet, Filter, Printer } from "lucide-react";
import * as XLSX from "xlsx";

export default function OportunidadClientView({ initialData, initialDate }: { initialData: Oportunidad[], initialDate: string }) {
  const [data, setData] = useState<Oportunidad[]>(initialData);
  const [fecha, setFecha] = useState(initialDate);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'TODOS' | 'VENCIDOS' | 'PENDIENTES'>('TODOS');

  // Cargar datos cuando cambie la fecha manualmente
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await getOportunidadesHoy(fecha);
      if (res.data) setData(res.data);
      setLoading(false);
    };
    fetchData();
  }, [fecha]);

  // Función para parsear el Excel de Rayen
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const agendaRows: AgendaRow[] = [];
        let currentProfessional = "DESCONOCIDO";
        let detectedDate = fecha;

        // Función para convertir hora serial de Excel a HH:MM
        const formatExcelTime = (val: any) => {
          if (!val) return "00:00";
          if (typeof val === 'number') {
            const totalMinutes = Math.round(val * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
          const s = val.toString();
          return s.includes(":") || s.includes(".") ? s.replace(".", ":") : "00:00";
        };

        rows.forEach((row, idx) => {
          if (!row || row.length === 0) return;

          const rowString = row.join(" ").toUpperCase();
          
          // Detectar Fecha de la Hoja
          if (rowString.includes("HOJA DIARIA MÓDULO")) {
            const dateMatch = rowString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
              const [_, d, m, y] = dateMatch;
              detectedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              setFecha(detectedDate);
            }
          }

          // Identificar profesional (Rayen pone "PROFESIONAL: NOMBRE (RUT)")
          if (rowString.includes("PROFESIONAL:")) {
            const profMatch = row.join(" ").match(/PROFESIONAL:\s*([^(\n]+)/);
            if (profMatch) currentProfessional = profMatch[1].trim();
          }

          // Identificar fila de paciente (Buscamos algo que parezca RUT)
          // Rayen: Col 2 (RUT), Col 3 (Nombre), Col 7 (Hora)
          const potentialRut = row[2]?.toString() || "";
          const rutMatch = potentialRut.match(/(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/);
          
          if (rutMatch) {
            agendaRows.push({
              rut: rutMatch[0],
              nombre: row[3]?.toString() || "PACIENTE SIN NOMBRE",
              hora: formatExcelTime(row[7]),
              profesional: currentProfessional,
              prestacion: row[9]?.toString() || row[10]?.toString() || "CONSULTA"
            });
          }
        });

        if (agendaRows.length > 0) {
          const res = await uploadAgendaDiaria(agendaRows, detectedDate);
          if (res.success) {
            const updated = await getOportunidadesHoy(detectedDate);
            if (updated.data) setData(updated.data);
            alert(`¡Agenda cargada! Se encontraron ${res.count} pacientes.`);
          } else {
            alert(res.error);
          }
        } else {
          alert("No se encontraron pacientes válidos en el archivo. Verifica el formato.");
        }
      } catch (err) {
        console.error(err);
        alert("Error al leer el archivo Excel");
      } finally {
        setUploading(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || item.rut.includes(searchTerm);
    if (filter === 'VENCIDOS') return matchesSearch && item.empam_estado === 'VENCIDO';
    if (filter === 'PENDIENTES') return matchesSearch && item.estado_rescate === 'PENDIENTE';
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
            <Calendar className="mr-3 text-blue-600" size={32} />
            OPORTUNIDAD DE ATENCIÓN
          </h1>
          <p className="text-slate-500 font-medium italic mt-1">
            "Rescate Inteligente" - Cruce de agenda diaria con programas clínicos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center">
            <input 
              type="date" 
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="text-sm font-bold text-slate-600 outline-none px-2"
            />
          </div>
          
          <button 
            onClick={() => window.print()}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center hover:bg-slate-50 transition-all active:scale-95 no-print"
          >
            <Printer size={18} className="mr-2" />
            Imprimir
          </button>

          <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center cursor-pointer transition-all shadow-lg shadow-blue-100 active:scale-95 no-print">
            <Upload size={18} className="mr-2" />
            {uploading ? 'Procesando...' : 'Subir Agenda'}
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print, aside, nav, .sidebar-container { display: none !important; }
          body, html { background: white !important; padding: 0 !important; margin: 0 !important; }
          main { margin-left: 0 !important; padding: 0 !important; width: 100% !important; }
          .p-6 { padding: 0 !important; }
          .shadow-xl, .shadow-sm { shadow: none !important; border: 1px solid #eee !important; }
          table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
          th, td { border: 1px solid #eee !important; padding: 10px 5px !important; word-wrap: break-word !important; }
          .rounded-[2.5rem], .rounded-3xl { border-radius: 0 !important; }
          .max-w-7xl { max-width: 100% !important; width: 100% !important; }
        }
      `}</style>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-4">
            <User size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Citados Hoy</p>
            <p className="text-2xl font-black text-slate-800">{data.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center">
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mr-4">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencidos (Rescate)</p>
            <p className="text-2xl font-black text-slate-800">
              {data.filter(i => i.empam_estado === 'VENCIDO').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mr-4">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rescatados</p>
            <p className="text-2xl font-black text-slate-800">
              {data.filter(i => i.estado_rescate === 'RESCATADO').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center no-print">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por RUT o Nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {(['TODOS', 'VENCIDOS', 'PENDIENTES'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora / Profesional</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Contacto</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado EMPAM</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.length > 0 ? filteredData.map((item, idx) => (
              <tr key={idx} className={`hover:bg-slate-50 transition-colors group ${item.estado_rescate === 'RESCATADO' ? 'opacity-60' : ''}`}>
                <td className="px-6 py-5">
                  <div className="flex items-center">
                    <div className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-lg mr-3">
                      {item.hora.slice(0, 5)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 leading-tight">{item.profesional}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.prestacion}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="text-sm font-bold text-slate-800 leading-tight uppercase">{item.nombre}</p>
                  <p className="text-[11px] font-mono text-slate-400">{item.rut}</p>
                </td>
                <td className="px-6 py-5 text-center">
                  <p className="text-xs font-black text-slate-700">{item.telefono || '—'}</p>
                </td>
                <td className="px-6 py-5 text-center">
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide uppercase ${
                    item.empam_estado === 'VENCIDO' 
                      ? 'bg-red-100 text-red-600 border border-red-200' 
                      : item.empam_estado === 'AL DIA'
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {item.empam_estado === 'VENCIDO' && <AlertCircle size={12} className="mr-1.5" />}
                    {item.empam_estado === 'AL DIA' && <CheckCircle2 size={12} className="mr-1.5" />}
                    {item.empam_estado}
                  </div>
                  {item.empam_fecha && (
                    <p className="text-[9px] text-slate-400 mt-1 font-bold">Último: {new Date(item.empam_fecha).toLocaleDateString()}</p>
                  )}
                </td>
                <td className="px-6 py-5 text-center">
                  {item.estado_rescate === 'RESCATADO' ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                      Capturado ✓
                    </span>
                  ) : (
                    <button 
                      onClick={async () => {
                        await marcarRescatado(item.rut, fecha);
                        const updated = await getOportunidadesHoy(fecha);
                        if (updated.data) setData(updated.data);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-slate-900 active:scale-95"
                    >
                      Gestionar Rescate
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet size={48} className="text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">No hay agenda cargada para esta fecha.</p>
                    <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Sube el Excel de Rayen para comenzar</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

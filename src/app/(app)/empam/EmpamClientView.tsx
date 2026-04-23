"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, AlertTriangle, CheckCircle, Clock, Download } from "lucide-react";
import * as XLSX from "xlsx";

const getEmpamStatus = (fechaString: string | null, resultado: string | null) => {
  if (!fechaString) return { status: "Pendiente", color: "bg-red-100 text-red-800 border-red-200", icon: <AlertTriangle size={14} className="mr-1" /> };
  
  const fecha = new Date(fechaString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - fecha.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Normativa MINSAL: 6 meses (180 días) para riesgo, 12 meses (365 días) para el resto
  const resUpper = String(resultado || '').toUpperCase();
  const isRisk = resUpper.includes('CON RIESGO') || resUpper.includes('RIESGO DE DEPENDENCIA');
  const vigenciaDias = isRisk ? 180 : 365;
  
  if (diffDays <= vigenciaDias) {
    return { status: "Vigente", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle size={14} className="mr-1" /> };
  } else {
    return { status: "Vencido", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock size={14} className="mr-1" /> };
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch(e) {
    return dateString;
  }
};

export default function EmpamClientView({ data }: { data: any[] }) {
  const [searchRut, setSearchRut] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterEfam, setFilterEfam] = useState("Todos");

  const sectors = useMemo(() => ["Todos", ...Array.from(new Set(data.map(p => p.sector))).sort()], [data]);

  const filtered = useMemo(() => {
    return data.filter(p => {
      const qRut = searchRut.replace(/[-.]/g, "").toLowerCase();
      const matchRut = p.rut.toLowerCase().includes(qRut) || p.nombre_completo.toLowerCase().includes(searchRut.toLowerCase());
      const matchSector = filterSector === "Todos" || p.sector === filterSector;
      const statusObj = getEmpamStatus(p.ultima_atencion, p.resultado_efam);
      const matchStatus = filterStatus === "Todos" || statusObj.status === filterStatus;
      const matchEfam = filterEfam === "Todos" || p.resultado_efam === filterEfam;
      
      return matchRut && matchSector && matchStatus && matchEfam;
    });
  }, [data, searchRut, filterSector, filterStatus, filterEfam]);

  const exportToExcel = () => {
    // Aplanar los datos para el Excel
    const dataset = filtered.map(p => {
      const cv = p.data_clinica || {};
      
      // Calculate age at the time of export
      let age = "-";
      if (p.fecha_nacimiento) {
         const bd = new Date(p.fecha_nacimiento);
         const today = new Date();
         let a = today.getFullYear() - bd.getFullYear();
         if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) a--;
         age = a.toString();
      }

      return {
        "Estado": getEmpamStatus(p.ultima_atencion, p.resultado_efam).status,
        "RUT": p.rut + "-" + p.dv,
        "Nombre": p.nombre_completo,
        "Edad": age,
        "Sector": p.sector,
        "Teléfono": p.telefono,
        "Fecha Último EMPAM": formatDate(p.ultima_atencion),
        "Resultado Clínico Global": p.resultado_efam || "PENDIENTE",
        // Desglose Estadístico de Variables Clínicas (Solo presentes si ya se le hizo el examen con el nuevo Formulario)
        "Estado Nutricional": cv.estado_nutricional || "-",
        "Pertenencia Indigena": cv.pertenencia_indigena || "-",
        "Tipo Control": cv.tipo_control || "-",
        "Riesgo Caidas": cv.riesgo_caidas || "-",
        "Presión Arterial Alta (>=140/90)": cv.presion_arterial || "-",
        "Glicemia Alterada": cv.glicemia || "-",
        "Colesterol Alta": cv.colesterol || "-",
        "AM Actividad Fisica": cv.actividad_fisica || "-",
        "Fuma": cv.fuma || "-",
        "Sospecha Maltrato": cv.sospecha_maltrato || "-",
        "Derivación +AMA": cv.derivacion_medico || "-",
        "Profesional Responsable": p.profesional_rut || "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Poblacion_EMPAM");
    XLSX.writeFile(workbook, `Sabana_Estadistica_EMPAM.xlsx`);
  };

  // Statistics
  const totalAM = data.length;
  const vigentes = data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Vigente").length;
  const pendientes = data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Pendiente").length;
  const vencidos = data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Vencido").length;
  const cobPorcentaje = totalAM > 0 ? ((vigentes / totalAM) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col space-y-6">
      {/* Indicadores Top */}
      <div className="grid grid-cols-5 gap-4 px-6 pt-4 border-b border-slate-200 pb-6">
        <div className="text-center">
           <p className="text-4xl font-light text-slate-800">{totalAM.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Población AM Total</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-blue-600">{cobPorcentaje}%</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Deltas de Cobertura</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-emerald-600">{vigentes.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-emerald-600/70 uppercase mt-2">Vigentes</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-red-600">{pendientes.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-red-600/70 uppercase mt-2">Pendientes (Sin Eval)</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-yellow-600">{vencidos.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-yellow-600/70 uppercase mt-2">Vencidos (+1 Año)</p>
        </div>
      </div>

      <div className="px-6 flex space-x-4">
        <div className="flex-1">
          <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
            <Search size={12} className="mr-1" /> Buscar por RUT o Nombre
          </label>
          <input 
            type="text" value={searchRut} onChange={e => setSearchRut(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100" 
            placeholder="Ej: 12345678 o Juan"
          />
        </div>
        <div className="flex-1">
          <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
            <MapPin size={12} className="mr-1" /> Filtrar por Sector
          </label>
          <select 
            value={filterSector} onChange={e => setFilterSector(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100"
          >
            {sectors.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
            🚦 Filtrar por Estado
          </label>
          <select 
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100"
          >
            <option value="Todos">Todos</option>
            <option value="Vigente">Vigente</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Vencido">Vencido</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
            Clasificación EFAM
          </label>
          <select 
            value={filterEfam} onChange={e => setFilterEfam(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100"
          >
            <option value="Todos">Todos</option>
            <option value="Autovalente sin riesgo">Autovalente sin riesgo</option>
            <option value="Autovalente con riesgo">Autovalente con riesgo</option>
            <option value="Riesgo de Dependencia">Riesgo de Dependencia</option>
            <option value="Dependencia leve">Dependencia leve</option>
            <option value="Dependencia moderada">Dependencia moderada</option>
            <option value="Dependencia severa">Dependencia severa</option>
          </select>
        </div>
      </div>

      <div className="px-6 pb-6 w-full overflow-x-auto">
        <div className="flex justify-between items-end mb-2">
           <span className="text-sm text-slate-600 font-medium block">Mostrando {filtered.length} adultos mayores según filtros seleccionados.</span>
           <button 
              onClick={exportToExcel}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-bold border border-emerald-200 transition flex items-center"
           >
              <Download size={14} className="mr-2" /> Extracción Estadística CSV/Excel
           </button>
        </div>
        <table className="w-full text-left text-xs whitespace-nowrap text-slate-600">
          <thead className="bg-slate-50 border-y border-slate-200 font-medium text-slate-500">
            <tr>
              <th className="px-3 py-3">RUT</th>
              <th className="px-3 py-3">Nombre</th>
              <th className="px-3 py-3 text-center">Edad</th>
              <th className="px-3 py-3">Sector</th>
              <th className="px-3 py-3">Teléfono</th>
              <th className="px-3 py-3">Resultado EFAM</th>
              <th className="px-3 py-3">Fecha Último</th>
              <th className="px-3 py-3">Fecha Vence</th>
              <th className="px-3 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 500).map((p, i) => {
              const semaforo = getEmpamStatus(p.ultima_atencion, p.resultado_efam);
              let fechaVence = "-";
              if (p.ultima_atencion) {
                 const d = new Date(p.ultima_atencion);
                 const resUpper = String(p.resultado_efam || '').toUpperCase();
                 if (resUpper.includes('CON RIESGO') || resUpper.includes('RIESGO DE DEPENDENCIA')) {
                    d.setMonth(d.getMonth() + 6);
                 } else {
                    d.setFullYear(d.getFullYear() + 1);
                 }
                 fechaVence = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
              }
              
              // Calc age
              let age = "-";
              if (p.fecha_nacimiento) {
                 const bd = new Date(p.fecha_nacimiento);
                 const today = new Date();
                 let a = today.getFullYear() - bd.getFullYear();
                 if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) a--;
                 age = a.toString();
              }

              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium">{p.rut}-{p.dv}</td>
                  <td className="px-3 py-3 uppercase truncate max-w-[150px]">{p.nombre_completo}</td>
                  <td className="px-3 py-3 text-center">{age}</td>
                  <td className="px-3 py-3 uppercase">{p.sector}</td>
                  <td className="px-3 py-3">{p.telefono || '-'}</td>
                  <td className="px-3 py-3 uppercase font-medium">{p.resultado_efam || "PENDIENTE"}</td>
                  <td className="px-3 py-3 font-mono">{formatDate(p.ultima_atencion)}</td>
                  <td className="px-3 py-3 font-mono text-slate-400">{fechaVence}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${semaforo.color}`}>
                      {semaforo.icon} {semaforo.status === 'Pendiente' ? 'SIN REGISTRO' : semaforo.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">Visualizando 500 filas max.</div>
        )}
      </div>
    </div>
  );
}

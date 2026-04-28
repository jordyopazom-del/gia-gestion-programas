"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, AlertTriangle, CheckCircle, Clock, Download, Activity, ClipboardList, X, User, Phone, Map, Calendar, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import { UserProfile } from "@/actions/userActions";

const getEmpamStatus = (fechaString: string | null, resultado: string | null) => {
  if (!fechaString) return { status: "Pendiente", color: "bg-red-100 text-red-800 border-red-200", icon: <AlertTriangle size={14} className="mr-1" /> };
  
  // Usamos UTC para evitar desfases de zona horaria
  const fecha = new Date(fechaString);
  const now = new Date();
  
  // Normalizar ambas fechas a medianoche UTC para comparar días reales
  const d1 = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
  const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Normativa MINSAL: 6 meses (180 días) para riesgo, 12 meses (365 días) para el resto
  const resUpper = String(resultado || '').toUpperCase();
  const isRisk = resUpper.includes('CON RIESGO') || resUpper.includes('RIESGO DE DEPENDENCIA');
  const vigenciaDias = isRisk ? 180 : 365;
  
  if (diffDays > vigenciaDias) {
    return { status: "Vencido", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock size={14} className="mr-1" /> };
  } else if (diffDays >= (vigenciaDias - 30)) {
    return { status: "Próximo a Vencer", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <AlertTriangle size={14} className="mr-1" /> };
  } else {
    return { status: "Vigente", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle size={14} className="mr-1" /> };
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  } catch(e) {
    return dateString;
  }
};

export default function EmpamClientView({ data, user }: { data: any[], user: UserProfile }) {
  const [view, setView] = useState<'lista' | 'analisis'>('lista');
  const [searchRut, setSearchRut] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterEfam, setFilterEfam] = useState("Todos");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

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

  // Statistics for Dashboard
  const stats = useMemo(() => {
    const total = data.length;
    const efamCounts: Record<string, number> = {};
    const nutriCounts: Record<string, number> = {};
    const sectorStats: Record<string, { total: number, vigentes: number }> = {};

    data.forEach(p => {
      const efam = p.resultado_efam || "SIN REGISTRO";
      efamCounts[efam] = (efamCounts[efam] || 0) + 1;

      const nutri = p.data_clinica?.estado_nutricional || "SIN REGISTRO";
      nutriCounts[nutri] = (nutriCounts[nutri] || 0) + 1;

      const sec = p.sector || "SIN SECTOR";
      if (!sectorStats[sec]) sectorStats[sec] = { total: 0, vigentes: 0 };
      sectorStats[sec].total++;
      if (getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Vigente") {
        sectorStats[sec].vigentes++;
      }
    });

    return { efamCounts, nutriCounts, sectorStats, total };
  }, [data]);

  const exportToExcel = () => {
    const dataset = filtered.map(p => {
      const cv = p.data_clinica || {};
      let age = "-";
      if (p.fecha_nacimiento) {
         const bd = new Date(p.fecha_nacimiento);
         const today = new Date();
         let a = today.getFullYear() - bd.getUTCFullYear();
         if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
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

  const totalAM = data.length;
  const statusCounts = {
    vigentes: data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Vigente").length,
    pendientes: data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Pendiente").length,
    vencidos: data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Vencido").length,
    proximos: data.filter(p => getEmpamStatus(p.ultima_atencion, p.resultado_efam).status === "Próximo a Vencer").length,
  };
  const cobPorcentaje = totalAM > 0 ? ((statusCounts.vigentes / totalAM) * 100).toFixed(1) : "0.0";

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
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Cobertura Vigente</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-emerald-600">{statusCounts.vigentes.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-emerald-600/70 uppercase mt-2">Vigentes</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-orange-500">{statusCounts.proximos.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-orange-500/70 uppercase mt-2">Por Vencer (30d)</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-red-600">{statusCounts.vencidos.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-red-600/70 uppercase mt-2">Vencidos / Pendientes</p>
        </div>
      </div>

      {/* Selector de Vista */}
      <div className="px-6 flex justify-between items-center">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('lista')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition ${view === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Listado Operativo
          </button>
          <button 
            onClick={() => setView('analisis')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition ${view === 'analisis' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Análisis Estadístico
          </button>
        </div>

        {view === 'lista' && (
          <button 
            onClick={exportToExcel}
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-bold border border-emerald-200 transition flex items-center"
          >
            <Download size={14} className="mr-2" /> Exportar a Excel
          </button>
        )}
      </div>

      {view === 'lista' ? (
        <>
          <div className="px-6 flex space-x-4">
            <div className="flex-1 flex-grow">
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
                <Activity size={12} className="mr-1" /> Filtrar por Estado
              </label>
              <select 
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Todos">Todos</option>
                <option value="Vigente">Vigente</option>
                <option value="Próximo a Vencer">Próximo a Vencer</option>
                <option value="Vencido">Vencido</option>
                <option value="Pendiente">Sin Registro (Pendiente)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
                <ClipboardList size={12} className="mr-1" /> Clasificación EFAM
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
                        d.setUTCMonth(d.getUTCMonth() + 6);
                     } else {
                        d.setUTCFullYear(d.getUTCFullYear() + 1);
                     }
                     fechaVence = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
                  }
                  
                  let age = "-";
                  if (p.fecha_nacimiento) {
                     const bd = new Date(p.fecha_nacimiento);
                     const today = new Date();
                     let a = today.getFullYear() - bd.getUTCFullYear();
                     if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
                     age = a.toString();
                  }

                  return (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-3 py-3 font-medium text-blue-600 group-hover:underline">{p.rut}-{p.dv}</td>
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
        </>
      ) : (
        /* Vista de Análisis Estadístico */
        <div className="px-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Gráfico EFAM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg mr-2">📊</span>
                Distribución Clasificación EFAM
              </h3>
              <div className="space-y-4">
                {Object.entries(stats.efamCounts).sort((a,b) => b[1] - a[1]).map(([label, count]) => {
                  const percentage = ((count / stats.total) * 100).toFixed(1);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span className="uppercase">{label}</span>
                        <span>{count} pac. ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico Estado Nutricional */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg mr-2">🥗</span>
                Estado Nutricional (Ultima Eval)
              </h3>
              <div className="space-y-4">
                {Object.entries(stats.nutriCounts).sort((a,b) => b[1] - a[1]).map(([label, count]) => {
                  const percentage = ((count / stats.total) * 100).toFixed(1);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span className="uppercase">{label}</span>
                        <span>{count} pac. ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cobertura por Sector */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg mr-2">📍</span>
                Deltas de Cobertura por Sector Territorial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(stats.sectorStats).sort((a,b) => b[1].total - a[1].total).map(([sector, sData]) => {
                  const cob = ((sData.vigentes / sData.total) * 100).toFixed(1);
                  return (
                    <div key={sector} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">{sector}</p>
                      <div className="flex items-end space-x-2">
                        <p className="text-3xl font-light text-slate-800">{cob}%</p>
                        <p className="text-xs text-slate-500 mb-1">Cobertura</p>
                      </div>
                      <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full" 
                          style={{ width: `${cob}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {sData.vigentes} vigentes de {sData.total} pacientes 65+
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Panel Lateral: Tarjeta de Seguimiento */}
      {selectedPatient && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedPatient(null)}
          ></div>
          
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header del Panel */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                  {selectedPatient.nombre_completo.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight uppercase">{selectedPatient.nombre_completo}</h3>
                  <p className="text-sm text-slate-500 font-mono">{selectedPatient.rut}-{selectedPatient.dv}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del Panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Sección 1: Información Base */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <User size={12} className="mr-2" /> Datos del Adulto Mayor
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Edad</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {selectedPatient.fecha_nacimiento ? (new Date().getFullYear() - new Date(selectedPatient.fecha_nacimiento).getUTCFullYear()) : '-'} Años
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Sector</p>
                    <p className="text-sm font-semibold text-slate-700 uppercase">{selectedPatient.sector}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone size={14} className="mr-3 text-slate-400" /> {selectedPatient.telefono || 'Sin teléfono registrado'}
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Map size={14} className="mr-3 text-slate-400" /> {selectedPatient.direccion || 'Sin dirección registrada'}
                  </div>
                </div>
              </div>

              {/* Sección 2: Estado EMPAM Actual */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Calendar size={12} className="mr-2" /> Seguimiento EMPAM
                </h4>
                <div className={`p-4 rounded-2xl border ${getEmpamStatus(selectedPatient.ultima_atencion, selectedPatient.resultado_efam).color} flex flex-col space-y-2`}>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-tight">Estado Actual</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 uppercase">
                        {getEmpamStatus(selectedPatient.ultima_atencion, selectedPatient.resultado_efam).status}
                      </span>
                   </div>
                   <p className="text-xl font-black uppercase leading-tight">
                     {selectedPatient.resultado_efam || 'PENDIENTE'}
                   </p>
                   <p className="text-[10px] opacity-80 pt-2 border-t border-black/10">
                     Última Evaluación: {formatDate(selectedPatient.ultima_atencion)}
                   </p>
                </div>
              </div>

              {/* Sección 3: Detalle Clínico (Variables de Gestión) */}
              {selectedPatient.data_clinica && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Activity size={12} className="mr-2" /> Variables de Gestión
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: "Estado Nutricional", value: selectedPatient.data_clinica.estado_nutricional },
                      { label: "Riesgo de Caídas", value: selectedPatient.data_clinica.riesgo_caidas },
                      { label: "Actividad Física", value: selectedPatient.data_clinica.actividad_fisica },
                      { label: "Glicemia Alterada", value: selectedPatient.data_clinica.glicemia },
                      { label: "Presión Arterial", value: selectedPatient.data_clinica.presion_arterial },
                      { label: "Sospecha Maltrato", value: selectedPatient.data_clinica.sospecha_maltrato },
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                        <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                        <span className="text-xs font-bold text-slate-700 uppercase">{item.value || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección 4: Nota para Referente Técnico */}
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-black uppercase mb-1">Recordatorio de Gestión</p>
                <p className="text-xs text-blue-800 leading-relaxed italic">
                  "Esta tarjeta reemplaza el tarjetero físico. Los datos mostrados corresponden al último ingreso registrado en GIA. Verifique vigencia antes de realizar derivaciones."
                </p>
              </div>

            </div>

            {/* Footer del Panel */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setSelectedPatient(null)}
                className="w-full bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
              >
                Cerrar Tarjeta
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

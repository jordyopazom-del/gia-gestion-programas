"use client";

import { useState } from "react";
import { UserProfile } from "@/actions/userActions";
import { Search, Info, CheckCircle2, AlertCircle, Phone, Calendar, Stethoscope, Carrot, ActivitySquare, AlertTriangle, ShieldAlert, Baby, X, User, Map, MapPin, CalendarX, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { registrarNspInfantil, editarPacienteInfantilAdmin } from "@/actions/infantilActions";

function formatFecha(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y.substring(0, 4)}`; // Extraemos substring para prever sufijos de hora
}

function formatMesAno(dateStr: string): string {
  if (!dateStr) return "-";
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [y, m] = dateStr.split("-");
  const mesIndex = parseInt(m, 10) - 1;
  if (mesIndex >= 0 && mesIndex <= 11) {
    return `${meses[mesIndex]} ${y.substring(0, 4)}`;
  }
  return dateStr;
}

function parseDsmDetalle(detalle: any) {
  if (!detalle) return null;
  if (typeof detalle === 'string') {
    try {
      return JSON.parse(detalle);
    } catch (e) {
      return null;
    }
  }
  return detalle;
}

type InfantilData = {
  rut: string;
  dv: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sector: string;
  telefono: string;
  direccion: string;
  estado: string;
  motivo_egreso: string;
  es_naneas: boolean;
  es_caso_social: boolean;
  edad_anios: number;
  edad_meses: number;
  edad_dias: number;
  ultimo_control_medico: string | null;
  ultimo_control_enfermera: string | null;
  ultimo_control_nutri: string | null;
  ultimo_control_dental: string | null;
  proximo_control: string | null;
  estamento_proximo_control: string | null;
  condicion_especial: string | null;
  estado_nutricional: string | null;
  dsm_resultado: string | null;
  tipo_evaluacion_dsm: string | null;
  estado_programa: string | null;
  observaciones: string | null;
  dsm_detalle: any;
};

export default function InfantilClientView({ data, user }: { data: InfantilData[], user: UserProfile }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"LISTADO" | "EGRESADOS">("LISTADO");
  const [filterSector, setFilterSector] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [edadMin, setEdadMin] = useState<number>(0);
  const [edadMax, setEdadMax] = useState<number>(10);
  
  const canManage = user.rol === "ADMINISTRADOR" || user.rol === "REFERENTE";

  // NSP Modal
  const [showNspModal, setShowNspModal] = useState(false);
  const [nspPaciente, setNspPaciente] = useState<InfantilData | null>(null);
  const [nspFecha, setNspFecha] = useState("");
  const [nspEstamento, setNspEstamento] = useState("ENFERMERA");
  const [isSavingNsp, setIsSavingNsp] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPaciente, setEditPaciente] = useState<InfantilData | null>(null);
  const [editDsm, setEditDsm] = useState("Normal");
  const [editNutri, setEditNutri] = useState("Normal");
  const [editNaneas, setEditNaneas] = useState(false);
  const [editSocial, setEditSocial] = useState(false);
  const [editCondicion, setEditCondicion] = useState("");
  const [editProxControl, setEditProxControl] = useState("");
  const [editProxEstamento, setEditProxEstamento] = useState("ENFERMERA");
  const [editObs, setEditObs] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<InfantilData | null>(null);

  const handleSaveNsp = async () => {
    if (!nspPaciente || !nspFecha) return;
    setIsSavingNsp(true);
    const res = await registrarNspInfantil({
      rut_paciente: nspPaciente.rut,
      fecha_nsp: nspFecha,
      estamento: nspEstamento
    });
    setIsSavingNsp(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Inasistencia registrada");
      setShowNspModal(false);
      window.location.reload();
    }
  };

  const handleSaveEdit = async () => {
    if (!editPaciente) return;
    setIsSavingEdit(true);
    const res = await editarPacienteInfantilAdmin({
      rut_paciente: editPaciente.rut,
      dsm_resultado: editDsm,
      estado_nutricional: editNutri,
      es_naneas: editNaneas,
      es_caso_social: editSocial,
      condicion_especial: editCondicion,
      proximo_control: editProxControl ? `${editProxControl}-01` : null,
      estamento_proximo_control: editProxEstamento,
      observaciones: editObs
    });
    setIsSavingEdit(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Información actualizada");
      setShowEditModal(false);
      window.location.reload();
    }
  };

  // Filter out patients based on age to determine basic categories
  // Activos: < 10 años. Egresados: >= 10 años.
  const activos = data.filter(p => p.edad_anios < 10);
  const egresados = data.filter(p => p.edad_anios >= 10);

  // Brechas: Dentro de los activos, aquellos que su próximo control ya pasó o no tienen control o estado_programa es inasistente (Solo para conteo en KPIs)
  const brechas = activos.filter(p => {
    if (!p.proximo_control) return true;
    const proxControl = new Date(p.proximo_control);
    const hoy = new Date();
    return proxControl < hoy || p.estado_programa === 'INASISTENTE';
  });

  const getFilteredData = () => {
    let list = activeTab === "LISTADO" ? activos : egresados;
    
    if (activeTab === "LISTADO" && filterEstado !== "TODOS") {
      list = list.filter(p => {
        let isVencido = false;
        let isItInasistente = p.estado_programa === 'INASISTENTE';
        
        if (!isItInasistente) {
          if (p.proximo_control) {
            const proxControl = new Date(p.proximo_control);
            const hoy = new Date();
            const proxYear = proxControl.getUTCFullYear();
            const proxMonth = proxControl.getUTCMonth();
            const hoyYear = hoy.getFullYear();
            const hoyMonth = hoy.getMonth();
            if (proxYear < hoyYear || (proxYear === hoyYear && proxMonth < hoyMonth)) {
              isVencido = true;
            }
          } else if (!p.proximo_control) {
            isVencido = true;
          }
        }

        if (filterEstado === "VIGENTES") return !isVencido && !isItInasistente;
        if (filterEstado === "VENCIDOS") return isVencido && !isItInasistente;
        if (filterEstado === "INASISTENTES") return isItInasistente;
        return true;
      });
    }

    if (filterSector !== "TODOS") {
      list = list.filter(p => p.sector === filterSector);
    }
    
    list = list.filter(p => p.edad_anios >= edadMin && p.edad_anios <= edadMax);
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.rut.includes(lower) || 
        p.nombre_completo.toLowerCase().includes(lower)
      );
    }
    
    return list;
  };

  const filteredData = getFilteredData();
  const sectores = ["TODOS", ...Array.from(new Set(data.map(d => d.sector).filter(Boolean)))];

  const getEstadoBadge = (paciente: InfantilData) => {
    if (paciente.edad_anios >= 10) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Alta por Edad</span>;
    }
    
    if (paciente.estado_programa === 'INASISTENTE') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">Inasistente</span>;
    }

    let isVencido = false;
    if (paciente.proximo_control) {
      const proxControl = new Date(paciente.proximo_control);
      const hoy = new Date();
      const proxYear = proxControl.getUTCFullYear();
      const proxMonth = proxControl.getUTCMonth();
      const hoyYear = hoy.getFullYear();
      const hoyMonth = hoy.getMonth();
      if (proxYear < hoyYear || (proxYear === hoyYear && proxMonth < hoyMonth)) {
        isVencido = true;
      }
    } else if (!paciente.proximo_control) {
      isVencido = true;
    }

    if (isVencido) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Vencido</span>;
    }
    
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Vigente</span>;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Indicadores Top */}
      <div className="grid grid-cols-3 gap-4 px-6 pt-4 border-b border-slate-200 pb-6">
        <div className="text-center">
           <p className="text-4xl font-light text-slate-800">{activos.length.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Población Activa</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-red-600">{brechas.length.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-red-600/70 uppercase mt-2">Brechas / Inasistentes</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-emerald-600">{egresados.length.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-emerald-600/70 uppercase mt-2">Egresados (Cumplen 10)</p>
        </div>
      </div>

      {/* Selector de Vista (TABS) y Filtros */}
      <div className="px-6 pt-4 flex flex-col space-y-4 pb-4 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                  onClick={() => setActiveTab('LISTADO')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'LISTADO' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Listado de Pacientes
              </button>
              <button 
                  onClick={() => setActiveTab('EGRESADOS')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'EGRESADOS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  Historial de Egresados
              </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Search size={12}/> Buscar por RUT o Nombre
            </label>
            <input
              type="text"
              placeholder="Ej: 12345678 o Juan"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
                 {activeTab === 'LISTADO' && (
            <div className="space-y-1.5 min-w-0">
               <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                 Estado de Control
               </label>
               <select 
                 value={filterEstado}
                 onChange={(e) => setFilterEstado(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-semibold truncate"
               >
                 <option value="TODOS">Todos</option>
                 <option value="VIGENTES">Vigente</option>
                 <option value="VENCIDOS">Vencidos</option>
                 <option value="INASISTENTES">Inasistentes</option>
               </select>
            </div>
          )}

          <div className="space-y-1.5 min-w-0">
             <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
               Filtrar por Sector
             </label>
             <select 
               value={filterSector}
               onChange={(e) => setFilterSector(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow truncate"
             >
               {sectores.map(s => <option key={s} value={s}>{s === "TODOS" ? "Todos" : s}</option>)}
             </select>
          </div>
          
          <div className={`space-y-1.5 min-w-0 ${activeTab !== 'LISTADO' ? 'md:col-span-2' : ''}`}>
             <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 truncate">
               Rango de Edad
             </label>
             <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs w-full h-[34px] overflow-hidden">
                <span className="text-slate-500 font-bold hidden xl:inline">Desde:</span>
                <select 
                  value={edadMin}
                  onChange={(e) => setEdadMin(Number(e.target.value))}
                  className="bg-transparent border-none outline-none font-bold text-blue-600 focus:ring-0 p-0 text-xs text-center"
                >
                  {[...Array(11)].map((_, i) => <option key={`min-${i}`} value={i}>{i} años</option>)}
                </select>
                <span className="text-slate-300 mx-1">|</span>
                <span className="text-slate-500 font-bold hidden xl:inline">Hasta:</span>
                <select 
                  value={edadMax}
                  onChange={(e) => setEdadMax(Number(e.target.value))}
                  className="bg-transparent border-none outline-none font-bold text-blue-600 focus:ring-0 p-0 text-xs text-center"
                >
                  {[...Array(11)].map((_, i) => <option key={`max-${i}`} value={i}>{i} años</option>)}
                </select>
             </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
           <span>Mostrando {filteredData.length} pacientes según filtros.</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="min-w-full text-left border-collapse border-spacing-0">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
            <tr className="border-b border-slate-100 bg-slate-50/30">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-1/3">Identificación</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Últimas Atenciones</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Evaluación Clínica</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado / Próx. Control</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center">
                    <Baby className="h-10 w-10 text-slate-300 mb-2" />
                    <p>No se encontraron registros</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((p) => (
                <tr key={p.rut} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedPaciente(p)}>
                  <td className="px-6 py-4 min-w-[250px] align-top">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <p className="text-sm font-bold text-slate-800 uppercase leading-none mr-1">{p.nombre_completo}</p>
                      {p.es_naneas && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-100 text-cyan-600 text-[8px] font-black tracking-widest leading-none">NANEAS</span>}
                      {p.es_caso_social && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 border border-green-100 text-green-600 text-[8px] font-black tracking-widest leading-none">CASO SOCIAL</span>}
                      {p.condicion_especial && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 border border-purple-100 text-purple-600 text-[8px] font-black tracking-widest leading-none" title={p.condicion_especial}>CONDICIÓN</span>}
                    </div>
                    <div className="flex flex-wrap items-center text-[10px] text-slate-500 gap-x-2 gap-y-1">
                      <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.rut}-{p.dv}</span>
                      <span>•</span>
                      <span className="font-bold">{p.edad_anios} Años, {p.edad_meses} M</span>
                      <span>•</span>
                      <span className="flex items-center font-bold uppercase"><MapPin size={10} className="mr-1 text-slate-400"/> {p.sector}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                     <div className="flex flex-col space-y-1.5 min-w-[140px]">
                        <div className="flex justify-between items-center text-[9px] gap-4">
                           <span className="font-black text-slate-400 uppercase">Médico</span>
                           <span className="font-bold text-slate-600">{p.ultimo_control_medico ? formatFecha(p.ultimo_control_medico) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] gap-4 border-t border-slate-50 pt-1.5">
                           <span className="font-black text-slate-400 uppercase">Enfermera</span>
                           <span className="font-bold text-slate-600">{p.ultimo_control_enfermera ? formatFecha(p.ultimo_control_enfermera) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] gap-4 border-t border-slate-50 pt-1.5">
                           <span className="font-black text-slate-400 uppercase">Nutricionista</span>
                           <span className="font-bold text-slate-600">{p.ultimo_control_nutri ? formatFecha(p.ultimo_control_nutri) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] gap-4 border-t border-slate-50 pt-1.5">
                           <span className="font-black text-slate-400 uppercase">Dental</span>
                           <span className="font-bold text-slate-600">{p.ultimo_control_dental ? formatFecha(p.ultimo_control_dental) : '-'}</span>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      {p.dsm_resultado && (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">DSM ({p.tipo_evaluacion_dsm || 'Evaluación'})</span>
                          <span className={`w-fit mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            p.dsm_resultado === 'Normal' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 
                            p.dsm_resultado.includes('Riesgo') || p.dsm_resultado.includes('Rezago') ? 'border-amber-100 bg-amber-50 text-amber-600' : 
                            'border-red-100 bg-red-50 text-red-600'
                          }`}>{p.dsm_resultado}</span>
                        </div>
                      )}
                      {p.estado_nutricional && (
                        <div className="flex flex-col mt-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Nutricional</span>
                          <span className={`w-fit mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            p.estado_nutricional === 'Normal' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 
                            p.estado_nutricional.includes('Sobrepeso') || p.estado_nutricional.includes('Riesgo') ? 'border-amber-100 bg-amber-50 text-amber-600' : 
                            'border-red-100 bg-red-50 text-red-600'
                          }`}>{p.estado_nutricional}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col items-start gap-1">
                      {getEstadoBadge(p)}
                      {p.proximo_control && (
                        <div className="flex flex-col mt-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Próximo Control</span>
                          <div className="flex items-center gap-1 mt-0.5 text-slate-700">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="font-bold text-[10px] uppercase">{formatMesAno(p.proximo_control)}</span>
                            {p.estamento_proximo_control && <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 rounded ml-1">{p.estamento_proximo_control}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end space-x-2">
                      {activeTab === 'LISTADO' && canManage && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNspPaciente(p);
                              setNspFecha(new Date().toISOString().split('T')[0]);
                              setNspEstamento("ENFERMERA");
                              setShowNspModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Registrar Inasistencia (NSP)"
                          >
                            <CalendarX size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditPaciente(p);
                              setEditDsm(p.dsm_resultado || "Normal");
                              setEditNutri(p.estado_nutricional || "Normal");
                              setEditNaneas(p.es_naneas || false);
                              setEditSocial(p.es_caso_social || false);
                              setEditCondicion(p.condicion_especial || "");
                              setEditProxControl(p.proximo_control ? p.proximo_control.substring(0, 7) : "");
                              setEditProxEstamento(p.estamento_proximo_control || "ENFERMERA");
                              setEditObs(p.observaciones || "");
                              setShowEditModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edición Rápida (Administrativa)"
                          >
                            <Edit size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over (Panel Lateral) para Detalles del Paciente */}
      {selectedPaciente && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedPaciente(null)}
          ></div>
          
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header del Panel */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                  {selectedPaciente.nombre_completo.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight uppercase">{selectedPaciente.nombre_completo}</h3>
                  <p className="text-sm text-slate-500 font-mono">{selectedPaciente.rut}-{selectedPaciente.dv}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPaciente(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del Panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Datos Generales */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <User size={12} className="mr-2" /> Información de Ficha
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Edad</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {selectedPaciente.edad_anios} Años, {selectedPaciente.edad_meses} Meses
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Sector</p>
                    <p className="text-sm font-semibold text-slate-700 uppercase">{selectedPaciente.sector}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone size={14} className="mr-3 text-slate-400" /> {selectedPaciente.telefono || 'Sin teléfono registrado'}
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Map size={14} className="mr-3 text-slate-400" /> {selectedPaciente.direccion || 'Sin dirección registrada'}
                  </div>
                </div>
              </div>

              {/* Banderas Clínicas */}
              {(selectedPaciente.es_naneas || selectedPaciente.es_caso_social || selectedPaciente.condicion_especial) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <AlertTriangle size={12} className="mr-2" /> Banderas Clínicas
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedPaciente.es_naneas && <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-bold rounded">NANEAS</span>}
                      {selectedPaciente.es_caso_social && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">CASO SOCIAL</span>}
                    </div>
                    {selectedPaciente.condicion_especial && (
                      <p className="text-sm text-slate-700 mt-2"><strong>Condición:</strong> {selectedPaciente.condicion_especial}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluación Clínica (DSM, etc) */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Stethoscope size={12} className="mr-2" /> Última Evaluación Clínica
                </h4>
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                  {selectedPaciente.estado_nutricional && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-slate-600">Estado Nutricional</span>
                      <span className="text-sm font-semibold text-slate-800">{selectedPaciente.estado_nutricional}</span>
                    </div>
                  )}

                  {selectedPaciente.dsm_resultado && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-slate-600">DSM ({selectedPaciente.tipo_evaluacion_dsm})</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPaciente.dsm_resultado}</span>
                    </div>
                  )}

                  {/* Detalles extra desde dsm_detalle */}
                  {(() => {
                    const detalle = parseDsmDetalle(selectedPaciente.dsm_detalle);
                    if (!detalle) return null;
                    return (
                      <div className="mt-2 space-y-2 pt-2 border-t border-slate-200">
                        {detalle.presion_arterial && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Presión Arterial</span>
                            <span className="text-xs font-bold text-slate-700">{detalle.presion_arterial}</span>
                          </div>
                        )}
                        {detalle.score_ira && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Score IRA</span>
                            <span className="text-xs font-bold text-slate-700">{detalle.score_ira}</span>
                          </div>
                        )}
                        {detalle.lme === true && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">LME (6-7m)</span>
                            <span className="text-xs font-bold text-green-700">Sí (Exclusiva)</span>
                          </div>
                        )}
                        {detalle.mchat && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">M-CHAT</span>
                            <span className="text-xs font-bold text-amber-700">{detalle.mchat}</span>
                          </div>
                        )}
                        {detalle.obsTea === true && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500">Obs. TEA</span>
                            <span className="text-xs font-bold text-indigo-700">Marcado</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Fechas de Control */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Calendar size={12} className="mr-2" /> Fechas de Control
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Médico</p>
                    <p className="text-sm font-semibold text-slate-700">{formatFecha(selectedPaciente.ultimo_control_medico || "")}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Enfermera</p>
                    <p className="text-sm font-semibold text-slate-700">{formatFecha(selectedPaciente.ultimo_control_enfermera || "")}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Nutricionista</p>
                    <p className="text-sm font-semibold text-slate-700">{formatFecha(selectedPaciente.ultimo_control_nutri || "")}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Dental</p>
                    <p className="text-sm font-semibold text-slate-700">{formatFecha(selectedPaciente.ultimo_control_dental || "")}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer del Panel */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setSelectedPaciente(null)}
                className="w-full bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal NSP */}
      {showNspModal && nspPaciente && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CalendarX size={18} className="text-slate-500" />
                Registrar Inasistencia (NSP)
              </h3>
              <button onClick={() => setShowNspModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs border border-blue-100 mb-4">
                <span className="font-bold block mb-1">{nspPaciente.nombre_completo}</span>
                {nspPaciente.rut}-{nspPaciente.dv} • {nspPaciente.edad_anios} Años
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha de Inasistencia</label>
                <input 
                  type="date" 
                  value={nspFecha} 
                  onChange={(e) => setNspFecha(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Estamento de la Cita</label>
                <select 
                  value={nspEstamento} 
                  onChange={(e) => setNspEstamento(e.target.value)}
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="MEDICO">Médico</option>
                  <option value="ENFERMERA">Enfermera</option>
                  <option value="NUTRICIONISTA">Nutricionista</option>
                  <option value="DENTAL">Dental</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowNspModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition"
                  disabled={isSavingNsp}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveNsp}
                  disabled={isSavingNsp || !nspFecha}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {isSavingNsp ? 'Guardando...' : 'Registrar NSP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Administrativo */}
      {showEditModal && editPaciente && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit size={18} className="text-blue-500" />
                Edición Administrativa
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">{editPaciente.nombre_completo}</span>
                  <span className="text-xs text-slate-500">{editPaciente.rut}-{editPaciente.dv} • {editPaciente.edad_anios} Años</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Clínica</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Desarrollo Psicomotor (DSM)</label>
                    <select value={editDsm} onChange={e => setEditDsm(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg">
                      <option>Normal</option>
                      <option>Normal con Rezago</option>
                      <option>Riesgo</option>
                      <option>Retraso</option>
                      <option>Déficit</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Estado Nutricional</label>
                    <select value={editNutri} onChange={e => setEditNutri(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg">
                      <option>Normal</option>
                      <option>Riesgo de Desnutrición</option>
                      <option>Desnutrición</option>
                      <option>Sobrepeso</option>
                      <option>Obesidad</option>
                      <option>Obesidad Severa</option>
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editNaneas} onChange={e => setEditNaneas(e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">NANEAS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editSocial} onChange={e => setEditSocial(e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">Caso Social</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Condición Especial</label>
                    <input type="text" value={editCondicion} onChange={e => setEditCondicion(e.target.value)} placeholder="Ej: Alergia alimentaria" className="w-full text-sm border-slate-300 rounded-lg" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Agendamiento</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Mes y Año (Correspondiente)</label>
                    <input 
                      type="month" 
                      min={new Date().toISOString().substring(0, 7)}
                      value={editProxControl} 
                      onChange={e => setEditProxControl(e.target.value)} 
                      className="w-full text-sm border-slate-300 rounded-lg" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Estamento Próx. Control</label>
                    <select value={editProxEstamento} onChange={e => setEditProxEstamento(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg">
                      <option value="MEDICO">Médico</option>
                      <option value="ENFERMERA">Enfermera</option>
                      <option value="NUTRICIONISTA">Nutricionista</option>
                      <option value="DENTAL">Dental</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Observaciones</label>
                    <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={3} className="w-full text-sm border-slate-300 rounded-lg font-mono" placeholder="Notas internas..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 rounded-xl transition"
                disabled={isSavingEdit}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

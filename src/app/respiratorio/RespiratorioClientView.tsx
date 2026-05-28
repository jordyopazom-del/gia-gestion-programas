"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  Activity, 
  ClipboardList, 
  Plus, 
  X, 
  Wind, 
  Calendar,
  Filter,
  Phone,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Edit2
} from "lucide-react";
import Link from "next/link";
import { UserProfile } from "@/actions/userActions";
import { 
  getRespiratorioData, 
  updateDiagnosticoControl, 
  egresarPacienteRespiratorio,
  togglePadStatus 
} from "@/actions/respiratorioActions";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { LogOut, History, UserCheck, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';

const getStatus = (fechaString: string | null, diagnostico: string | null) => {
  if (!fechaString) return { status: "Sin Registro", color: "bg-slate-100 text-slate-600 border-slate-200" };
  
  const fecha = new Date(fechaString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - fecha.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Regla general: 6 meses (180 días) para seguimiento respiratorio crónico
  if (diffDays > 180) {
    return { status: "Vencido", color: "bg-red-50 text-red-700 border-red-100" };
  } else if (diffDays > 150) {
    return { status: "Por Vencer", color: "bg-amber-50 text-amber-700 border-amber-100" };
  }
  return { status: "Vigente", color: "bg-emerald-50 text-emerald-700 border-emerald-100" };
};

const getVigenciaHibrida = (fechaUltimo: string | null, fechaProxima: string | null, diasLimite: number) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Validar por Citación Futura (Agenda)
  if (fechaProxima) {
    const cita = new Date(fechaProxima);
    cita.setHours(0, 0, 0, 0);
    
    // Si la cita es en el futuro, manda la cita
    if (cita >= now) {
      const diffCita = Math.ceil((cita.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffCita <= 7) return { label: "Próximo", color: "text-amber-600 bg-amber-50" };
      return { label: "Vigente", color: "text-emerald-600 bg-emerald-50" };
    }
  }

  // 2. Validar por Norma Clínica (Fallback si no hay cita o si la cita ya pasó)
  if (!fechaUltimo) return { label: "Pendiente", color: "text-slate-400 bg-slate-50" };
  
  const ultimo = new Date(fechaUltimo);
  const diffClinica = Math.ceil(Math.abs(now.getTime() - ultimo.getTime()) / (1000 * 60 * 60 * 24));

  if (diffClinica > diasLimite) return { label: "Vencido", color: "text-red-600 bg-red-50 font-bold" };
  if (diffClinica > (diasLimite - 30)) return { label: "Próximo", color: "text-amber-600 bg-amber-50" };

  return { label: "Vigente", color: "text-emerald-600 bg-emerald-50" };
};

const calculateAge = (birthday: string | Date | null) => {
  if (!birthday) return null;
  const ageDifMs = Date.now() - new Date(birthday).getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
  } catch(e) {
    return "-";
  }
};

const MESES_LIST = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

const formatMesAnio = (dateString: string | null | undefined, fallbackLabel?: string) => {
  if (dateString) {
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return `${MESES_LIST[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      }
    } catch (e) {
      // Ignorar
    }
  }
  if (fallbackLabel) {
    if (fallbackLabel.includes("T") || fallbackLabel.includes("-") || fallbackLabel.includes("/")) {
      try {
        const d = new Date(fallbackLabel);
        if (!isNaN(d.getTime())) {
          return `${MESES_LIST[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        }
      } catch(e) {}
    }
    return fallbackLabel.toUpperCase();
  }
  return '-';
};

const LISTA_DIAG = [
  "ASMA LEVE",
  "ASMA MODERADA",
  "ASMA SEVERA",
  "EPOC TIPO A",
  "EPOC TIPO B",
  "SBOR",
  "OXIGENO DEPENDIENTE",
  "AVNI",
  "FIBROSIS QUISTICA",
  "OTRAS RESPIRATORIAS"
];

const LISTA_CONTROL = [
  "CONTROLADO",
  "PARCIALMENTE CONTROLADO",
  "NO CONTROLADO",
  "SIN EVALUAR"
];

export default function RespiratorioClientView({ data, user }: { data: any[], user: UserProfile }) {
  const router = useRouter();
  const [searchRut, setSearchRut] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");
  const [filterProg, setFilterProg] = useState("Todos");
  const [filterDiag, setFilterDiag] = useState("Todos");
  const [filterCtrl, setFilterCtrl] = useState("Todos");
  const [filterVigencia, setFilterVigencia] = useState("Todos");
  const [onlyPad, setOnlyPad] = useState(false);

  // Estados de Pestañas y Modales
  const [view, setView] = useState<'lista' | 'analisis'>('lista');
  const [activeTab, setActiveTab] = useState<'activos' | 'egresados'>('activos');
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [motivoEgreso, setMotivoEgreso] = useState("ALTA MÉDICA");
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [obsEgreso, setObsEgreso] = useState("");

  const [isEgresando, setIsEgresando] = useState(false);
  
  // Estados para optimizar UX/UI (espacio y descargas)
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estados para Modal de Edición Rápida (Correcciones Administrativas)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFichaId, setEditFichaId] = useState<number | null>(null);
  const [editDiag, setEditDiag] = useState("");
  const [editCtrl, setEditCtrl] = useState("");
  const [editMigrante, setEditMigrante] = useState(false);
  const [editPuebloOriginario, setEditPuebloOriginario] = useState(false);
  const [editSecueladoTbc, setEditSecueladoTbc] = useState(false);
  const [editOtraRespiratoriaDetalle, setEditOtraRespiratoriaDetalle] = useState("");
  const [editPacienteDataCli, setEditPacienteDataCli] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleSaveEdit = async () => {
    if (!editFichaId) return;
    setIsSavingEdit(true);

    const updatedDataClinica = {
      ...editPacienteDataCli,
      es_migrante: editMigrante,
      pueblo_originario: editPuebloOriginario,
      secuelado_tbc: editSecueladoTbc,
      otra_respiratoria_detalle: editDiag === "OTRAS RESPIRATORIAS" ? editOtraRespiratoriaDetalle.toUpperCase().trim() : ""
    };

    const res = await updateDiagnosticoControl(
      editFichaId,
      editDiag,
      editCtrl,
      updatedDataClinica
    );

    if (res.success) {
      toast.success("Diagnóstico y caracterización actualizados correctamente");
      setShowEditModal(false);
      setEditFichaId(null);
      router.refresh();
    } else {
      toast.error("Error al actualizar: " + res.error);
    }
    setIsSavingEdit(false);
  };

  const canManage = user.rol === "ADMINISTRADOR" || user.rol === "REFERENTE";

  const handleEgreso = async () => {
    if (!selectedPaciente) return;
    setIsEgresando(true);
    const res = await egresarPacienteRespiratorio({
      ficha_id: selectedPaciente.ficha_id,
      motivo: motivoEgreso,
      fecha: `${fechaEgreso}-01`,
      observaciones: obsEgreso,
      profesional_rut: user.rut
    });

    if (res.success) {
      toast.success("Egreso procesado correctamente");
      setShowEgresoModal(false);
      setSelectedPaciente(null);
      setObsEgreso("");
      router.refresh();
    } else {
      toast.error("Error: " + res.error);
    }
    setIsEgresando(false);
  };

  const downloadExcel = () => {
    const excelData = filtered.map(p => {
      const age = calculateAge(p.fecha_nacimiento);
      const kStat = getVigenciaHibrida(p.ultima_atencion_global, p.cita_kine, 120);
      const mStat = getVigenciaHibrida(null, p.cita_medico, 180);
      const eStat = getVigenciaHibrida(null, p.cita_espiro, 365);

      let dataCli: any = {};
      try {
        dataCli = typeof p.data_clinica === 'string' ? JSON.parse(p.data_clinica) : (p.data_clinica || {});
      } catch (e) {
        dataCli = {};
      }

      const getSurveyScore = () => {
        const diagUpper = (p.diagnostico || "").toUpperCase();
        const isEq5dDiag = diagUpper.includes("ASMA") || 
                           diagUpper === "OXIGENO DEPENDIENTE" || 
                           diagUpper === "AVNI" || 
                           diagUpper === "FIBROSIS QUISTICA" || 
                           diagUpper === "OTRAS RESPIRATORIAS";
        if (isEq5dDiag) {
          return dataCli.eq5d_score !== undefined && dataCli.eq5d_score !== null ? `EQ-5D: ${dataCli.eq5d_score}` : "SIN REGISTRO";
        } else if (diagUpper.includes("EPOC")) {
          return dataCli.cat_score !== undefined && dataCli.cat_score !== null ? `CAT: ${dataCli.cat_score}` : "SIN REGISTRO";
        }
        return "NO APLICA";
      };

      return {
        "RUT": `${p.rut}-${p.dv}`,
        "NOMBRE COMPLETO": p.nombre_completo,
        "EDAD": age,
        "SECTOR": p.sector,
        "DIAGNÓSTICO": p.diagnostico === "OTRAS RESPIRATORIAS" && dataCli.otra_respiratoria_detalle
          ? `OTRAS RESPIRATORIAS (${dataCli.otra_respiratoria_detalle})`
          : (p.diagnostico || "SIN REGISTRO"),
        "NIVEL DE CONTROL": p.nivel_control || "SIN EVALUAR",
        "ESTRATEGIA PAD": p.es_pad ? "SÍ" : "NO",
        "MIGRANTE": dataCli.es_migrante ? "SÍ" : "NO",
        "PUEBLO ORIGINARIO": dataCli.pueblo_originario ? "SÍ" : "NO",
        "SECUELADO TBC": dataCli.secuelado_tbc ? "SÍ" : "NO",
        "PUNTAJE ENCUESTA": getSurveyScore(),
        "FECHA ENCUESTA": formatDate(dataCli.fecha_encuesta),
        "ÚLT. CONTROL MÉDICO": formatDate(p.last_med),
        "ÚLT. CONTROL KINE": formatDate(p.last_kin),
        "ÚLT. ESPIROMETRÍA": formatDate(p.last_esp),
        "VIGENCIA KINE": kStat.label,
        "VIGENCIA MÉDICO": mStat.label,
        "VIGENCIA ESPIRO": eStat.label,
        "ESTADO PROGRAMA": p.estado_programa || "ACTIVO",
        "OBSERVACIONES": p.observaciones || ""
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Padrón Respiratorio");
    XLSX.writeFile(wb, `Estadistica_Respiratorio_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Excel generado correctamente");
  };

  const exportCampanaExcel = () => {
    const vencidos = data.filter(p => {
      const kineStat = getVigenciaHibrida(p.last_kin, p.cita_kine, 120);
      const mediStat = getVigenciaHibrida(p.last_med, p.cita_medico, 180);
      return kineStat.label === 'Vencido' || mediStat.label === 'Vencido' || kineStat.label === 'Pendiente' || mediStat.label === 'Pendiente';
    });

    const dataset = vencidos.map(p => {
      const age = calculateAge(p.fecha_nacimiento);
      const kineStat = getVigenciaHibrida(p.last_kin, p.cita_kine, 120);
      const mediStat = getVigenciaHibrida(p.last_med, p.cita_medico, 180);
      const isKVencido = kineStat.label === 'Vencido' || kineStat.label === 'Pendiente';
      const isMVencido = mediStat.label === 'Vencido' || mediStat.label === 'Pendiente';
      
      return {
        "Vencido Médico": isMVencido ? "SÍ" : "NO",
        "Vencido Kine": isKVencido ? "SÍ" : "NO",
        "Rut": `${p.rut}-${p.dv}`,
        "Nombre": p.nombre_completo,
        "Edad": age || "-",
        "Sector": p.sector || "SIN SECTOR",
        "Telefono": p.telefono || "-"
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataset);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Campana_Vencidos");
    XLSX.writeFile(wb, `Campana_Vencidos_Respiratorio.xlsx`);
    toast.success("Excel de campaña generado correctamente");
  };

  const sectors = useMemo(() => ["Todos", ...Array.from(new Set(data.map(p => p.sector))).sort()], [data]);
  
  // Generar listas dinámicas para los filtros (Diagnóstico y Control) limpiando espacios
  const uniqueDiagnostics = useMemo(() => Array.from(new Set(data.map(p => p.diagnostico?.trim()))).filter(Boolean).sort(), [data]);
  const uniqueControls = useMemo(() => Array.from(new Set(data.map(p => p.nivel_control?.trim()))).filter(Boolean).sort(), [data]);

  const filtered = useMemo(() => {
    return data.filter((p) => {
      // Filtrar por Pestaña (Activo vs Egreso)
      const isEgreso = p.estado_programa && p.estado_programa !== 'ACTIVO';
      if (activeTab === 'activos' && isEgreso) return false;
      if (activeTab === 'egresados' && !isEgreso) return false;

      const qRut = searchRut.replace(/[-.]/g, "").toLowerCase();
      const matchRut = p.rut.toLowerCase().includes(qRut) || p.nombre_completo.toLowerCase().includes(searchRut.toLowerCase());
      const matchSector = filterSector === "Todos" || p.sector === filterSector;
      
      const age = calculateAge(p.fecha_nacimiento);
      const program = (age !== null && age < 20) ? "IRA" : "ERA";
      const matchProg = filterProg === "Todos" || program === filterProg;

      const matchDiag = filterDiag === "Todos" || (p.diagnostico?.trim() === filterDiag?.trim());
      const matchCtrl = filterCtrl === "Todos" || (p.nivel_control?.trim() === filterCtrl?.trim());

      const kineStat = getVigenciaHibrida(p.last_kin, p.cita_kine, 120);
      const espiStat = getVigenciaHibrida(p.last_esp, p.cita_espiro, 365);
      const mediStat = getVigenciaHibrida(p.last_med, p.cita_medico, 180);

      let pStatus = 'Vigente';
      const isKVencido = kineStat.label === 'Vencido' || kineStat.label === 'Pendiente';
      const isMVencido = mediStat.label === 'Vencido' || mediStat.label === 'Pendiente';
      
      if (isKVencido || isMVencido) pStatus = 'Vencido';
      else if (kineStat.label === 'Próximo' || mediStat.label === 'Próximo') pStatus = 'Por Vencer';
      const matchVigencia = filterVigencia === "Todos" || pStatus === filterVigencia;

      const matchPad = !onlyPad || p.es_pad;

      return matchRut && matchSector && matchProg && matchDiag && matchCtrl && matchVigencia && matchPad;
    });
  }, [data, searchRut, filterSector, filterProg, filterDiag, filterCtrl, filterVigencia, onlyPad, activeTab]);

  const stats = useMemo(() => {
    const total = data.filter(p => !p.estado_programa || p.estado_programa === 'ACTIVO').length;
    const diagCounts: Record<string, number> = {};
    const ctrlCounts: Record<string, number> = {};
    const sectorStats: Record<string, { total: number, vigentes: number }> = {};
    
    const padPatients = data.filter(p => (!p.estado_programa || p.estado_programa === 'ACTIVO') && p.es_pad);
    const padCount = padPatients.length;
    
    const padBySector = padPatients.reduce((acc: any, p) => {
      acc[p.sector || 'SIN SECTOR'] = (acc[p.sector || 'SIN SECTOR'] || 0) + 1;
      return acc;
    }, {});

    const padByControl = padPatients.reduce((acc: any, p) => {
      const ctrl = p.nivel_control || 'SIN EVALUAR';
      acc[ctrl] = (acc[ctrl] || 0) + 1;
      return acc;
    }, {});

    let vigentesCount = 0;
    let proximosCount = 0;
    let vencidosCount = 0;

    data.forEach(p => {
      const isEgreso = p.estado_programa && p.estado_programa !== 'ACTIVO';
      if (isEgreso) return;

      const diag = p.diagnostico || "SIN REGISTRO";
      diagCounts[diag] = (diagCounts[diag] || 0) + 1;

      const ctrl = p.nivel_control || "SIN EVALUAR";
      ctrlCounts[ctrl] = (ctrlCounts[ctrl] || 0) + 1;

      const sec = p.sector || "SIN SECTOR";
      if (!sectorStats[sec]) sectorStats[sec] = { total: 0, vigentes: 0 };
      sectorStats[sec].total++;

      const k = getVigenciaHibrida(p.last_kin, p.cita_kine, 120);
      const m = getVigenciaHibrida(p.last_med, p.cita_medico, 180);
      
      const isVencido = k.label === 'Vencido' || m.label === 'Vencido' || k.label === 'Pendiente' || m.label === 'Pendiente';
      const isProximo = k.label === 'Próximo' || m.label === 'Próximo';

      if (isVencido) vencidosCount++;
      else if (isProximo) proximosCount++;
      else if (k.label === 'Vigente' && m.label === 'Vigente') {
        vigentesCount++;
        sectorStats[sec].vigentes++;
      }
    });

    return { total, diagCounts, ctrlCounts, sectorStats, padCount, padBySector, padByControl, vigentesCount, proximosCount, vencidosCount };
  }, [data]);

  const percCob = stats.total > 0 ? ((stats.vigentesCount / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Indicadores Top Estilo GIA */}
      <div className="grid grid-cols-5 gap-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
           <p className="text-4xl font-light text-slate-800">{stats.total.toLocaleString("es-CL")}</p>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Población Bajo Control</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-blue-600">{percCob}%</p>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Cobertura Vigente</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-emerald-600">{stats.vigentesCount.toLocaleString("es-CL")}</p>
           <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mt-2">Vigentes</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-orange-500">{stats.proximosCount.toLocaleString("es-CL")}</p>
           <p className="text-[10px] font-black text-orange-500/70 uppercase tracking-widest mt-2">Próximos Venc.</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-red-600">{stats.vencidosCount.toLocaleString("es-CL")}</p>
           <p className="text-[10px] font-black text-red-600/70 uppercase tracking-widest mt-2">Vencidos / Pend.</p>
        </div>
      </div>

      {/* Selector de Vista e Historial */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => { setView('lista'); setActiveTab('activos'); }}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'activos' && view === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserCheck size={14} />
            <span>LISTADO OPERATIVO</span>
          </button>
          <button 
            onClick={() => { setView('lista'); setActiveTab('egresados'); }}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'egresados' && view === 'lista' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History size={14} />
            <span>HISTORIAL DE EGRESADOS</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setView(view === 'lista' ? 'analisis' : 'lista')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'analisis' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {view === 'lista' ? "ANÁLISIS ESTADÍSTICO" : "VOLVER AL LISTADO"}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center justify-center space-x-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl font-black hover:bg-emerald-100 transition-all shadow-sm text-xs"
            >
              <Download size={16} />
              <span>EXPORTAR REPORTE</span>
              <span className="text-[10px] ml-1">▼</span>
            </button>
            {showExportDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                  <button 
                    onClick={() => {
                      downloadExcel();
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Padrón Completo</span>
                  </button>
                  <button 
                    onClick={() => {
                      exportCampanaExcel();
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-2"
                  >
                    <span>🎯</span>
                    <span>Campaña Vencidos</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          <Link 
            href="/respiratorio/nuevo"
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span className="text-sm">Registrar</span>
          </Link>
        </div>
      </div>


      {view === 'lista' ? (
        <>
          {/* Barra de Filtros Avanzada */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={searchRut}
                    onChange={(e) => setSearchRut(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <select 
                  value={filterDiag} 
                  onChange={(e) => setFilterDiag(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">DIAGNÓSTICO (TODOS)</option>
                  {uniqueDiagnostics.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <select 
                  value={filterCtrl} 
                  onChange={(e) => setFilterCtrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Todos">NIVEL DE CONTROL (TODOS)</option>
                  {uniqueControls.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                    showAdvancedFilters 
                      ? 'bg-slate-200 text-slate-800' 
                      : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                  }`}
                >
                  <Filter size={14} />
                  <span>MÁS FILTROS {showAdvancedFilters ? '▲' : '▼'}</span>
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="flex gap-4 border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex-1">
                    <select 
                      value={filterProg} 
                      onChange={(e) => setFilterProg(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Todos">PROGRAMAS (TODOS)</option>
                      <option value="IRA">IRA (INFANTIL)</option>
                      <option value="ERA">ERA (ADULTO)</option>
                    </select>
                </div>
                <div className="flex-1">
                    <select 
                      value={filterSector} 
                      onChange={(e) => setFilterSector(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Todos">SECTORES (TODOS)</option>
                      {sectors.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <select 
                      value={filterVigencia} 
                      onChange={(e) => setFilterVigencia(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Todos">VIGENCIAS (TODAS)</option>
                      <option value="Vigente">VIGENTES</option>
                      <option value="Vencido">VENCIDOS</option>
                      <option value="Por Vencer">POR VENCER</option>
                    </select>
                </div>
                <button 
                  onClick={() => {
                    setSearchRut(""); setFilterSector("Todos"); setFilterProg("Todos");
                    setFilterDiag("Todos"); setFilterCtrl("Todos"); setFilterVigencia("Todos");
                    setOnlyPad(false);
                  }}
                  className="px-4 py-2 text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  LIMPIAR FILTROS
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-6 py-2 bg-slate-50/50 rounded-xl border border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               Padrón Operativo: {filtered.length} pacientes
             </span>

             <button 
                onClick={() => setOnlyPad(!onlyPad)}
                className={`flex items-center space-x-3 px-4 py-1.5 rounded-xl border transition-all ${
                  onlyPad 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  onlyPad ? 'bg-white border-white text-blue-600' : 'bg-white border-slate-300'
                }`}>
                  {onlyPad && <Check size={10} strokeWidth={4} />}
                </div>
                <ShieldCheck size={14} className={onlyPad ? 'text-white' : 'text-slate-400'} />
                <span className={`text-[10px] font-black uppercase tracking-tight ${onlyPad ? 'text-white' : 'text-slate-600'}`}>Solo Pacientes PAD</span>
             </button>
          </div>

          {/* Tabla Profesional */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-spacing-0">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Identificación</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Diagnóstico / Control</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Últimas Atenciones</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Próximos Controles (Vigencia)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => {
                const age = calculateAge(p.fecha_nacimiento);
                const kineStat = getVigenciaHibrida(p.last_kin, p.cita_kine, 120);
                const espiStat = getVigenciaHibrida(p.last_esp, p.cita_espiro, 365);
                const mediStat = getVigenciaHibrida(p.last_med, p.cita_medico, 180);

                // Asegurar que dataCli sea un objeto (por si viene como string JSON desde la DB)
                let dataCli: any = {};
                try {
                  dataCli = typeof p.data_clinica === 'string' ? JSON.parse(p.data_clinica) : (p.data_clinica || {});
                } catch (e) {
                  dataCli = {};
                }

                const renderSurveyBadge = () => {
                  const diagUpper = (p.diagnostico || "").toUpperCase();
                  const isEq5dDiag = diagUpper.includes("ASMA") || 
                                     diagUpper === "OXIGENO DEPENDIENTE" || 
                                     diagUpper === "AVNI" || 
                                     diagUpper === "FIBROSIS QUISTICA" || 
                                     diagUpper === "OTRAS RESPIRATORIAS";
                  const isEpoc = diagUpper.includes("EPOC");

                  if (!isEq5dDiag && !isEpoc) return null;

                  const fechaEnc = dataCli.fecha_encuesta;
                  const hasSurvey = isEq5dDiag 
                    ? dataCli.eq5d_score !== undefined && dataCli.eq5d_score !== null 
                    : (dataCli.cat_score !== undefined && dataCli.cat_score !== null);

                  if (!hasSurvey || !fechaEnc) {
                    return (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-400 font-bold uppercase w-fit mt-1">
                        {isEq5dDiag ? "EQ-5D Pendiente" : "CAT Pendiente"}
                      </span>
                    );
                  }

                  const fEnc = new Date(fechaEnc);
                  const now = new Date();
                  now.setHours(0,0,0,0);
                  fEnc.setHours(0,0,0,0);
                  const diffTime = now.getTime() - fEnc.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isVencido = diffDays > 365;

                  if (isVencido) {
                    return (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600 font-bold uppercase w-fit mt-1 flex items-center gap-1" title={`Última aplicación: ${formatDate(fechaEnc)}`}>
                        <span>⚠️</span> {isEq5dDiag ? "EQ-5D" : "CAT"} Vencido
                      </span>
                    );
                  }

                  if (isEq5dDiag) {
                    return (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold uppercase w-fit mt-1" title={`Aplicado el ${formatDate(fechaEnc)}`}>
                        EQ-5D: {dataCli.eq5d_score}
                      </span>
                    );
                  } else {
                    return (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-600 font-bold uppercase w-fit mt-1" title={`Aplicado el ${formatDate(fechaEnc)}`}>
                        CAT: {dataCli.cat_score}
                      </span>
                    );
                  }
                };

                return (
                  <tr key={p.rut} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 min-w-[250px]">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <p className="text-sm font-bold text-slate-800 uppercase leading-none mr-1">{p.nombre_completo}</p>
                        {p.es_pad && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black tracking-widest leading-none">
                            <ShieldCheck size={10} className="mr-1 text-blue-600" />
                            PAD
                          </span>
                        )}
                        {dataCli.es_migrante && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black tracking-widest leading-none" title="Paciente Migrante">
                            MIG
                          </span>
                        )}
                        {dataCli.pueblo_originario && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black tracking-widest leading-none" title="Pueblo Originario">
                            PO
                          </span>
                        )}
                        {dataCli.secuelado_tbc && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-red-600 text-[8px] font-black tracking-widest leading-none" title="Secuelado TBC">
                            TBC
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center text-[10px] text-slate-500 gap-x-2 gap-y-1 mb-2">
                        <span className="font-mono font-bold bg-slate-100 px-1 rounded text-slate-600">{p.rut}-{p.dv}</span>
                        <span>•</span>
                        <span className="font-bold">{age} Años</span>
                        <span>•</span>
                        <span className="flex items-center"><MapPin size={10} className="mr-0.5"/> {p.sector}</span>
                      </div>
                      
                      {p.observaciones && (
                        <div className="flex items-start gap-1.5 p-2 bg-amber-50/50 border border-amber-100/50 rounded-lg max-w-xs">
                           <Activity size={10} className="text-amber-500 mt-0.5 shrink-0" />
                           <p className="text-[9px] font-medium text-amber-800 line-clamp-2 leading-tight italic">
                             "{p.observaciones}"
                           </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase mb-0.5">
                              {p.diagnostico === 'OTRAS RESPIRATORIAS' && dataCli.otra_respiratoria_detalle 
                                ? 'OTRAS RESPIRATORIAS' 
                                : (p.diagnostico || 'Pendiente')
                              }
                            </p>
                            {p.diagnostico === 'OTRAS RESPIRATORIAS' && dataCli.otra_respiratoria_detalle && (
                              <span className="text-[9px] font-bold text-slate-500 italic uppercase leading-none mb-0.5">
                                ({dataCli.otra_respiratoria_detalle})
                              </span>
                            )}
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border w-fit ${
                              p.nivel_control === 'CONTROLADO' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-slate-100 text-slate-500 bg-slate-50'
                            }`}>
                              {p.nivel_control || 'Sin Evaluar'}
                            </span>
                            {renderSurveyBadge()}
                         </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col space-y-1 min-w-[140px]">
                          <div className="flex justify-between text-[9px] gap-4">
                             <span className="font-black text-slate-400 uppercase">Médico</span>
                             <span className="font-bold text-slate-600">{formatDate(p.last_med)}</span>
                          </div>
                          <div className="flex justify-between text-[9px] gap-4">
                             <span className="font-black text-slate-400 uppercase">Kine</span>
                             <span className="font-bold text-slate-600">{formatDate(p.last_kin)}</span>
                          </div>
                          <div className="flex justify-between text-[9px] gap-4 border-t border-slate-100 pt-1">
                             <span className="font-black text-slate-400 uppercase">Espiro</span>
                             <span className="font-bold text-slate-600">{formatDate(p.last_esp)}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1.5 min-w-[160px] bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 mx-auto">
                        {/* MÉDICO */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-500 uppercase flex items-center gap-1">🩺 Med</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-slate-700 font-bold">{formatMesAnio(p.cita_medico, dataCli.proximo_medico_label)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${mediStat.color}`}>
                              {mediStat.label}
                            </span>
                          </div>
                        </div>
                        {/* KINE */}
                        <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-500 uppercase flex items-center gap-1">🧘‍♂️ Kin</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-slate-700 font-bold">{formatMesAnio(p.cita_kine, dataCli.proximo_kine_label)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${kineStat.color}`}>
                              {kineStat.label}
                            </span>
                          </div>
                        </div>
                        {/* ESPIRO */}
                        <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-500 uppercase flex items-center gap-1">🌬️ Esp</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-slate-700 font-bold">{formatMesAnio(p.cita_espiro, dataCli.proximo_espiro_label)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${espiStat.color}`}>
                              {espiStat.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {activeTab === 'activos' ? (
                            canManage && (
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => {
                                    let dCli: any = {};
                                    try {
                                      dCli = typeof p.data_clinica === 'string' ? JSON.parse(p.data_clinica) : (p.data_clinica || {});
                                    } catch (e) {
                                      dCli = {};
                                    }
                                    setEditFichaId(p.ficha_id);
                                    setEditDiag(p.diagnostico || "");
                                    setEditCtrl(p.nivel_control || "");
                                    setEditMigrante(!!dCli.es_migrante);
                                    setEditPuebloOriginario(!!dCli.pueblo_originario);
                                    setEditSecueladoTbc(!!dCli.secuelado_tbc);
                                    setEditOtraRespiratoriaDetalle(dCli.otra_respiratoria_detalle || "");
                                    setEditPacienteDataCli(dCli);
                                    setShowEditModal(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Editar Diagnóstico / Caracterización"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedPaciente(p);
                                    setShowEgresoModal(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group/egreso"
                                  title="Gestionar Egreso"
                                >
                                  <LogOut size={18} className="group-hover/egreso:scale-110 transition-transform" />
                                </button>
                              </div>
                            )
                          ) : (
                             <div className="text-right">
                                <p className="text-[9px] font-black text-red-600 uppercase leading-none mb-1">{p.estado_programa}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">
                                  {new Date(p.ultima_atencion_global + 'T12:00:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                                </p>
                             </div>
                          )}
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Search size={40} />
              </div>
              <p className="text-slate-400 font-medium">No se encontraron pacientes en este programa.</p>
            </div>
          )}
        </div>
      </div>
      </>
    ) : (
      /* Vista de Análisis Estadístico Estilo GIA */
      <div className="pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico Diagnósticos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg mr-2">📊</span>
              Distribución por Diagnóstico
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.diagCounts).sort((a,b) => b[1] - a[1]).map(([label, count]) => {
                const percentage = ((count / stats.total) * 100).toFixed(1);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1">
                      <span>{label}</span>
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

          {/* Gráfico Niveles de Control */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg mr-2">🩺</span>
              Calidad del Control Clínico
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.ctrlCounts).sort((a,b) => b[1] - a[1]).map(([label, count]) => {
                const percentage = ((count / stats.total) * 100).toFixed(1);
                const color = label.includes('CONTROLAD') ? 'bg-emerald-500' : 'bg-slate-400';
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1">
                      <span>{label}</span>
                      <span>{count} pac. ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`${color} h-full rounded-full transition-all duration-1000`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cobertura por Sector Territorial */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg mr-2">📍</span>
              Cobertura Vigente por Sector Territorial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(stats.sectorStats).sort((a,b) => b[1].total - a[1].total).map(([sector, sData]) => {
                const cob = ((sData.vigentes / sData.total) * 100).toFixed(1);
                return (
                  <div key={sector} className="p-4 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:shadow-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{sector}</p>
                    <div className="flex items-end space-x-2">
                      <p className="text-3xl font-light text-slate-800">{cob}%</p>
                      <p className="text-xs text-slate-500 mb-1">Cobertura</p>
                    </div>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full transition-all duration-700" 
                        style={{ width: `${cob}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
                      {sData.vigentes} VIGENTES / {sData.total} TOTAL
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tarjeta de Gestión PAD */}
            <div className="col-span-full bg-gradient-to-br from-blue-700 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-5 border-r border-white/10 pr-8">
                     <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                           <ShieldCheck size={32} className="text-blue-300" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black uppercase tracking-tighter">Estrategia PAD Respiratorio</h3>
                        </div>
                     </div>
                     <div className="flex items-baseline space-x-2">
                        <span className="text-7xl font-black tracking-tighter">{stats.padCount}</span>
                        <span className="text-blue-200 text-sm font-bold uppercase">Pacientes en PAD</span>
                     </div>
                  </div>

                  <div className="md:col-span-4 border-r border-white/10 pr-8">
                     <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">Calidad del Control PAD</h4>
                     <div className="space-y-3">
                        {Object.entries(stats.padByControl).map(([label, count]: [string, any]) => {
                           const percent = Math.round((count / stats.padCount) * 100);
                           return (
                              <div key={label} className="space-y-1">
                                 <div className="flex justify-between text-[10px] font-bold">
                                    <span className="uppercase">{label}</span>
                                    <span>{count} PAC. ({percent}%)</span>
                                 </div>
                                 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full rounded-full transition-all duration-1000 ${label === 'CONTROLADO' ? 'bg-emerald-400' : 'bg-blue-400'}`} 
                                       style={{ width: `${percent}%` }}
                                    ></div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="md:col-span-3">
                     <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">Distribución por Sectores</h4>
                     <div className="grid grid-cols-1 gap-2">
                        {Object.entries(stats.padBySector)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .map(([sector, count]: [string, any]) => (
                           <div key={sector} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                              <div className="flex items-center space-x-2">
                                 <MapPin size={12} className="text-blue-300" />
                                 <span className="text-[10px] font-bold uppercase">{sector}</span>
                              </div>
                              <span className="text-[10px] font-black">{count}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

        </div>
      </div>
    )}

      {/* Modal de Egreso Respiratorio */}
      {showEgresoModal && selectedPaciente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Gestionar Egreso</h3>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedPaciente.nombre_completo}</p>
              </div>
              <button onClick={() => setShowEgresoModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo del Egreso</label>
                <select 
                  value={motivoEgreso} onChange={e => setMotivoEgreso(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                >
                  <option value="ALTA MÉDICA">ALTA MÉDICA</option>
                  <option value="INASISTENCIA / ABANDONO">INASISTENCIA / ABANDONO</option>
                  <option value="TRASLADO">TRASLADO</option>
                  <option value="FALLECIMIENTO">FALLECIMIENTO</option>
                  <option value="ERROR DE INGRESO">ERROR DE INGRESO</option>
                </select>
              </div>
              <div>
               <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5 block">Mes del Egreso</label>
               <input 
                 type="month"
                 value={fechaEgreso}
                 onChange={(e) => setFechaEgreso(e.target.value)}
                 className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 uppercase"
               />
             </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones / Justificación</label>
                <textarea 
                  value={obsEgreso} onChange={e => setObsEgreso(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[100px]"
                  placeholder="Detalle el motivo del cierre de caso..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowEgresoModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleEgreso}
                  disabled={isEgresando}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isEgresando ? "Procesando..." : <><LogOut size={18} /> <span>Confirmar Egreso</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición Rápida */}
      {showEditModal && editFichaId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Corrección Administrativa</h3>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Editar Datos de la Última Ficha</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditFichaId(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Diagnóstico */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diagnóstico Principal</label>
                <select
                  value={editDiag}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditDiag(val);
                    if (val !== "OTRAS RESPIRATORIAS") {
                      setEditOtraRespiratoriaDetalle("");
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {LISTA_DIAG.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Detalle si es OTRAS RESPIRATORIAS */}
              {editDiag === "OTRAS RESPIRATORIAS" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Detalle de Otra Enfermedad</label>
                  <input
                    type="text"
                    value={editOtraRespiratoriaDetalle}
                    onChange={(e) => setEditOtraRespiratoriaDetalle(e.target.value)}
                    maxLength={100}
                    placeholder="Ej. Oxigenoterapia domiciliaria, etc."
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                  />
                </div>
              )}

              {/* Nivel de Control */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nivel de Control</label>
                <select
                  value={editCtrl}
                  onChange={(e) => setEditCtrl(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {LISTA_CONTROL.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Caracterización Sociodemográfica / Flags */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Caracterización Especial</label>
                
                <label className="flex items-center space-x-3 cursor-pointer py-1 select-none">
                  <input
                    type="checkbox"
                    checked={editMigrante}
                    onChange={(e) => setEditMigrante(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-700 uppercase">Paciente Migrante</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer py-1 select-none">
                  <input
                    type="checkbox"
                    checked={editPuebloOriginario}
                    onChange={(e) => setEditPuebloOriginario(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-700 uppercase">Pueblo Originario</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer py-1 select-none">
                  <input
                    type="checkbox"
                    checked={editSecueladoTbc}
                    onChange={(e) => setEditSecueladoTbc(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-700 uppercase">Secuelado TBC</span>
                </label>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditFichaId(null);
                  }}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                  disabled={isSavingEdit}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || (editDiag === "OTRAS RESPIRATORIAS" && !editOtraRespiratoriaDetalle.trim())}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSavingEdit ? "Guardando..." : <><Check size={18} /> <span>Guardar Cambios</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, AlertTriangle, CheckCircle, Clock, Download, ClipboardCheck, X, User, Phone, Map, Calendar, ShieldCheck, HeartPulse, UserCheck, Info, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { UserProfile } from "@/actions/userActions";
import { saveEcicepRecord, obtenerClinicosActivos, EcicepSubmission } from "@/actions/ecicepActions";

const ENFERMEDADES_CRONICAS = [
  "Hipertensión Arterial (HTA)",
  "Diabetes Mellitus Tipo 2 (DM2)",
  "Enfermedad Pulmonar Obstructiva Crónica (EPOC)",
  "Asma Bronquial",
  "Enfermedad Renal Crónica (ERC)",
  "Artrosis (Cadera/Rodilla/Otras)",
  "Insuficiencia Cardíaca (ICC)",
  "Hipotiroidismo",
  "Dislipidemia",
  "Depresión / Salud Mental Crónica",
  "Epilepsia",
  "Secuela de Accidente Cerebrovascular (ACV)"
];

const getEcicepStatus = (fechaString: string | null) => {
  if (!fechaString) {
    return { status: "Pendiente", color: "bg-red-100 text-red-800 border-red-200", icon: <AlertTriangle size={14} className="mr-1" /> };
  }
  
  const fecha = new Date(fechaString);
  const now = new Date();
  
  const d1 = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
  const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const vigenciaDias = 365;
  
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

const getCitaDisplayStatus = (p: any, rol: string) => {
  const plan = p.data_clinica?.plan || [];
  const match = plan.find((item: any) => item.rol === rol);
  
  if (match) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const baseLabel = `${NOMBRES_MESES[match.mes - 1]} ${match.ano}`;
    const isExpired = match.ano < currentYear || (match.ano === currentYear && match.mes < currentMonth);
    
    return { 
      label: baseLabel, 
      isExpired,
      className: isExpired 
        ? "bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold" 
        : "bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold" 
    };
  }
  
  let legacyDate = null;
  if (rol === "Médico") legacyDate = p.cita_medico;
  else if (rol === "Enfermero") legacyDate = p.cita_enfermero;
  else if (rol === "Nutricionista") legacyDate = p.cita_nutri;
  else if (rol === "Kinesiólogo") legacyDate = p.cita_kine;
  
  if (legacyDate) {
    const date = new Date(legacyDate);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const dateMonth = date.getUTCMonth() + 1;
    const dateYear = date.getUTCFullYear();
    const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const baseLabel = `${NOMBRES_MESES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    const isExpired = dateYear < currentYear || (dateYear === currentYear && dateMonth < currentMonth);
    
    return { 
      label: baseLabel, 
      isExpired,
      className: isExpired 
        ? "bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold" 
        : "bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold" 
    };
  }
  
  return { label: "—", isExpired: false, className: "text-slate-400 font-normal text-xs" };
};

export default function EcicepClientView({ data, user }: { data: any[], user: UserProfile }) {
  const [view, setView] = useState<'lista' | 'analisis'>('lista');
  const [searchRut, setSearchRut] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [onlySeguimiento, setOnlySeguimiento] = useState(false);
  const [onlyBrecha, setOnlyBrecha] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [clinicos, setClinicos] = useState<any[]>([]);
  const [fechaAtencion, setFechaAtencion] = useState("");
  const [categoria, setCategoria] = useState("G1");
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);
  const [polifarmacia, setPolifarmacia] = useState(false);
  const [funcionalidad, setFuncionalidad] = useState("Autovalente sin riesgo");
  const [deterioroCognitivo, setDeterioroCognitivo] = useState(false);
  const [riesgoSocial, setRiesgoSocial] = useState(false);
  const [hospitalizacionReciente, setHospitalizacionReciente] = useState(false);
  const [consultasUrgencia, setConsultasUrgencia] = useState(0);
  const [gestorRut, setGestorRut] = useState("");
  const [profesionalRut, setProfesionalRut] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [citaMedico, setCitaMedico] = useState("");
  const [citaEnfermero, setCitaEnfermero] = useState("");
  const [citaNutri, setCitaNutri] = useState("");
  const [citaKine, setCitaKine] = useState("");
  const [planAtenciones, setPlanAtenciones] = useState<{ rol: string; mes: number; ano: number }[]>([]);
  const [seguimientoTelefonico, setSeguimientoTelefonico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch Clinicos
  useEffect(() => {
    async function load() {
      const res = await obtenerClinicosActivos();
      if (res.success && res.data) {
        setClinicos(res.data);
      }
    }
    load();
  }, []);

  const patientAge = useMemo(() => {
    if (!selectedPatient || !selectedPatient.fecha_nacimiento) return null;
    const bd = new Date(selectedPatient.fecha_nacimiento);
    const today = new Date();
    let a = today.getFullYear() - bd.getUTCFullYear();
    if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
    return a;
  }, [selectedPatient]);

  const isAdultoMayor = patientAge !== null && patientAge >= 65;

  const openFormModal = () => {
    if (!selectedPatient) return;
    setFechaAtencion(new Date().toISOString().slice(0, 10));
    setCategoria(selectedPatient.categoria || "G1");
    setDiagnosticos([]);
    setPolifarmacia(false);
    setFuncionalidad("No aplica (Menor de 65 años)");
    setDeterioroCognitivo(false);
    setRiesgoSocial(false);
    setHospitalizacionReciente(false);
    setConsultasUrgencia(0);
    setGestorRut(selectedPatient.gestor_rut || "");
    setProfesionalRut(selectedPatient.profesional_rut || user.rut || "");
    setObservaciones(selectedPatient.observaciones || "");
    setSeguimientoTelefonico(selectedPatient.data_clinica?.seguimiento_telefonico || false);
    
    // Cargar plan dinámico de atenciones
    const plan = selectedPatient.data_clinica?.plan || [];
    if (plan.length > 0) {
      setPlanAtenciones(plan);
    } else {
      const defaults = [];
      if (selectedPatient.cita_medico) {
        const d = new Date(selectedPatient.cita_medico);
        defaults.push({ rol: "Médico", mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
      }
      if (selectedPatient.cita_enfermero) {
        const d = new Date(selectedPatient.cita_enfermero);
        defaults.push({ rol: "Enfermero", mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
      }
      if (selectedPatient.cita_nutri) {
        const d = new Date(selectedPatient.cita_nutri);
        defaults.push({ rol: "Nutricionista", mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
      }
      if (selectedPatient.cita_kine) {
        const d = new Date(selectedPatient.cita_kine);
        defaults.push({ rol: "Kinesiólogo", mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
      }
      setPlanAtenciones(defaults);
    }

    setSaveError("");
    setSuccess(false);
    setShowFormModal(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setSaving(true);
    setSaveError("");

    let dateMed: string | undefined = undefined;
    let dateEnf: string | undefined = undefined;
    let dateNut: string | undefined = undefined;
    let dateKin: string | undefined = undefined;

    planAtenciones.forEach(item => {
      const formattedMonth = item.mes.toString().padStart(2, "0");
      const dateStr = `${item.ano}-${formattedMonth}-01`;
      if (item.rol === "Médico") dateMed = dateStr;
      if (item.rol === "Enfermero") dateEnf = dateStr;
      if (item.rol === "Nutricionista") dateNut = dateStr;
      if (item.rol === "Kinesiólogo") dateKin = dateStr;
    });
    
    const payload: EcicepSubmission = {
      rut_paciente: selectedPatient.rut,
      fecha_atencion: fechaAtencion,
      categoria,
      diagnosticos: [],
      polifarmacia: false,
      funcionalidad: "No aplica (Menor de 65 años)",
      deterioro_cognitivo: false,
      riesgo_social: false,
      hospitalizacion_reciente: false,
      consultas_urgencia: 0,
      gestor_rut: gestorRut || undefined,
      profesional_rut: profesionalRut || undefined,
      observaciones: observaciones || undefined,
      cita_medico: dateMed,
      cita_enfermero: dateEnf,
      cita_nutri: dateNut,
      cita_kine: dateKin,
      data_clinica: { plan: planAtenciones, seguimiento_telefonico: seguimientoTelefonico }
    };

    const res = await saveEcicepRecord(payload);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setShowFormModal(false);
        setSelectedPatient(null);
        window.location.reload();
      }, 1000);
    }
  };

  const toggleDiagnostico = (diag: string) => {
    if (diagnosticos.includes(diag)) {
      setDiagnosticos(diagnosticos.filter(d => d !== diag));
    } else {
      setDiagnosticos([...diagnosticos, diag]);
    }
  };

  const addPlanRow = () => {
    setPlanAtenciones([...planAtenciones, { rol: "Médico", mes: new Date().getMonth() + 1, ano: new Date().getFullYear() }]);
  };

  const removePlanRow = (idx: number) => {
    setPlanAtenciones(planAtenciones.filter((_, i) => i !== idx));
  };

  const updatePlanRow = (idx: number, field: 'rol' | 'mes' | 'ano', value: any) => {
    const updated = [...planAtenciones];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlanAtenciones(updated);
  };

  const sectors = useMemo(() => {
    const s = new Set(data.map(p => p.sector).filter(sec => sec && sec.toUpperCase() !== "SECTOR GENERAL"));
    return ["Todos", ...Array.from(s)].sort();
  }, [data]);

  const hasBrecha = (p: any) => {
    const roles = ["Médico", "Enfermero", "Nutricionista", "Kinesiólogo"];
    return roles.some(rol => {
      const status = getCitaDisplayStatus(p, rol);
      return status.isExpired;
    });
  };

  const filtered = useMemo(() => {
    return data.filter(p => {
      const qRut = searchRut.replace(/[-.]/g, "").toLowerCase();
      const matchRut = p.rut.toLowerCase().includes(qRut) || p.nombre_completo.toLowerCase().includes(searchRut.toLowerCase());
      const matchSector = filterSector === "Todos" || p.sector === filterSector;
      const statusObj = getEcicepStatus(p.ultima_atencion);
      const matchStatus = filterStatus === "Todos" || statusObj.status === filterStatus;
      
      const cat = p.categoria || "PENDIENTE";
      const matchCategory = filterCategory === "Todos" || cat === filterCategory;
      
      const matchSeguimiento = !onlySeguimiento || p.data_clinica?.seguimiento_telefonico;
      const matchBrecha = !onlyBrecha || hasBrecha(p);
      
      return matchRut && matchSector && matchStatus && matchCategory && matchSeguimiento && matchBrecha;
    });
  }, [data, searchRut, filterSector, filterStatus, filterCategory, onlySeguimiento, onlyBrecha]);

  const stats = useMemo(() => {
    const total = data.length;
    const catCounts: Record<string, number> = { "G0": 0, "G1": 0, "G2": 0, "G3": 0, "PENDIENTE": 0 };
    const funcCounts: Record<string, number> = {};
    const sectorStats: Record<string, { total: number, vigentes: number, g0: number, g1: number, g2: number, g3: number }> = {};
    const professionalStats: Record<string, number> = {};
    let totalVigentes = 0;
    let totalPolifarmacia = 0;
    let totalRiesgoSocial = 0;
    let totalDeterioroCognitivo = 0;
    let totalSeguimiento = 0;

    data.forEach(p => {
      if (p.data_clinica?.seguimiento_telefonico) totalSeguimiento++;
      const cat = p.categoria || "PENDIENTE";
      catCounts[cat] = (catCounts[cat] || 0) + 1;

      if (p.polifarmacia) totalPolifarmacia++;
      if (p.riesgo_social) totalRiesgoSocial++;
      if (p.deterioro_cognitivo) totalDeterioroCognitivo++;

      const func = p.funcionalidad || "SIN REGISTRO";
      funcCounts[func] = (funcCounts[func] || 0) + 1;

      const sec = p.sector || "SIN SECTOR";
      if (!sectorStats[sec]) sectorStats[sec] = { total: 0, vigentes: 0, g0: 0, g1: 0, g2: 0, g3: 0 };
      sectorStats[sec].total++;

      const statusObj = getEcicepStatus(p.ultima_atencion);
      if (statusObj.status === "Vigente") {
        sectorStats[sec].vigentes++;
        totalVigentes++;
      }

      if (cat === "G0") sectorStats[sec].g0++;
      if (cat === "G1") sectorStats[sec].g1++;
      if (cat === "G2") sectorStats[sec].g2++;
      if (cat === "G3") sectorStats[sec].g3++;

      const profName = p.profesional_nombre || "SIN REGISTRO";
      if (p.ultima_atencion) {
        professionalStats[profName] = (professionalStats[profName] || 0) + 1;
      }
    });

    return { 
      catCounts, 
      funcCounts, 
      sectorStats, 
      total, 
      totalVigentes, 
      totalPolifarmacia, 
      totalRiesgoSocial, 
      totalDeterioroCognitivo,
      totalSeguimiento,
      professionalStats 
    };
  }, [data]);

  const exportToExcel = () => {
    const dataset = filtered.map(p => {
      let age = "-";
      if (p.fecha_nacimiento) {
         const bd = new Date(p.fecha_nacimiento);
         const today = new Date();
         let a = today.getFullYear() - bd.getUTCFullYear();
         if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
         age = a.toString();
      }
      return {
        "Estado Vigencia": getEcicepStatus(p.ultima_atencion).status,
        "RUT": p.rut + "-" + p.dv,
        "Nombre": p.nombre_completo,
        "Edad": age,
        "Sector": p.sector,
        "Teléfono": p.telefono,
        "Fecha Última Estratificación": formatDate(p.ultima_atencion),
        "Categoría ECICEP": p.categoria || "PENDIENTE",
        "Polifarmacia": p.polifarmacia ? "SI" : "NO",
        "Funcionalidad": p.funcionalidad || "-",
        "Deterioro Cognitivo": p.deterioro_cognitivo ? "SI" : "NO",
        "Riesgo Social": p.riesgo_social ? "SI" : "NO",
        "Seguimiento Telefónico": p.data_clinica?.seguimiento_telefonico ? "SI" : "NO",
        "Hospitalización Reciente (12m)": p.hospitalizacion_reciente ? "SI" : "NO",
        "Consultas Urgencia (12m)": p.consultas_urgencia || 0,
        "Diagnósticos Crónicos": p.diagnosticos ? p.diagnosticos.join(", ") : "-",
        "Profesional Evaluador": p.profesional_nombre || "-",
        "Gestor Asignado": p.gestor_nombre || "-",
        "Observaciones": p.observaciones || "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Poblacion_ECICEP");
    XLSX.writeFile(workbook, `Padrón_ECICEP_GIA.xlsx`);
  };

  const exportCampanaExcel = () => {
    const vencidosOPendientes = data.filter(p => {
      const st = getEcicepStatus(p.ultima_atencion).status;
      return st === "Vencido" || st === "Pendiente";
    });
    const dataset = vencidosOPendientes.map(p => {
      let age = "-";
      if (p.fecha_nacimiento) {
         const bd = new Date(p.fecha_nacimiento);
         const today = new Date();
         let a = today.getFullYear() - bd.getUTCFullYear();
         if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
         age = a.toString();
      }
      return {
        "Estado": getEcicepStatus(p.ultima_atencion).status,
        "RUT": `${p.rut}-${p.dv}`,
        "Nombre": p.nombre_completo,
        "Edad": age,
        "Sector": p.sector || "SIN SECTOR",
        "Teléfono": p.telefono || "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Campana_Rescate_ECICEP");
    XLSX.writeFile(workbook, `Campaña_Rescate_ECICEP.xlsx`);
  };

  const totalPacientes = data.length;
  const statusCounts = {
    vigentes: stats.totalVigentes,
    pendientes: data.filter(p => getEcicepStatus(p.ultima_atencion).status === "Pendiente").length,
    vencidos: data.filter(p => getEcicepStatus(p.ultima_atencion).status === "Vencido").length,
    proximos: data.filter(p => getEcicepStatus(p.ultima_atencion).status === "Próximo a Vencer").length,
  };
  const cobPorcentaje = totalPacientes > 0 ? ((statusCounts.vigentes / totalPacientes) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col space-y-6">
      {/* Indicadores Top */}
      <div className="grid grid-cols-5 gap-4 px-6 pt-4 border-b border-slate-200 pb-6">
        <div className="text-center">
           <p className="text-4xl font-light text-slate-800">{totalPacientes.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Población Activa</p>
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
           <p className="text-xs font-semibold text-orange-500/70 uppercase mt-2">Próximos a Vencer</p>
        </div>
        <div className="text-center border-l border-slate-200">
           <p className="text-4xl font-light text-red-600">{(statusCounts.vencidos + statusCounts.pendientes).toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-red-600/70 uppercase mt-2">Pendientes / Vencidos</p>
        </div>
      </div>

      {/* Selector de Vista */}
      <div className="px-6 flex justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button 
                onClick={() => setView('lista')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Listado de Pacientes
            </button>
            <button 
                onClick={() => setView('analisis')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'analisis' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Análisis Estadístico
            </button>
        </div>
        <div className="flex space-x-2">
            <button onClick={exportToExcel} className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition shadow-sm font-bold text-sm">
                <Download size={16} />
                <span>Exportar Padrón</span>
            </button>
            <button onClick={exportCampanaExcel} className="flex items-center space-x-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 hover:bg-amber-100 transition shadow-sm font-bold text-sm">
                <Download size={16} />
                <span>Campaña Rescate</span>
            </button>
        </div>
      </div>

      {view === 'lista' ? (
        <>
          <div className="px-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-500 mb-1">
                <Search size={12} className="mr-1" /> Buscar por RUT o Nombre
              </label>
              <input 
                type="text" value={searchRut} onChange={e => setSearchRut(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 font-medium" 
                placeholder="Ej: 12345678 o Juan"
              />
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-500 mb-1">
                <MapPin size={12} className="mr-1" /> Filtrar por Sector
              </label>
              <select 
                value={filterSector} onChange={e => setFilterSector(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
              >
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-500 mb-1">
                <ClipboardCheck size={12} className="mr-1" /> Categoría ECICEP
              </label>
              <select 
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
              >
                <option value="Todos">Todos</option>
                <option value="G0">G0 - Sin Riesgo / Bajo</option>
                <option value="G1">G1 - Riesgo Bajo</option>
                <option value="G2">G2 - Riesgo Moderado</option>
                <option value="G3">G3 - Riesgo Alto / Complejo</option>
                <option value="PENDIENTE">Sin Estratificar</option>
              </select>
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-500 mb-1">
                <Clock size={12} className="mr-1" /> Estado de Alerta
              </label>
              <select 
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
              >
                <option value="Todos">Todos</option>
                <option value="Vigente">Vigente</option>
                <option value="Próximo a Vencer">Próximo a Vencer</option>
                <option value="Vencido">Vencido</option>
                <option value="Pendiente">Sin Registro</option>
              </select>
            </div>
          </div>

          <div className="px-6 pb-6 w-full overflow-x-auto mt-4">
            <div className="flex justify-between items-center mb-3">
               <span className="text-sm text-slate-600 font-medium block">
                 Mostrando {filtered.length} pacientes según filtros.
               </span>
               
               <div className="flex space-x-2">
                 <label className={`flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${onlySeguimiento ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                   <input 
                     type="checkbox" 
                     className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                     checked={onlySeguimiento}
                     onChange={(e) => setOnlySeguimiento(e.target.checked)}
                   />
                   <span className="text-xs font-bold uppercase tracking-wide flex items-center">
                     📞 Solo Seguimiento
                   </span>
                 </label>

                 <label className={`flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${onlyBrecha ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-red-600 focus:ring-red-500 border-slate-300"
                      checked={onlyBrecha}
                      onChange={(e) => setOnlyBrecha(e.target.checked)}
                    />
                    <span className="text-xs font-bold uppercase tracking-wide flex items-center">
                      🚨 Citas Vencidas
                    </span>
                  </label>
               </div>
            </div>

            <table className="w-full text-left text-xs whitespace-nowrap text-slate-600">
              <thead className="bg-slate-50 border-y border-slate-200 font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-3 w-[35%] min-w-[240px]">Identificación</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3 text-center">Médico</th>
                  <th className="px-3 py-3 text-center">Enfermero</th>
                  <th className="px-3 py-3 text-center">Nutricionista</th>
                  <th className="px-3 py-3 text-center">Kinesiólogo</th>
                  <th className="px-3 py-3 text-center">Plan Anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 500).map((p, i) => {
                  let age = "-";
                  if (p.fecha_nacimiento) {
                     const bd = new Date(p.fecha_nacimiento);
                     const today = new Date();
                     let a = today.getFullYear() - bd.getUTCFullYear();
                     if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
                     age = a.toString();
                  }

                  const stObj = getEcicepStatus(p.ultima_atencion);
                  const isG3 = p.categoria === "G3";

                  return (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors group font-medium"
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <div className="font-bold text-slate-800 uppercase text-xs block text-left group-hover:text-blue-600 group-hover:underline transition-colors">
                            {p.nombre_completo}
                          </div>
                          {p.data_clinica?.seguimiento_telefonico && (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black tracking-widest shrink-0 animate-pulse" title="Seguimiento Telefónico Activo">
                              📞 SEGUIMIENTO
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center text-[9px] text-slate-500 gap-x-1.5 gap-y-0.5 mt-1 font-medium">
                          <span className="font-mono font-bold bg-slate-100 px-1 rounded text-slate-600 leading-none">{p.rut}-{p.dv}</span>
                          <span>•</span>
                          <span className="font-bold">{age} Años</span>
                          <span>•</span>
                          <span className="flex items-center"><MapPin size={8} className="mr-0.5 text-slate-400 shrink-0"/> {p.sector}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {p.categoria ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                            isG3 ? 'bg-red-100 text-red-700 border border-red-200' : 
                            p.categoria === 'G2' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                            p.categoria === 'G1' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                            'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {p.categoria}
                          </span>
                        ) : (
                          <span className="text-slate-400">PENDIENTE</span>
                        )}
                      </td>
                       <td className="px-3 py-3.5 text-center">
                         {(() => {
                           const s = getCitaDisplayStatus(p, "Médico");
                           if (s.label === "—") return <span className="text-slate-400 font-normal text-xs">—</span>;
                           return (
                             <div className="flex flex-col items-center">
                               <span className={s.className}>{s.label}</span>
                               {s.isExpired && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Vencido</span>}
                             </div>
                           );
                         })()}
                       </td>
                       <td className="px-3 py-3.5 text-center">
                         {(() => {
                           const s = getCitaDisplayStatus(p, "Enfermero");
                           if (s.label === "—") return <span className="text-slate-400 font-normal text-xs">—</span>;
                           return (
                             <div className="flex flex-col items-center">
                               <span className={s.className}>{s.label}</span>
                               {s.isExpired && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Vencido</span>}
                             </div>
                           );
                         })()}
                       </td>
                       <td className="px-3 py-3.5 text-center">
                         {(() => {
                           const s = getCitaDisplayStatus(p, "Nutricionista");
                           if (s.label === "—") return <span className="text-slate-400 font-normal text-xs">—</span>;
                           return (
                             <div className="flex flex-col items-center">
                               <span className={s.className}>{s.label}</span>
                               {s.isExpired && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Vencido</span>}
                             </div>
                           );
                         })()}
                       </td>
                       <td className="px-3 py-3.5 text-center">
                         {(() => {
                           const s = getCitaDisplayStatus(p, "Kinesiólogo");
                           if (s.label === "—") return <span className="text-slate-400 font-normal text-xs">—</span>;
                           return (
                             <div className="flex flex-col items-center">
                               <span className={s.className}>{s.label}</span>
                               {s.isExpired && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Vencido</span>}
                             </div>
                           );
                         })()}
                       </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight ${stObj.color}`}>
                          {stObj.icon} {stObj.status}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">Visualizando 500 filas máximo.</div>
            )}
          </div>
        </>
      ) : (
        /* Vista de Análisis Estadístico */
        <div className="px-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Categorías ECICEP */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg mr-2">📊</span>
                Distribución Niveles ECICEP
              </h3>
              <div className="space-y-4">
                {[
                  { key: "G3", label: "G3 - Riesgo Alto / Complejo", color: "bg-red-500" },
                  { key: "G2", label: "G2 - Riesgo Moderado", color: "bg-amber-500" },
                  { key: "G1", label: "G1 - Riesgo Bajo", color: "bg-blue-500" },
                  { key: "G0", label: "G0 - Sin Riesgo / Bajo", color: "bg-emerald-500" },
                  { key: "PENDIENTE", label: "Sin Estratificación (Pendiente)", color: "bg-slate-400" },
                ].map(({ key, label, color }) => {
                  const count = stats.catCounts[key] || 0;
                  const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>{label}</span>
                        <span>{count} pac. ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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

            {/* Gestión de Seguimiento */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg mr-2">📞</span>
                Seguimiento y Rescate Activo
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Pacientes en Seguimiento Telefónico (TENS)", count: stats.totalSeguimiento, color: "bg-blue-600" },
                ].map(({ label, count, color }) => {
                  const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>{label}</span>
                        <span>{count} pac. ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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

            {/* Cobertura e Índices por Sector */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg mr-2">📍</span>
                Estratificación y Cobertura Territorial por Sector
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
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${cob}%` }}
                        ></div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-1 text-[9px] font-bold text-center text-slate-500 uppercase">
                        <div className="bg-emerald-100/50 text-emerald-700 p-1 rounded">G0: {sData.g0}</div>
                        <div className="bg-blue-100/50 text-blue-700 p-1 rounded">G1: {sData.g1}</div>
                        <div className="bg-amber-100/50 text-amber-700 p-1 rounded">G2: {sData.g2}</div>
                        <div className="bg-red-100/50 text-red-700 p-1 rounded">G3: {sData.g3}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rendimiento por Profesional */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <span className="bg-teal-100 text-teal-600 p-1.5 rounded-lg mr-2">🩺</span>
                Estratificaciones Realizadas por Profesional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stats.professionalStats).sort((a,b) => b[1] - a[1]).map(([prof, count]) => {
                  return (
                    <div key={prof} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="text-xs font-black text-slate-600 uppercase truncate block" title={prof}>{prof}</span>
                        <span className="text-[10px] text-slate-400">Profesional Clínico</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-2xl font-light text-slate-800">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Panel Lateral: Ficha Resumen ECICEP */}
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
              
              {/* Datos Generales */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <User size={12} className="mr-2" /> Información de Ficha
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

              {/* Categoría y Vigencia */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Calendar size={12} className="mr-2" /> Estado del Cuidado Crónico
                  </h4>
                  <button
                    onClick={openFormModal}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition flex items-center bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5"
                  >
                    <Plus size={12} className="mr-1" /> {selectedPatient.categoria ? "Actualizar" : "Estratificar"}
                  </button>
                </div>
                {selectedPatient.categoria ? (
                  <div className={`p-4 rounded-2xl border ${
                    selectedPatient.categoria === 'G3' ? 'bg-red-50 border-red-200 text-red-800' :
                    selectedPatient.categoria === 'G2' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    selectedPatient.categoria === 'G1' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                    'bg-emerald-50 border-emerald-200 text-emerald-800'
                  } flex flex-col space-y-2`}>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-tight">NIVEL ASIGNADO</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/50 uppercase">
                          {selectedPatient.categoria}
                        </span>
                     </div>
                     <p className="text-lg font-black leading-tight">
                       {selectedPatient.categoria === 'G3' ? 'RIESGO ALTO / COMPLEJO' :
                        selectedPatient.categoria === 'G2' ? 'RIESGO MODERADO' :
                        selectedPatient.categoria === 'G1' ? 'RIESGO BAJO' : 'G0 - SIN RIESGO'}
                     </p>
                      <p className="text-[10px] opacity-80 pt-2 border-t border-black/10 flex flex-col space-y-1">
                        <span>Evaluado el: {formatDate(selectedPatient.ultima_atencion)}</span>
                        <span>Elaborado por: {selectedPatient.data_clinica?.creador?.nombre || selectedPatient.profesional_nombre || "Clínico Registrador"}</span>
                        {selectedPatient.data_clinica?.creador && selectedPatient.data_clinica.creador.rut !== selectedPatient.profesional_rut && (
                          <span className="font-semibold text-slate-900 mt-0.5">
                            Última actualización: {selectedPatient.profesional_nombre}
                          </span>
                        )}
                      </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 flex flex-col space-y-2">
                     <p className="text-sm font-bold">Paciente sin estratificar en el sistema.</p>
                     <p className="text-xs">Se recomienda agendar evaluación para categorización ECICEP.</p>
                  </div>
                )}
              </div>

              {/* Plan de Seguimiento Anual */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Calendar size={12} className="mr-2" /> Plan de Cuidado (Citas Programadas)
                </h4>
                {(() => {
                  const plan = selectedPatient.data_clinica?.plan || [];
                  if (plan.length > 0) {
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {plan.map((item: any, idx: number) => {
                          const status = getCitaDisplayStatus(selectedPatient, item.rol);
                          return (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black">{item.rol}</span>
                              <div className="flex flex-col items-start">
                                <span className={status.className}>{status.label}</span>
                                {status.isExpired && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Vencido</span>}
                              </div>
                              {item.nota && (
                                <p className="text-[10px] text-slate-500 italic mt-1 border-t border-slate-100 pt-1 whitespace-normal break-words">
                                  {item.nota}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  // Legacy fallback
                  const defaults = [];
                  if (selectedPatient.cita_medico) defaults.push("Médico");
                  if (selectedPatient.cita_enfermero) defaults.push("Enfermero");
                  if (selectedPatient.cita_nutri) defaults.push("Nutricionista");
                  if (selectedPatient.cita_kine) defaults.push("Kinesiólogo");
                  
                  if (defaults.length > 0) {
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {defaults.map((rol, idx) => {
                          const status = getCitaDisplayStatus(selectedPatient, rol);
                          return (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black">{rol}</span>
                              <div className="flex flex-col items-start">
                                <span className={status.className}>{status.label}</span>
                                {status.isExpired && <span className="text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Vencido</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  return <p className="text-slate-400 text-xs py-2 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No hay atenciones programadas.</p>;
                })()}
              </div>



              {/* Diagnósticos Crónicos */}
              {selectedPatient.diagnosticos && selectedPatient.diagnosticos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Multimorbilidad Crónica
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPatient.diagnosticos.map((diag: string) => (
                      <span key={diag} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 uppercase">
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {selectedPatient.observaciones && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Observaciones
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    {selectedPatient.observaciones}
                  </div>
                </div>
              )}

            </div>

            {/* Footer del Panel */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
              <button
                onClick={openFormModal}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm flex items-center justify-center"
              >
                📋 {selectedPatient.categoria ? "Actualizar Datos" : "Registrar Estratificación"}
              </button>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="flex-1 bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Formulario de Estratificación Integrado */}
      {showFormModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <div className="flex items-center space-x-3 text-slate-800">
                <ClipboardCheck className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-bold text-base">Estratificar Paciente</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-tight font-bold font-mono">{selectedPatient.nombre_completo} ({selectedPatient.rut}-{selectedPatient.dv})</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-white border rounded-full">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de la Estratificación</label>
                  <input 
                    type="date" 
                    required 
                    value={fechaAtencion} 
                    max={new Date().toISOString().slice(0, 10)} 
                    onChange={e => setFechaAtencion(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Profesional Responsable / Evaluador</label>
                  <select 
                    required
                    value={profesionalRut} 
                    onChange={e => setProfesionalRut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                  >
                    <option value="">-- Seleccione Profesional --</option>
                    {clinicos.map(c => (
                      <option key={c.rut} value={c.rut}>{c.nombre} ({c.profesion})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Categoría ECICEP</label>
                  <select 
                    value={categoria} 
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  >
                    <option value="G0">G0 - Sin Riesgo / Bajo</option>
                    <option value="G1">G1 - Riesgo Bajo</option>
                    <option value="G2">G2 - Riesgo Moderado</option>
                    <option value="G3">G3 - Riesgo Alto / Complejo</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      checked={seguimientoTelefonico}
                      onChange={e => setSeguimientoTelefonico(e.target.checked)}
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide select-none">
                      📞 Requiere Seguimiento Telefónico
                    </span>
                  </label>
                </div>
              </div>

              {/* Plan de Cuidado Anual (Próximas Citas) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">📅 Plan de Cuidado Anual (Próximas Citas - 12 Meses)</h4>
                  <button 
                    type="button" 
                    onClick={addPlanRow}
                    className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition flex items-center"
                  >
                    + Programar Cita
                  </button>
                </div>
                
                {planAtenciones.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No hay atenciones programadas en el plan anual.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {planAtenciones.map((item: any, idx) => (
                      <div key={idx} className="flex flex-col space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in duration-100">
                        <div className="flex items-center space-x-2">
                          <select 
                            value={item.rol} 
                            onChange={e => updatePlanRow(idx, 'rol', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                          >
                            {["Médico", "Enfermero", "Nutricionista", "Kinesiólogo", "Psicólogo", "Asistente Social", "Terapeuta Ocupacional", "Fonoaudiólogo", "Odontólogo", "TENS", "Matrón(a)"].map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <select 
                            value={item.mes} 
                            onChange={e => updatePlanRow(idx, 'mes', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-28"
                          >
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((name, mIdx) => (
                              <option key={mIdx} value={mIdx + 1}>{name}</option>
                            ))}
                          </select>
                          <select 
                            value={item.ano} 
                            onChange={e => updatePlanRow(idx, 'ano', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-20"
                          >
                            {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <button 
                            type="button" 
                            onClick={() => removePlanRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.nota || ""}
                          onChange={e => updatePlanRow(idx, 'nota', e.target.value)}
                          placeholder="Nota específica para esta cita (Ej: examen de sangre, 10 sesiones...)"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observaciones</label>
                <textarea 
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Ingrese observaciones de la atención..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 min-h-[80px] outline-none"
                />
              </div>

              {saveError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs border border-red-100">
                  {saveError}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs border border-emerald-200 font-bold text-center">
                  ¡Estratificación guardada con éxito! Actualizando...
                </div>
              )}
            </form>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
              <button 
                type="button" 
                onClick={() => setShowFormModal(false)}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveModal}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : '📋 Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Search, HeartPulse, User, ShieldCheck, Download, Plus, FileText, AlertTriangle, CheckCircle2, HelpCircle, Eye, Settings, X, PlusCircle, MapPin, Calendar, Clock } from "lucide-react";
import * as XLSX from "xlsx";
import { UserProfile } from "@/actions/userActions";
import Link from "next/link";
import { guardarHisterectomia, guardarPap, getHistorialExamenesPaciente, ingresarEmbarazo } from "@/actions/mujerActions";

type PacienteMujer = {
  rut: string;
  dv: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sector: string;
  telefono: string;
  estado: string;
  sexo?: string;
  es_pad?: boolean;
  histerectomizada?: boolean;
  fecha_histerectomia?: string;
  causa_histerectomia?: string;
  ultima_fecha_pap?: string;
  ultimo_resultado_pap?: string;
  ultimo_tipo_examen?: string;
  ultima_adecuacion_muestra?: string;
  ultimo_motivo_insatisfactoria?: string;
  ultima_fecha_resultado?: string;
  ultimo_derivado_upc?: boolean;
  ultima_fecha_derivacion_upc?: string;
};

export default function MujerClientView({ initialData, initialEmbarazadasData, user }: { initialData: PacienteMujer[], initialEmbarazadasData?: any[], user: UserProfile }) {
  const [data, setData] = useState<PacienteMujer[]>(initialData);
  const [embarazadasData, setEmbarazadasData] = useState<any[]>(initialEmbarazadasData || []);
  const [searchRut, setSearchRut] = useState("");
  const [selectedSector, setSelectedSector] = useState("TODOS");
  const [selectedStatus, setSelectedStatus] = useState("TODOS");
  const [onlyPad, setOnlyPad] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // "general", "pap", "embarazadas"
  const [tipoIngreso, setTipoIngreso] = useState("SELECCION"); // "SELECCION", "PAP", "EMBARAZO"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Estados para Modal de Histerectomía
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteMujer | null>(null);
  const [showHisterectomiaModal, setShowHisterectomiaModal] = useState(false);
  const [histerectomizadaForm, setHisterectomizadaForm] = useState(false);
  const [fechaHisterectomiaForm, setFechaHisterectomiaForm] = useState("");
  const [causaHisterectomiaForm, setCausaHisterectomiaForm] = useState("BENIGNA");
  const [savingHisterectomia, setSavingHisterectomia] = useState(false);
  const [histerectomiaError, setHisterectomiaError] = useState("");

  // Estados para Modal de Ingreso Rápido de Examen PAP/VPH
  const [selectedPacienteExamen, setSelectedPacienteExamen] = useState<PacienteMujer | null>(null);
  const [showExamenModal, setShowExamenModal] = useState(false);
  const [tipoExamenForm, setTipoExamenForm] = useState("PAP");
  const [fechaExamenForm, setFechaExamenForm] = useState("");
  const [adecuacionMuestraForm, setAdecuacionMuestraForm] = useState("SATISFACTORIA");
  const [motivoInsatisfactoriaForm, setMotivoInsatisfactoriaForm] = useState("");
  const [resultadoForm, setResultadoForm] = useState("PENDIENTE");
  const [fechaResultadoForm, setFechaResultadoForm] = useState("");

  // Estados Formulario Embarazo
  const [fumForm, setFumForm] = useState("");
  const [fppForm, setFppForm] = useState("");
  const [fechaUltimoControlForm, setFechaUltimoControlForm] = useState("");
  const [fechaProximoControlForm, setFechaProximoControlForm] = useState("");
  const [estadoNutricionalForm, setEstadoNutricionalForm] = useState("");
  const [observacionesEmbarazoForm, setObservacionesEmbarazoForm] = useState("");
  
  // Auto-calcular FPP cuando cambia FUM
  const handleFumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fumDate = e.target.value;
    setFumForm(fumDate);
    if (fumDate) {
      const date = new Date(fumDate);
      date.setDate(date.getDate() + 280); // 40 semanas
      setFppForm(date.toISOString().split('T')[0]);
    } else {
      setFppForm("");
    }
  };

  const calcularSemanasGestacion = (fumStr: string) => {
    if(!fumStr) return "-";
    const fumDate = new Date(fumStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - fumDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return `${weeks}+${days}`;
  };

  const [derivadoUpcForm, setDerivadoUpcForm] = useState(false);
  const [fechaDerivacionUpcForm, setFechaDerivacionUpcForm] = useState("");
  const [observacionesExamenForm, setObservacionesExamenForm] = useState("");
  const [savingExamen, setSavingExamen] = useState(false);
  const [examenError, setExamenError] = useState("");

  // Estados para Panel Lateral (Historial de Exámenes)
  const [selectedPacienteHistorial, setSelectedPacienteHistorial] = useState<PacienteMujer | null>(null);
  const [historialExamenes, setHistorialExamenes] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialError, setHistorialError] = useState("");

  const openHistorialDrawer = async (paciente: PacienteMujer) => {
    setSelectedPacienteHistorial(paciente);
    setLoadingHistorial(true);
    setHistorialError("");
    setHistorialExamenes([]);
    
    try {
      const res = await getHistorialExamenesPaciente(paciente.rut);
      if (res.error) {
        setHistorialError(res.error);
      } else {
        setHistorialExamenes(res.examenes || []);
      }
    } catch (err) {
      setHistorialError("Error al conectar con el servidor.");
    } finally {
      setLoadingHistorial(false);
    }
  };

  const openExamenModal = (paciente: PacienteMujer) => {
    setSelectedPacienteExamen(paciente);
    setTipoExamenForm("PAP");
    
    // Inicializar fecha con el día actual local
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const todayStr = new Date(d.getTime() - offset).toISOString().slice(0, 10);
    setFechaExamenForm(todayStr);
    
    setAdecuacionMuestraForm("SATISFACTORIA");
    setMotivoInsatisfactoriaForm("");
    setResultadoForm("PENDIENTE");
    setFechaResultadoForm("");
    setDerivadoUpcForm(false);
    setFechaDerivacionUpcForm("");
    setObservacionesExamenForm("");
    setExamenError("");
    setShowExamenModal(true);
  };

  const handleSaveExamen = async () => {
    if (!selectedPacienteExamen) return;
    setSavingExamen(true);
    setExamenError("");

    const isInsatisfactoria = tipoExamenForm === "PAP" && adecuacionMuestraForm === "INSATISFACTORIA";
    const realResultado = isInsatisfactoria ? "MUESTRA INSATISFACTORIA" : resultadoForm;
    const isPatologico = !isInsatisfactoria && realResultado !== "NEGATIVO" && realResultado !== "NORMAL" && realResultado !== "PENDIENTE";

    const res = await guardarPap({
      rut_paciente: selectedPacienteExamen.rut,
      fecha_pap: fechaExamenForm,
      tipo_examen: tipoExamenForm,
      adecuacion_muestra: isInsatisfactoria ? "INSATISFACTORIA" : "SATISFACTORIA",
      motivo_insatisfactoria: isInsatisfactoria ? motivoInsatisfactoriaForm : undefined,
      resultado: realResultado,
      fecha_resultado: realResultado !== "PENDIENTE" ? (fechaResultadoForm || fechaExamenForm) : undefined,
      derivado_upc: isPatologico ? derivadoUpcForm : false,
      fecha_derivacion_upc: isPatologico && derivadoUpcForm ? (fechaDerivacionUpcForm || fechaExamenForm) : undefined,
      observaciones: observacionesExamenForm
    });

    setSavingExamen(false);

    if (res.error) {
      setExamenError(res.error);
    } else {
      setData(prev => prev.map(p => {
        if (p.rut === selectedPacienteExamen.rut) {
          return {
            ...p,
            ultima_fecha_pap: fechaExamenForm,
            ultimo_resultado_pap: realResultado,
            ultimo_tipo_examen: tipoExamenForm,
            ultima_adecuacion_muestra: isInsatisfactoria ? "INSATISFACTORIA" : "SATISFACTORIA",
            ultimo_motivo_insatisfactoria: isInsatisfactoria ? motivoInsatisfactoriaForm : undefined,
            ultima_fecha_resultado: realResultado !== "PENDIENTE" ? (fechaResultadoForm || fechaExamenForm) : undefined,
            ultimo_derivado_upc: isPatologico ? derivadoUpcForm : false,
            ultima_fecha_derivacion_upc: isPatologico && derivadoUpcForm ? (fechaDerivacionUpcForm || fechaExamenForm) : undefined
          };
        }
        return p;
      }));
      setShowExamenModal(false);
      setSelectedPacienteExamen(null);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Lógica Clínica de Tamizaje y Conducta de APS
  const getTamizajeStatus = (p: PacienteMujer) => {
    // 1. Excluidas por Histerectomía Benigna
    if (p.histerectomizada && p.causa_histerectomia === "BENIGNA") {
      return {
        estado: "EXCLUIDA",
        label: "EXCLUIDA",
        color: "text-slate-500 bg-slate-100 border-slate-200",
        conducta: "Excluida de tamizaje por histerectomía total benigna.",
        critico: false
      };
    }

    // 2. Sin Registro Histórico
    if (!p.ultima_fecha_pap) {
      return {
        estado: "SIN_REGISTRO",
        label: "SIN REGISTRO",
        color: "text-amber-600 bg-amber-50 border-amber-200",
        conducta: "Citar para ingreso a tamizaje de PAP/VPH.",
        critico: false
      };
    }

    // 3. Pendiente de Resultado
    if (p.ultimo_resultado_pap === "PENDIENTE") {
      return {
        estado: "PENDIENTE",
        label: "PENDIENTE",
        color: "text-blue-600 bg-blue-50 border-blue-200",
        conducta: "Esperar resultado del laboratorio citológico.",
        critico: false
      };
    }

    // 4. Muestra Insatisfactoria (Rechazada)
    if (p.ultima_adecuacion_muestra === "INSATISFACTORIA" || p.ultimo_resultado_pap === "MUESTRA INSATISFACTORIA") {
      return {
        estado: "INSATISFACTORIO",
        label: "RECHAZADO",
        color: "text-orange-600 bg-orange-50 border-orange-200 font-bold",
        conducta: `Muestra insatisfactoria (${p.ultimo_motivo_insatisfactoria || "No especificado"}). Repetir PAP de inmediato.`,
        critico: true
      };
    }

    // 5. Casos Patológicos / Alterados (ASC-US, L-SIL, H-SIL, AGC, VPH+)
    const esNegativo = p.ultimo_resultado_pap === "NEGATIVO" || p.ultimo_resultado_pap === "NORMAL";
    if (!esNegativo) {
      const derivado = p.ultimo_derivado_upc;
      return {
        estado: "ALTERADO",
        label: derivado ? "ALTERADO (DERIVADO)" : "CRÍTICO SIN DERIVAR",
        color: derivado 
          ? "text-red-500 bg-red-50 border-red-200" 
          : "text-red-700 bg-red-100 border-red-300 font-black animate-pulse",
        conducta: derivado 
          ? `Derivada a UPC el ${p.ultima_fecha_derivacion_upc ? new Date(p.ultima_fecha_derivacion_upc).toLocaleDateString('es-CL') : '—'}.`
          : "¡Alerta! Requiere derivación prioritaria a UPC.",
        critico: !derivado
      };
    }

    // 6. Vigente o Vencido (Negativos/Normales)
    const fechaExamen = new Date(p.ultima_fecha_pap);
    const hoy = new Date();
    const diffMs = hoy.getTime() - fechaExamen.getTime();
    const diffAnios = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    const esVPH = p.ultimo_tipo_examen === "VPH";
    const vigenciaAnios = esVPH ? 5 : 3;
    const esVigente = diffAnios < vigenciaAnios;

    if (esVigente) {
      return {
        estado: "VIGENTE",
        label: "VIGENTE",
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        conducta: `Control de tamizaje en ${Math.ceil(vigenciaAnios - diffAnios)} años (${esVPH ? 'Test VPH' : 'PAP'}).`,
        critico: false
      };
    } else {
      return {
        estado: "VENCIDO",
        label: "VENCIDO",
        color: "text-red-600 bg-red-50 border-red-200",
        conducta: `Tamizaje vencido hace ${Math.floor(diffAnios - vigenciaAnios)} años/meses. Citar para toma de examen.`,
        critico: false
      };
    }
  };

  const sectores = useMemo(() => {
    const s = new Set(data.map(p => p.sector).filter(sec => sec && sec.toUpperCase() !== "SECTOR GENERAL"));
    return ["TODOS", ...Array.from(s)].sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = activeTab === "embarazadas" ? embarazadasData : data;

    // Solo activos por defecto
    result = result.filter(p => !p.estado || p.estado === 'ACTIVO');

    if (searchRut) {
      const q = searchRut.replace(/[^0-9kK-]/g, "").toLowerCase();
      result = result.filter(p => 
        p.rut.toLowerCase().includes(q) || 
        p.nombre_completo.toLowerCase().includes(searchRut.toLowerCase())
      );
    }

    if (onlyPad) {
      result = result.filter(p => p.es_pad);
    }

    if (selectedSector !== "TODOS") {
      result = result.filter(p => p.sector === selectedSector);
    }

    if (activeTab === "pap") {
      // Filtrar mujeres de 25 a 64 años (Población objetivo de tamizaje)
      result = result.filter(p => {
        const age = calculateAge(p.fecha_nacimiento);
        return age !== null && age >= 25 && age <= 64;
      });

      // Filtro por Estado de Tamizaje (Brechas de Demanda)
      if (selectedStatus !== "TODOS") {
        result = result.filter(p => {
          const status = getTamizajeStatus(p);
          if (selectedStatus === "VIGENTES") return status.estado === "VIGENTE";
          if (selectedStatus === "VENCIDOS") return status.estado === "VENCIDO";
          if (selectedStatus === "SIN_REGISTRO") return status.estado === "SIN_REGISTRO";
          if (selectedStatus === "CRITICOS_SIN_DERIVACION") return status.estado === "ALTERADO" && !p.ultimo_derivado_upc;
          if (selectedStatus === "RECHAZADOS") return status.estado === "INSATISFACTORIO";
          if (selectedStatus === "PENDIENTES") return status.estado === "PENDIENTE";
          if (selectedStatus === "EXCLUIDAS") return status.estado === "EXCLUIDA";
          return true;
        });
      }
    }

    return result;
  }, [data, searchRut, onlyPad, selectedSector, activeTab, selectedStatus]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Abrir Modal de Histerectomía
  const openHisterectomiaModal = (paciente: PacienteMujer) => {
    setSelectedPaciente(paciente);
    setHisterectomizadaForm(paciente.histerectomizada || false);
    setFechaHisterectomiaForm(paciente.fecha_histerectomia || "");
    setCausaHisterectomiaForm(paciente.causa_histerectomia || "BENIGNA");
    setHisterectomiaError("");
    setShowHisterectomiaModal(true);
  };

  const handleSaveHisterectomia = async () => {
    if (!selectedPaciente) return;
    setSavingHisterectomia(true);
    setHisterectomiaError("");

    const res = await guardarHisterectomia({
      rut_paciente: selectedPaciente.rut,
      histerectomizada: histerectomizadaForm,
      fecha_histerectomia: histerectomizadaForm ? fechaHisterectomiaForm : undefined,
      causa_histerectomia: histerectomizadaForm ? causaHisterectomiaForm : undefined
    });

    setSavingHisterectomia(false);

    if (res.error) {
      setHisterectomiaError(res.error);
    } else {
      setData(prev => prev.map(p => {
        if (p.rut === selectedPaciente.rut) {
          return {
            ...p,
            histerectomizada: histerectomizadaForm,
            fecha_histerectomia: histerectomizadaForm ? fechaHisterectomiaForm : undefined,
            causa_histerectomia: histerectomizadaForm ? causaHisterectomiaForm : undefined
          };
        }
        return p;
      }));
      setShowHisterectomiaModal(false);
      setSelectedPaciente(null);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredData.map(p => {
      const age = calculateAge(p.fecha_nacimiento);
      const status = getTamizajeStatus(p);
      return {
        "RUT": `${p.rut}-${p.dv}`,
        "Nombre": p.nombre_completo,
        "Edad": age,
        "Sexo": p.sexo || "FEMENINO",
        "Sector": p.sector,
        "Teléfono": p.telefono || "Sin Registro",
        "Histerectomizada": p.histerectomizada ? `SÍ (${p.causa_histerectomia})` : "NO",
        "Último Examen": p.ultima_fecha_pap ? `${p.ultimo_tipo_examen} (${new Date(p.ultima_fecha_pap).toLocaleDateString('es-CL')})` : "Sin Registro",
        "Resultado": p.ultimo_resultado_pap || "—",
        "Adecuación Muestra": p.ultima_adecuacion_muestra || "—",
        "Derivada a UPC": p.ultimo_derivado_upc ? `SÍ (${p.ultima_fecha_derivacion_upc ? new Date(p.ultima_fecha_derivacion_upc).toLocaleDateString('es-CL') : '—'})` : "NO",
        "Estado Tamizaje": status.label,
        "Conducta Clínico-Administrativa": status.conducta
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tamizaje CaCu");
    XLSX.writeFile(wb, `Programa_Mujer_Tamizaje_${activeTab === "pap" ? "PAP" : "General"}.xlsx`);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center tracking-tight">
            <HeartPulse className="mr-3 text-pink-500" size={32} strokeWidth={2.5} />
            Programa de la Mujer
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Gestión de la Demanda y Control de Tamizaje de Cáncer Cérvico-uterino (CaCu)</p>
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/mujer/nuevo"
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-pink-700 transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            <span>Registrar Examen</span>
          </Link>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm text-sm"
          >
            <Download size={18} />
            <span>Exportar Nómina</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab("general"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "general" 
            ? "bg-white text-slate-800 shadow-sm" 
            : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Población General
        </button>
        <button
          onClick={() => { setActiveTab("pap"); setCurrentPage(1); setSelectedStatus("TODOS"); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "pap" 
            ? "bg-white text-pink-600 shadow-sm" 
            : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tamizaje PAP / VPH (25-64 años)
        </button>
        <button
          onClick={() => { setActiveTab("embarazadas"); setCurrentPage(1); setSelectedStatus("TODOS"); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "embarazadas" 
            ? "bg-white text-purple-600 shadow-sm" 
            : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Embarazadas
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="relative max-w-md w-full flex items-center">
              <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Buscar por RUT o Nombre..."
                value={searchRut}
                onChange={(e) => { setSearchRut(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all shadow-sm font-medium text-slate-700 text-sm"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:justify-end flex-1 w-full lg:w-auto">
              {/* Filtro por Sector */}
              <select
                value={selectedSector}
                onChange={(e) => { setSelectedSector(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-xl px-4 h-11 text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm cursor-pointer w-full sm:w-auto sm:min-w-[160px]"
              >
                {sectores.map(s => <option key={s} value={s}>{s === "TODOS" ? "Todos los Sectores" : s.toUpperCase()}</option>)}
              </select>

              {/* Filtro por Estado de Tamizaje (Visible sólo en pestaña PAP) */}
              {activeTab === "pap" && (
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-xl px-4 h-11 text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm cursor-pointer w-full sm:w-auto sm:min-w-[240px]"
                >
                  <option value="TODOS">Todos los Estados (Población Objetivo)</option>
                  <option value="VIGENTES">Vigentes (Al día)</option>
                  <option value="VENCIDOS">Vencidos (Brecha de Tamizaje)</option>
                  <option value="SIN_REGISTRO">Sin Registro Histórico</option>
                  <option value="CRITICOS_SIN_DERIVACION">Críticos sin Derivación UPC (Brecha Seguimiento)</option>
                  <option value="RECHAZADOS">Rechazados / Muestra Insatisfactoria</option>
                  <option value="PENDIENTES">PAPs Pendientes de Laboratorio</option>
                  <option value="EXCLUIDAS">Excluidas (Histerectomía)</option>
                </select>
              )}

              <button
                onClick={() => { setOnlyPad(!onlyPad); setCurrentPage(1); }}
                className={`flex items-center justify-center px-4 h-11 rounded-xl text-sm font-bold border transition-all w-full sm:w-auto shrink-0 cursor-pointer ${
                  onlyPad 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck size={16} className={`mr-2 shrink-0 ${onlyPad ? 'text-blue-600' : 'text-slate-400'}`} />
                Solo Pacientes PAD
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse table-fixed transition-all duration-300 ${activeTab === 'pap' ? 'min-w-[1200px]' : activeTab === 'embarazadas' ? 'min-w-[1100px]' : 'min-w-[900px]'}`}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {activeTab === "embarazadas" ? (
                  <>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Identificación</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Gestación</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Controles</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Nutrición / Obs.</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50 text-right">Acciones</th>
                  </>
                ) : activeTab === "pap" ? (
                  <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[32%] min-w-[280px]">Identificación</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[13%] min-w-[110px]">Último Examen</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[13%] min-w-[110px]">Resultado</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[13%] min-w-[120px]">Estado Tamizaje</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[22%] min-w-[220px]">Conducta Clínica Sugerida</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[7%] min-w-[80px]">Acciones</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[45%] min-w-[300px]">Identificación</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%] min-w-[150px]">Contacto</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%] min-w-[150px]">Histerectomía</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[15%] min-w-[100px]">Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === "pap" ? 6 : 4} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No se encontraron pacientes mujeres que cumplan los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p, i) => {
                  const age = calculateAge(p.fecha_nacimiento);
                  const tamizaje = getTamizajeStatus(p);
                  return (
                    <tr key={i} className="hover:bg-pink-50/20 transition-colors group">
                      <td className="px-6 py-4 min-w-[280px]">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <button
                            onClick={() => openHistorialDrawer(p)}
                            className="font-bold text-slate-800 uppercase text-sm block text-left hover:text-pink-600 hover:underline transition-colors focus:outline-none cursor-pointer"
                            title="Ver Historial Clínico Completo"
                          >
                            {p.nombre_completo}
                          </button>
                          {p.es_pad && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black tracking-widest shrink-0">
                              <ShieldCheck size={10} className="mr-1 text-blue-600" />
                              PAD
                            </span>
                          )}
                          {p.histerectomizada && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 border border-purple-100 text-purple-600 text-[9px] font-black tracking-widest shrink-0" title="Paciente Histerectomizada">
                              HST
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center text-[10px] text-slate-500 gap-x-2 gap-y-1">
                          <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 leading-none">{p.rut}-{p.dv}</span>
                          <span>•</span>
                          <span className="font-bold">{age} Años</span>
                          <span>•</span>
                          <span className="flex items-center"><MapPin size={10} className="mr-0.5 text-slate-400 shrink-0"/> {p.sector || "GENERAL"}</span>
                        </div>
                      </td>
                      
                      {activeTab === "embarazadas" ? (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded w-fit">
                                E.G: {p.fum ? calcularSemanasGestacion(p.fum) : "-"} semanas
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                FPP: {p.fpp ? new Date(p.fpp).toLocaleDateString('es-CL') : "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-xs text-slate-600">
                              <div><span className="font-semibold text-slate-400 text-[10px] uppercase">Último:</span> {p.fecha_ultimo_control ? new Date(p.fecha_ultimo_control).toLocaleDateString('es-CL') : "Sin reg"}</div>
                              <div><span className="font-semibold text-slate-400 text-[10px] uppercase">Próximo:</span> {p.fecha_proximo_control ? new Date(p.fecha_proximo_control).toLocaleDateString('es-CL') : "Sin reg"}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded w-fit ${p.estado_nutricional === 'OBESIDAD' ? 'bg-red-50 text-red-600' : p.estado_nutricional === 'SOBREPESO' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {p.estado_nutricional || "S/N"}
                              </span>
                              {p.observaciones && <span className="text-xs text-slate-500 line-clamp-2" title={p.observaciones}>{p.observaciones}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setTipoIngreso("EMBARAZO"); openExamenModal(p); }} className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1.5 rounded-lg transition-colors" title="Actualizar Embarazo">
                                <FileText size={16} />
                              </button>
                             </div>
                          </td>
                        </>
                      ) : activeTab === "pap" ? (
                        <>
                          <td className="px-6 py-4 text-sm text-slate-600 truncate">
                            {p.ultima_fecha_pap ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700">
                                  {new Date(p.ultima_fecha_pap).toLocaleDateString('es-CL')}
                                </span>
                                <span className="text-[10px] text-slate-400 uppercase font-black">
                                  {p.ultimo_tipo_examen || "PAP"}
                                </span>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase truncate" title={p.ultimo_resultado_pap || "—"}>
                            {p.ultimo_resultado_pap ? (
                              <span className={p.ultimo_resultado_pap !== "NEGATIVO" && p.ultimo_resultado_pap !== "NORMAL" && p.ultimo_resultado_pap !== "PENDIENTE" ? "text-red-600" : ""}>
                                {p.ultimo_resultado_pap}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black tracking-wider border uppercase ${tamizaje.color}`}>
                              {tamizaje.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-normal break-words">
                            {tamizaje.conducta}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openExamenModal(p)}
                                title="Ingresar Examen PAP / VPH"
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-pink-600 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              >
                                <PlusCircle size={15} />
                              </button>
                              <button
                                onClick={() => openHisterectomiaModal(p)}
                                title="Registrar Antecedentes Histerectomía"
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-purple-600 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              >
                                <Settings size={15} />
                              </button>
                              <Link
                                href={`/pacientes?search=${p.rut}`}
                                title="Ver Ficha Clínica"
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                              >
                                <Eye size={15} />
                              </Link>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium truncate">{p.telefono || "—"}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase truncate">
                            {p.histerectomizada ? (
                              <span className="text-purple-600 font-bold">
                                SÍ ({p.causa_histerectomia || "BENIGNA"})
                              </span>
                            ) : "NO"}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openExamenModal(p)}
                                title="Ingresar Examen PAP / VPH"
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-pink-600 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              >
                                <PlusCircle size={15} />
                              </button>
                              <button
                                onClick={() => openHisterectomiaModal(p)}
                                title="Registrar Histerectomía"
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-purple-600 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                              >
                                <Settings size={15} />
                              </button>
                              <Link
                                href={`/pacientes?search=${p.rut}`}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                title="Ver Ficha Clínica"
                              >
                                <Eye size={15} />
                              </Link>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Premium de Antecedentes de Histerectomía */}
      {showHisterectomiaModal && selectedPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in scale-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Antecedentes Quirúrgicos</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedPaciente.nombre_completo}</p>
              </div>
              <button 
                onClick={() => { setShowHisterectomiaModal(false); setSelectedPaciente(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="modalHisterectomizada"
                  checked={histerectomizadaForm}
                  onChange={(e) => setHisterectomizadaForm(e.target.checked)}
                  className="h-4.5 w-4.5 text-pink-600 focus:ring-pink-500 border-slate-300 rounded transition-all cursor-pointer"
                />
                <label htmlFor="modalHisterectomizada" className="text-sm font-bold text-slate-700 select-none cursor-pointer">
                  ¿La paciente está histerectomizada?
                </label>
              </div>

              {histerectomizadaForm && (
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-xs font-black text-purple-700 uppercase tracking-widest mb-1">Causa de Histerectomía</label>
                    <select
                      value={causaHisterectomiaForm}
                      onChange={(e) => setCausaHisterectomiaForm(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                    >
                      <option value="BENIGNA">Benigna (Miomas, Prolapso, etc.) - Excluye del PAP</option>
                      <option value="ONCOLOGICA">Oncológica (Cáncer) - Requiere seguimiento UPC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-purple-700 uppercase tracking-widest mb-1">Fecha de Operación (Opcional)</label>
                    <input
                      type="date"
                      value={fechaHisterectomiaForm}
                      onChange={(e) => setFechaHisterectomiaForm(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-700 font-medium text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {histerectomiaError && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertTriangle size={14} className="shrink-0" />
                  {histerectomiaError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowHisterectomiaModal(false); setSelectedPaciente(null); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveHisterectomia}
                disabled={savingHisterectomia}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {savingHisterectomia ? "Guardando..." : "Guardar Antecedentes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Premium de Ingreso Rápido de Examen PAP/VPH */}
      {showExamenModal && selectedPacienteExamen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in scale-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Registrar Tamizaje PAP / VPH</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Paciente: {selectedPacienteExamen.nombre_completo} (RUT: {selectedPacienteExamen.rut}-{selectedPacienteExamen.dv})</p>
              </div>
              <button 
                onClick={() => { setShowExamenModal(false); setSelectedPacienteExamen(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tipo Examen */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Examen</label>
                  <select
                    value={tipoExamenForm}
                    onChange={(e) => {
                      setTipoExamenForm(e.target.value);
                      setResultadoForm("PENDIENTE");
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                  >
                    <option value="PAP">PAP (Citología)</option>
                    <option value="VPH">Test de VPH (Molecular)</option>
                  </select>
                </div>

                {/* Fecha Toma */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha de la Toma</label>
                  <input
                    type="date"
                    value={fechaExamenForm}
                    onChange={(e) => setFechaExamenForm(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>

                {/* Adecuación Muestra (PAP) */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Adecuación Muestra</label>
                  <select
                    value={adecuacionMuestraForm}
                    onChange={(e) => setAdecuacionMuestraForm(e.target.value)}
                    disabled={tipoExamenForm === "VPH"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none disabled:opacity-50 cursor-pointer"
                  >
                    <option value="SATISFACTORIA">Satisfactoria</option>
                    <option value="INSATISFACTORIA">Insatisfactoria</option>
                  </select>
                </div>
              </div>

              {/* Motivo Insatisfactoria (PAP) */}
              {tipoExamenForm === "PAP" && adecuacionMuestraForm === "INSATISFACTORIA" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <label className="block text-[10px] font-black text-amber-800 uppercase tracking-wider">Motivo de Rechazo</label>
                  <select
                    value={motivoInsatisfactoriaForm}
                    onChange={(e) => setMotivoInsatisfactoriaForm(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccione Motivo --</option>
                    <option value="CELULARIDAD_ESCASA">Celularidad Escasa</option>
                    <option value="MALA_FIJACION">Mala Fijación</option>
                    <option value="HEMORRAGICO">Exceso de Sangre (Hemorrágico)</option>
                    <option value="INFLAMATORIO">Exceso de Exudado Inflamatorio</option>
                    <option value="OTRO">Otro Motivo Clínico</option>
                  </select>
                </div>
              )}

              {/* Resultados */}
              {!(tipoExamenForm === "PAP" && adecuacionMuestraForm === "INSATISFACTORIA") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Resultado</label>
                    {tipoExamenForm === "PAP" ? (
                      <select
                        value={resultadoForm}
                        onChange={(e) => setResultadoForm(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                      >
                        <option value="PENDIENTE">PENDIENTE DE RESULTADO</option>
                        <option value="NEGATIVO">NEGATIVO (Normal)</option>
                        <option value="ASC-US">ASC-US (Significado Indeterminado)</option>
                        <option value="ASC-H">ASC-H (No descarta Alto Grado)</option>
                        <option value="L-SIL">L-SIL / LIEBG (Bajo Grado / NIC 1)</option>
                        <option value="H-SIL">H-SIL / LIEAG (Alto Grado / NIC 2-3)</option>
                        <option value="AGC">AGC (Glandulares Atípicas)</option>
                        <option value="AIS">AIS (Adenocarcinoma endocervical in situ)</option>
                        <option value="CANCER_INVASOR">Cáncer Invasor</option>
                      </select>
                    ) : (
                      <select
                        value={resultadoForm}
                        onChange={(e) => setResultadoForm(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                      >
                        <option value="PENDIENTE">PENDIENTE DE RESULTADO</option>
                        <option value="NEGATIVO">NEGATIVO (Ausencia de VPH)</option>
                        <option value="POSITIVO_16_18">POSITIVO VPH 16 o 18</option>
                        <option value="POSITIVO_OTROS">POSITIVO Otros VPH Alto Riesgo</option>
                      </select>
                    )}
                  </div>

                  {resultadoForm !== "PENDIENTE" && (
                    <div className="animate-in fade-in duration-200">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha del Resultado</label>
                      <input
                        type="date"
                        value={fechaResultadoForm}
                        onChange={(e) => setFechaResultadoForm(e.target.value)}
                        min={fechaExamenForm}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Alerta de Derivación UPC */}
              {!(tipoExamenForm === "PAP" && adecuacionMuestraForm === "INSATISFACTORIA") && resultadoForm !== "NEGATIVO" && resultadoForm !== "PENDIENTE" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2 text-red-700">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold uppercase">Resultado Patológico:</span> Requiere seguimiento y derivación prioritaria a la **Unidad de Patología Cervical (UPC)**.
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-t border-red-200 pt-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="modalExamenDerivadoUpc"
                        checked={derivadoUpcForm}
                        onChange={(e) => setDerivadoUpcForm(e.target.checked)}
                        className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-slate-300 rounded cursor-pointer"
                      />
                      <label htmlFor="modalExamenDerivadoUpc" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        ¿Fue derivada a UPC?
                      </label>
                    </div>

                    {derivadoUpcForm && (
                      <div className="flex items-center gap-2 animate-in fade-in duration-200 w-full sm:w-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase font-bold">Fecha Derivación</span>
                        <input
                          type="date"
                          value={fechaDerivacionUpcForm}
                          onChange={(e) => setFechaDerivacionUpcForm(e.target.value)}
                          min={fechaExamenForm}
                          max={new Date().toISOString().split("T")[0]}
                          className="px-2 py-1 bg-white border border-red-200 rounded text-xs text-slate-700 font-medium outline-none focus:ring-1 focus:ring-pink-500"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Observaciones Clínicas</label>
                <textarea
                  value={observacionesExamenForm}
                  onChange={(e) => setObservacionesExamenForm(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                  placeholder="Ingrese antecedentes familiares, tratamientos previos u observaciones adicionales relevantes..."
                />
              </div>

              {examenError && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertTriangle size={14} className="shrink-0" />
                  {examenError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-5 bg-slate-50 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => { setShowExamenModal(false); setSelectedPacienteExamen(null); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-white transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveExamen}
                disabled={savingExamen}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {savingExamen ? "Guardando..." : "Ingresar Examen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Lateral (Drawer) de Historial Clínico PAP/VPH */}
      {selectedPacienteHistorial && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedPacienteHistorial(null)}
          />
          
          <div className="absolute inset-y-0 right-0 max-w-md w-full sm:max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Cabecera del Drawer */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0">
                  <User className="text-pink-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight uppercase text-base">{selectedPacienteHistorial.nombre_completo}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedPacienteHistorial.rut}-{selectedPacienteHistorial.dv}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPacienteHistorial(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Resumen Ficha Rápida */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Edad</span>
                  <span className="text-sm font-bold text-slate-700">{calculateAge(selectedPacienteHistorial.fecha_nacimiento)} Años</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Sector</span>
                  <span className="text-sm font-bold text-slate-700 uppercase">{selectedPacienteHistorial.sector || "GENERAL"}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Contacto</span>
                  <span className="text-sm font-bold text-slate-700">{selectedPacienteHistorial.telefono || "Sin Teléfono"}</span>
                </div>
              </div>

              {/* Antecedentes Críticos */}
              {selectedPacienteHistorial.histerectomizada && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-purple-800 text-xs flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-[9px] text-purple-700 mb-0.5">Paciente Excluida (HST)</span>
                    Paciente histerectomizada el {selectedPacienteHistorial.fecha_histerectomia ? new Date(selectedPacienteHistorial.fecha_histerectomia).toLocaleDateString('es-CL') : '—'} debido a causa {selectedPacienteHistorial.causa_histerectomia || "BENIGNA"}. Excluida del tamizaje estándar.
                  </div>
                </div>
              )}

              {/* Título de la Línea de Tiempo */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Historial de Tamizajes (Línea de Tiempo)</h4>
                
                {loadingHistorial ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="h-8 w-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">Cargando exámenes anteriores...</span>
                  </div>
                ) : historialError ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
                    {historialError}
                  </div>
                ) : historialExamenes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                    <FileText className="text-slate-300 mb-2" size={32} />
                    <span className="text-xs font-semibold text-slate-500">No se registran PAP o VPH previos</span>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Ingrese un examen utilizando el botón "+" en la lista principal.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 ml-3">
                    {historialExamenes.map((ex, index) => {
                      const isPatologico = ex.resultado !== "NEGATIVO" && ex.resultado !== "NORMAL" && ex.resultado !== "PENDIENTE" && ex.resultado !== "MUESTRA INSATISFACTORIA";
                      return (
                        <div key={ex.id} className="relative">
                          {/* Nodo de Línea de Tiempo */}
                          <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            isPatologico 
                            ? "border-red-500 text-red-500" 
                            : ex.resultado === "PENDIENTE" 
                            ? "border-amber-500 text-amber-500"
                            : "border-pink-500 text-pink-500"
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${
                              isPatologico 
                              ? "bg-red-500" 
                              : ex.resultado === "PENDIENTE" 
                              ? "bg-amber-500"
                              : "bg-pink-500"
                            }`} />
                          </div>

                          {/* Contenido de la Tarjeta de Examen */}
                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 flex items-center">
                                <Calendar size={12} className="mr-1.5 text-slate-400" />
                                {new Date(ex.fecha_pap).toLocaleDateString('es-CL')}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                {ex.tipo_examen || "PAP"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Resultado</span>
                                <span className={`font-bold uppercase ${isPatologico ? "text-red-600" : "text-slate-700"}`}>
                                  {ex.resultado}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Adecuación</span>
                                <span className="font-semibold text-slate-600 uppercase text-[10px]">
                                  {ex.adecuacion_muestra === "SATISFACTORIA" ? "Satisfactoria" : `Insatisfactoria (${ex.motivo_insatisfactoria || '—'})`}
                                </span>
                              </div>
                            </div>

                            {ex.derivado_upc && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold">
                                <AlertTriangle size={12} className="text-red-500" />
                                <span>Derivada a UPC el {ex.fecha_derivacion_upc ? new Date(ex.fecha_derivacion_upc).toLocaleDateString('es-CL') : '—'}</span>
                              </div>
                            )}

                            {ex.observaciones && (
                              <div className="p-2.5 bg-slate-50 rounded-lg text-[10px] text-slate-500 italic border-l-2 border-slate-200">
                                "{ex.observaciones}"
                              </div>
                            )}

                            <div className="flex items-center text-[9px] text-slate-400 border-t border-slate-50 pt-2 font-medium">
                              <Clock size={10} className="mr-1" />
                              <span>Registrado por Profesional RUT: {ex.profesional_rut}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pie del Drawer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPacienteHistorial(null)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


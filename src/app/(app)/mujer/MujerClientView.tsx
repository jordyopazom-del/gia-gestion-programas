"use client";

import { useState, useMemo } from "react";
import { Search, HeartPulse, User, ShieldCheck, Download, Plus, FileText, AlertTriangle, CheckCircle2, HelpCircle, Eye, Settings, X, PlusCircle, MapPin, Calendar, Clock, Phone, ChevronRight, Activity, AlertOctagon } from "lucide-react";
import * as XLSX from "xlsx";
import { UserProfile } from "@/actions/userActions";
import Link from "next/link";
import { guardarHisterectomia, guardarPap, getHistorialExamenesPaciente, ingresarEmbarazo, obtenerProfesionalesMatroneria } from "@/actions/mujerActions";
import { useEffect } from "react";
import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";

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
  ultimo_codigo_lab?: string;
  ultima_periodicidad_meses?: number;
  ultima_fecha_proximo_control?: string;
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

  // Estados para Modal de Ingreso Rápido de Examen PAP/VPH y Decodificador Inteligente
  const [profesionalesList, setProfesionalesList] = useState<{ rut: string; nombre: string; profesion: string; rol: string }[]>([]);
  const [profesionalRutForm, setProfesionalRutForm] = useState<string>(user?.rut || "");
  const [searchProfModalInput, setSearchProfModalInput] = useState<string>("");
  const [showProfModalDropdown, setShowProfModalDropdown] = useState<boolean>(false);
  const [modoProfesionalForm, setModoProfesionalForm] = useState<"PROPIO" | "MANUAL">("PROPIO");

  const filteredProfesionalesModal = useMemo(() => {
    if (!searchProfModalInput.trim()) return profesionalesList;
    const q = searchProfModalInput.toLowerCase().trim();
    return profesionalesList.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      p.rut.toLowerCase().includes(q) || 
      (p.profesion && p.profesion.toLowerCase().includes(q))
    );
  }, [profesionalesList, searchProfModalInput]);

  const profesionalSeleccionadoModalObj = useMemo(() => {
    if (!profesionalRutForm) return null;
    return profesionalesList.find(p => p.rut === profesionalRutForm) || null;
  }, [profesionalesList, profesionalRutForm]);

  useEffect(() => {
    obtenerProfesionalesMatroneria().then(res => {
      if (res.profesionales) {
        setProfesionalesList(res.profesionales);
      }
    });
  }, []);

  const [selectedPacienteExamen, setSelectedPacienteExamen] = useState<PacienteMujer | null>(null);
  const [showExamenModal, setShowExamenModal] = useState(false);
  const [tipoExamenForm, setTipoExamenForm] = useState("PAP");
  const [fechaExamenForm, setFechaExamenForm] = useState("");
  const [codigoLabForm, setCodigoLabForm] = useState("");
  const [periodicidadMesesForm, setPeriodicidadMesesForm] = useState<number>(36);
  const [fechaProximoControlForm, setFechaProximoControlForm] = useState("");
  const [criterioPersonalizado, setCriterioPersonalizado] = useState(false);
  const [adecuacionMuestraForm, setAdecuacionMuestraForm] = useState("SATISFACTORIA");
  const [motivoInsatisfactoriaForm, setMotivoInsatisfactoriaForm] = useState("");
  const [resultadoForm, setResultadoForm] = useState("NEGATIVO");
  const [fechaResultadoForm, setFechaResultadoForm] = useState("");

  // Decodificación en tiempo real del código compuesto de citología
  const decodificacion: DecodificacionPap = useMemo(() => {
    if (tipoExamenForm !== "PAP") {
      return {
        codigoOriginal: "",
        codigoLimpio: "",
        diagnostico: resultadoForm === "POSITIVO_16_18" ? "POSITIVO VPH 16/18" : resultadoForm === "POSITIVO_OTROS" ? "POSITIVO Otros VPH" : resultadoForm === "NEGATIVO" ? "NEGATIVO VPH" : "PENDIENTE",
        adecuacion: "SATISFACTORIA",
        adecuacionDescripcion: "Muestra Satisfactoria",
        microbiologia: [],
        conducta: [],
        esPatologico: resultadoForm.startsWith("POSITIVO"),
        esInsatisfactorio: false,
        periodicidadSugeridaMeses: resultadoForm === "NEGATIVO" ? 60 : 0,
        textoResumen: "",
      };
    }
    return decodificarCodigoPap(codigoLabForm);
  }, [codigoLabForm, tipoExamenForm, resultadoForm]);

  const handleCodigoLabChange = (val: string) => {
    const raw = val.toUpperCase();
    setCodigoLabForm(raw);
    const dec = decodificarCodigoPap(raw);
    
    if (dec.esInsatisfactorio) {
      setAdecuacionMuestraForm("INSATISFACTORIA");
      setMotivoInsatisfactoriaForm(dec.motivoInsatisfactoria || "CELULARIDAD_ESCASA");
      setResultadoForm("MUESTRA INSATISFACTORIA");
    } else {
      setAdecuacionMuestraForm("SATISFACTORIA");
      setMotivoInsatisfactoriaForm("");
      if (dec.esPatologico) {
        setResultadoForm(dec.diagnosticoCodigo || "ASC-US");
        setDerivadoUpcForm(true);
      } else {
        setResultadoForm("NEGATIVO");
        setDerivadoUpcForm(false);
      }
    }

    if (!criterioPersonalizado) {
      setPeriodicidadMesesForm(dec.periodicidadSugeridaMeses);
      if (fechaExamenForm && dec.periodicidadSugeridaMeses > 0) {
        const d = new Date(fechaExamenForm);
        d.setMonth(d.getMonth() + dec.periodicidadSugeridaMeses);
        setFechaProximoControlForm(d.toISOString().split("T")[0]);
      } else if (dec.periodicidadSugeridaMeses === 0) {
        setFechaProximoControlForm("");
      }
    }
  };

  const handlePeriodicidadChange = (meses: number, manual: boolean = true) => {
    setPeriodicidadMesesForm(meses);
    if (manual) setCriterioPersonalizado(true);
    if (fechaExamenForm && meses > 0) {
      const d = new Date(fechaExamenForm);
      d.setMonth(d.getMonth() + meses);
      setFechaProximoControlForm(d.toISOString().split("T")[0]);
    } else if (meses === 0) {
      setFechaProximoControlForm("");
    }
  };

  // Estados Formulario Embarazo
  const [fumForm, setFumForm] = useState("");
  const [fppForm, setFppForm] = useState("");
  const [fechaUltimoControlEmbarazoForm, setFechaUltimoControlEmbarazoForm] = useState("");
  const [fechaProximoControlEmbarazoForm, setFechaProximoControlEmbarazoForm] = useState("");
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
    setModoProfesionalForm("PROPIO");
    setProfesionalRutForm(user?.rut || "");
    setSearchProfModalInput("");
    setShowProfModalDropdown(false);
    setTipoIngreso("SELECCION");
    setTipoExamenForm("PAP");
    
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const todayStr = new Date(d.getTime() - offset).toISOString().slice(0, 10);
    setFechaExamenForm(todayStr);
    
    setCodigoLabForm("IG8");
    setPeriodicidadMesesForm(36);
    setCriterioPersonalizado(false);
    const dProx = new Date(todayStr);
    dProx.setMonth(dProx.getMonth() + 36);
    setFechaProximoControlForm(dProx.toISOString().split("T")[0]);

    setAdecuacionMuestraForm("SATISFACTORIA");
    setMotivoInsatisfactoriaForm("");
    setResultadoForm("NEGATIVO");
    setFechaResultadoForm(todayStr);
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

    const isInsatisfactoria = tipoExamenForm === "PAP" ? (adecuacionMuestraForm === "INSATISFACTORIA" || decodificacion.esInsatisfactorio) : false;
    const realResultado = isInsatisfactoria ? "MUESTRA INSATISFACTORIA" : (tipoExamenForm === "PAP" ? (decodificacion.esPatologico ? (decodificacion.diagnosticoCodigo || resultadoForm) : "NEGATIVO") : resultadoForm);
    const isPatologico = !isInsatisfactoria && realResultado !== "NEGATIVO" && realResultado !== "NORMAL" && realResultado !== "PENDIENTE";

    const res = await guardarPap({
      rut_paciente: selectedPacienteExamen.rut,
      fecha_pap: fechaExamenForm,
      profesional_rut: modoProfesionalForm === "MANUAL" ? (profesionalRutForm || undefined) : undefined,
      tipo_examen: tipoExamenForm,
      adecuacion_muestra: isInsatisfactoria ? "INSATISFACTORIA" : "SATISFACTORIA",
      motivo_insatisfactoria: isInsatisfactoria ? (motivoInsatisfactoriaForm || decodificacion.motivoInsatisfactoria) : undefined,
      resultado: realResultado,
      fecha_resultado: realResultado !== "PENDIENTE" ? (fechaResultadoForm || fechaExamenForm) : undefined,
      derivado_upc: isPatologico ? derivadoUpcForm : false,
      fecha_derivacion_upc: isPatologico && derivadoUpcForm ? (fechaDerivacionUpcForm || fechaExamenForm) : undefined,
      codigo_lab: tipoExamenForm === "PAP" ? codigoLabForm : undefined,
      periodicidad_meses: periodicidadMesesForm,
      fecha_proximo_control: fechaProximoControlForm || undefined,
      observaciones: observacionesExamenForm || (tipoExamenForm === "PAP" ? decodificacion.textoResumen : undefined)
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
            ultimo_motivo_insatisfactoria: isInsatisfactoria ? (motivoInsatisfactoriaForm || decodificacion.motivoInsatisfactoria) : undefined,
            ultima_fecha_resultado: realResultado !== "PENDIENTE" ? (fechaResultadoForm || fechaExamenForm) : undefined,
            ultimo_derivado_upc: isPatologico ? derivadoUpcForm : false,
            ultima_fecha_derivacion_upc: isPatologico && derivadoUpcForm ? (fechaDerivacionUpcForm || fechaExamenForm) : undefined,
            ultimo_codigo_lab: tipoExamenForm === "PAP" ? codigoLabForm : undefined,
            ultima_periodicidad_meses: periodicidadMesesForm,
            ultima_fecha_proximo_control: fechaProximoControlForm || undefined
          };
        }
        return p;
      }));
      setShowExamenModal(false);
      setSelectedPacienteExamen(null);
    }
  };

  const handleEmbarazoSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPacienteExamen || !fumForm || !fppForm) return;
    setSavingExamen(true);
    setExamenError("");
    
    const res = await ingresarEmbarazo({
      rut_paciente: selectedPacienteExamen.rut,
      fum: fumForm,
      fpp: fppForm,
      fecha_ultimo_control: fechaUltimoControlEmbarazoForm || undefined,
      fecha_proximo_control: fechaProximoControlEmbarazoForm || undefined,
      estado_nutricional: estadoNutricionalForm || undefined,
      observaciones: observacionesEmbarazoForm || undefined
    });
    
    setSavingExamen(false);
    if (res.error) {
      setExamenError(res.error);
    } else {
      setShowExamenModal(false);
      setSelectedPacienteExamen(null);
      setEmbarazadasData(prev => [
        {
          rut: selectedPacienteExamen.rut,
          dv: selectedPacienteExamen.dv,
          nombre_completo: selectedPacienteExamen.nombre_completo,
          fecha_nacimiento: selectedPacienteExamen.fecha_nacimiento,
          sector: selectedPacienteExamen.sector,
          telefono: selectedPacienteExamen.telefono,
          fum: fumForm,
          fpp: fppForm,
          fecha_ultimo_control: fechaUltimoControlEmbarazoForm,
          fecha_proximo_control: fechaProximoControlEmbarazoForm,
          estado_nutricional: estadoNutricionalForm,
          observaciones: observacionesEmbarazoForm,
          estado_embarazo: "EMBARAZO"
        },
        ...prev
      ]);
      setActiveTab("embarazadas");
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

    // 6. Vigente o Vencido (con soporte dinámico de Periodicidad Anual / 6 Meses / Personalizada)
    const hoy = new Date();
    
    if (p.ultima_fecha_proximo_control) {
      const proximo = new Date(p.ultima_fecha_proximo_control);
      const esVigente = hoy <= proximo;
      const meses = p.ultima_periodicidad_meses || 36;
      const tipoTag = meses === 12 ? " (CONTROL ANUAL)" : meses === 6 ? " (CONTROL 6M)" : "";

      if (esVigente) {
        return {
          estado: "VIGENTE",
          label: `VIGENTE${tipoTag}`,
          color: meses === 12 ? "text-blue-700 bg-blue-50 border-blue-200 font-bold" : "text-emerald-600 bg-emerald-50 border-emerald-200",
          conducta: `Próximo control programado para el ${proximo.toLocaleDateString('es-CL')}${meses === 12 ? ' (Criterio Anual)' : ''}.`,
          critico: false
        };
      } else {
        return {
          estado: "VENCIDO",
          label: `VENCIDO${tipoTag}`,
          color: "text-red-600 bg-red-50 border-red-200 font-bold",
          conducta: `Tamizaje vencido desde el ${proximo.toLocaleDateString('es-CL')}. Citar para control prioritario.`,
          critico: true
        };
      }
    }

    const fechaExamen = new Date(p.ultima_fecha_pap);
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

      // Excluir histerectomizadas de la lista activa de tamizaje por defecto (a menos que se filtre explícitamente por "EXCLUIDAS")
      if (selectedStatus === "TODOS") {
        result = result.filter(p => !p.histerectomizada);
      } else {
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


  // Métricas del Dashboard PAP (Gestión de Demanda y Brechas)
  const papMetrics = useMemo(() => {
    const papPob = data.filter(p => {
      const age = calculateAge(p.fecha_nacimiento);
      return age !== null && age >= 25 && age <= 64 && (!p.estado || p.estado === 'ACTIVO');
    });

    const total = papPob.length;
    const excluidas = papPob.filter(p => p.histerectomizada).length;
    const poblacionActiva = total - excluidas;
    const vigentes = papPob.filter(p => !p.histerectomizada && getTamizajeStatus(p).estado === "VIGENTE").length;
    const porVencer = papPob.filter(p => !p.histerectomizada && getTamizajeStatus(p).label.includes("POR VENCER")).length;
    const vencidos = papPob.filter(p => !p.histerectomizada && (getTamizajeStatus(p).estado === "VENCIDO" || getTamizajeStatus(p).estado === "SIN_REGISTRO")).length;
    const patologicos = papPob.filter(p => getTamizajeStatus(p).estado === "ALTERADO").length;
    const cob = poblacionActiva > 0 ? (((vigentes + porVencer) / poblacionActiva) * 100).toFixed(1) : "0.0";

    return { total, poblacionActiva, vigentes, porVencer, vencidos, patologicos, excluidas, cob };
  }, [data]);

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

      {/* Indicadores Clave del Dashboard PAP (Gestión de Demanda) */}
      {activeTab === "pap" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div 
            onClick={() => { setSelectedStatus("TODOS"); setCurrentPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === "TODOS" 
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400' 
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <span className={`block text-[10px] font-black uppercase tracking-wider ${selectedStatus === "TODOS" ? 'text-slate-400' : 'text-slate-400'}`}>
              Población Objetivo (25-64a)
            </span>
            <span className="text-2xl font-black mt-1 block">
              {papMetrics.poblacionActiva.toLocaleString("es-CL")}
            </span>
            <span className={`text-[10px] font-semibold block mt-0.5 ${selectedStatus === "TODOS" ? 'text-slate-300' : 'text-slate-500'}`}>
              Meta CaCu MINSAL
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Cobertura Vigente
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {papMetrics.cob}%
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(parseFloat(papMetrics.cob), 100)}%` }} />
            </div>
          </div>

          <div 
            onClick={() => { setSelectedStatus("VIGENTES"); setCurrentPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === "VIGENTES" 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300' 
                : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 shadow-xs'
            }`}
          >
            <span className={`block text-[10px] font-black uppercase tracking-wider ${selectedStatus === "VIGENTES" ? 'text-emerald-100' : 'text-emerald-600'}`}>
              Vigentes
            </span>
            <span className={`text-2xl font-black mt-1 block ${selectedStatus === "VIGENTES" ? 'text-white' : 'text-emerald-600'}`}>
              {papMetrics.vigentes.toLocaleString("es-CL")}
            </span>
            <span className={`text-[10px] font-semibold block mt-0.5 ${selectedStatus === "VIGENTES" ? 'text-emerald-100' : 'text-slate-500'}`}>
              Examen al día
            </span>
          </div>

          <div 
            onClick={() => { setSelectedStatus("VENCIDOS"); setCurrentPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === "VENCIDOS" 
                ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300' 
                : 'bg-red-50/50 text-red-950 border-red-200 hover:border-red-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`block text-[10px] font-black uppercase tracking-wider ${selectedStatus === "VENCIDOS" ? 'text-red-100' : 'text-red-600'}`}>
                Brecha de Rescate
              </span>
              <span className={`h-2 w-2 rounded-full ${selectedStatus === "VENCIDOS" ? 'bg-white' : 'bg-red-500 animate-pulse'}`} />
            </div>
            <span className={`text-2xl font-black mt-1 block ${selectedStatus === "VENCIDOS" ? 'text-white' : 'text-red-600'}`}>
              {papMetrics.vencidos.toLocaleString("es-CL")}
            </span>
            <span className={`text-[10px] font-semibold block mt-0.5 ${selectedStatus === "VENCIDOS" ? 'text-red-100' : 'text-red-700/80'}`}>
              Vencidas o sin registro
            </span>
          </div>

          <div 
            onClick={() => { setSelectedStatus("CRITICOS_SIN_DERIVACION"); setCurrentPage(1); }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedStatus === "CRITICOS_SIN_DERIVACION" 
                ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-400' 
                : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 shadow-xs'
            }`}
          >
            <span className={`block text-[10px] font-black uppercase tracking-wider ${selectedStatus === "CRITICOS_SIN_DERIVACION" ? 'text-purple-200' : 'text-purple-700'}`}>
              Alertas UPC / Alteradas
            </span>
            <span className={`text-2xl font-black mt-1 block ${selectedStatus === "CRITICOS_SIN_DERIVACION" ? 'text-white' : 'text-purple-700'}`}>
              {papMetrics.patologicos.toLocaleString("es-CL")}
            </span>
            <span className={`text-[10px] font-semibold block mt-0.5 ${selectedStatus === "CRITICOS_SIN_DERIVACION" ? 'text-purple-200' : 'text-slate-500'}`}>
              Seguimiento de patología
            </span>
          </div>
        </div>
      )}


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

        {/* Barra Superior con Conteo de Pacientes (Estándar de la Plataforma) */}
        <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Mostrando <strong className="text-slate-800 font-bold">{filteredData.length.toLocaleString("es-CL")}</strong> pacientes {searchRut || selectedSector !== "TODOS" || (activeTab === "pap" && selectedStatus !== "TODOS") || onlyPad ? "según filtros seleccionados" : "en nómina"}.
          </span>
          {totalPages > 1 && (
            <span className="text-[11px] text-slate-400 font-semibold">
              Página {currentPage} de {totalPages}
            </span>
          )}
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
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%] min-w-[260px]">Identificación</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[18%] min-w-[150px]">Contacto (SOME)</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[18%] min-w-[150px]">Último Tamizaje</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[16%] min-w-[140px]">Próximo Control</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[18%] min-w-[150px]">Estado Tamizaje</th>
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
                          {/* CONTACTO (SOME) */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              {p.telefono ? (
                                <a 
                                  href={`tel:${p.telefono}`} 
                                  className="flex items-center text-xs font-mono font-bold text-slate-700 hover:text-pink-600 transition-colors w-fit"
                                  title="Llamar para rescate / citación"
                                >
                                  <Phone size={12} className="mr-1.5 text-pink-500 shrink-0" />
                                  {p.telefono}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium italic">Sin Teléfono</span>
                              )}
                            </div>
                          </td>

                          {/* ÚLTIMO TAMIZAJE */}
                          <td className="px-6 py-4">
                            {p.ultima_fecha_pap ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800 text-xs">
                                    {new Date(p.ultima_fecha_pap).toLocaleDateString('es-CL')}
                                  </span>
                                  <span className="text-[9px] text-slate-500 uppercase font-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {p.ultimo_tipo_examen || "PAP"}
                                  </span>
                                </div>
                                {p.ultimo_codigo_lab ? (
                                  <span className="font-mono text-xs font-black bg-pink-50 text-pink-700 px-2 py-0.5 rounded border border-pink-200 uppercase w-fit tracking-wider shadow-2xs">
                                    {p.ultimo_codigo_lab}
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-bold uppercase truncate ${p.ultimo_resultado_pap !== "NEGATIVO" && p.ultimo_resultado_pap !== "NORMAL" && p.ultimo_resultado_pap !== "PENDIENTE" ? "text-red-600" : "text-slate-600"}`}>
                                    {p.ultimo_resultado_pap}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">Sin Examen Previo</span>
                            )}
                          </td>

                          {/* PRÓXIMO CONTROL / VENCIMIENTO */}
                          <td className="px-6 py-4">
                            {p.histerectomizada ? (
                              <span className="text-xs text-purple-600 font-bold">Excluida</span>
                            ) : p.ultima_fecha_proximo_control ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-800 text-xs">
                                  {new Date(p.ultima_fecha_proximo_control).toLocaleDateString('es-CL')}
                                </span>
                                {p.ultima_periodicidad_meses === 12 && (
                                  <span className="text-[8px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 uppercase w-fit">
                                    Control Anual
                                  </span>
                                )}
                                {p.ultima_periodicidad_meses === 6 && (
                                  <span className="text-[8px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase w-fit">
                                    Control 6 Meses
                                  </span>
                                )}
                              </div>
                            ) : p.ultima_fecha_pap ? (
                              <span className="text-xs text-slate-600 font-medium">
                                {(() => {
                                  const d = new Date(p.ultima_fecha_pap);
                                  d.setFullYear(d.getFullYear() + (p.ultimo_tipo_examen === "VPH" ? 5 : 3));
                                  return d.toLocaleDateString('es-CL');
                                })()}
                              </span>
                            ) : (
                              <span className="text-xs text-red-500 font-bold">Inmediato (Brecha)</span>
                            )}
                          </td>

                          {/* ESTADO TAMIZAJE & ACCIÓN DIRECTA */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border uppercase shadow-2xs ${tamizaje.color}`}>
                                {tamizaje.label}
                              </span>
                              <button
                                onClick={() => openHistorialDrawer(p)}
                                className="p-1.5 bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-pink-600 rounded-lg transition-all border border-slate-200 hover:border-pink-200 cursor-pointer"
                                title="Abrir Historial Clínico y Acciones"
                              >
                                <ChevronRight size={16} />
                              </button>
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
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => openHistorialDrawer(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-pink-50 text-slate-600 hover:text-pink-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 hover:border-pink-200 cursor-pointer"
                                title="Abrir Historial Clínico y Acciones"
                              >
                                <span>Historial</span>
                                <ChevronRight size={14} />
                              </button>
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
                <h3 className="font-bold text-slate-800 text-base">
                  {tipoIngreso === "SELECCION" ? "Seleccione Tipo de Registro" : tipoIngreso === "PAP" ? "Ingreso de Tamizaje (PAP/VPH)" : "Control de Embarazo"}
                </h3>
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
              {tipoIngreso === "SELECCION" && (
                <div className="grid grid-cols-2 gap-4 h-full min-h-[300px]">
                  <button onClick={() => setTipoIngreso("PAP")} className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-pink-50 border-2 border-slate-100 hover:border-pink-300 rounded-2xl transition-all group">
                    <FileText size={48} className="text-slate-300 group-hover:text-pink-500 mb-4 transition-colors" />
                    <span className="font-bold text-slate-700 group-hover:text-pink-700 text-lg">Tamizaje PAP / VPH</span>
                  </button>
                  <button onClick={() => setTipoIngreso("EMBARAZO")} className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-purple-50 border-2 border-slate-100 hover:border-purple-300 rounded-2xl transition-all group">
                    <HeartPulse size={48} className="text-slate-300 group-hover:text-purple-500 mb-4 transition-colors" />
                    <span className="font-bold text-slate-700 group-hover:text-purple-700 text-lg">Control de Embarazo</span>
                  </button>
                </div>
              )}
              {tipoIngreso === "PAP" && (
                <form id="pap-form" onSubmit={(e) => { e.preventDefault(); handleSaveExamen(); }} className="space-y-4">
                  {/* Selector Predictivo de Profesional Responsable */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={13} className="text-pink-600" />
                        Profesional Responsable / Matrón(a)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModoProfesionalForm("PROPIO");
                            setProfesionalRutForm(user?.rut || "");
                            setSearchProfModalInput("");
                            setShowProfModalDropdown(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            modoProfesionalForm === "PROPIO" ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Mi Usuario ({user?.nombre ? user.nombre.split(" ")[0] : "Actual"})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModoProfesionalForm("MANUAL");
                            setSearchProfModalInput("");
                            setShowProfModalDropdown(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            modoProfesionalForm === "MANUAL" ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Buscar Otro
                        </button>
                      </div>
                    </div>

                    {modoProfesionalForm === "MANUAL" ? (
                      <div className="relative">
                        {profesionalSeleccionadoModalObj ? (
                          <div className="flex items-center justify-between p-2.5 bg-white border border-pink-200 rounded-xl shadow-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center">
                                {profesionalSeleccionadoModalObj.nombre.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 text-xs block uppercase">
                                  {profesionalSeleccionadoModalObj.nombre}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {profesionalSeleccionadoModalObj.profesion || "Profesional"} • RUT: {profesionalSeleccionadoModalObj.rut}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setProfesionalRutForm("");
                                setSearchProfModalInput("");
                                setShowProfModalDropdown(true);
                              }}
                              className="text-[10px] font-bold text-pink-600 hover:text-pink-800 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                              type="text"
                              placeholder="Escribe nombre o RUT del matrón(a)..."
                              value={searchProfModalInput}
                              onChange={(e) => {
                                setSearchProfModalInput(e.target.value);
                                setShowProfModalDropdown(true);
                              }}
                              onFocus={() => setShowProfModalDropdown(true)}
                              className="w-full pl-8 pr-7 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none shadow-xs"
                              autoFocus
                            />
                            {searchProfModalInput && (
                              <button
                                type="button"
                                onClick={() => { setSearchProfModalInput(""); setShowProfModalDropdown(false); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            )}

                            {/* Dropdown flotante */}
                            {showProfModalDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="px-3 py-1 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                  <span>Profesionales disponibles ({filteredProfesionalesModal.length})</span>
                                  <span>Haz clic para seleccionar</span>
                                </div>
                                {filteredProfesionalesModal.length > 0 ? (
                                  filteredProfesionalesModal.map((prof) => (
                                    <button
                                      key={prof.rut}
                                      type="button"
                                      onClick={() => {
                                        setProfesionalRutForm(prof.rut);
                                        setSearchProfModalInput(prof.nombre);
                                        setShowProfModalDropdown(false);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-pink-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                      <div>
                                        <span className="font-bold text-slate-800 text-xs block group-hover:text-pink-700 transition-colors uppercase">
                                          {prof.nombre}
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          {prof.profesion || "Profesional"} • RUT: {prof.rut}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Elegir
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-3 text-center text-xs text-slate-500 font-medium">
                                    No hay coincidencias para &quot;{searchProfModalInput}&quot;.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-bold">{user?.nombre || "Usuario Actual"}</span>
                        <span className="text-[10px] font-mono text-slate-500">{user?.rut} • {user?.profesion || "Matrón(a) / Clínico"}</span>
                      </div>
                    )}
                  </div>

                  {/* Fila Tipo Examen y Fecha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tipo de Examen</label>
                      <select
                        value={tipoExamenForm}
                        onChange={(e) => {
                          setTipoExamenForm(e.target.value);
                          if (e.target.value === "VPH") {
                            setResultadoForm("NEGATIVO");
                            setPeriodicidadMesesForm(60);
                          } else {
                            handleCodigoLabChange(codigoLabForm || "IG8");
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                      >
                        <option value="PAP">PAP (Citología Cervical)</option>
                        <option value="VPH">Test de VPH (Molecular)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Toma de Muestra</label>
                      <input
                        type="date"
                        value={fechaExamenForm}
                        onChange={(e) => {
                          setFechaExamenForm(e.target.value);
                          if (e.target.value && periodicidadMesesForm > 0) {
                            const d = new Date(e.target.value);
                            d.setMonth(d.getMonth() + periodicidadMesesForm);
                            setFechaProximoControlForm(d.toISOString().split("T")[0]);
                          }
                        }}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* SECCIÓN PAP: DECODIFICADOR INTELIGENTE DE CÓDIGOS */}
                  {tipoExamenForm === "PAP" ? (
                    <div className="p-4 bg-pink-50/40 border border-pink-100 rounded-2xl space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-black text-pink-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                            Código del Laboratorio (Anatomía Patológica)
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">Ej: IG8, IG7, IG8J5O3, AG8T, H1G8S1</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={codigoLabForm}
                            onChange={(e) => handleCodigoLabChange(e.target.value)}
                            placeholder="Ingrese código compuesto (ej: IG8, IG7, IG8J5O3, AG8T)"
                            className="w-full px-4 py-2.5 bg-white border-2 border-pink-200 rounded-xl text-slate-900 font-mono font-black text-sm tracking-widest uppercase focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none shadow-xs"
                            autoFocus
                          />
                          {codigoLabForm && (
                            <button
                              type="button"
                              onClick={() => handleCodigoLabChange("")}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Desglose Clínico Traducido en Tiempo Real */}
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Traducción Clínica Automática</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            decodificacion.esPatologico ? 'bg-red-100 text-red-700' : decodificacion.esInsatisfactorio ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {decodificacion.esPatologico ? 'PATOLÓGICO / ALTERADO' : decodificacion.esInsatisfactorio ? 'MUESTRA INADECUADA' : 'NORMAL / NEGATIVO'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Citología / Diagnóstico</span>
                            <span className={`font-bold ${decodificacion.esPatologico ? 'text-red-600' : 'text-slate-800'}`}>
                              {decodificacion.diagnostico}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Adecuación de Muestra</span>
                            <span className={`font-semibold ${decodificacion.esInsatisfactorio ? 'text-orange-600' : 'text-slate-700'}`}>
                              {decodificacion.adecuacionDescripcion}
                            </span>
                          </div>

                          {decodificacion.microbiologia.length > 0 && (
                            <div className="col-span-1 sm:col-span-2 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                              <span className="block text-[9px] font-bold text-amber-800 uppercase">Hallazgos Microbiológicos / Inflamatorios</span>
                              <span className="text-amber-900 font-medium">{decodificacion.microbiologia.join(" • ")}</span>
                            </div>
                          )}

                          {decodificacion.conducta.length > 0 && (
                            <div className="col-span-1 sm:col-span-2 bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                              <span className="block text-[9px] font-bold text-blue-800 uppercase">Conducta Sugerida por Laboratorio</span>
                              <span className="text-blue-900 font-semibold">{decodificacion.conducta.join(" • ")}</span>
                            </div>
                          )}
                        </div>

                        {/* Alerta de Derivación UPC */}
                        {decodificacion.esPatologico && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs animate-in fade-in">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold uppercase block text-[10px]">Alerta GES / Derivación UPC</span>
                              Requiere ingreso a seguimiento prioritario en la Unidad de Patología Cervical.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SELECTOR DE PERIODICIDAD Y PRÓXIMO CONTROL */}
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                              Periodicidad y Próximo Control PAP
                            </label>
                            <p className="text-[10px] text-slate-400">Seleccione la frecuencia de citación según norma o criterio clínico:</p>
                          </div>
                          {criterioPersonalizado && (
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                              Criterio Clínico Activo
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePeriodicidadChange(36)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                              periodicidadMesesForm === 36
                                ? 'bg-pink-600 text-white border-pink-600 shadow-xs ring-2 ring-pink-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            3 Años
                            <span className="block text-[8px] font-normal opacity-80">Estándar MINSAL</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePeriodicidadChange(12)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                              periodicidadMesesForm === 12
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            1 Año
                            <span className="block text-[8px] font-normal opacity-80">Criterio Clínico / G7</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePeriodicidadChange(6)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                              periodicidadMesesForm === 6
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            6 Meses
                            <span className="block text-[8px] font-normal opacity-80">Tratar / Inflamación</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePeriodicidadChange(0)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                              periodicidadMesesForm === 0
                                ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            UPC / Repetir
                            <span className="block text-[8px] font-normal opacity-80">Sin periodicidad</span>
                          </button>
                        </div>

                        {periodicidadMesesForm > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-xs font-semibold text-slate-600">Fecha calculada para próximo PAP:</span>
                            <input
                              type="date"
                              value={fechaProximoControlForm}
                              onChange={(e) => {
                                setFechaProximoControlForm(e.target.value);
                                setCriterioPersonalizado(true);
                              }}
                              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* SECCIÓN TEST VPH */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Resultado Test VPH</label>
                        <select
                          value={resultadoForm}
                          onChange={(e) => {
                            setResultadoForm(e.target.value);
                            if (e.target.value === "NEGATIVO") {
                              setPeriodicidadMesesForm(60);
                              if (fechaExamenForm) {
                                const d = new Date(fechaExamenForm);
                                d.setFullYear(d.getFullYear() + 5);
                                setFechaProximoControlForm(d.toISOString().split("T")[0]);
                              }
                            } else {
                              setPeriodicidadMesesForm(0);
                              setFechaProximoControlForm("");
                              setDerivadoUpcForm(true);
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                        >
                          <option value="NEGATIVO">NEGATIVO (Ausencia de VPH)</option>
                          <option value="POSITIVO_16_18">POSITIVO VPH 16 o 18 (UPC Directa)</option>
                          <option value="POSITIVO_OTROS">POSITIVO Otros VPH Alto Riesgo</option>
                          <option value="PENDIENTE">PENDIENTE DE RESULTADO</option>
                        </select>
                      </div>

                      {resultadoForm !== "PENDIENTE" && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha del Resultado</label>
                          <input
                            type="date"
                            value={fechaResultadoForm}
                            onChange={(e) => setFechaResultadoForm(e.target.value)}
                            min={fechaExamenForm}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Observaciones Clínicas Adicionales</label>
                    <textarea
                      value={observacionesExamenForm}
                      onChange={(e) => setObservacionesExamenForm(e.target.value)}
                      maxLength={1000}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                      placeholder="Antecedentes adicionales, tratamientos o indicaciones del profesional..."
                    />
                  </div>


                </form>
              )}
              
              {tipoIngreso === "EMBARAZO" && (
                <form id="embarazo-form" onSubmit={handleEmbarazoSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">F.U.M</label>
                      <input type="date" value={fumForm} onChange={handleFumChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-purple-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">F.P.P (Calculada)</label>
                      <input type="date" value={fppForm} readOnly className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-semibold text-xs opacity-80" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Último Control</label>
                      <input type="date" value={fechaUltimoControlEmbarazoForm} onChange={e => setFechaUltimoControlEmbarazoForm(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Próximo Control</label>
                      <input type="date" value={fechaProximoControlEmbarazoForm} onChange={e => setFechaProximoControlEmbarazoForm(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nutrición</label>
                    <select value={estadoNutricionalForm} onChange={e => setEstadoNutricionalForm(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-purple-500 outline-none">
                      <option value="">-- Seleccionar --</option>
                      <option value="ENFLAQUECIDA">Enflaquecida</option>
                      <option value="NORMOPESO">Normopeso</option>
                      <option value="SOBREPESO">Sobrepeso</option>
                      <option value="OBESIDAD">Obesidad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Observaciones</label>
                    <textarea value={observacionesEmbarazoForm} onChange={e => setObservacionesEmbarazoForm(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs focus:ring-2 focus:ring-purple-500 outline-none"></textarea>
                  </div>
                </form>
              )}

              {examenError && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertTriangle size={14} className="shrink-0" />
                  {examenError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end p-5 border-t border-slate-100 bg-slate-50/50 gap-3 shrink-0">
              {tipoIngreso !== "SELECCION" && (
                <button type="button" onClick={() => setTipoIngreso("SELECCION")} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors mr-auto">
                  Atrás
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowExamenModal(false); setSelectedPacienteExamen(null); }}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                disabled={savingExamen}
              >
                Cancelar
              </button>
              {tipoIngreso !== "SELECCION" && (
              <button
                onClick={tipoIngreso === "PAP" ? handleSaveExamen : handleEmbarazoSubmit}
                disabled={savingExamen}
                className={`px-6 py-2.5 rounded-xl font-bold text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 ${tipoIngreso === "EMBARAZO" ? "bg-purple-600 hover:bg-purple-700" : "bg-pink-600 hover:bg-pink-700"}`}
              >
                {savingExamen ? "Guardando..." : "Guardar Registro"}
              </button>
              )}
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
              {/* Botón de Ingreso en el Drawer */}
              <div>
                <button
                  onClick={() => {
                    const p = selectedPacienteHistorial;
                    setSelectedPacienteHistorial(null);
                    setTipoIngreso("PAP");
                    openExamenModal(p);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-pink-700 transition-colors text-xs shadow-xs cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Ingresar Examen PAP / VPH</span>
                </button>
              </div>

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

              {/* Antecedentes Quirúrgicos / Tamizaje */}
              {selectedPacienteHistorial.histerectomizada ? (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle size={16} className="text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider block text-[9px] text-purple-700 mb-0.5">Paciente Excluida por Histerectomía</span>
                      Registrada el {selectedPacienteHistorial.fecha_histerectomia ? new Date(selectedPacienteHistorial.fecha_histerectomia).toLocaleDateString('es-CL') : '—'} por causa {selectedPacienteHistorial.causa_histerectomia || "BENIGNA"}. Excluida del tamizaje estándar.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const p = selectedPacienteHistorial;
                      setSelectedPacienteHistorial(null);
                      openHisterectomiaModal(p);
                    }}
                    className="shrink-0 px-2 py-1 bg-white border border-purple-200 rounded-lg text-[10px] font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Modificar
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700 text-xs">Sin Antecedentes de Histerectomía</span>
                  </div>
                  <button
                    onClick={() => {
                      const p = selectedPacienteHistorial;
                      setSelectedPacienteHistorial(null);
                      openHisterectomiaModal(p);
                    }}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                  >
                    Registrar Histerectomía
                  </button>
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
                              <div className="flex items-center gap-1.5">
                                {ex.codigo_lab && (
                                  <span className="font-mono text-[9px] font-black bg-pink-100 text-pink-700 px-2 py-0.5 rounded border border-pink-200 uppercase tracking-wider">
                                    {ex.codigo_lab}
                                  </span>
                                )}
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                  {ex.tipo_examen || "PAP"}
                                </span>
                              </div>
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
                              <span>Registrado por: <strong className="text-slate-600 font-bold">{ex.profesional_nombre || ex.profesional_rut}</strong></span>
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


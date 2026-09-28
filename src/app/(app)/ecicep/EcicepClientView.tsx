"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, MapPin, AlertTriangle, CheckCircle, Clock, Download, ClipboardCheck, X, User, Phone, Map, Calendar, Plus, Save, Briefcase, Hospital, RefreshCw, ArrowUpRight, BarChart3, ChevronDown, FileSpreadsheet, Target, Filter, UserCheck, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { UserProfile } from "@/actions/userActions";
import { saveEcicepRecord, obtenerClinicosActivos, EcicepSubmission } from "@/actions/ecicepActions";
import { 
  ingresarCasoGestion, 
  obtenerCasosGestion, 
  tomarCaso, 
  asignarGestorCaso, 
  cerrarCaso, 
  obtenerProfesionalesAsignables, 
  ingresarCasosMultiples, 
  anularCaso,
  GestionCaso, 
  TipoCaso, 
  EstadoCaso,
  ProfesionalAsignable 
} from "@/actions/gestionCasosActions";
import { CopyBadge } from "@/components/CopyBadge";

const ROLES_DISPONIBLES = [
  "Médico", "Enfermero", "Nutricionista", "Kinesiólogo", 
  "Psicólogo", "Asistente Social", "Terapeuta Ocupacional", 
  "Fonoaudiólogo", "Odontólogo", "TENS", "Matrón(a)"
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

const calcularDv = (rut: string | number): string => {
  const cleanRut = String(rut).replace(/[^0-9]/g, "");
  if (!cleanRut) return "";
  let sum = 0;
  let mul = 2;
  for (let i = cleanRut.length - 1; i >= 0; i--) {
    sum += parseInt(cleanRut[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  if (rem === 11) return "0";
  if (rem === 10) return "K";
  return String(rem);
};

const getParsedDataClinica = (dataClinica: any) => {
  if (!dataClinica) return null;
  if (typeof dataClinica === "string") {
    try {
      return JSON.parse(dataClinica);
    } catch (e) {
      return null;
    }
  }
  return dataClinica;
};

const getItemDisplayStatus = (item: { rol: string; mes: number; ano: number; nota?: string }) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const baseLabel = `${NOMBRES_MESES[item.mes - 1]} ${item.ano}`;
  const isExpired = item.ano < currentYear || (item.ano === currentYear && item.mes < currentMonth);
  
  return { 
    label: baseLabel, 
    isExpired,
    className: isExpired 
      ? "bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold" 
      : "bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold" 
  };
};

const getCitaDisplayStatus = (p: any, rol: string) => {
  const dataClinica = getParsedDataClinica(p.data_clinica);
  const plan = [...(dataClinica?.plan || [])].sort((a: any, b: any) => {
    return (a.ano * 12 + a.mes) - (b.ano * 12 + b.mes);
  });
  
  const match = plan.find((item: any) => item.rol === rol);
  
  if (match) {
    return getItemDisplayStatus(match);
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
  const [view, setView] = useState<'lista' | 'analisis' | 'gestion'>('lista');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [searchRut, setSearchRut] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterPendienteEstamento, setFilterPendienteEstamento] = useState("Todos");
  const [filterSeguimientoEstamento, setFilterSeguimientoEstamento] = useState("Todos");
  const [onlyBrecha, setOnlyBrecha] = useState(false);
  const [onlyOrdenes, setOnlyOrdenes] = useState(false);
  const [onlySinPlan, setOnlySinPlan] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // ── Gestión de Casos ──────────────────────────────────────────────────────
  const [casos, setCasos] = useState<GestionCaso[]>([]);
  const [loadingCasos, setLoadingCasos] = useState(false);

  // Modal: Ingresar Caso
  const [showIngresarCasoModal, setShowIngresarCasoModal] = useState(false);
  const [isDerivacionDirecta, setIsDerivacionDirecta] = useState(false);
  const [casoRutInput, setCasoRutInput] = useState("");
  const [casoRutSearch, setCasoRutSearch] = useState("");
  const [casoPacienteEncontrado, setCasoPacienteEncontrado] = useState<any>(null);
  const [casoTipo, setCasoTipo] = useState<TipoCaso>("POST_HOSPITALIZADO");
  const [casoFechaAlta, setCasoFechaAlta] = useState("");
  const [casoDiagnostico, setCasoDiagnostico] = useState("");
  const [casoObservaciones, setCasoObservaciones] = useState("");
  const [casoEstamentoSolicitado, setCasoEstamentoSolicitado] = useState("ENFERMERÍA");
  const [casoSaving, setCasoSaving] = useState(false);
  const [casoError, setCasoError] = useState("");
  const [filterTipoCaso, setFilterTipoCaso] = useState<"Todos" | TipoCaso>("Todos");
  const [filterEstadoCaso, setFilterEstadoCaso] = useState<"ACTIVOS" | "PENDIENTE_ASIGNACION" | "EN_SEGUIMIENTO" | "CERRADO">("ACTIVOS");
  const [searchGestion, setSearchGestion] = useState("");
  const [filterSectorGestion, setFilterSectorGestion] = useState("Todos");
  const [filterSoloMisCasos, setFilterSoloMisCasos] = useState(false);

  // Modales de gestión de casos
  const [profesionales, setProfesionales] = useState<ProfesionalAsignable[]>([]);
  const [modalAsignar, setModalAsignar] = useState<{ show: boolean; casoId: number | null; pacienteNombre: string; estamentoSugerido?: string; categoria?: string | null }>({
    show: false, casoId: null, pacienteNombre: ""
  });
  const [asignarSelectedRut, setAsignarSelectedRut] = useState("");
  const [asignarSearchQuery, setAsignarSearchQuery] = useState("");
  const [asignarSaving, setAsignarSaving] = useState(false);

  const [modalCerrar, setModalCerrar] = useState<{ show: boolean; casoId: number | null; pacienteNombre: string }>({
    show: false, casoId: null, pacienteNombre: ""
  });
  const [cerrarMotivo, setCerrarMotivo] = useState("OBJETIVO_CUMPLIDO");
  const [cerrarSaving, setCerrarSaving] = useState(false);

  // Modales de confirmación para Tomar y Anular
  const [modalTomar, setModalTomar] = useState<{
    show: boolean;
    casoId: number | null;
    pacienteNombre: string;
    sector: string;
    estamento?: string;
  }>({
    show: false,
    casoId: null,
    pacienteNombre: "",
    sector: "",
    estamento: ""
  });
  const [tomarSaving, setTomarSaving] = useState(false);

  const [modalAnular, setModalAnular] = useState<{
    show: boolean;
    casoId: number | null;
    pacienteNombre: string;
    tipo: string;
  }>({
    show: false,
    casoId: null,
    pacienteNombre: "",
    tipo: ""
  });
  const [anularSaving, setAnularSaving] = useState(false);

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [clinicos, setClinicos] = useState<any[]>([]);
  const [fechaAtencion, setFechaAtencion] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [estamentoSeguimiento, setEstamentoSeguimiento] = useState("");
  


  const [categoria, setCategoria] = useState("G1");
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);
  const [polifarmacia, setPolifarmacia] = useState(false);
  const [funcionalidad, setFuncionalidad] = useState("Autovalente sin riesgo");
  const [deterioroCognitivo, setDeterioroCognitivo] = useState(false);
  const [riesgoSocial, setRiesgoSocial] = useState(false);
  const [hospitalizacionReciente, setHospitalizacionReciente] = useState(false);
  const [consultasUrgencia, setConsultasUrgencia] = useState(0);

  // Estados para Modal de Órdenes
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [examsModalPatient, setExamsModalPatient] = useState<any>(null);
  const [examsModalPlan, setExamsModalPlan] = useState<any[]>([]);

  const [gestorRut, setGestorRut] = useState("");
  const [profesionalRut, setProfesionalRut] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [planAtenciones, setPlanAtenciones] = useState<any[]>([]);
  const [seguimientoTelefonico, setSeguimientoTelefonico] = useState(false);
  const [gestionCaso, setGestionCaso] = useState(false);
  const [estamentoGestion, setEstamentoGestion] = useState("");
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

  // ── Lógica Gestión de Casos ───────────────────────────────────────────────

  const cargarCasos = useCallback(async () => {
    setLoadingCasos(true);
    const result = await obtenerCasosGestion();
    setCasos(result);
    setLoadingCasos(false);
  }, []);

  useEffect(() => {
    if (view === "gestion") cargarCasos();
  }, [view, cargarCasos]);

  // Buscar paciente en el padrón por RUT al escribir en el modal
  const handleBuscarPacienteCaso = useCallback(() => {
    const q = casoRutInput.replace(/[^0-9kK]/g, "").toLowerCase();
    if (q.length < 5) { setCasoPacienteEncontrado(null); return; }
    const encontrado = data.find(p => p.rut.replace(/[^0-9kK]/g, "").toLowerCase().startsWith(q));
    setCasoPacienteEncontrado(encontrado || null);
    if (!encontrado) setCasoError("RUT no encontrado en el padrón activo.");
    else setCasoError("");
  }, [casoRutInput, data]);

  const [casosPendientes, setCasosPendientes] = useState<any[]>([]);

  useEffect(() => {
    handleBuscarPacienteCaso();
  }, [casoRutInput, handleBuscarPacienteCaso]);

  const resetCasoForm = () => {
    setCasoRutInput("");
    setCasoPacienteEncontrado(null);
    setCasoFechaAlta("");
    setCasoDiagnostico("");
    setCasoObservaciones("");
    setCasoError("");
  };

  const resetCasoModal = () => {
    resetCasoForm();
    setCasoTipo("POST_HOSPITALIZADO");
    setCasoSaving(false);
    setCasosPendientes([]);
    setIsDerivacionDirecta(false);
  };

  const handleDerivarPacienteACaso = (paciente: any) => {
    resetCasoModal();
    setCasoRutInput(paciente.rut);
    setCasoPacienteEncontrado(paciente);
    setCasoTipo("DERIVACION_CLINICA");
    setIsDerivacionDirecta(true);
    setShowIngresarCasoModal(true);
  };

  const handleAgregarALista = () => {
    if (!casoPacienteEncontrado) { setCasoError("Selecciona un paciente válido primero."); return; }
    if (casoTipo === "POST_HOSPITALIZADO" && !casoFechaAlta) { setCasoError("La Fecha de Alta es obligatoria."); return; }
    if (casosPendientes.find(c => c.rut_paciente === casoPacienteEncontrado.rut)) { setCasoError("Este paciente ya está en la lista actual."); return; }
    
    setCasosPendientes(prev => [...prev, {
      rut_paciente: casoPacienteEncontrado.rut,
      nombre_completo: casoPacienteEncontrado.nombre_completo,
      sector: casoPacienteEncontrado.sector,
      tipo: casoTipo,
      fecha_alta: casoTipo === "POST_HOSPITALIZADO" ? casoFechaAlta : null,
      diagnostico_alta: casoDiagnostico || null,
      estamento_solicitado: casoEstamentoSolicitado || "SIN ASIGNAR",
      observaciones: casoObservaciones || null,
    }]);
    
    resetCasoForm(); // Limpiar el input para el siguiente
  };

  const handleQuitarDeLista = (rut: string) => {
    setCasosPendientes(prev => prev.filter(c => c.rut_paciente !== rut));
  };

  const handleGuardarLista = async () => {
    if (casosPendientes.length === 0) return;
    setCasoSaving(true);
    setCasoError("");
    
    const res = await ingresarCasosMultiples(casosPendientes.map(c => ({
      rut_paciente: c.rut_paciente,
      tipo: c.tipo,
      fecha_alta: c.fecha_alta,
      diagnostico_alta: c.diagnostico_alta,
      estamento_solicitado: c.estamento_solicitado,
      observaciones: c.observaciones
    })));
    
    setCasoSaving(false);
    if (res.error) {
      setCasoError(res.error);
    } else {
      let msg = `Se ingresaron ${res.insertados} casos exitosamente.`;
      const numErrores = res.errores?.length ?? 0;
      if (numErrores > 0) {
        msg += ` Hubo ${numErrores} errores (pacientes ya ingresados o inactivos).`;
        toast.error(msg, { duration: 5000 });
      } else {
        toast.success(msg);
      }
      setShowIngresarCasoModal(false);
      resetCasoModal();
      await cargarCasos();
    }
  };

  const handleGuardarDerivacionDirecta = async () => {
    if (!casoPacienteEncontrado) return;
    setCasoSaving(true);
    setCasoError("");

    const newCaso = {
      rut_paciente: casoPacienteEncontrado.rut,
      tipo: casoTipo,
      fecha_alta: casoFechaAlta || undefined,
      diagnostico_alta: casoDiagnostico || undefined,
      estamento_solicitado: casoEstamentoSolicitado || undefined,
      observaciones: casoObservaciones || undefined
    };

    const res = await ingresarCasosMultiples([newCaso]);
    setCasoSaving(false);

    if (res.error) {
      setCasoError(res.error);
    } else {
      if ((res.insertados ?? 0) > 0) {
        toast.success("Paciente derivado exitosamente.");
        setShowIngresarCasoModal(false);
        resetCasoModal();
        await cargarCasos();
      } else {
        setCasoError("El paciente ya se encuentra en seguimiento o hubo un error.");
      }
    }
  };

  // Cargar lista de profesionales para asignar
  useEffect(() => {
    async function loadProfesionales() {
      const list = await obtenerProfesionalesAsignables();
      setProfesionales(list);
    }
    if (view === "gestion") {
      loadProfesionales();
    }
  }, [view]);

  // Confirmar y anular derivación
  const handleConfirmarAnularCaso = async () => {
    if (!modalAnular.casoId) return;
    setAnularSaving(true);
    const res = await anularCaso(modalAnular.casoId);
    setAnularSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Derivación anulada correctamente.");
      setModalAnular({ show: false, casoId: null, pacienteNombre: "", tipo: "" });
      await cargarCasos();
    }
  };

  // Confirmar y tomar caso (Autogestión del usuario actual)
  const handleConfirmarTomarCaso = async () => {
    if (!modalTomar.casoId) return;
    setTomarSaving(true);
    const res = await tomarCaso(modalTomar.casoId);
    setTomarSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Has tomado este caso para seguimiento.");
      setModalTomar({ show: false, casoId: null, pacienteNombre: "", sector: "", estamento: "" });
      await cargarCasos();
    }
  };

  // Exportar casos a Excel
  const handleExportarCasosExcel = () => {
    if (casosFiltrados.length === 0) {
      toast.error("No hay casos para exportar con los filtros seleccionados.");
      return;
    }
    const rows = casosFiltrados.map(c => ({
      "RUT": c.dv ? `${c.rut_paciente}-${c.dv}` : `${c.rut_paciente}-${calcularDv(c.rut_paciente)}`,
      "Nombre Paciente": c.nombre_completo,
      "Sector": c.sector,
      "Teléfono": c.telefono || "—",
      "Categoría ECICEP": c.categoria || "S/E",
      "Origen del Caso": c.tipo === "POST_HOSPITALIZADO" ? "Post-Alta Hospitalaria" : c.tipo === "POLICONSULTANTE" ? "Policonsultante" : "Derivación Clínica",
      "Fecha Alta Hosp.": c.fecha_alta ? formatDate(c.fecha_alta) : "—",
      "Diagnóstico Alta": c.diagnostico_alta || "—",
      "Estamento Requerido": c.estamento_solicitado || "—",
      "Estado": c.estado === "PENDIENTE_ASIGNACION" ? "Sin Gestor" : c.estado === "EN_SEGUIMIENTO" ? "En Seguimiento" : "Cerrado",
      "Gestor Asignado": c.gestor_asignado_nombre || "Sin Asignar",
      "Fecha Asignación": c.fecha_asignacion ? formatDate(c.fecha_asignacion) : "—",
      "Fecha Cierre": c.fecha_cierre ? formatDate(c.fecha_cierre) : "—",
      "Motivo Cierre": c.motivo_cierre || "—",
      "Fecha Registro": c.fecha_registro ? formatDate(c.fecha_registro) : "—",
      "Observaciones": c.observaciones || "—"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gestión de Casos");
    XLSX.writeFile(wb, `GIA_Gestion_Casos_${filterEstadoCaso}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exportados ${rows.length} casos exitosamente.`);
  };

  // Asignar a un profesional específico
  const handleConfirmarAsignacion = async () => {
    if (!modalAsignar.casoId || !asignarSelectedRut) {
      toast.error("Selecciona un profesional.");
      return;
    }
    setAsignarSaving(true);
    const res = await asignarGestorCaso(modalAsignar.casoId, asignarSelectedRut);
    setAsignarSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Gestor asignado exitosamente.");
      setModalAsignar({ show: false, casoId: null, pacienteNombre: "" });
      setAsignarSelectedRut("");
      setAsignarSearchQuery("");
      await cargarCasos();
    }
  };

  // Cerrar caso con tipificación
  const handleConfirmarCierre = async () => {
    if (!modalCerrar.casoId) return;
    setCerrarSaving(true);
    const res = await cerrarCaso(modalCerrar.casoId, cerrarMotivo);
    setCerrarSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Caso cerrado exitosamente.");
      setModalCerrar({ show: false, casoId: null, pacienteNombre: "" });
      await cargarCasos();
    }
  };

  // Cálculo de horas desde el alta para el semáforo (Post-Hospitalizados)
  const calcularHorasDesdeAlta = (fechaAlta: string | null): number | null => {
    if (!fechaAlta) return null;
    const alta = new Date(fechaAlta + "T00:00:00");
    const ahora = new Date();
    return Math.floor((ahora.getTime() - alta.getTime()) / (1000 * 60 * 60));
  };

  const getSemaforoConfig = (horas: number | null) => {
    if (horas === null) return { color: "bg-slate-100 text-slate-500 border-slate-200", label: "Sin fecha", dot: "bg-slate-400" };
    if (horas > 72) return { color: "bg-red-50 text-red-700 border-red-200", label: `${horas}h`, dot: "bg-red-500 animate-pulse" };
    if (horas > 48) return { color: "bg-orange-50 text-orange-700 border-orange-200", label: `${horas}h`, dot: "bg-orange-400" };
    return { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: `${horas}h`, dot: "bg-emerald-500" };
  };

  // Cálculo de tiempo en gestión (reloj longitudinal de 6 meses)
  const calcularTiempoEnGestion = (fechaRegistro: string) => {
    if (!fechaRegistro) return { label: "—", subtext: "", meses: 0, esAlerta: false, className: "text-slate-400" };
    const reg = new Date(fechaRegistro);
    const ahora = new Date();
    const diffDias = Math.max(0, Math.floor((ahora.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24)));
    const meses = Math.floor(diffDias / 30.44);

    if (meses >= 6) {
      return {
        label: `🚨 Mes ${meses + 1} (>6m)`,
        subtext: `${diffDias} días`,
        meses,
        esAlerta: true,
        className: "bg-red-50 text-red-700 border-red-200 font-black"
      };
    } else if (meses === 0) {
      return {
        label: `Mes 1 de 6`,
        subtext: `${diffDias} días`,
        meses: 0,
        esAlerta: false,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
      };
    } else {
      return {
        label: `Mes ${meses + 1} de 6`,
        subtext: `${diffDias} días`,
        meses,
        esAlerta: meses >= 4,
        className: meses >= 4 
          ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
          : "bg-blue-50 text-blue-700 border-blue-200 font-bold"
      };
    }
  };



  const patientAge = useMemo(() => {
    if (!selectedPatient || !selectedPatient.fecha_nacimiento) return null;
    const bd = new Date(selectedPatient.fecha_nacimiento);
    const today = new Date();
    let a = today.getFullYear() - bd.getUTCFullYear();
    if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
    return a;
  }, [selectedPatient]);


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
    setProfesionalRut(user.rut || "");
    setObservaciones(selectedPatient.observaciones || "");
    const dataClinica = getParsedDataClinica(selectedPatient.data_clinica);
    setSeguimientoTelefonico(dataClinica?.seguimiento_telefonico || false);
    setEstamentoSeguimiento(dataClinica?.estamento_seguimiento || "");
    setGestionCaso(dataClinica?.gestion_caso || false);
    setEstamentoGestion(dataClinica?.estamento_gestion || "");

    setFechaIngreso(dataClinica?.fecha_ingreso || selectedPatient.ultima_atencion || new Date().toISOString().slice(0, 10));
    
    // Cargar plan dinámico de atenciones
    const plan = dataClinica?.plan || [];
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
      data_clinica: { 
        plan: planAtenciones, 
        seguimiento_telefonico: seguimientoTelefonico,
        estamento_seguimiento: seguimientoTelefonico ? estamentoSeguimiento : "",
        gestion_caso: gestionCaso,
        estamento_gestion: gestionCaso ? estamentoGestion : "",
        fecha_ingreso: fechaIngreso 
      }
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

  const handleSaveExamsModal = async () => {
    if (!window.confirm("¿Estás seguro de guardar estos cambios? Los exámenes desmarcados se registrarán como realizados y desaparecerán de las órdenes pendientes.")) {
      return;
    }
    
    try {
      const payload: EcicepSubmission = {
        rut_paciente: examsModalPatient.rut,
        fecha_atencion: examsModalPatient.ultima_atencion,
        categoria: examsModalPatient.categoria || "G1",
        diagnosticos: examsModalPatient.diagnosticos || [],
        polifarmacia: examsModalPatient.polifarmacia || false,
        funcionalidad: examsModalPatient.funcionalidad || "No aplica (Menor de 65 años)",
        deterioro_cognitivo: examsModalPatient.deterioro_cognitivo || false,
        riesgo_social: examsModalPatient.riesgo_social || false,
        hospitalizacion_reciente: examsModalPatient.hospitalizacion_reciente || false,
        consultas_urgencia: examsModalPatient.consultas_urgencia || 0,
        gestor_rut: examsModalPatient.gestor_rut || undefined,
        profesional_rut: user.rut,
        observaciones: examsModalPatient.observaciones || undefined,
        cita_medico: examsModalPatient.cita_medico || undefined,
        cita_enfermero: examsModalPatient.cita_enfermero || undefined,
        cita_nutri: examsModalPatient.cita_nutri || undefined,
        cita_kine: examsModalPatient.cita_kine || undefined,
        data_clinica: {
          ...getParsedDataClinica(examsModalPatient.data_clinica),
          plan: examsModalPlan
        }
      };

      const res = await saveEcicepRecord(payload);
      if (res.success) {
        toast.success("Órdenes actualizadas correctamente");
        setShowExamsModal(false);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error("Error al actualizar órdenes");
      }
    } catch (e) {
      toast.error("Error de sistema al actualizar órdenes");
    }
  };

  const addPlanRow = () => {
    setPlanAtenciones([...planAtenciones, { 
      rol: "Médico", 
      mes: new Date().getMonth() + 1, 
      ano: new Date().getFullYear(),
      laboratorio: false,
      ecg: false,
      espirometria: false,
      fondoOjo: false,
      perfilPA: false,
      otros: false,
      otrosTexto: ""
    }]);
  };

  const removePlanRow = (idx: number) => {
    setPlanAtenciones(planAtenciones.filter((_, i) => i !== idx));
  };

  const updatePlanRow = (idx: number, field: string, value: any) => {
    const updated = [...planAtenciones];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'otros' && !value) updated[idx].otrosTexto = "";
    setPlanAtenciones(updated);
  };

  const sectors = useMemo(() => {
    const s = new Set(data.map(p => p.sector).filter(sec => sec && sec.toUpperCase() !== "SECTOR GENERAL"));
    return ["Todos", ...Array.from(s)].sort();
  }, [data]);

  const hasPlanRegistrado = (p: any) => {
    const dc = getParsedDataClinica(p.data_clinica);
    const plan = dc?.plan || [];
    if (plan.length > 0) return true;
    if (p.cita_medico || p.cita_enfermero || p.cita_nutri || p.cita_kine) return true;
    return false;
  };

  const isCronicoSinPlan = (p: any) => {
    const cat = p.categoria;
    if (!cat || cat === "G0" || cat === "PENDIENTE") return false;
    return !hasPlanRegistrado(p);
  };

  const hasBrecha = (p: any) => {
    if (p.categoria === "G0") return false; // G0 es población sana/promocional, no tiene brechas crónicas
    return ROLES_DISPONIBLES.some(rol => {
      const status = getCitaDisplayStatus(p, rol);
      return status.isExpired;
    });
  };

  const hasOrdenes = (p: any) => {
    const dc = getParsedDataClinica(p.data_clinica);
    const plan = dc?.plan || [];
    return plan.some((c: any) => c.laboratorio || c.ecg || c.espirometria || c.fondoOjo || c.perfilGlicemia || c.perfilPA || c.otros);
  };

  const counts = useMemo(() => {
    let brechas = 0;
    let ordenes = 0;
    let seguimiento = 0;
    let sinPlan = 0;
    data.forEach(p => {
      if (hasBrecha(p)) brechas++;
      if (hasOrdenes(p)) ordenes++;
      if (isCronicoSinPlan(p)) sinPlan++;
      const dc = getParsedDataClinica(p.data_clinica);
      if (dc?.seguimiento_telefonico) seguimiento++;
    });
    return { brechas, ordenes, seguimiento, sinPlan };
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter(p => {
      const qRut = searchRut.replace(/[-.]/g, "").toLowerCase();
      const matchRut = p.rut.toLowerCase().includes(qRut) || p.nombre_completo.toLowerCase().includes(searchRut.toLowerCase());
      const matchSector = filterSector === "Todos" || p.sector === filterSector;
      const statusObj = getEcicepStatus(p.ultima_atencion);
      const matchStatus = filterStatus === "Todos" || statusObj.status === filterStatus;
      
      const cat = p.categoria || "PENDIENTE";
      const matchCategory = filterCategory === "Todos" || cat === filterCategory;
      
      const dataClinica = getParsedDataClinica(p.data_clinica);
      const matchSeguimiento = filterSeguimientoEstamento === "Todos" ? true :
        (filterSeguimientoEstamento === "Solo con Seguimiento" ? !!dataClinica?.seguimiento_telefonico :
        (!!dataClinica?.seguimiento_telefonico && dataClinica?.estamento_seguimiento === filterSeguimientoEstamento));
      const matchBrecha = !onlyBrecha || hasBrecha(p);
      const matchOrdenes = !onlyOrdenes || hasOrdenes(p);
      const matchSinPlan = !onlySinPlan || isCronicoSinPlan(p);
      
      const matchPendienteEstamento = filterPendienteEstamento === "Todos" || (() => {
        const status = getCitaDisplayStatus(p, filterPendienteEstamento);
        return status.isExpired;
      })();
      
      return matchRut && matchSector && matchStatus && matchCategory && matchSeguimiento && matchBrecha && matchOrdenes && matchSinPlan && matchPendienteEstamento;
    });
  }, [data, searchRut, filterSector, filterStatus, filterCategory, filterSeguimientoEstamento, onlyBrecha, onlyOrdenes, onlySinPlan, filterPendienteEstamento]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchRut, filterSector, filterStatus, filterCategory, filterSeguimientoEstamento, onlyBrecha, onlyOrdenes, onlySinPlan, filterPendienteEstamento]);

  const casosFiltrados = useMemo(() => {
    return casos.filter(c => {
      if (filterTipoCaso !== 'Todos' && c.tipo !== filterTipoCaso) return false;
      if (filterEstadoCaso === "ACTIVOS") {
        if (c.estado === 'CERRADO') return false;
      } else if (c.estado !== filterEstadoCaso) {
        return false;
      }
      if (filterSectorGestion !== 'Todos' && c.sector !== filterSectorGestion) return false;
      if (filterSoloMisCasos) {
        const userCleanRut = user?.rut ? user.rut.replace(/[^0-9kK]/g, "").toLowerCase() : "";
        const casoCleanRut = c.gestor_asignado_rut ? c.gestor_asignado_rut.replace(/[^0-9kK]/g, "").toLowerCase() : "";
        if (!userCleanRut || userCleanRut !== casoCleanRut) return false;
      }
      if (searchGestion.trim()) {
        const q = searchGestion.toLowerCase().trim();
        const rutClean = c.rut_paciente ? c.rut_paciente.toLowerCase() : "";
        const nomClean = c.nombre_completo ? c.nombre_completo.toLowerCase() : "";
        if (!rutClean.includes(q) && !nomClean.includes(q)) return false;
      }
      return true;
    });
  }, [casos, filterTipoCaso, filterEstadoCaso, filterSectorGestion, filterSoloMisCasos, searchGestion, user]);

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
      const dataClinica = getParsedDataClinica(p.data_clinica);
      if (dataClinica?.seguimiento_telefonico) totalSeguimiento++;
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

  // ─── Funciones de Exportación Excel ──────────────────────────────────────────

  const mapPacienteToExcelRow = (p: any) => {
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
      "Sexo": p.sexo || "SIN REGISTRO",
      "Sector": p.sector,
      "Teléfono": p.telefono,
      "Fecha Última Estratificación": formatDate(p.ultima_atencion),
      "Fecha Ingreso ECICEP": formatDate(getParsedDataClinica(p.data_clinica)?.fecha_ingreso || p.ultima_atencion),
      "Categoría ECICEP": p.categoria || "PENDIENTE",
      "Seguimiento Telefónico": getParsedDataClinica(p.data_clinica)?.seguimiento_telefonico ? "SI" : "NO",
      "Profesional Seguimiento": getParsedDataClinica(p.data_clinica)?.estamento_seguimiento || "-",
      "Gestión de Caso": getParsedDataClinica(p.data_clinica)?.gestion_caso ? "SI" : "NO",
      "Profesional Gestión de Caso": getParsedDataClinica(p.data_clinica)?.estamento_gestion || "-",
      "Diagnósticos Crónicos": p.diagnosticos ? p.diagnosticos.join(", ") : "-",
      "Profesional Evaluador": p.profesional_nombre || "-",
      "Gestor Asignado": p.gestor_nombre || "-",
      "Observaciones": p.observaciones || "-"
    };
  };

  const exportPadronCompleto = () => {
    const dataset = data.map(mapPacienteToExcelRow);
    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Padron_Completo");
    XLSX.writeFile(workbook, `Padron_Completo_ECICEP_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Padrón completo exportado (${data.length} pacientes)`);
  };

  const exportVistaFiltrada = () => {
    if (filtered.length === 0) {
      toast.error("No hay pacientes en la vista filtrada.");
      return;
    }
    const dataset = filtered.map(mapPacienteToExcelRow);
    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vista_Filtrada");
    XLSX.writeFile(workbook, `Vista_Filtrada_ECICEP_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Vista filtrada exportada (${filtered.length} pacientes)`);
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
        "Sexo": p.sexo || "SIN REGISTRO",
        "Sector": p.sector || "SIN SECTOR",
        "Teléfono": p.telefono || "-",
        "Profesional Evaluador": p.profesional_nombre || "-",
        "Seguimiento Telefónico": getParsedDataClinica(p.data_clinica)?.seguimiento_telefonico ? "SI" : "NO",
        "Profesional Seguimiento": getParsedDataClinica(p.data_clinica)?.estamento_seguimiento || "-",
        "Gestión de Caso": getParsedDataClinica(p.data_clinica)?.gestion_caso ? "SI" : "NO",
        "Profesional Gestión de Caso": getParsedDataClinica(p.data_clinica)?.estamento_gestion || "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataset);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Campana_Rescate_ECICEP");
    XLSX.writeFile(workbook, `Campana_Rescate_ECICEP_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Campaña de rescate exportada (${vencidosOPendientes.length} pacientes)`);
  };

  const totalPacientes = data.length;
  const statusCounts = {
    vigentes: stats.totalVigentes,
    pendientes: data.filter(p => getEcicepStatus(p.ultima_atencion).status === "Pendiente").length,
    vencidos: data.filter(p => getEcicepStatus(p.ultima_atencion).status === "Vencido").length,
    proximos: data.filter(p => getEcicepStatus(p.ultima_atencion).status === "Próximo a Vencer").length,
  };
  const cobPorcentaje = totalPacientes > 0 ? ((statusCounts.vigentes / totalPacientes) * 100).toFixed(1) : "0.0";

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

      {/* Selector de Vista y Herramientas */}
      <div className="px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Pestañas Operativas Clínicas */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            type="button"
            onClick={() => setView('lista')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${view === 'lista' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Listado de Pacientes
          </button>
          <button 
            type="button"
            onClick={() => setView('gestion')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'gestion' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Briefcase size={14} />
            <span>Gestión de Casos</span>
            {casos.filter(c => c.tipo === 'POST_HOSPITALIZADO').length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {casos.filter(c => c.tipo === 'POST_HOSPITALIZADO').length}
              </span>
            )}
          </button>
        </div>

        {/* Acciones y Herramientas */}
        <div className="flex items-center space-x-2">
          {/* Botón Separado: Análisis Estadístico */}
          <button 
            type="button"
            onClick={() => setView(view === 'analisis' ? 'lista' : 'analisis')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
              view === 'analisis' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={14} />
            <span>{view === 'analisis' ? "← Volver al Listado" : "Análisis Estadístico"}</span>
          </button>

          {/* En vista Gestión de Casos: Botón Ingresar Caso */}
          {view === 'gestion' && (
            <button
              type="button"
              onClick={() => { resetCasoModal(); setShowIngresarCasoModal(true); }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-bold text-xs"
            >
              <Plus size={15} />
              <span>Ingresar Caso</span>
            </button>
          )}

          {/* Menú Dropdown de Exportación (disponible en lista y análisis) */}
          {view !== 'gestion' && (
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm text-xs"
              >
                <Download size={14} className="text-slate-500" />
                <span>Exportar</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showExportDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowExportDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1 divide-y divide-slate-100">
                    <button 
                      type="button"
                      onClick={() => {
                        exportVistaFiltrada();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-900 transition flex items-center gap-2.5"
                    >
                      <Filter size={14} className="text-indigo-600 shrink-0" />
                      <div>
                        <p className="leading-tight">Vista Filtrada Actual</p>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">{filtered.length.toLocaleString('es-CL')} pacientes seleccionados</p>
                      </div>
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        exportCampanaExcel();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50/70 hover:text-amber-900 transition flex items-center gap-2.5"
                    >
                      <Target size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="leading-tight">Campaña de Rescate</p>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Vencidos y pendientes</p>
                      </div>
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        exportPadronCompleto();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-900 transition flex items-center gap-2.5"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="leading-tight">Padrón Completo ECICEP</p>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">{data.length.toLocaleString('es-CL')} pacientes totales</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>



      {view === 'gestion' ? (
        /* ───── VISTA GESTIÓN DE CASOS (DESATURADA & MINIMALISTA) ───── */
        <div className="px-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

          {/* Alerta de Casos Críticos Post-Alta (>48h sin gestor) */}
          {(() => {
            const postHosp = casos.filter(c => c.tipo === 'POST_HOSPITALIZADO');
            const criticos = postHosp.filter(c => { const h = calcularHorasDesdeAlta(c.fecha_alta); return h !== null && h > 48 && c.estado === 'PENDIENTE_ASIGNACION'; });
            if (criticos.length === 0) return null;
            return (
              <div className="mb-3 flex items-center justify-between bg-red-50/90 border border-red-200/80 px-4 py-2 rounded-xl text-xs text-red-800 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                  <span className="font-medium">
                    Hay <strong>{criticos.length} caso{criticos.length > 1 ? 's' : ''} post-alta</strong> con más de 48 horas sin gestor asignado.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setFilterTipoCaso('POST_HOSPITALIZADO'); setFilterEstadoCaso('PENDIENTE_ASIGNACION'); }}
                  className="font-bold text-red-700 hover:text-red-900 underline text-xs ml-3"
                >
                  Filtrar casos críticos &rarr;
                </button>
              </div>
            );
          })()}

          {/* Barra de Filtros Espaciosa y Funcional */}
          {(() => {
            const pendientesCount = casos.filter(c => c.estado === 'PENDIENTE_ASIGNACION').length;
            const enSeguimientoCount = casos.filter(c => c.estado === 'EN_SEGUIMIENTO').length;
            const cerradosCount = casos.filter(c => c.estado === 'CERRADO').length;
            const activosCount = pendientesCount + enSeguimientoCount;

            return (
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                
                {/* Lado izquierdo: Buscador y Segmentado de Estado */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
                  {/* Buscador */}
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={searchGestion}
                      onChange={e => setSearchGestion(e.target.value)}
                      placeholder="Buscar por RUT o Nombre..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    {searchGestion && (
                      <button 
                        type="button"
                        onClick={() => setSearchGestion("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Segmented Control con conteos integrados */}
                  <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setFilterEstadoCaso("ACTIVOS")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        filterEstadoCaso === "ACTIVOS"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>Activos</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        filterEstadoCaso === "ACTIVOS" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/80 text-slate-600"
                      }`}>
                        {activosCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterEstadoCaso("PENDIENTE_ASIGNACION")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        filterEstadoCaso === "PENDIENTE_ASIGNACION"
                          ? "bg-white text-amber-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Sin Gestor</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        filterEstadoCaso === "PENDIENTE_ASIGNACION" ? "bg-amber-100 text-amber-800" : "bg-slate-200/80 text-slate-600"
                      }`}>
                        {pendientesCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterEstadoCaso("EN_SEGUIMIENTO")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        filterEstadoCaso === "EN_SEGUIMIENTO"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>En Seguimiento</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        filterEstadoCaso === "EN_SEGUIMIENTO" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200/80 text-slate-600"
                      }`}>
                        {enSeguimientoCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterEstadoCaso("CERRADO")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        filterEstadoCaso === "CERRADO"
                          ? "bg-white text-slate-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>Cerrados</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        filterEstadoCaso === "CERRADO" ? "bg-slate-200 text-slate-800" : "bg-slate-200/80 text-slate-600"
                      }`}>
                        {cerradosCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Lado derecho: Selects, Mis Casos, Exportar y Refrescar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={filterTipoCaso}
                    onChange={e => setFilterTipoCaso(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Todos">Todos los Orígenes</option>
                    <option value="POST_HOSPITALIZADO">🏥 Post-Alta</option>
                    <option value="POLICONSULTANTE">🔄 Policonsult.</option>
                    <option value="DERIVACION_CLINICA">📋 Derivación</option>
                  </select>

                  <select
                    value={filterSectorGestion}
                    onChange={e => setFilterSectorGestion(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {sectors.map(sec => (
                      <option key={sec} value={sec}>
                        {sec === "Todos" ? "Todo Sector" : sec}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setFilterSoloMisCasos(!filterSoloMisCasos)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                      filterSoloMisCasos 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                    title="Filtrar solo los casos asignados a mí"
                  >
                    👤 Mis Casos
                  </button>


                  <button
                    type="button"
                    onClick={cargarCasos}
                    disabled={loadingCasos}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl bg-white transition shrink-0"
                    title="Actualizar casos"
                  >
                    <RefreshCw size={14} className={loadingCasos ? 'animate-spin text-indigo-600' : ''} />
                  </button>
                </div>

              </div>
            );
          })()}

          {/* Tabla de Casos Desaturada y Elegante */}
          {loadingCasos ? (
            <div className="flex justify-center items-center py-16 text-slate-400 text-sm">Cargando casos...</div>
          ) : casosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white">
              <Briefcase size={28} className="mb-2 opacity-30" />
              <p className="text-xs font-bold text-slate-600">No se encontraron casos con los filtros seleccionados.</p>
              {(searchGestion || filterTipoCaso !== 'Todos' || filterEstadoCaso !== 'ACTIVOS' || filterSectorGestion !== 'Todos' || filterSoloMisCasos) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchGestion("");
                    setFilterTipoCaso("Todos");
                    setFilterEstadoCaso("ACTIVOS");
                    setFilterSectorGestion("Todos");
                    setFilterSoloMisCasos(false);
                  }}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 w-[28%]">Paciente</th>
                    <th className="px-4 py-3.5">Origen</th>
                    <th className="px-4 py-3.5">Gestor Asignado</th>
                    <th className="px-4 py-3.5 text-center">Tiempo / Urgencia</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {casosFiltrados.map(caso => {
                    const horas = caso.tipo === 'POST_HOSPITALIZADO' ? calcularHorasDesdeAlta(caso.fecha_alta) : null;
                    const semaforo = getSemaforoConfig(horas);
                    const tiempo = calcularTiempoEnGestion(caso.fecha_registro);
                    const isSinGestor = caso.estado === 'PENDIENTE_ASIGNACION';

                    return (
                      <tr key={caso.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* 1. Paciente */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-800 uppercase text-xs tracking-tight">
                              {caso.nombre_completo}
                            </p>
                            {caso.categoria ? (
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-black rounded border font-mono leading-none ${
                                  caso.categoria === 'G3'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : caso.categoria === 'G2'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : caso.categoria === 'G1'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                                title={`Estratificación ECICEP: ${caso.categoria}`}
                              >
                                {caso.categoria}
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded leading-none"
                                title="Sin Estratificar ECICEP"
                              >
                                S/E
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                            <CopyBadge 
                              value={caso.dv ? `${caso.rut_paciente}-${caso.dv}` : `${caso.rut_paciente}-${calcularDv(caso.rut_paciente)}`} 
                              label="RUT" 
                            />
                            <span className="text-slate-300 font-sans">·</span>
                            <span className="font-sans font-medium text-slate-600">{caso.sector}</span>
                            {caso.telefono && (
                              <>
                                <span className="text-slate-300 font-sans">·</span>
                                <span className="text-slate-600">📞 {caso.telefono}</span>
                              </>
                            )}
                          </div>
                          {caso.diagnostico_alta && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[260px]" title={caso.diagnostico_alta}>
                              {caso.diagnostico_alta}
                            </p>
                          )}
                        </td>

                        {/* 2. Origen */}
                        <td className="px-4 py-3.5">
                          {caso.tipo === 'POST_HOSPITALIZADO' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                              <Hospital size={11} /> Post-Alta
                            </span>
                          ) : caso.tipo === 'POLICONSULTANTE' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                              <RefreshCw size={11} /> Policonsult.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                              <ClipboardCheck size={11} /> Derivación
                            </span>
                          )}
                        </td>

                        {/* 3. Gestor Asignado */}
                        <td className="px-4 py-3.5">
                          {caso.estado === 'CERRADO' ? (
                            <div>
                              <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <User size={12} className="text-slate-400" />
                                {caso.gestor_asignado_nombre || "Sin gestor asignado"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Cerrado: {caso.fecha_cierre ? formatDate(caso.fecha_cierre) : "—"}
                              </p>
                            </div>
                          ) : isSinGestor ? (
                            (() => {
                              const estamentoValido = caso.estamento_solicitado && 
                                caso.estamento_solicitado.toUpperCase() !== 'SIN ASIGNAR' && 
                                caso.estamento_solicitado.trim() !== '';

                              return (
                                <div className="space-y-1">
                                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                    <span className="text-slate-400">⏳</span> Sin Asignar
                                  </span>
                                  {estamentoValido && (
                                    <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                                      Perfil: {caso.estamento_solicitado}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                <User size={12} className="text-indigo-600" />
                                {caso.gestor_asignado_nombre}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {caso.estamento_solicitado && caso.estamento_solicitado.toUpperCase() !== 'SIN ASIGNAR' ? `${caso.estamento_solicitado} · ` : ''}
                                {caso.fecha_asignacion ? new Date(caso.fecha_asignacion).toLocaleDateString('es-CL') : ''}
                              </p>
                            </div>
                          )}
                        </td>

                        {/* 4. Tiempo / Urgencia */}
                        <td className="px-4 py-3.5 text-center">
                          {caso.estado === 'CERRADO' ? (
                            <span className="text-xs font-medium text-slate-500">
                              Finalizado
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              {caso.tipo === 'POST_HOSPITALIZADO' && isSinGestor ? (
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${semaforo.color}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${semaforo.dot}`} />
                                  Post-Alta: {semaforo.label}
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-slate-700">
                                  {tiempo.subtext || tiempo.label}
                                </span>
                              )}
                              {tiempo.esAlerta && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                  &gt;6 meses
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Estado */}
                        <td className="px-4 py-3.5">
                          {caso.estado === 'CERRADO' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Cerrado
                            </span>
                          ) : isSinGestor ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Sin Gestor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              En Seguimiento
                            </span>
                          )}
                        </td>

                        {/* 6. Acciones */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {caso.estado === 'CERRADO' ? (
                              <span 
                                className="inline-block text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg"
                                title={caso.motivo_cierre || "Caso finalizado"}
                              >
                                {(() => {
                                  switch (caso.motivo_cierre) {
                                    case "OBJETIVO_CUMPLIDO": return "✅ Objetivo Cumplido";
                                    case "ALTA_MEDICA": return "🏥 Alta Médica";
                                    case "INUBICABLE": return "📞 Inubicable";
                                    case "RECHAZA": return "🚫 Rechazo";
                                    case "TRASLADO_FALLECIDO": return "🕊️ Traslado / Defunción";
                                    default: return caso.motivo_cierre ? caso.motivo_cierre.replace(/_/g, " ") : "Finalizado";
                                  }
                                })()}
                              </span>
                            ) : isSinGestor ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setModalAnular({
                                    show: true,
                                    casoId: caso.id,
                                    pacienteNombre: caso.nombre_completo,
                                    tipo: caso.tipo
                                  })}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Anular derivación"
                                >
                                  <Trash2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalTomar({
                                    show: true,
                                    casoId: caso.id,
                                    pacienteNombre: caso.nombre_completo,
                                    sector: caso.sector,
                                    estamento: caso.estamento_solicitado || ""
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
                                  title="Tomar caso a mi nombre"
                                >
                                  <UserCheck size={13} className="shrink-0" />
                                  <span>Tomar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalAsignar({
                                      show: true,
                                      casoId: caso.id,
                                      pacienteNombre: caso.nombre_completo,
                                      estamentoSugerido: caso.estamento_solicitado || undefined,
                                      categoria: caso.categoria || null
                                    });
                                    setAsignarSelectedRut("");
                                    setAsignarSearchQuery("");
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                                >
                                  Asignar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalAsignar({
                                      show: true,
                                      casoId: caso.id,
                                      pacienteNombre: caso.nombre_completo,
                                      estamentoSugerido: caso.estamento_solicitado || undefined,
                                      categoria: caso.categoria || null
                                    });
                                    setAsignarSelectedRut(caso.gestor_asignado_rut || "");
                                    setAsignarSearchQuery("");
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                >
                                  Reasignar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalCerrar({
                                      show: true,
                                      casoId: caso.id,
                                      pacienteNombre: caso.nombre_completo
                                    });
                                    setCerrarMotivo("OBJETIVO_CUMPLIDO");
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg border border-slate-200 transition"
                                >
                                  Cerrar
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : view === 'lista' ? (
        <>

          {/* ─── FILTROS PRINCIPALES (1 Fila Limpia) ───────────────────────── */}
          <div className="px-6 grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            {/* Buscador Universal (RUT o Nombre) */}
            <div className="md:col-span-6 lg:col-span-5">
              <label className="flex items-center text-xs font-bold text-slate-600 mb-1">
                <Search size={13} className="mr-1.5 text-slate-400" /> Buscar Paciente por RUT o Nombre
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchRut} 
                  onChange={e => setSearchRut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition" 
                  placeholder="Ej: 12345678 o Juan Pérez..."
                />
                {searchRut && (
                  <button 
                    onClick={() => setSearchRut("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filtro Sector */}
            <div className="md:col-span-3 lg:col-span-3">
              <label className="flex items-center text-xs font-bold text-slate-600 mb-1">
                <MapPin size={13} className="mr-1.5 text-slate-400" /> Sector Territorial
              </label>
              <select 
                value={filterSector} 
                onChange={e => setFilterSector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium transition"
              >
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Filtro Categoría */}
            <div className="md:col-span-3 lg:col-span-4">
              <label className="flex items-center text-xs font-bold text-slate-600 mb-1">
                <ClipboardCheck size={13} className="mr-1.5 text-slate-400" /> Categoría ECICEP
              </label>
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium transition"
              >
                <option value="Todos">Todas las categorías</option>
                <option value="G0">G0 - Sin Riesgo / Bajo</option>
                <option value="G1">G1 - Riesgo Bajo</option>
                <option value="G2">G2 - Riesgo Moderado</option>
                <option value="G3">G3 - Riesgo Alto / Complejo</option>
                <option value="PENDIENTE">Sin Estratificar</option>
              </select>
            </div>
          </div>

          {/* ─── BARRA TÁCTICA DE ACCESO RÁPIDO (Píldoras y Conteo) ────────── */}
          <div className="px-6 py-2.5 bg-slate-50/60 border-y border-slate-200/70 flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filtros Tácticos:</span>
              
              {/* Píldora: Citas Vencidas */}
              <button
                type="button"
                onClick={() => setOnlyBrecha(!onlyBrecha)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  onlyBrecha 
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>🚨</span>
                <span>Citas Vencidas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${onlyBrecha ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts.brechas}
                </span>
              </button>

              {/* Píldora: Órdenes Pendientes */}
              <button
                type="button"
                onClick={() => setOnlyOrdenes(!onlyOrdenes)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  onlyOrdenes 
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>⚠️</span>
                <span>Órdenes Pendientes</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${onlyOrdenes ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts.ordenes}
                </span>
              </button>

              {/* Píldora: Sin Plan Anual (G1, G2, G3 sin controles) */}
              <button
                type="button"
                onClick={() => setOnlySinPlan(!onlySinPlan)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  onlySinPlan 
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>📋</span>
                <span>Sin Plan Anual</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${onlySinPlan ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts.sinPlan}
                </span>
              </button>

              {/* Píldora: Seguimiento Activo */}
              <button
                type="button"
                onClick={() => setFilterSeguimientoEstamento(filterSeguimientoEstamento === "Solo con Seguimiento" ? "Todos" : "Solo con Seguimiento")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterSeguimientoEstamento === "Solo con Seguimiento" 
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>📞</span>
                <span>En Seguimiento</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${filterSeguimientoEstamento === "Solo con Seguimiento" ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts.seguimiento}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Filtro compacto por estamento */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-[11px]">Vencidos por:</span>
                <select 
                  value={filterPendienteEstamento} 
                  onChange={e => setFilterPendienteEstamento(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Todos">Todos los estamentos</option>
                  {ROLES_DISPONIBLES.map(rol => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>

              {/* Contador de resultados */}
              <span className="text-xs font-bold text-slate-500 border-l border-slate-200 pl-3">
                {filtered.length} pac.
              </span>
            </div>
          </div>

          {/* ─── TABLA DE OPERACIONES (4 Columnas) ─────────────────────────── */}
          <div className="px-6 pb-6 w-full overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap text-slate-600">
              <thead className="bg-slate-50/80 border-y border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-[34%]">Paciente & Territorio</th>
                  <th className="px-4 py-3.5 w-[14%]">Riesgo ECICEP</th>
                  <th className="px-4 py-3.5 w-[32%]">Plan de Cuidado Anual</th>
                  <th className="px-4 py-3.5 w-[20%] text-right pr-6">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((p, i) => {
                  let age = "-";
                  if (p.fecha_nacimiento) {
                     const bd = new Date(p.fecha_nacimiento);
                     const today = new Date();
                     let a = today.getFullYear() - bd.getUTCFullYear();
                     if (today.getMonth() < bd.getUTCMonth() || (today.getMonth() === bd.getUTCMonth() && today.getDate() < bd.getUTCDate())) a--;
                     age = a.toString();
                  }

                  const stObj = getEcicepStatus(p.ultima_atencion);
                  const dc = getParsedDataClinica(p.data_clinica);
                  const plan = dc?.plan || [];

                  // Brechas de citas por estamentos
                  const brechasRoles = ROLES_DISPONIBLES.filter(rol => getCitaDisplayStatus(p, rol).isExpired);
                  
                  // Conteo de órdenes de exámenes
                  let ordersCount = 0;
                  plan.forEach((c: any) => {
                    if (c.laboratorio) ordersCount++;
                    if (c.ecg) ordersCount++;
                    if (c.espirometria) ordersCount++;
                    if (c.fondoOjo) ordersCount++;
                    if (c.perfilGlicemia) ordersCount++;
                    if (c.perfilPA) ordersCount++;
                    if (c.otros) ordersCount++;
                  });

                  const isG3 = p.categoria === "G3";

                  return (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group font-medium"
                    >
                      {/* 1. Paciente & Territorio */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 uppercase text-xs block text-left group-hover:text-blue-600 transition-colors">
                            {p.nombre_completo}
                          </span>
                          {dc?.seguimiento_telefonico && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold shrink-0" title="En seguimiento telefónico activo">
                              📞 {dc.estamento_seguimiento || "SEGUIMIENTO"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center text-[10px] text-slate-500 gap-x-2 gap-y-0.5 mt-1 font-mono">
                          <CopyBadge value={`${p.rut}-${p.dv}`} label="RUT" />
                          <span className="text-slate-300">•</span>
                          <span className="font-semibold text-slate-600 font-sans">{age} años</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center font-sans font-medium text-slate-600"><MapPin size={10} className="mr-0.5 text-slate-400 shrink-0"/> {p.sector}</span>
                          {p.telefono && (
                            <>
                              <span className="text-slate-300">•</span>
                              <CopyBadge 
                                value={p.telefono} 
                                label="Teléfono" 
                                prefixIcon="📞"
                                className="bg-slate-100 hover:bg-slate-200 px-1 py-0.5 rounded text-slate-600 transition-colors cursor-copy inline-flex items-center text-[9px]" 
                              />
                            </>
                          )}
                        </div>
                      </td>

                      {/* 2. Categoría / Riesgo */}
                      <td className="px-4 py-3.5">
                        {p.categoria ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${
                            isG3 ? 'bg-red-50 text-red-700 border border-red-200' : 
                            p.categoria === 'G2' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                            p.categoria === 'G1' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {p.categoria} • {isG3 ? 'ALTO' : p.categoria === 'G2' ? 'MODERADO' : p.categoria === 'G1' ? 'BAJO' : 'SIN RIESGO'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            PENDIENTE
                          </span>
                        )}
                      </td>

                      {/* 3. Plan de Cuidado Anual (Unificada) */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          {/* Estado de Controles (5 Estados Clínicos APS) */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.categoria === "G0" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md" title="Población sin multimorbilidad crónica. Enfoque promocional/preventivo.">
                                🛡️ No Requiere Plan Crónico
                              </span>
                            ) : !p.categoria || p.categoria === "PENDIENTE" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md italic">
                                ⚪ Sin Estratificar
                              </span>
                            ) : !hasPlanRegistrado(p) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md" title="Paciente estratificado pero aún sin atenciones ni controles programados">
                                ⚠️ Sin Plan Programado
                              </span>
                            ) : brechasRoles.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <AlertTriangle size={10} />
                                  FALTAN {brechasRoles.length}:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {brechasRoles.map(rol => (
                                    <span key={rol} className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                      {rol.substring(0, 4)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <CheckCircle size={10} /> Plan de Controles al Día
                              </span>
                            )}
                          </div>

                          {/* Órdenes Médicas Pendientes */}
                          {ordersCount > 0 && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExamsModalPlan(plan);
                                setExamsModalPatient(p);
                                setShowExamsModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black cursor-pointer transition w-fit"
                              title="Haga clic para ver o resolver las órdenes pendientes"
                            >
                              <span>⚠️</span>
                              <span>{ordersCount} {ordersCount === 1 ? 'Órden Pendiente' : 'Órdenes Pendientes'}</span>
                              <span className="text-[9px] text-amber-600 underline ml-0.5">Ver</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Acciones */}
                      <td className="px-4 py-3.5 text-right pr-6" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDerivarPacienteACaso(p)}
                          className="px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs group/btn whitespace-nowrap"
                          title="Derivar paciente a seguimiento en Gestión de Casos"
                        >
                          <ArrowUpRight size={13} className="text-indigo-500 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                          <span>Derivar a Gestión de Caso</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} pac.
                </span>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
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
                  <div className="mt-0.5">
                    <CopyBadge value={`${selectedPatient.rut}-${selectedPatient.dv}`} label="RUT" />
                  </div>
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
                    <Phone size={14} className="mr-3 text-slate-400" />
                    {selectedPatient.telefono ? (
                      <CopyBadge value={selectedPatient.telefono} label="Teléfono" />
                    ) : (
                      'Sin teléfono registrado'
                    )}
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
                    {(() => {
                         const dataClinica = getParsedDataClinica(selectedPatient.data_clinica);
                         return (
                           <div className="text-[10px] opacity-80 pt-2 border-t border-black/10 flex flex-col space-y-1">
                             <span><strong>Ingresado el:</strong> {formatDate(dataClinica?.fecha_ingreso || selectedPatient.ultima_atencion)}</span>
                             <span><strong>Evaluado el:</strong> {formatDate(selectedPatient.ultima_atencion)}</span>
                             <span className="mt-1">
                               <strong className="text-indigo-800">Gestor de Caso:</strong> {selectedPatient.gestor_nombre || 'Sin Asignar'}
                             </span>
                             <span>
                               <strong>Última actualización por:</strong> {selectedPatient.profesional_nombre || "Clínico Registrador"}
                             </span>
                           </div>
                         );
                       })()}
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
                  const dataClinica = getParsedDataClinica(selectedPatient.data_clinica);
                  const plan = [...(dataClinica?.plan || [])].sort((a: any, b: any) => {
                    return (a.ano * 12 + a.mes) - (b.ano * 12 + b.mes);
                  });
                  if (plan.length > 0) {
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {plan.map((item: any, idx: number) => {
                          const status = getItemDisplayStatus(item);
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

              {/* Órdenes Médicas / Exámenes Pendientes */}
              {(() => {
                const dataClinica = getParsedDataClinica(selectedPatient.data_clinica);
                const plan = dataClinica?.plan || [];
                const pendingOrders: { tipo: string; badge: string; color: string; mesAno: string }[] = [];

                plan.forEach((c: any) => {
                  const mesAno = `${c.mes}/${c.ano}`;
                  if (c.laboratorio) pendingOrders.push({ tipo: "Laboratorio Clínico", badge: "🩸 LAB", color: "bg-red-50 text-red-700 border-red-200", mesAno });
                  if (c.ecg) pendingOrders.push({ tipo: "Electrocardiograma (ECG)", badge: "🫀 ECG", color: "bg-rose-50 text-rose-700 border-rose-200", mesAno });
                  if (c.espirometria) pendingOrders.push({ tipo: "Espirometría", badge: "🫁 ESP", color: "bg-teal-50 text-teal-700 border-teal-200", mesAno });
                  if (c.fondoOjo) pendingOrders.push({ tipo: "Fondo de Ojo", badge: "👁️ FOJO", color: "bg-amber-50 text-amber-700 border-amber-200", mesAno });
                  if (c.perfilGlicemia) pendingOrders.push({ tipo: "Perfil de Glicemia", badge: "🩸 GLICEMIA", color: "bg-purple-50 text-purple-700 border-purple-200", mesAno });
                  if (c.perfilPA) pendingOrders.push({ tipo: "Perfil Presión Arterial", badge: "⚕️ PERFIL PA", color: "bg-indigo-50 text-indigo-700 border-indigo-200", mesAno });
                  if (c.otros) pendingOrders.push({ tipo: c.otrosTexto || "Otros Exámenes", badge: "➕ OTROS", color: "bg-slate-100 text-slate-700 border-slate-200", mesAno });
                });

                if (pendingOrders.length === 0) return null;

                return (
                  <div className="space-y-3 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <span>⚠️</span> Órdenes y Exámenes Pendientes ({pendingOrders.length})
                      </h4>
                      <button
                        onClick={() => {
                          setExamsModalPlan(plan);
                          setExamsModalPatient(selectedPatient);
                          setShowExamsModal(true);
                        }}
                        className="text-[11px] font-bold text-amber-800 bg-amber-200/60 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition"
                      >
                        Gestionar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {pendingOrders.map((ord, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span>{ord.badge}</span>
                            <span>{ord.tipo}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">Prog: {ord.mesAno}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={openFormModal}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <ClipboardCheck size={15} />
                  <span>{selectedPatient.categoria ? "Actualizar Estratificación" : "Registrar Estratificación"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDerivarPacienteACaso(selectedPatient)}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl border border-indigo-200 transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <Briefcase size={15} />
                  <span>Derivar a Caso</span>
                </button>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="w-full bg-white text-slate-500 font-bold py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-xs"
              >
                Cerrar Panel
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
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de la Estratificación Actual</label>
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
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de Ingreso al ECICEP (Histórica)</label>
                  <input 
                    type="date" 
                    required 
                    value={fechaIngreso} 
                    max={new Date().toISOString().slice(0, 10)} 
                    onChange={e => setFechaIngreso(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-emerald-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Profesional que Registra / Modifica</label>
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
              </div>

              {/* Acciones y Derivaciones (Checkboxes) */}
              <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Derivaciones Inmediatas</h4>
                <div className="space-y-4">
                  {/* Seguimiento Telefónico */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        checked={seguimientoTelefonico}
                        onChange={e => {
                          setSeguimientoTelefonico(e.target.checked);
                          setEstamentoSeguimiento(e.target.checked ? "TENS" : "");
                        }}
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide select-none">
                        📞 Requiere Seguimiento Telefónico (TENS)
                      </span>
                    </label>
                  </div>
                  
                  {/* Gestión de Caso */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        checked={gestionCaso}
                        onChange={e => {
                          setGestionCaso(e.target.checked);
                          if (!e.target.checked) setEstamentoGestion("");
                        }}
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide select-none">
                        📋 Requiere Gestión de Caso
                      </span>
                    </label>

                    {gestionCaso && (
                      <div className="mt-3 sm:mt-0 animate-in fade-in slide-in-from-left-4 duration-200">
                        <select
                          required
                          value={estamentoGestion}
                          onChange={e => setEstamentoGestion(e.target.value)}
                          className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        >
                          <option value="">-- Asignar a Estamento --</option>
                          {ROLES_DISPONIBLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
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
                            {ROLES_DISPONIBLES.map(role => (
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
                        
                        {/* Procedimientos y Órdenes para esta cita */}
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Órdenes pendientes para esta cita:</p>
                          <div className="flex flex-wrap gap-2">
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-red-600 rounded border-slate-300" checked={item.laboratorio || false} onChange={e => updatePlanRow(idx, 'laboratorio', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🩸 Lab</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-rose-600 rounded border-slate-300" checked={item.ecg || false} onChange={e => updatePlanRow(idx, 'ecg', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🫀 ECG</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-teal-600 rounded border-slate-300" checked={item.espirometria || false} onChange={e => updatePlanRow(idx, 'espirometria', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🫁 Espiro</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-amber-600 rounded border-slate-300" checked={item.fondoOjo || false} onChange={e => updatePlanRow(idx, 'fondoOjo', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">👁️ F.Ojo</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-indigo-600 rounded border-slate-300" checked={item.perfilPA || false} onChange={e => updatePlanRow(idx, 'perfilPA', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">⚕️ Perfil PA</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-purple-600 rounded border-slate-300" checked={item.perfilGlicemia || false} onChange={e => updatePlanRow(idx, 'perfilGlicemia', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🩸 Glicemia</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-slate-600 rounded border-slate-300" checked={item.otros || false} onChange={e => updatePlanRow(idx, 'otros', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">➕ Otros</span>
                            </label>
                          </div>
                          {item.otros && (
                            <div className="mt-2">
                              <input 
                                type="text" 
                                value={item.otrosTexto || ""}
                                onChange={e => updatePlanRow(idx, 'otrosTexto', e.target.value)}
                                placeholder="Ej: Rx Tórax..."
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-[11px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                required
                              />
                            </div>
                          )}
                        </div>
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

      {/* Modal de Resolución de Órdenes Pendientes */}
      {showExamsModal && examsModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center"><span className="mr-2">📋</span> Resolución de Órdenes</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">{examsModalPatient.nombre_completo} ({examsModalPatient.rut}-{examsModalPatient.dv})</p>
              </div>
              <button onClick={() => setShowExamsModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 bg-white">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs font-medium border border-blue-100 mb-4 flex items-start">
                <span className="mr-2 text-base leading-none">ℹ️</span>
                <p>A continuación se listan las citas que tienen exámenes u órdenes pendientes. <strong>Desmarque las casillas</strong> de aquellos procedimientos que el paciente ya se haya realizado para quitarlos de la lista.</p>
              </div>
              
              <div className="space-y-3">
                {examsModalPlan.map((cita, idx) => {
                  const hasExams = cita.laboratorio || cita.ecg || cita.espirometria || cita.fondoOjo || cita.perfilPA || cita.otros;
                  if (!hasExams) return null;
                  
                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition hover:border-blue-200 hover:shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-black text-sm text-slate-700">Cita con {cita.rol}</span>
                        <span className="text-[10px] font-black tracking-widest bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200 text-slate-500 uppercase">
                          {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][cita.mes - 1]} {cita.ano}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {cita.laboratorio && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 transition">
                             <input type="checkbox" checked={cita.laboratorio} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].laboratorio = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-red-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">🩸 Laboratorio</span>
                           </label>
                         )}
                         {cita.ecg && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition">
                             <input type="checkbox" checked={cita.ecg} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].ecg = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-rose-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">🫀 ECG</span>
                           </label>
                         )}
                         {cita.espirometria && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-teal-50 hover:border-teal-200 transition">
                             <input type="checkbox" checked={cita.espirometria} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].espirometria = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-teal-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">🫁 Espirometría</span>
                           </label>
                         )}
                         {cita.fondoOjo && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition">
                             <input type="checkbox" checked={cita.fondoOjo} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].fondoOjo = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-amber-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">👁️ Fondo Ojo</span>
                           </label>
                         )}
                         {cita.perfilGlicemia && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition">
                             <input type="checkbox" checked={cita.perfilGlicemia} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].perfilGlicemia = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-purple-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">🩸 Glicemia</span>
                           </label>
                         )}
                         {cita.perfilGlicemia && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-200 transition">
                             <input type="checkbox" checked={cita.perfilGlicemia} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].perfilGlicemia = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-purple-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">🩸 Perfil Glicemia</span>
                           </label>
                         )}
                         {cita.perfilPA && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition">
                             <input type="checkbox" checked={cita.perfilPA} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].perfilPA = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-indigo-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">⚕️ Perfil PA</span>
                           </label>
                         )}
                         {cita.otros && (
                           <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                             <input type="checkbox" checked={cita.otros} onChange={e => {
                               const newPlan = [...examsModalPlan];
                               newPlan[idx].otros = e.target.checked;
                               setExamsModalPlan(newPlan);
                             }} className="h-4 w-4 text-slate-600 rounded border-slate-300" />
                             <span className="text-xs font-bold text-slate-700 select-none">➕ {cita.otrosTexto || 'Otros'}</span>
                           </label>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button onClick={() => setShowExamsModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button 
                onClick={handleSaveExamsModal}
                className="px-5 py-2 text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition flex items-center"
              >
                <Save size={16} className="mr-2" /> Guardar Resoluciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Ingresar Caso a Gestión ─────────────────────────────────── */}
      {showIngresarCasoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div className="flex items-center space-x-3">
                <Briefcase className="text-indigo-600" size={22} />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {isDerivacionDirecta ? "Confirmar Derivación a Caso" : "Ingresar a Gestión de Casos"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isDerivacionDirecta ? "Derivación clínica desde el Padrón" : "Busca al paciente por RUT en el padrón"}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowIngresarCasoModal(false); resetCasoModal(); }} className="text-slate-400 hover:text-slate-600 p-1 bg-white border rounded-full">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={e => { e.preventDefault(); handleAgregarALista(); }} className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Búsqueda de paciente por RUT */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">RUT del Paciente <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={casoRutInput}
                  onChange={e => setCasoRutInput(e.target.value)}
                  placeholder="Ej: 12345678"
                  maxLength={10}
                  readOnly={isDerivacionDirecta}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${isDerivacionDirecta ? 'opacity-70 cursor-not-allowed' : ''}`}
                  autoFocus={!isDerivacionDirecta}
                />
                {/* Paciente encontrado */}
                {casoPacienteEncontrado && (
                  <div
                    onClick={!isDerivacionDirecta ? handleAgregarALista : undefined}
                    className={`mt-2 w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in fade-in duration-150 text-left ${!isDerivacionDirecta ? 'hover:bg-emerald-100 hover:border-emerald-300 transition-colors group cursor-pointer' : ''}`}
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {casoPacienteEncontrado.nombre_completo?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-emerald-800 uppercase">{casoPacienteEncontrado.nombre_completo}</p>
                      <p className="text-[10px] text-emerald-600">{casoPacienteEncontrado.sector} · {casoPacienteEncontrado.categoria || 'Sin categoría ECICEP'}</p>
                    </div>
                    {!isDerivacionDirecta && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 group-hover:bg-emerald-200 px-2 py-1 rounded-lg transition-colors shrink-0">
                        + Agregar
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tipo de Caso */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Tipo de Caso <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`flex flex-col items-center p-2.5 rounded-xl border-2 cursor-pointer transition ${casoTipo === 'POST_HOSPITALIZADO' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="sr-only" checked={casoTipo === 'POST_HOSPITALIZADO'} onChange={() => { setCasoTipo('POST_HOSPITALIZADO'); setCasoFechaAlta(''); }} />
                    <Hospital size={20} className={casoTipo === 'POST_HOSPITALIZADO' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`mt-1 text-[10px] font-black text-center ${casoTipo === 'POST_HOSPITALIZADO' ? 'text-blue-700' : 'text-slate-500'}`}>Post-Alta</span>
                  </label>
                  <label className={`flex flex-col items-center p-2.5 rounded-xl border-2 cursor-pointer transition ${casoTipo === 'POLICONSULTANTE' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="sr-only" checked={casoTipo === 'POLICONSULTANTE'} onChange={() => setCasoTipo('POLICONSULTANTE')} />
                    <RefreshCw size={20} className={casoTipo === 'POLICONSULTANTE' ? 'text-amber-600' : 'text-slate-400'} />
                    <span className={`mt-1 text-[10px] font-black text-center ${casoTipo === 'POLICONSULTANTE' ? 'text-amber-700' : 'text-slate-500'}`}>Policonsult.</span>
                  </label>
                  <label className={`flex flex-col items-center p-2.5 rounded-xl border-2 cursor-pointer transition ${casoTipo === 'DERIVACION_CLINICA' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" className="sr-only" checked={casoTipo === 'DERIVACION_CLINICA'} onChange={() => setCasoTipo('DERIVACION_CLINICA')} />
                    <ClipboardCheck size={20} className={casoTipo === 'DERIVACION_CLINICA' ? 'text-purple-600' : 'text-slate-400'} />
                    <span className={`mt-1 text-[10px] font-black text-center ${casoTipo === 'DERIVACION_CLINICA' ? 'text-purple-700' : 'text-slate-500'}`}>Derivación</span>
                  </label>
                </div>
              </div>

              {/* Estamento Requerido */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Estamento Requerido para Gestión</label>
                <select
                  value={casoEstamentoSolicitado}
                  onChange={e => setCasoEstamentoSolicitado(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                >
                  <option value="ENFERMERÍA">Enfermería</option>
                  <option value="TRABAJO SOCIAL">Trabajo Social / Asistente Social</option>
                  <option value="MÉDICO">Médico</option>
                  <option value="KINESIOLOGÍA">Kinesiología</option>
                  <option value="NUTRICIÓN">Nutrición</option>
                  <option value="PSICOLOGÍA">Psicología</option>
                  <option value="TENS">TENS</option>
                  <option value="GENERAL / OTRO">General / Sin estamento específico</option>
                </select>
              </div>

              {/* Campos exclusivos de POST_HOSPITALIZADO */}
              {casoTipo === 'POST_HOSPITALIZADO' && (
                <>
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Fecha de Alta <span className="text-red-500">*</span>
                      <span className="ml-2 text-slate-400 font-normal normal-case">(Motor del semáforo de 48h)</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={casoFechaAlta}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setCasoFechaAlta(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Diagnóstico de Alta
                      <span className="ml-2 text-slate-400 font-normal normal-case">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={casoDiagnostico}
                      onChange={e => setCasoDiagnostico(e.target.value)}
                      maxLength={200}
                      placeholder="Ej: Insuficiencia cardíaca descompensada"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Botón "Agregar a la Lista" — alternativa al click en la tarjeta */}
              {!isDerivacionDirecta && (
                <button
                  type="button"
                  onClick={handleAgregarALista}
                  disabled={!casoPacienteEncontrado}
                  className="w-full py-3 border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} /> Agregar a la Lista
                </button>
              )}

              {/* Error */}
              {casoError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs border border-red-200 font-medium">
                  ⚠️ {casoError}
                </div>
              )}
              
              {/* Lista Temporal de Casos (Carrito) */}
              {!isDerivacionDirecta && casosPendientes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-700">Casos en Lista ({casosPendientes.length})</h4>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Pendientes de guardar</span>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {casosPendientes.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg group">
                        <div>
                          <p className="text-[11px] font-black text-slate-700 uppercase">{c.nombre_completo}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {c.rut_paciente}-{calcularDv(c.rut_paciente)} <span className="font-sans">• {c.tipo === 'POST_HOSPITALIZADO' ? `🏥 Post-Hosp (${c.fecha_alta})` : c.tipo === 'POLICONSULTANTE' ? '🔄 Policonsultante' : '📋 Derivación Clínica'}</span>
                          </p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleQuitarDeLista(c.rut_paciente)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowIngresarCasoModal(false); resetCasoModal(); }}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isDerivacionDirecta) {
                    handleGuardarDerivacionDirecta();
                  } else {
                    handleGuardarLista();
                  }
                }}
                disabled={casoSaving || (!isDerivacionDirecta && casosPendientes.length === 0)}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {casoSaving 
                  ? 'Guardando...' 
                  : isDerivacionDirecta 
                    ? <><ArrowUpRight size={14} /> Confirmar Derivación</> 
                    : <><Briefcase size={14} /> Guardar {casosPendientes.length} Casos</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Asignar / Derivar Gestor a Profesional ──────────────────── */}
      {modalAsignar.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Asignar Gestor de Caso</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-500 truncate max-w-[220px] font-bold text-indigo-700 uppercase">
                      {modalAsignar.pacienteNombre}
                    </p>
                    {modalAsignar.categoria && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-black rounded border font-mono leading-none ${
                          modalAsignar.categoria === 'G3'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : modalAsignar.categoria === 'G2'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : modalAsignar.categoria === 'G1'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {modalAsignar.categoria}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setModalAsignar({ show: false, casoId: null, pacienteNombre: "" });
                  setAsignarSelectedRut("");
                  setAsignarSearchQuery("");
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-white border rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalAsignar.estamentoSugerido && 
               modalAsignar.estamentoSugerido.toUpperCase() !== "SIN ASIGNAR" &&
               modalAsignar.estamentoSugerido.trim() !== "" && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
                  <span>🏷 Estamento sugerido: <strong className="uppercase">{modalAsignar.estamentoSugerido}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona el Profesional del CESFAM <span className="text-red-500">*</span>
                </label>

                {(() => {
                  const profesionalSeleccionado = profesionales.find(p => p.rut === asignarSelectedRut);
                  const queryNorm = asignarSearchQuery.trim().toLowerCase();
                  const estamentoNorm = (modalAsignar.estamentoSugerido || "").trim().toLowerCase();

                  const sugerencias = profesionales.filter(p => {
                    if (!queryNorm) return true;
                    const nom = p.nombre.toLowerCase();
                    const rol = (p.rol || "").toLowerCase();
                    const rut = p.rut.toLowerCase();
                    return nom.includes(queryNorm) || rol.includes(queryNorm) || rut.includes(queryNorm);
                  }).sort((a, b) => {
                    if (estamentoNorm && estamentoNorm !== "sin asignar") {
                      const aMatch = (a.rol || "").toLowerCase().includes(estamentoNorm);
                      const bMatch = (b.rol || "").toLowerCase().includes(estamentoNorm);
                      if (aMatch && !bMatch) return -1;
                      if (!aMatch && bMatch) return 1;
                    }
                    return a.nombre.localeCompare(b.nombre);
                  });

                  if (profesionalSeleccionado) {
                    return (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200/90 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <User size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 uppercase truncate">
                              {profesionalSeleccionado.nombre}
                            </p>
                            <p className="text-[11px] text-indigo-700 font-medium truncate">
                              {profesionalSeleccionado.rol} · <span className="font-mono text-slate-400">{profesionalSeleccionado.rut}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAsignarSelectedRut("");
                            setAsignarSearchQuery("");
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg transition shrink-0 ml-2 shadow-sm"
                        >
                          Cambiar
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          value={asignarSearchQuery}
                          onChange={e => setAsignarSearchQuery(e.target.value)}
                          placeholder="Escribe nombre o estamento (ej: Claudia, TENS)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-800"
                        />
                        {asignarSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setAsignarSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Lista de sugerencias predictivas: SOLO se muestra al escribir */}
                      {queryNorm.length > 0 && (
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-lg animate-in fade-in duration-150">
                          {sugerencias.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No se encontraron profesionales con &ldquo;{asignarSearchQuery}&rdquo;
                            </div>
                          ) : (
                            sugerencias.slice(0, 10).map(p => {
                              const esSugerido = modalAsignar.estamentoSugerido && 
                                modalAsignar.estamentoSugerido.toUpperCase() !== "SIN ASIGNAR" &&
                                (p.rol || "").toUpperCase().includes(modalAsignar.estamentoSugerido.toUpperCase());
                              return (
                                <button
                                  key={p.rut}
                                  type="button"
                                  onClick={() => {
                                    setAsignarSelectedRut(p.rut);
                                    setAsignarSearchQuery("");
                                  }}
                                  className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/70 transition flex items-center justify-between group"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 uppercase truncate">
                                      {p.nombre}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">
                                      {p.rol}
                                    </p>
                                  </div>
                                  {esSugerido && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                      Sugerido
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <p className="text-[11px] text-slate-400 mt-2">
                  El caso pasará inmediatamente a estado <strong>En Seguimiento</strong> a nombre del profesional seleccionado.
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalAsignar({ show: false, casoId: null, pacienteNombre: "" });
                  setAsignarSelectedRut("");
                  setAsignarSearchQuery("");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAsignacion}
                disabled={asignarSaving || !asignarSelectedRut}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {asignarSaving ? "Guardando..." : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Cerrar Caso con Motivo ──────────────────────────────────── */}
      {modalCerrar.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Cierre de Gestión de Caso</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px] font-bold text-rose-700 uppercase">
                    {modalCerrar.pacienteNombre}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalCerrar({ show: false, casoId: null, pacienteNombre: "" })} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-white border rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Motivo de Cierre del Caso <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { id: "OBJETIVO_CUMPLIDO", label: "✅ Objetivo Clínico Cumplido / Compensado", desc: "El paciente alcanzó las metas del plan de cuidado." },
                    { id: "ALTA_MEDICA", label: "🏥 Alta Médica / Intervención Finalizada", desc: "Se dio término formal al ciclo de seguimiento." },
                    { id: "INUBICABLE", label: "📞 Inubicable", desc: "No fue posible contactar tras múltiples llamadas y/o VDI." },
                    { id: "RECHAZA", label: "🚫 Rechazo de Intervención", desc: "El paciente o familia desiste del acompañamiento." },
                    { id: "TRASLADO_FALLECIDO", label: "🕊️ Traslado de CESFAM o Fallecimiento", desc: "Cierre administrativo por cambio de red o defunción." },
                    { id: "OTRO", label: "📝 Otro Motivo Administrativo", desc: "Cierre justificado en ficha clínica RAS." }
                  ].map(op => (
                    <label 
                      key={op.id}
                      className={`block p-3 rounded-xl border-2 cursor-pointer transition ${cerrarMotivo === op.id ? 'border-rose-500 bg-rose-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{op.label}</span>
                        <input 
                          type="radio" 
                          name="motivoCierre" 
                          value={op.id} 
                          checked={cerrarMotivo === op.id} 
                          onChange={() => setCerrarMotivo(op.id)}
                          className="text-rose-600"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{op.desc}</p>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setModalCerrar({ show: false, casoId: null, pacienteNombre: "" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCierre}
                disabled={cerrarSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {cerrarSaving ? "Cerrando..." : "Confirmar Cierre de Caso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Confirmar Tomar Caso ───────────────────────────────────── */}
      {modalTomar.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Tomar Caso Clínico</h3>
                  <p className="text-xs text-indigo-700 font-bold uppercase truncate max-w-[240px]">
                    {modalTomar.pacienteNombre}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalTomar({ show: false, casoId: null, pacienteNombre: "", sector: "", estamento: "" })} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-white border rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Sector:</span>
                  <span className="font-bold text-slate-800">{modalTomar.sector}</span>
                </div>
                {modalTomar.estamento && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Perfil Requerido:</span>
                    <span className="font-bold text-slate-800">{modalTomar.estamento}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Gestor que asumirá:</span>
                  <span className="font-bold text-indigo-600">{user?.nombre || "Tu usuario"}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Confirmas que deseas asumir el seguimiento de este caso? El paciente pasará a estado <strong>En Seguimiento</strong> bajo tu responsabilidad.
              </p>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setModalTomar({ show: false, casoId: null, pacienteNombre: "", sector: "", estamento: "" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarTomarCaso}
                disabled={tomarSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {tomarSaving ? "Asignando..." : "Confirmar y Tomar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Confirmar Anular Caso ─────────────────────────────────── */}
      {modalAnular.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Anular Derivación</h3>
                  <p className="text-xs text-rose-700 font-bold uppercase truncate max-w-[240px]">
                    {modalAnular.pacienteNombre}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalAnular({ show: false, casoId: null, pacienteNombre: "", tipo: "" })} 
                className="text-slate-400 hover:text-slate-600 p-1 bg-white border rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  Esta acción eliminará la derivación pendiente de la lista de gestión de casos. Solo debes anularla si se ingresó por error o ya no procede el seguimiento.
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setModalAnular({ show: false, casoId: null, pacienteNombre: "", tipo: "" })}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors border border-slate-200 bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnularCaso}
                disabled={anularSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {anularSaving ? "Anulando..." : "Sí, Anular Derivación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

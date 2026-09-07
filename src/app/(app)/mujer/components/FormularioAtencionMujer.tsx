"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { guardarPap, ingresarEmbarazo, obtenerProfesionalesMatroneria } from "@/actions/mujerActions";
import { UserCircle, Calendar, ShieldCheck, AlertCircle, CheckCircle, FileText, ArrowLeft, HeartPulse, Sparkles, Clock, AlertTriangle, User, Search, X, ChevronRight, UserPlus } from "lucide-react";
import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";
import { getLocalDateString } from "@/lib/dateUtils";

interface FormularioAtencionMujerProps {
  paciente: any;
  user?: any;
  onSuccess: (data?: any) => void;
  onCancel?: () => void;
  initialTipoIngreso?: "SELECCION" | "PAP" | "EMBARAZO";
  isModal?: boolean;
}

export default function FormularioAtencionMujer({
  paciente,
  user,
  onSuccess,
  onCancel,
  initialTipoIngreso = "PAP",
  isModal = false
}: FormularioAtencionMujerProps) {
  const [tipoIngreso, setTipoIngreso] = useState<"SELECCION" | "PAP" | "EMBARAZO">(initialTipoIngreso);
  
  // Profesionales
  const [profesionalesList, setProfesionalesList] = useState<{ rut: string; nombre: string; profesion: string; rol: string }[]>([]);
  const [profesionalRut, setProfesionalRut] = useState<string>(user?.rut || "");
  const [searchProfInput, setSearchProfInput] = useState<string>("");
  const [showProfDropdown, setShowProfDropdown] = useState<boolean>(false);
  const [modoProfesional, setModoProfesional] = useState<"PROPIO" | "MANUAL">("PROPIO");
  const profSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    obtenerProfesionalesMatroneria().then(res => {
      if (res.profesionales) {
        setProfesionalesList(res.profesionales);
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profSearchRef.current && !profSearchRef.current.contains(event.target as Node)) {
        setShowProfDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProfesionales = useMemo(() => {
    if (!searchProfInput.trim()) return profesionalesList;
    const q = searchProfInput.toLowerCase().trim();
    return profesionalesList.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      p.rut.toLowerCase().includes(q) || 
      (p.profesion && p.profesion.toLowerCase().includes(q))
    );
  }, [profesionalesList, searchProfInput]);

  const profesionalSeleccionadoObj = useMemo(() => {
    if (!profesionalRut) return null;
    return profesionalesList.find(p => p.rut === profesionalRut) || null;
  }, [profesionalesList, profesionalRut]);

  // Formulario PAP
  const [tipoExamen, setTipoExamen] = useState("PAP");
  const [fechaPap, setFechaPap] = useState(() => getLocalDateString());
  const [codigoLab, setCodigoLab] = useState("");
  const [periodicidadMeses, setPeriodicidadMeses] = useState<number | null>(36);
  const [fechaProximoControl, setFechaProximoControl] = useState(() => {
    const d = new Date(getLocalDateString());
    d.setMonth(d.getMonth() + 36);
    return d.toISOString().split("T")[0];
  });
  const [criterioPersonalizado, setCriterioPersonalizado] = useState(false);
  const [adecuacionMuestra, setAdecuacionMuestra] = useState("SATISFACTORIA");
  const [motivoInsatisfactoria, setMotivoInsatisfactoria] = useState("");
  const [resultado, setResultado] = useState("NEGATIVO");
  const [fechaResultado, setFechaResultado] = useState(() => getLocalDateString());
  const [derivadoUpc, setDerivadoUpc] = useState(false);
  const [fechaDerivacionUpc, setFechaDerivacionUpc] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Formulario Embarazo
  const [fum, setFum] = useState("");
  const [fpp, setFpp] = useState("");
  const [fechaUltimoControl, setFechaUltimoControl] = useState(() => getLocalDateString());
  const [fechaProximoControlEmb, setFechaProximoControlEmb] = useState("");
  const [estadoNutricional, setEstadoNutricional] = useState("");
  const [observacionesEmb, setObservacionesEmb] = useState("");
  const [altoRiesgoObstetrico, setAltoRiesgoObstetrico] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const decodificacion: DecodificacionPap = useMemo(() => {
    if (tipoExamen !== "PAP") {
      return {
        codigoOriginal: "",
        codigoLimpio: "",
        diagnostico: resultado === "POSITIVO_16_18" ? "POSITIVO VPH 16/18" : resultado === "POSITIVO_OTROS" ? "POSITIVO Otros VPH" : resultado === "NEGATIVO" ? "NEGATIVO VPH" : "PENDIENTE",
        adecuacion: "SATISFACTORIA",
        adecuacionDescripcion: "Muestra Satisfactoria",
        microbiologia: [],
        conducta: [],
        esPatologico: resultado.startsWith("POSITIVO"),
        esInsatisfactorio: false,
        periodicidadSugeridaMeses: resultado === "NEGATIVO" ? 60 : 0,
        textoResumen: "",
      };
    }
    if (!codigoLab.trim()) {
      return {
        codigoOriginal: "",
        codigoLimpio: "",
        diagnostico: "Pendiente de ingresar código",
        adecuacion: "SATISFACTORIA",
        adecuacionDescripcion: "Ingrese código del informe",
        microbiologia: [],
        conducta: [],
        esPatologico: false,
        esInsatisfactorio: false,
        periodicidadSugeridaMeses: 36,
        textoResumen: "",
      };
    }
    return decodificarCodigoPap(codigoLab);
  }, [codigoLab, tipoExamen, resultado]);

  const handleCodigoLabChange = (val: string) => {
    const raw = val.toUpperCase();
    setCodigoLab(raw);
    if (!raw.trim()) return;

    const dec = decodificarCodigoPap(raw);
    
    if (dec.esInsatisfactorio) {
      setAdecuacionMuestra("INSATISFACTORIA");
      setMotivoInsatisfactoria(dec.motivoInsatisfactoria || "CELULARIDAD_ESCASA");
      setResultado("MUESTRA INSATISFACTORIA");
    } else {
      setAdecuacionMuestra("SATISFACTORIA");
      setMotivoInsatisfactoria("");
      if (dec.esPatologico) {
        setResultado(dec.diagnosticoCodigo || "ASC-US");
        setDerivadoUpc(true);
      } else {
        setResultado("NEGATIVO");
        setDerivadoUpc(false);
      }
    }

    if (!criterioPersonalizado) {
      setPeriodicidadMeses(dec.periodicidadSugeridaMeses);
      if (fechaPap && dec.periodicidadSugeridaMeses > 0) {
        const d = new Date(fechaPap);
        d.setMonth(d.getMonth() + dec.periodicidadSugeridaMeses);
        setFechaProximoControl(d.toISOString().split("T")[0]);
      } else if (dec.periodicidadSugeridaMeses === 0) {
        setFechaProximoControl("");
      }
    }
  };

  const handlePeriodicidadChange = (meses: number, manual: boolean = true) => {
    if (manual && periodicidadMeses === meses) {
      setPeriodicidadMeses(null);
      setFechaProximoControl("");
      return;
    }
    
    setPeriodicidadMeses(meses);
    if (manual) setCriterioPersonalizado(true);
    if (fechaPap && meses > 0) {
      const d = new Date(fechaPap);
      d.setMonth(d.getMonth() + meses);
      setFechaProximoControl(d.toISOString().split("T")[0]);
    } else if (meses === 0) {
      setFechaProximoControl("");
    }
  };

  const handleFumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fumVal = e.target.value;
    setFum(fumVal);
    if (fumVal) {
      const date = new Date(fumVal);
      date.setDate(date.getDate() + 280);
      setFpp(date.toISOString().split('T')[0]);
    } else {
      setFpp("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setSaving(true);
    setSaveError("");

    if (tipoIngreso === "PAP") {
      const isInsatisfactoria = tipoExamen === "PAP" ? (adecuacionMuestra === "INSATISFACTORIA" || decodificacion.esInsatisfactorio) : false;
      
      let realResultado = resultado;
      if (tipoExamen === "PAP") {
        if (!codigoLab.trim()) {
          realResultado = "PENDIENTE";
        } else if (isInsatisfactoria) {
          realResultado = "MUESTRA INSATISFACTORIA";
        } else if (decodificacion.esPatologico) {
          realResultado = decodificacion.diagnosticoCodigo || resultado;
        } else {
          realResultado = "NEGATIVO";
        }
      } else {
        realResultado = isInsatisfactoria ? "MUESTRA INSATISFACTORIA" : resultado;
      }
      
      const isPatologico = !isInsatisfactoria && realResultado !== "NEGATIVO" && realResultado !== "NORMAL" && realResultado !== "PENDIENTE";

      const payload = {
        rut_paciente: paciente.rut,
        fecha_pap: fechaPap,
        profesional_rut: modoProfesional === "MANUAL" ? (profesionalRut || undefined) : undefined,
        tipo_examen: tipoExamen,
        adecuacion_muestra: isInsatisfactoria ? "INSATISFACTORIA" : "SATISFACTORIA",
        motivo_insatisfactoria: isInsatisfactoria ? (motivoInsatisfactoria || decodificacion.motivoInsatisfactoria) : undefined,
        resultado: realResultado,
        fecha_resultado: realResultado !== "PENDIENTE" ? (fechaResultado || fechaPap) : undefined,
        derivado_upc: isPatologico ? derivadoUpc : false,
        fecha_derivacion_upc: isPatologico && derivadoUpc ? (fechaDerivacionUpc || fechaPap) : undefined,
        codigo_lab: tipoExamen === "PAP" ? (codigoLab || undefined) : undefined,
        periodicidad_meses: periodicidadMeses === null ? undefined : periodicidadMeses,
        fecha_proximo_control: fechaProximoControl || undefined,
        observaciones: observaciones || (tipoExamen === "PAP" ? decodificacion.textoResumen : undefined)
      };

      const res = await guardarPap(payload);

      setSaving(false);

      if (res.error) {
        setSaveError(res.error);
      } else {
        onSuccess(payload);
      }
    } else {
      const payload = {
        rut_paciente: paciente.rut,
        fum,
        fpp,
        fecha_ultimo_control: fechaUltimoControl || undefined,
        fecha_proximo_control: fechaProximoControlEmb || undefined,
        estado_nutricional: estadoNutricional || undefined,
        observaciones: observacionesEmb || undefined,
        alto_riesgo_obstetrico: altoRiesgoObstetrico,
        profesional_rut: modoProfesional === "MANUAL" ? (profesionalRut || undefined) : undefined
      };
      const res = await ingresarEmbarazo(payload);

      setSaving(false);

      if (res.error) {
        setSaveError(res.error);
      } else {
        onSuccess(payload);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Ficha Rápida - Sólo en modo no modal, o si se desea en modal */}
      {!isModal && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 shrink-0">
              <UserCircle size={28} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              <div>
                <h2 className="text-base font-bold text-slate-800 uppercase leading-tight">{paciente.nombre_completo}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">RUT: {paciente.rut}-{paciente.dv}</p>
              </div>
              <div className="text-left sm:text-right flex items-center sm:justify-end gap-2 flex-wrap">
                <span className="px-3 py-1 bg-pink-50 text-pink-700 border border-pink-100 rounded-full text-xs font-black uppercase tracking-wider">
                  Sector: {paciente.sector || "General"}
                </span>
                {paciente.histerectomizada && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-black uppercase tracking-wider">
                    HST (Excluida)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Tipo de Atención */}
      {tipoIngreso === "SELECCION" ? (
        <div className="grid grid-cols-2 gap-4 h-full min-h-[300px]">
          <button type="button" onClick={() => setTipoIngreso("PAP")} className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-pink-50 border-2 border-slate-100 hover:border-pink-300 rounded-2xl transition-all group cursor-pointer">
            <FileText size={48} className="text-slate-300 group-hover:text-pink-500 mb-4 transition-colors" />
            <span className="font-bold text-slate-700 group-hover:text-pink-700 text-lg">Tamizaje PAP / VPH</span>
          </button>
          <button type="button" onClick={() => setTipoIngreso("EMBARAZO")} className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-purple-50 border-2 border-slate-100 hover:border-purple-300 rounded-2xl transition-all group cursor-pointer">
            <HeartPulse size={48} className="text-slate-300 group-hover:text-purple-500 mb-4 transition-colors" />
            <span className="font-bold text-slate-700 group-hover:text-purple-700 text-lg">Control de Embarazo</span>
          </button>
        </div>
      ) : !isModal && (
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTipoIngreso("PAP")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              tipoIngreso === "PAP"
                ? 'bg-pink-50 border-pink-500 shadow-xs ring-2 ring-pink-300'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">Tamizaje PAP / VPH</span>
              <span className="text-[10px] font-black text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">Decodificador Lab</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Registrar informe de citología con códigos de laboratorio.</p>
          </button>

          <button
            type="button"
            onClick={() => setTipoIngreso("EMBARAZO")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              tipoIngreso === "EMBARAZO"
                ? 'bg-purple-50 border-purple-500 shadow-xs ring-2 ring-purple-300'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">Control de Embarazo</span>
              <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Cálculo FPP</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Registrar FUM, FPP automática y controles gestacionales.</p>
          </button>
        </div>
      )}

      {tipoIngreso !== "SELECCION" && (
        <div className={`${isModal ? '' : 'bg-white p-6 rounded-2xl shadow-sm border border-slate-200'} mb-6`}>
          {/* Selector Predictivo de Profesional Responsable / Matrón(a) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-pink-600" />
                Profesional Responsable / Matrón(a)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { 
                    setModoProfesional("PROPIO"); 
                    setProfesionalRut(user?.rut || ""); 
                    setSearchProfInput("");
                    setShowProfDropdown(false);
                  }}
                  className={`px-2.5 py-1 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                    modoProfesional === "PROPIO" ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Mi Usuario {user?.nombre ? `(${user.nombre.split(" ")[0]})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoProfesional("MANUAL");
                    setProfesionalRut("");
                    setSearchProfInput("");
                    setShowProfDropdown(true);
                  }}
                  className={`px-2.5 py-1 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                    modoProfesional === "MANUAL" ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Buscar Otro
                </button>
              </div>
            </div>

            {modoProfesional === "MANUAL" ? (
              <div className="relative" ref={profSearchRef}>
                {profesionalSeleccionadoObj ? (
                  <div className="flex items-center justify-between p-3 bg-white border border-pink-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center">
                        {profesionalSeleccionadoObj.nombre.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs block uppercase">
                          {profesionalSeleccionadoObj.nombre}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {profesionalSeleccionadoObj.profesion || "Profesional"} • RUT: {profesionalSeleccionadoObj.rut}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfesionalRut("");
                        setSearchProfInput("");
                        setShowProfDropdown(true);
                      }}
                      className="text-[10px] font-bold text-pink-600 hover:text-pink-800 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Escribe nombre, apellido o RUT del matrón(a)..."
                      value={searchProfInput}
                      onChange={(e) => {
                        setSearchProfInput(e.target.value);
                        setShowProfDropdown(true);
                      }}
                      onFocus={() => setShowProfDropdown(true)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none shadow-xs"
                      autoFocus
                    />
                    {searchProfInput && (
                      <button
                        type="button"
                        onClick={() => { setSearchProfInput(""); setShowProfDropdown(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}

                    {showProfDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Profesionales disponibles ({filteredProfesionales.length})</span>
                          <span>Haz clic para seleccionar</span>
                        </div>
                        {filteredProfesionales.length > 0 ? (
                          filteredProfesionales.map((prof) => (
                            <button
                              key={prof.rut}
                              type="button"
                              onClick={() => {
                                setProfesionalRut(prof.rut);
                                setSearchProfInput(prof.nombre);
                                setShowProfDropdown(false);
                              }}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-pink-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                  {prof.nombre.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block group-hover:text-pink-700 transition-colors uppercase">
                                    {prof.nombre}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {prof.profesion || "Profesional"} • RUT: {prof.rut}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Seleccionar
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500 font-medium">
                            No se encontraron profesionales que coincidan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span className="font-bold">Usuario en sesión</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Se registrará automáticamente con tu cuenta</span>
              </div>
            )}
          </div>

        </div>
      )}

      {tipoIngreso === "PAP" && (
        <div className={`${isModal ? '' : 'bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5'}`}>
          {!isModal && (
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Detalles del Examen PAP / VPH
            </h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Examen</label>
              <select
                value={tipoExamen}
                onChange={(e) => {
                  setTipoExamen(e.target.value);
                  if (e.target.value === "VPH") {
                    setResultado("NEGATIVO");
                    handlePeriodicidadChange(60, false);
                  } else {
                    handleCodigoLabChange(codigoLab);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
              >
                <option value="PAP">PAP (Citología Convencional)</option>
                <option value="VPH">Test de VPH (Tamizaje Molecular)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de la Toma</label>
              <input
                type="date"
                value={fechaPap}
                onChange={(e) => {
                  setFechaPap(e.target.value);
                  if (e.target.value && periodicidadMeses !== null && periodicidadMeses > 0) {
                    const d = new Date(e.target.value);
                    d.setMonth(d.getMonth() + periodicidadMeses);
                    setFechaProximoControl(d.toISOString().split("T")[0]);
                  }
                }}
                max={getLocalDateString()}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                required
              />
            </div>
          </div>

          {tipoExamen === "PAP" && (
            <div className="mt-4 p-4 bg-pink-50/60 border border-pink-100 rounded-2xl space-y-4">
              <div>
                <label className="block text-xs font-black text-pink-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-pink-600" />
                  Código Compuesto de Anatomía Patológica (Laboratorio)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoLab}
                    onChange={(e) => handleCodigoLabChange(e.target.value)}
                    placeholder="Escriba código del informe (ej: IG8, IG7...)"
                    className="flex-1 px-4 py-2.5 bg-white border border-pink-200 rounded-xl font-mono font-black text-pink-700 tracking-widest text-base uppercase focus:ring-2 focus:ring-pink-500 outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Interpretación Clínica</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    decodificacion.esPatologico ? 'bg-red-100 text-red-700' : decodificacion.esInsatisfactorio ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {decodificacion.esPatologico ? 'PATOLÓGICO / ALTERADO' : decodificacion.esInsatisfactorio ? 'MUESTRA INADECUADA' : 'NORMAL / NEGATIVO'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Diagnóstico Citológico</span>
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
                    <div className="col-span-1 sm:col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                      <span className="block text-[9px] font-bold text-amber-800 uppercase">Hallazgos Microbiológicos / Inflamatorios</span>
                      <span className="text-amber-900 font-medium">{decodificacion.microbiologia.join(" • ")}</span>
                    </div>
                  )}

                  {decodificacion.conducta.length > 0 && (
                    <div className="col-span-1 sm:col-span-2 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                      <span className="block text-[9px] font-bold text-blue-800 uppercase">Conducta Sugerida por Laboratorio</span>
                      <span className="text-blue-900 font-semibold">{decodificacion.conducta.join(" • ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      Periodicidad y Próximo Control PAP
                    </label>
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
                      periodicidadMeses === 36
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
                      periodicidadMeses === 12
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
                      periodicidadMeses === 6
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    6 Meses
                    <span className="block text-[8px] font-normal opacity-80">Tratamiento / Control</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePeriodicidadChange(0)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      periodicidadMeses === 0
                        ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    UPC / Repetir
                    <span className="block text-[8px] font-normal opacity-80">Sin Vigencia</span>
                  </button>
                </div>

                {periodicidadMeses !== null && periodicidadMeses > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500">Fecha Próximo PAP Calculada:</span>
                    <input
                      type="date"
                      value={fechaProximoControl}
                      onChange={(e) => {
                        setFechaProximoControl(e.target.value);
                        setCriterioPersonalizado(true);
                      }}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {tipoExamen === "VPH" && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Resultado Test VPH</label>
                <select
                  value={resultado}
                  onChange={(e) => {
                    setResultado(e.target.value);
                    if (e.target.value === "NEGATIVO") {
                      setPeriodicidadMeses(60);
                      if (fechaPap) {
                        const d = new Date(fechaPap);
                        d.setFullYear(d.getFullYear() + 5);
                        setFechaProximoControl(d.toISOString().split("T")[0]);
                      }
                    } else {
                      setPeriodicidadMeses(0);
                      setFechaProximoControl("");
                      setDerivadoUpc(true);
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

              {resultado !== "PENDIENTE" && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Fecha del Resultado</label>
                  <input
                    type="date"
                    value={fechaResultado}
                    onChange={(e) => setFechaResultado(e.target.value)}
                    min={fechaPap}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Observaciones Clínicas</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              maxLength={2000}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium h-20 text-slate-700 text-sm resize-none"
              placeholder="Observaciones adicionales del matrón(a)..."
            />
          </div>
        </div>
      )}

      {tipoIngreso === "EMBARAZO" && (
        <div className={`${isModal ? '' : 'bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4'}`}>
          {!isModal && (
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Ingreso al Programa de Control Gestacional (Embarazo)
            </h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">F.U.M</label>
              <input
                type="date"
                value={fum}
                onChange={handleFumChange}
                max={getLocalDateString()}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">F.P.P (Calculada)</label>
              <input
                type="date"
                value={fpp}
                readOnly
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-purple-700 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Último Control</label>
              <input
                type="date"
                value={fechaUltimoControl}
                onChange={(e) => setFechaUltimoControl(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Próximo Control</label>
              <input
                type="date"
                value={fechaProximoControlEmb}
                onChange={(e) => setFechaProximoControlEmb(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado Nutricional</label>
              <select
                value={estadoNutricional}
                onChange={(e) => setEstadoNutricional(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
              >
                <option value="">-- Seleccionar --</option>
                <option value="ENFLAQUECIDA">Enflaquecida</option>
                <option value="NORMOPESO">Normopeso</option>
                <option value="SOBREPESO">Sobrepeso</option>
                <option value="OBESIDAD">Obesidad</option>
              </select>
            </div>
            
            <div className="flex flex-col justify-center">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clasificación de Riesgo</label>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors">
                <input
                  type="checkbox"
                  checked={altoRiesgoObstetrico}
                  onChange={(e) => setAltoRiesgoObstetrico(e.target.checked)}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-red-300 cursor-pointer accent-red-600"
                />
                <div>
                  <span className="block text-sm font-bold text-red-700">Alto Riesgo Obstétrico (ARO)</span>
                  <span className="block text-[10px] text-red-500 font-medium leading-tight mt-0.5">Marcar si la paciente presenta condiciones de riesgo.</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Observaciones</label>
            <textarea
              value={observacionesEmb}
              onChange={(e) => setObservacionesEmb(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="Antecedentes obstétricos, patologías asociadas, etc..."
            />
          </div>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100 mt-4">
          <AlertCircle size={16} />
          {saveError}
        </div>
      )}

      {isModal ? (
        <div className="flex items-center justify-end p-5 border-t border-slate-100 bg-slate-50/50 gap-3 shrink-0 mt-6">
          {tipoIngreso !== "SELECCION" && (
            <button type="button" onClick={() => setTipoIngreso("SELECCION")} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors mr-auto">
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          {tipoIngreso !== "SELECCION" && (
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl font-bold text-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 ${tipoIngreso === "EMBARAZO" ? "bg-purple-600 hover:bg-purple-700" : "bg-pink-600 hover:bg-pink-700"}`}
            >
              {saving ? "Guardando..." : "Guardar Registro"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || tipoIngreso === "SELECCION"}
            className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {saving ? "Guardando Registro..." : "Guardar Atención"}
          </button>
        </div>
      )}
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { buscarPacienteMujerPorRut, guardarPap } from "@/actions/mujerActions";
import { Search, UserCircle, Calendar, ShieldCheck, AlertCircle, CheckCircle, FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLocalDateString } from "@/lib/dateUtils";
import Link from "next/link";

export default function NuevoPap() {
  const router = useRouter();
  const [rutInput, setRutInput] = useState("");
  
  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length > 9) clean = clean.slice(0, 9);
    if (clean.length <= 1) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body}-${dv}`;
  };

  const [paciente, setPaciente] = useState<any>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Datos del Examen
  const [tipoExamen, setTipoExamen] = useState("PAP");
  const [fechaPap, setFechaPap] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });
  const [adecuacionMuestra, setAdecuacionMuestra] = useState("SATISFACTORIA");
  const [motivoInsatisfactoria, setMotivoInsatisfactoria] = useState("");
  const [resultado, setResultado] = useState("PENDIENTE");
  const [fechaResultado, setFechaResultado] = useState("");
  const [derivadoUpc, setDerivadoUpc] = useState(false);
  const [fechaDerivacionUpc, setFechaDerivacionUpc] = useState("");
  const [observaciones, setObservaciones] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Efecto para ajustar campos lógicos según adecuación y resultado
  useEffect(() => {
    if (adecuacionMuestra === "INSATISFACTORIA") {
      setResultado("MUESTRA INSATISFACTORIA");
      setDerivadoUpc(false);
    } else if (resultado === "MUESTRA INSATISFACTORIA") {
      setResultado("PENDIENTE");
    }
  }, [adecuacionMuestra]);

  // Si el resultado es NEGATIVO o PENDIENTE, no corresponde derivación a UPC
  useEffect(() => {
    if (resultado === "NEGATIVO" || resultado === "PENDIENTE" || resultado === "MUESTRA INSATISFACTORIA") {
      setDerivadoUpc(false);
    }
  }, [resultado]);

  // Resetear fecha de resultado si vuelve a PENDIENTE
  useEffect(() => {
    if (resultado === "PENDIENTE") {
      setFechaResultado("");
    } else if (!fechaResultado) {
      setFechaResultado(fechaPap);
    }
  }, [resultado]);

  const handleSearch = async () => {
    setLoadingSearch(true);
    setSearchError("");
    setPaciente(null);

    const res = await buscarPacienteMujerPorRut(rutInput);
    setLoadingSearch(false);

    if (res.error) {
      setSearchError(res.error);
    } else {
      setPaciente(res.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setSaving(true);
    setSaveError("");

    const isPatologico = adecuacionMuestra === "SATISFACTORIA" && resultado !== "NEGATIVO" && resultado !== "PENDIENTE";

    const res = await guardarPap({
      rut_paciente: paciente.rut,
      fecha_pap: fechaPap,
      tipo_examen: tipoExamen,
      adecuacion_muestra: adecuacionMuestra,
      motivo_insatisfactoria: adecuacionMuestra === "INSATISFACTORIA" ? motivoInsatisfactoria : undefined,
      resultado: adecuacionMuestra === "INSATISFACTORIA" ? "MUESTRA INSATISFACTORIA" : resultado,
      fecha_resultado: resultado !== "PENDIENTE" ? (fechaResultado || fechaPap) : undefined,
      derivado_upc: isPatologico ? derivadoUpc : false,
      fecha_derivacion_upc: isPatologico && derivadoUpc ? (fechaDerivacionUpc || getLocalDateString()) : undefined,
      observaciones
    });

    setSaving(false);

    if (res.error) {
      setSaveError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/mujer");
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link 
          href="/mujer"
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <FileText className="mr-3 text-pink-500" size={32} />
            Registrar Tamizaje PAP / VPH
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Formulario clínico para el programa de salud de la mujer de APS</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Paciente de APS</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Ingrese RUT de la paciente..."
              value={rutInput}
              onChange={(e) => setRutInput(formatRut(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-mono font-medium text-slate-700"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loadingSearch || rutInput.length < 2}
            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loadingSearch ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {searchError && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
            <AlertCircle size={16} />
            {searchError}
          </div>
        )}
      </div>

      {paciente && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ficha Paciente */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                <UserCircle size={28} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                <div>
                  <h2 className="text-base font-bold text-slate-800 uppercase leading-tight">{paciente.nombre_completo}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">RUT: {paciente.rut}-{paciente.dv}</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 bg-pink-50 text-pink-700 border border-pink-100 rounded-full text-xs font-black uppercase tracking-wider">
                    Sector: {paciente.sector || "General"}
                  </span>
                  {paciente.histerectomizada && (
                    <span className="ml-2 inline-block px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-black uppercase tracking-wider">
                      Histerectomizada
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario Clínico de Tamizaje */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Detalles del Examen Realizado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tipo Examen */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Examen</label>
                <select
                  value={tipoExamen}
                  onChange={(e) => {
                    setTipoExamen(e.target.value);
                    setResultado("PENDIENTE");
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold text-slate-700 text-sm"
                >
                  <option value="PAP">PAP (Citología Convencional)</option>
                  <option value="VPH">Test de VPH (Tamizaje Molecular)</option>
                </select>
              </div>

              {/* Fecha Toma */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de la Toma</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    value={fechaPap}
                    onChange={(e) => setFechaPap(e.target.value)}
                    max={getLocalDateString()}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-medium text-slate-700 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Adecuación Muestra (Sólo para PAP) */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Adecuación de Muestra</label>
                <select
                  value={adecuacionMuestra}
                  onChange={(e) => setAdecuacionMuestra(e.target.value)}
                  disabled={tipoExamen === "VPH"}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold text-slate-700 text-sm disabled:opacity-50"
                >
                  <option value="SATISFACTORIA">SATISFACTORIA</option>
                  <option value="INSATISFACTORIA">INSATISFACTORIA</option>
                </select>
              </div>
            </div>

            {/* Motivo Insatisfactoria (Condicional) */}
            {adecuacionMuestra === "INSATISFACTORIA" && tipoExamen === "PAP" && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-black text-amber-800 uppercase tracking-widest">
                  Motivo de Muestra Insatisfactoria (Rechazo)
                </label>
                <select
                  value={motivoInsatisfactoria}
                  onChange={(e) => setMotivoInsatisfactoria(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-semibold text-slate-700 text-sm"
                  required
                >
                  <option value="">-- Seleccione Motivo --</option>
                  <option value="CELULARIDAD_ESCASA">Celularidad Escasa / Frotis Hipocelular</option>
                  <option value="MALA_FIJACION">Mala Fijación / Artefacto por Desecación</option>
                  <option value="HEMORRAGICO">Exceso de Sangre (Hemorrágico)</option>
                  <option value="INFLAMATORIO">Exceso de Exudado Inflamatorio</option>
                  <option value="OTRO">Otro Motivo Clínico</option>
                </select>
              </div>
            )}

            {/* Resultados y Fechas de Resultados */}
            {adecuacionMuestra === "SATISFACTORIA" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Diagnóstico/Resultado */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Resultado del Examen
                  </label>
                  {tipoExamen === "PAP" ? (
                    <select
                      value={resultado}
                      onChange={(e) => setResultado(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold text-slate-700 text-sm"
                    >
                      <option value="PENDIENTE">PENDIENTE DE RESULTADO</option>
                      <option value="NEGATIVO">NEGATIVO (Normal / Citología Benigna)</option>
                      <option value="ASC-US">ASC-US (Células Escamosas Atípicas Indeterminadas)</option>
                      <option value="ASC-H">ASC-H (Células Escamosas Atípicas no descartan Alto Grado)</option>
                      <option value="L-SIL">L-SIL / LIEBG (Lesión Intraepitelial de Bajo Grado / VPH / NIC 1)</option>
                      <option value="H-SIL">H-SIL / LIEAG (Lesión de Alto Grado / NIC 2 - NIC 3 / Ca in situ)</option>
                      <option value="AGC">AGC (Células Glandulares Atípicas)</option>
                      <option value="AIS">AIS (Adenocarcinoma endocervical in situ)</option>
                      <option value="CANCER_INVASOR">Sospecha de Carcinoma Escamoso Invasor</option>
                    </select>
                  ) : (
                    <select
                      value={resultado}
                      onChange={(e) => setResultado(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold text-slate-700 text-sm"
                    >
                      <option value="PENDIENTE">PENDIENTE DE RESULTADO</option>
                      <option value="NEGATIVO">NEGATIVO (Ausencia de VPH Oncogénicos)</option>
                      <option value="POSITIVO_16_18">POSITIVO para VPH Genotipos 16 o 18</option>
                      <option value="POSITIVO_OTROS">POSITIVO para Otros VPH Alto Riesgo (AR)</option>
                    </select>
                  )}
                </div>

                {/* Fecha de Resultado (Condicional si no está PENDIENTE) */}
                {resultado !== "PENDIENTE" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha del Resultado</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="date"
                        value={fechaResultado}
                        onChange={(e) => setFechaResultado(e.target.value)}
                        min={fechaPap}
                        max={getLocalDateString()}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-medium text-slate-700 text-sm"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Alerta de Derivación a UPC (Condicional si resultado es patológico/alterado) */}
            {adecuacionMuestra === "SATISFACTORIA" && resultado !== "NEGATIVO" && resultado !== "PENDIENTE" && (
              <div className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-red-800 text-sm uppercase">Resultado Alterado (Alerta de Seguimiento)</h4>
                    <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                      El resultado ingresado requiere control, repetir o derivación prioritaria a la **Unidad de Patología Cervical (UPC)** del hospital base correspondiente para Colposcopía y/o Biopsia.
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-red-200 pt-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="derivadoUpc"
                      checked={derivadoUpc}
                      onChange={(e) => setDerivadoUpc(e.target.checked)}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-slate-300 rounded"
                    />
                    <label htmlFor="derivadoUpc" className="text-sm font-bold text-slate-700 select-none">
                      ¿La paciente fue derivada a UPC?
                    </label>
                  </div>

                  {derivadoUpc && (
                    <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in duration-200">
                      <label className="text-xs font-black text-slate-400 uppercase whitespace-nowrap">Fecha Derivación</label>
                      <input
                        type="date"
                        value={fechaDerivacionUpc}
                        onChange={(e) => setFechaDerivacionUpc(e.target.value)}
                        min={fechaPap}
                        max={getLocalDateString()}
                        className="px-3 py-1.5 bg-white border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-700 font-medium"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Observaciones Clínicas</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                maxLength={2000}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-medium h-24 text-slate-700 text-sm"
                placeholder="Indique tratamientos previos, antecedentes familiares de CaCu, síntomas o detalles clínicos de relevancia..."
              />
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} />
              {saveError}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100 shadow-sm">
              <CheckCircle size={16} />
              ¡Tamizaje clínico registrado con éxito en el Programa de la Mujer! Redirigiendo...
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/mujer")}
              className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? "Guardando Registro..." : "Registrar Examen"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


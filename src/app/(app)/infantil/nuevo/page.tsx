"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buscarPacienteInfantilPorRut, guardarControlInfantil } from "@/actions/infantilActions";
import { Baby, Search, ArrowLeft, Save, AlertCircle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function NuevoControlInfantilPage() {
  const router = useRouter();
  const [rutBusqueda, setRutBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pacienteInfo, setPacienteInfo] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form states
  const [proximoControl, setProximoControl] = useState("");
  const [estamentoProximoControl, setEstamentoProximoControl] = useState("");
  
  const [dsmResultado, setDsmResultado] = useState("");
  const [tipoEvaluacionDsm, setTipoEvaluacionDsm] = useState("");
  
  // DSM Extended states
  const [eedpLenguaje, setEedpLenguaje] = useState("Normal");
  const [eedpSocial, setEedpSocial] = useState("Normal");
  const [eedpCoordinacion, setEedpCoordinacion] = useState("Normal");
  const [eedpMotricidad, setEedpMotricidad] = useState("Normal");
  
  const [tepsiLenguaje, setTepsiLenguaje] = useState("Normal");
  const [tepsiCoordinacion, setTepsiCoordinacion] = useState("Normal");
  const [tepsiMotricidad, setTepsiMotricidad] = useState("Normal");

  const [mchatResultado, setMchatResultado] = useState("Bajo");
  const [obsTea, setObsTea] = useState(false);

  // Estados condicionales por edad
  const [scoreIra, setScoreIra] = useState("");
  const [lme, setLme] = useState(false);
  const [presionArterial, setPresionArterial] = useState("Normal (PA menor al percentil 90)");

  const [estadoNutricional, setEstadoNutricional] = useState("Normal");
  
  const [esNaneas, setEsNaneas] = useState(false);
  const [esCasoSocial, setEsCasoSocial] = useState(false);
  const [enSalaEstimulacion, setEnSalaEstimulacion] = useState(false);
  const [condicionEspecial, setCondicionEspecial] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const handleBuscar = async () => {
    if (!rutBusqueda) return;
    setBuscando(true);
    setPacienteInfo(null);
    setErrorBusqueda(null);
    try {
      const res = await buscarPacienteInfantilPorRut(rutBusqueda);
      if (res.error || !res.data) {
        toast.error(res.error || "Paciente no encontrado");
        setErrorBusqueda(res.error || "Paciente no encontrado");
      } else {
        const p = res.data;
        setPacienteInfo(p);
        
        // Cargar flags actuales
        setEsNaneas(p.es_naneas || false);
        setEsCasoSocial(p.es_caso_social || false);
        setEnSalaEstimulacion(p.en_sala_estimulacion || false);
        setCondicionEspecial(p.condicion_especial || "");
      }
    } catch (error) {
      toast.error("Error al buscar paciente");
      setErrorBusqueda("Error de red");
    } finally {
      setBuscando(false);
    }
  };

  const handleGuardar = async () => {
    if (!pacienteInfo) return;
    
    setGuardando(true);
    try {
      let dsmDetalle: any = {};
      
      if (tipoEvaluacionDsm === "TEPSI") {
        dsmDetalle = {
          lenguaje: tepsiLenguaje,
          coordinacion: tepsiCoordinacion,
          motricidad: tepsiMotricidad
        };
      } else if (tipoEvaluacionDsm === "EEDP") {
        const reqMchat = eedpLenguaje === "Alterado" || eedpSocial === "Alterado";
        dsmDetalle = {
          lenguaje: eedpLenguaje,
          social: eedpSocial,
          coordinacion: eedpCoordinacion,
          motricidad: eedpMotricidad,
          mchat: reqMchat ? mchatResultado : null,
          obsTea: reqMchat ? obsTea : false
        };
      }

      // Payload dinámico
      if (pacienteInfo.edad_anios === 0 && pacienteInfo.edad_meses <= 6) {
        dsmDetalle = {
          ...dsmDetalle,
          score_ira: scoreIra,
          lme: lme
        };
      }

      if (pacienteInfo.edad_anios >= 3) {
        dsmDetalle = {
          ...dsmDetalle,
          presion_arterial: presionArterial
        };
      }

      const resControl = await guardarControlInfantil({
        rut_paciente: pacienteInfo.rut,
        ultimo_control_medico: pacienteInfo.hist_medico || null,
        ultimo_control_enfermera: pacienteInfo.hist_enfermera || null,
        ultimo_control_nutri: pacienteInfo.hist_nutri || null,
        ultimo_control_dental: pacienteInfo.hist_dental || null,
        atencion_hoy: true,
        proximo_control: proximoControl ? `${proximoControl}-01` : null,
        estamento_proximo_control: estamentoProximoControl || null,
        es_naneas: esNaneas,
        es_caso_social: esCasoSocial,
        en_sala_estimulacion: enSalaEstimulacion,
        condicion_especial: condicionEspecial || null,
        estado_nutricional: estadoNutricional,
        dsm_resultado: dsmResultado || null,
        tipo_evaluacion_dsm: tipoEvaluacionDsm || null,
        dsm_detalle: dsmDetalle,
        observaciones: observaciones,
        estado_programa: "ACTIVO"
      });

      if (resControl.error) {
        toast.error(resControl.error);
      } else {
        setShowSuccessModal(true);
        // Limpiar el form para el proximo registro
        setRutBusqueda("");
        setPacienteInfo(null);
        setDsmResultado("");
        setTipoEvaluacionDsm("");
        setEstadoNutricional("Normal");
        setProximoControl("");
        setEstamentoProximoControl("");
        setObservaciones("");
        setEnSalaEstimulacion(false);
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button 
            onClick={() => router.push('/infantil')}
            className="mr-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
              <Baby className="mr-3 text-pink-600" size={28} />
              Registrar Control Infantil
            </h1>
            <p className="text-slate-500 mt-1">Ingresa el RUT para cargar el historial y registrar una nueva atención</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex gap-4 max-w-2xl">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="RUT del paciente (ej: 12345678-9)"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-slate-200 rounded-xl font-mono text-lg focus:ring-pink-500 focus:border-pink-500"
              value={rutBusqueda}
              onChange={(e) => setRutBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </div>
          <button
            onClick={handleBuscar}
            disabled={buscando || !rutBusqueda}
            className="bg-slate-800 hover:bg-slate-900 text-white px-8 rounded-xl font-bold transition disabled:opacity-50 whitespace-nowrap"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {errorBusqueda && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start text-red-600">
            <AlertCircle size={20} className="mr-2 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No se encontró el paciente</p>
              <p className="text-sm opacity-80">Verifica el RUT ingresado o asegúrate de que esté registrado en el Directorio Maestro.</p>
            </div>
          </div>
        )}
      </div>

      {pacienteInfo && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Tarjeta Resumen del Paciente */}
          <div className="bg-gradient-to-br from-pink-50 to-white p-6 rounded-2xl border border-pink-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase mb-1">{pacienteInfo.nombre_completo}</h2>
                <div className="flex items-center text-sm text-slate-500 gap-4 font-medium">
                  <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">{pacienteInfo.rut}-{pacienteInfo.dv}</span>
                  <span>{pacienteInfo.edad_anios} Años, {pacienteInfo.edad_meses} Meses</span>
                  <span className="uppercase text-pink-600 font-bold bg-pink-100 px-2 py-0.5 rounded">{pacienteInfo.sector}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-6">
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Últimos Controles Registrados</label>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="font-semibold text-slate-600">Enfermera</span>
                    <span className="font-mono text-slate-400">{pacienteInfo.hist_enfermera || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="font-semibold text-slate-600">Médico</span>
                    <span className="font-mono text-slate-400">{pacienteInfo.hist_medico || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="font-semibold text-slate-600">Nutricionista</span>
                    <span className="font-mono text-slate-400">{pacienteInfo.hist_nutri || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-600">Dental</span>
                    <span className="font-mono text-slate-400">{pacienteInfo.hist_dental || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Alertas Clínicas Actuales</label>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={esNaneas} onChange={(e) => setEsNaneas(e.target.checked)} className="rounded border-slate-300 text-pink-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-bold text-sm text-slate-700">NANEAS</div>
                      <div className="text-[10px] text-slate-500">N. Especiales</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={esCasoSocial} onChange={(e) => setEsCasoSocial(e.target.checked)} className="rounded border-slate-300 text-pink-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-bold text-sm text-slate-700">Social</div>
                      <div className="text-[10px] text-slate-500">Alerta seguim.</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={enSalaEstimulacion} onChange={(e) => setEnSalaEstimulacion(e.target.checked)} className="rounded border-slate-300 text-pink-600 w-5 h-5 mr-3" />
                    <div>
                      <div className="font-bold text-sm text-slate-700">Sala Estimulación</div>
                      <div className="text-[10px] text-slate-500">Activo</div>
                    </div>
                  </label>
                  <div className="col-span-3">
                    <input 
                      type="text" 
                      placeholder="Condición Especial (Ej: Alergia a la proteína de leche de vaca)" 
                      value={condicionEspecial} 
                      onChange={(e) => setCondicionEspecial(e.target.value)} 
                      className="w-full text-sm border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            
            {/* Desarrollo Psicomotor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="font-black text-slate-800 uppercase flex items-center border-b pb-3">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-md flex items-center justify-center mr-2 text-xs">1</span>
                Desarrollo Psicomotor (DSM)
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Evaluación o Test Realizado</label>
                <select 
                  value={tipoEvaluacionDsm} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setTipoEvaluacionDsm(val);
                    if (val === "Pauta Breve" && !["Normal", "Alterado"].includes(dsmResultado)) {
                      setDsmResultado("");
                    } else if (val !== "Pauta Breve" && dsmResultado === "Alterado") {
                      setDsmResultado("");
                    }
                  }} 
                  className="w-full rounded-xl border-slate-200"
                >
                  <option value="">No Evaluado / Sin Registro de Instrumento</option>
                  <option value="Pauta Breve">Pauta Breve</option>
                  <option value="EEDP">EEDP</option>
                  <option value="TEPSI">TEPSI</option>
                </select>
              </div>

              {tipoEvaluacionDsm === "EEDP" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Lenguaje</label>
                    <select value={eedpLenguaje} onChange={e => setEedpLenguaje(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Alterado">Alterado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Social</label>
                    <select value={eedpSocial} onChange={e => setEedpSocial(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Alterado">Alterado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Coordinación</label>
                    <select value={eedpCoordinacion} onChange={e => setEedpCoordinacion(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Alterado">Alterado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Motricidad</label>
                    <select value={eedpMotricidad} onChange={e => setEedpMotricidad(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Alterado">Alterado</option>
                    </select>
                  </div>
                </div>
              )}

              {tipoEvaluacionDsm === "TEPSI" && (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Lenguaje</label>
                    <select value={tepsiLenguaje} onChange={e => setTepsiLenguaje(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Riesgo">Riesgo</option>
                      <option value="Retraso">Retraso</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Coordinación</label>
                    <select value={tepsiCoordinacion} onChange={e => setTepsiCoordinacion(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Riesgo">Riesgo</option>
                      <option value="Retraso">Retraso</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Motricidad</label>
                    <select value={tepsiMotricidad} onChange={e => setTepsiMotricidad(e.target.value)} className="w-full text-sm rounded-lg border-slate-200 py-1.5">
                      <option value="Normal">Normal</option>
                      <option value="Riesgo">Riesgo</option>
                      <option value="Retraso">Retraso</option>
                    </select>
                  </div>
                </div>
              )}

              {tipoEvaluacionDsm === "EEDP" && (eedpLenguaje === "Alterado" || eedpSocial === "Alterado") && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center">
                    <AlertCircle size={14} className="mr-1.5" /> 
                    Corresponde aplicar M-CHAT-R
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-700 mb-1">Riesgo TEA (Puntaje M-CHAT-R)</label>
                      <select value={mchatResultado} onChange={e => setMchatResultado(e.target.value)} className="w-full text-sm rounded-lg border-amber-200 bg-white py-1.5 text-amber-900">
                        <option value="Bajo">Bajo (0-2 puntos)</option>
                        <option value="Medio">Medio (3-7 puntos)</option>
                        <option value="Alto">Alto (8-20 puntos)</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={obsTea} onChange={e => setObsTea(e.target.checked)} className="rounded border-amber-300 text-amber-600 mr-2" />
                        <span className="text-sm font-semibold text-amber-900">Derivar a Confirmación (Observación TEA)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Resultado Global DSM</label>
                <select 
                  value={dsmResultado} 
                  onChange={(e) => setDsmResultado(e.target.value)} 
                  className={`w-full rounded-xl font-medium ${
                    !dsmResultado ? 'border-slate-200 text-slate-500' :
                    dsmResultado === "Normal" ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 
                    dsmResultado === "Rezago" ? 'border-amber-300 bg-amber-50 text-amber-700' : 
                    'border-red-300 bg-red-50 text-red-700'
                  }`}
                >
                  <option value="">Seleccionar Resultado DSM...</option>
                  <option value="Normal">Desarrollo Normal</option>
                  {tipoEvaluacionDsm === "Pauta Breve" ? (
                    <option value="Alterado">Alterado</option>
                  ) : tipoEvaluacionDsm ? (
                    <>
                      <option value="Rezago">Rezago del Desarrollo</option>
                      <option value="Riesgo">Riesgo de Retraso</option>
                      <option value="Retraso">Retraso del Desarrollo</option>
                    </>
                  ) : null}
                </select>
              </div>
            </div>

            {/* Nutricional y Físico */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 flex flex-col">
              <h3 className="font-black text-slate-800 uppercase flex items-center border-b pb-3">
                <span className="bg-emerald-100 text-emerald-600 w-6 h-6 rounded-md flex items-center justify-center mr-2 text-xs">2</span>
                Estado Nutricional
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Diagnóstico Nutricional Integrado</label>
                <select 
                  value={estadoNutricional} 
                  onChange={(e) => setEstadoNutricional(e.target.value)} 
                  className={`w-full rounded-xl font-medium ${
                    estadoNutricional === "Normal" ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 
                    estadoNutricional === "Sobrepeso" || estadoNutricional.includes("Riesgo") ? 'border-amber-300 bg-amber-50 text-amber-700' : 
                    'border-red-300 bg-red-50 text-red-700'
                  }`}
                >
                  <option value="Normal">Eutrófico (Normal)</option>
                  <option value="Riesgo Desnutrir">Riesgo de Desnutrir</option>
                  <option value="Desnutrición">Desnutrición</option>
                  <option value="Sobrepeso">Sobrepeso</option>
                  <option value="Obesidad">Obesidad</option>
                  <option value="Obesidad Severa">Obesidad Severa</option>
                </select>
              </div>

              {/* Controles Condicionales por Edad */}
              {pacienteInfo.edad_anios === 0 && pacienteInfo.edad_meses <= 6 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-auto">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Controles Lactante Menor</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-semibold text-slate-700">Lactancia Materna Exclusiva (LME)</span>
                      <input type="checkbox" checked={lme} onChange={e => setLme(e.target.checked)} className="rounded border-slate-300 text-pink-600 w-5 h-5" />
                    </label>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Score IRA</label>
                      <select value={scoreIra} onChange={e => setScoreIra(e.target.value)} className="w-full text-sm rounded-lg border-slate-200">
                        <option value="">Seleccionar...</option>
                        <option value="Leve">Leve</option>
                        <option value="Moderado">Moderado</option>
                        <option value="Grave">Grave</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {pacienteInfo.edad_anios >= 3 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-auto">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Control Presión Arterial (Desde 3 años)</h4>
                  <select value={presionArterial} onChange={e => setPresionArterial(e.target.value)} className="w-full text-sm rounded-lg border-slate-200">
                    <option value="Normal (PA menor al percentil 90)">Normal (PA menor al percentil 90)</option>
                    <option value="PA elevada">PA elevada</option>
                    <option value="HTA estadio I">HTA estadio I</option>
                    <option value="HTA estadio II">HTA estadio II</option>
                  </select>
                </div>
              )}

            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-black text-slate-800 uppercase flex items-center border-b pb-3">
              <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-md flex items-center justify-center mr-2 text-xs">3</span>
              Agendamiento y Observaciones
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Próximo Control Programado</label>
                <div className="flex gap-3">
                  <input 
                    type="month" 
                    min={new Date().toISOString().substring(0, 7)}
                    value={proximoControl} 
                    onChange={(e) => setProximoControl(e.target.value)} 
                    className="flex-1 rounded-xl border-slate-200"
                  />
                  <select 
                    value={estamentoProximoControl} 
                    onChange={(e) => setEstamentoProximoControl(e.target.value)} 
                    className="flex-1 rounded-xl border-slate-200"
                  >
                    <option value="">Estamento...</option>
                    <option value="MEDICO">Médico</option>
                    <option value="ENFERMERA">Enfermera</option>
                    <option value="NUTRICIONISTA">Nutricionista</option>
                    <option value="DENTAL">Dental</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Opcional. Si el paciente queda de alta o requiere interconsulta, puedes omitir la fecha de próximo control.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Observaciones Clínicas (Opcional)</label>
                <textarea 
                  value={observaciones} 
                  onChange={(e) => setObservaciones(e.target.value)} 
                  rows={3} 
                  placeholder="Detalles relevantes de la atención, indicaciones especiales..."
                  className="w-full rounded-xl border-slate-200"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 pt-6">
            <button 
              onClick={() => router.push('/infantil')}
              className="px-5 py-2.5 rounded-lg font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition flex items-center disabled:opacity-50"
            >
              {guardando ? "Guardando..." : <><Save size={18} className="mr-2" /> Guardar Control</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Éxito Moderno */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 mb-6 animate-bounce">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">¡Registro Exitoso!</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                El control infantil ha sido procesado y guardado correctamente en el historial clínico del paciente.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-pink-200 hover:bg-pink-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Entendido, Continuar Registrando
                </button>
                <button 
                   onClick={() => {
                     router.push("/infantil");
                     router.refresh();
                   }}
                   className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Volver al Tarjetero
                </button>
              </div>
            </div>
            <div className="bg-slate-50 py-4 px-8 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
              GIA Belarmina • Gestión Integral APS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buscarPacienteInfantilPorRut, guardarControlInfantil } from "@/actions/infantilActions";
import { Baby, Search, ArrowLeft, Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function NuevoControlInfantilPage() {
  const router = useRouter();
  const [rutBusqueda, setRutBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pacienteInfo, setPacienteInfo] = useState<any>(null);

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
        // Postgres EXTRACT devuelve numeric (string en JS), así que los convertimos a Number
        p.edad_anios = Number(p.edad_anios);
        p.edad_meses = Number(p.edad_meses);
        p.edad_dias = Number(p.edad_dias);
        
        if (p.edad_anios >= 10) {
          setErrorBusqueda(`El paciente ${p.nombre_completo} tiene ${p.edad_anios} años y ya no corresponde al programa infantil.`);
          return;
        }
        setPacienteInfo(p);
        setEsNaneas(p.es_naneas || false);
        setEsCasoSocial(p.es_caso_social || false);
        toast.success("Paciente encontrado");
      }
    } catch (error) {
      toast.error("Error al buscar paciente");
    } finally {
      setBuscando(false);
    }
  };

  const handleGuardar = async () => {
    if (!pacienteInfo) return;
    setGuardando(true);

    try {
      let dsmDetalle: any = {
        score_ira: (pacienteInfo.edad_anios === 0) ? (scoreIra || null) : null,
        lme: (pacienteInfo.edad_anios === 0 && (pacienteInfo.edad_meses === 6 || pacienteInfo.edad_meses === 7)) ? lme : null,
        presion_arterial: (pacienteInfo.edad_anios >= 3) ? presionArterial : null
      };

      if (tipoEvaluacionDsm === "EEDP") {
        const reqMchat = eedpLenguaje === "Alterado" || eedpSocial === "Alterado";
        dsmDetalle = {
          ...dsmDetalle,
          lenguaje: eedpLenguaje,
          social: eedpSocial,
          coordinacion: eedpCoordinacion,
          motricidad: eedpMotricidad,
          mchat: reqMchat ? mchatResultado : null,
          obsTea: reqMchat ? obsTea : false
        };
      } else if (tipoEvaluacionDsm === "TEPSI") {
        dsmDetalle = {
          ...dsmDetalle,
          lenguaje: tepsiLenguaje,
          coordinacion: tepsiCoordinacion,
          motricidad: tepsiMotricidad
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
        toast.success("Registro guardado exitosamente");
        router.push("/infantil");
        router.refresh();
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => router.push('/infantil')} 
          className="mr-4 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Registrar Control Infantil</h1>
          <p className="text-slate-500">Actualizar hitos y datos de niño sano</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">RUT del Paciente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: 21.123.456-7"
                className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 font-mono"
                value={rutBusqueda}
                onChange={(e) => setRutBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              />
            </div>
          </div>
          <button
            onClick={handleBuscar}
            disabled={buscando || !rutBusqueda}
            className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 transition flex items-center h-[42px]"
          >
            {buscando ? "Buscando..." : <><Search size={18} className="mr-2" /> Buscar</>}
          </button>
        </div>

        {pacienteInfo && (
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-4 bg-pink-50 text-pink-800 p-4 rounded-lg border border-pink-100">
              <Baby size={32} className="text-pink-400" />
              <div>
                <h3 className="font-bold text-lg">{pacienteInfo.nombre_completo}</h3>
                <p className="text-sm font-mono opacity-80">{pacienteInfo.rut}-{pacienteInfo.dv} • {pacienteInfo.edad_anios} años, {pacienteInfo.edad_meses} meses, {pacienteInfo.edad_dias} días</p>
              </div>
            </div>
          </div>
        )}

        {errorBusqueda && !pacienteInfo && (
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-4 bg-amber-50 text-amber-800 p-4 rounded-lg border border-amber-200">
              <AlertCircle size={32} className="text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Atención Requerida</h3>
                <p className="text-sm opacity-90">{errorBusqueda}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {pacienteInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Banderas Especiales */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Banderas Clínicas</h3>
              <div className="flex gap-8 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={esNaneas} onChange={(e) => setEsNaneas(e.target.checked)} className="w-5 h-5 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500" />
                  <span className="font-medium text-slate-700">Paciente NANEAS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={esCasoSocial} onChange={(e) => setEsCasoSocial(e.target.checked)} className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500" />
                  <span className="font-medium text-slate-700">Caso Social</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Condición Especial (Ej: Prematurez, Síndrome)</label>
                <input type="text" placeholder="Describir condición si aplica..." value={condicionEspecial} onChange={(e) => setCondicionEspecial(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm" />
              </div>
            </div>

            {/* Indicadores por Edad */}
            {(pacienteInfo.edad_anios === 0 || pacienteInfo.edad_anios >= 3) && (
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Indicadores Específicos por Edad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Para Lactantes */}
                  {pacienteInfo.edad_anios === 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Score IRA</label>
                        <select value={scoreIra} onChange={(e) => setScoreIra(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                          <option value="">Sin Score</option>
                          <option value="Leve">Leve</option>
                          <option value="Moderado">Moderado</option>
                          <option value="Grave">Grave</option>
                        </select>
                      </div>
                      
                      {(pacienteInfo.edad_meses === 6 || pacienteInfo.edad_meses === 7) && (
                        <div className="flex items-center pt-0 md:pt-6">
                          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-md shadow-sm w-full">
                            <input type="checkbox" checked={lme} onChange={(e) => setLme(e.target.checked)} className="w-5 h-5 text-fuchsia-600 border-slate-300 rounded focus:ring-fuchsia-500" />
                            <span className="font-medium text-slate-700 text-sm">Lactancia Materna Exclusiva (LME)</span>
                          </label>
                        </div>
                      )}
                    </>
                  )}

                  {/* Para 3 años o más */}
                  {pacienteInfo.edad_anios >= 3 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Presión Arterial (PA)</label>
                      <select value={presionArterial} onChange={(e) => setPresionArterial(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                        <option>Normal (PA menor al percentil 90)</option>
                        <option>PA elevada</option>
                        <option>HTA estadio I</option>
                        <option>HTA estadio II</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Evaluaciones */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Desarrollo Psicomotor (DSM)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evaluación</label>
                  <select value={tipoEvaluacionDsm} onChange={(e) => {
                      const val = e.target.value;
                      setTipoEvaluacionDsm(val);
                      if (val === "Pauta Breve" && !["Normal", "Alterado"].includes(dsmResultado)) {
                        setDsmResultado("");
                      } else if (val !== "Pauta Breve" && dsmResultado === "Alterado") {
                        setDsmResultado("");
                      }
                    }} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                    <option value="">Seleccionar...</option>
                    <option>Pauta Breve</option>
                    <option>EEDP</option>
                    <option>TEPSI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resultado DSM Global</label>
                  <select value={dsmResultado} onChange={(e) => setDsmResultado(e.target.value)} disabled={!tipoEvaluacionDsm} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                    <option value="">Seleccionar...</option>
                    <option>Normal</option>
                    {tipoEvaluacionDsm === "Pauta Breve" ? (
                      <option>Alterado</option>
                    ) : tipoEvaluacionDsm ? (
                      <>
                        <option>Riesgo</option>
                        <option>Rezago</option>
                        <option>Retraso</option>
                      </>
                    ) : null}
                  </select>
                </div>
              </div>

              {/* Detalle EEDP */}
              {tipoEvaluacionDsm === "EEDP" && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Detalle de Áreas EEDP</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Lenguaje</label>
                      <select value={eedpLenguaje} onChange={(e) => setEedpLenguaje(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Social</label>
                      <select value={eedpSocial} onChange={(e) => setEedpSocial(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Coordinación</label>
                      <select value={eedpCoordinacion} onChange={(e) => setEedpCoordinacion(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Motricidad</label>
                      <select value={eedpMotricidad} onChange={(e) => setEedpMotricidad(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                  </div>

                  {(eedpLenguaje === "Alterado" || eedpSocial === "Alterado") && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1 w-full">
                          <label className="block text-sm font-medium text-amber-700 mb-1">
                            <AlertCircle className="inline-block w-4 h-4 mr-1 mb-1" />
                            Resultado M-CHAT (Requerido por alteración Lenguaje/Social)
                          </label>
                          <select value={mchatResultado} onChange={(e) => setMchatResultado(e.target.value)} className="w-full border-amber-300 bg-amber-50 text-amber-900 rounded-md shadow-sm text-sm focus:ring-amber-500 focus:border-amber-500">
                            <option>Bajo</option>
                            <option>Moderado</option>
                            <option>Alto</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 mt-4 md:mt-0 pt-0 md:pt-6">
                          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-md shadow-sm">
                            <input type="checkbox" checked={obsTea} onChange={(e) => setObsTea(e.target.checked)} className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                            <span className="font-medium text-slate-700 text-sm">Obs. TEA</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detalle TEPSI */}
              {tipoEvaluacionDsm === "TEPSI" && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Detalle de Áreas TEPSI</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Lenguaje</label>
                      <select value={tepsiLenguaje} onChange={(e) => setTepsiLenguaje(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Coordinación</label>
                      <select value={tepsiCoordinacion} onChange={(e) => setTepsiCoordinacion(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Motricidad</label>
                      <select value={tepsiMotricidad} onChange={(e) => setTepsiMotricidad(e.target.value)} className="w-full border-slate-300 text-sm rounded">
                        <option>Normal</option>
                        <option>Alterado</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-1">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Estado Nutricional</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico Nutricional</label>
                  <select value={estadoNutricional} onChange={(e) => setEstadoNutricional(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                    <option>Normal</option>
                    <option>Riesgo de Desnutrición</option>
                    <option>Desnutrición</option>
                    <option>Sobrepeso</option>
                    <option>Obesidad</option>
                    <option>Obesidad Severa</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Agendamiento */}
            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center"><AlertCircle size={16} className="mr-2 text-slate-500" /> Próximo Control</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mes y Año (Correspondiente)</label>
                  <input 
                    type="month" 
                    min={new Date().toISOString().substring(0, 7)}
                    value={proximoControl} 
                    onChange={(e) => setProximoControl(e.target.value)} 
                    className="w-full border-slate-300 rounded-md shadow-sm text-sm" 
                  />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estamento</label>
                    <select value={estamentoProximoControl} onChange={(e) => setEstamentoProximoControl(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm">
                      <option value="">Sin asignar / Seleccionar...</option>
                      <option value="MEDICO">MEDICO</option>
                      <option value="ENFERMERA">ENFERMERA</option>
                      <option value="NUTRICIONISTA">NUTRICIONISTA</option>
                      <option value="DENTAL">DENTAL</option>
                    </select>
                  </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
              <textarea 
                rows={3} 
                value={observaciones} 
                onChange={(e) => setObservaciones(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm text-sm p-3"
                placeholder="Indique si hay derivaciones o aspectos relevantes del control..."
              />
            </div>

          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
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
    </div>
  );
}

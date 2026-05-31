"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Download, UserMinus, History, CheckCircle, AlertCircle, X, ShieldCheck, UserCheck, Trash2, UserPlus, Edit2, Phone, Calendar, Hash, ClipboardList } from "lucide-react";
import { egresarPaciente, validarPaciente, eliminarPacienteProvisorio, upsertPaciente, PacienteData } from "@/actions/pacientesActions";
import { UserProfile } from "@/actions/userActions";

const calculateAge = (birthDate: string | Date | null) => {
  if (!birthDate) return "-";
  
  let birthYear, birthMonth, birthDay;

  try {
    if (birthDate instanceof Date) {
      birthYear = birthDate.getFullYear();
      birthMonth = birthDate.getMonth() + 1;
      birthDay = birthDate.getDate();
    } else {
      const parts = String(birthDate).split(/[-T ]/);
      if (parts.length < 3) return "-";
      birthYear = parseInt(parts[0]);
      birthMonth = parseInt(parts[1]);
      birthDay = parseInt(parts[2]);
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--;
    }
    return isNaN(age) ? "-" : age;
  } catch (e) {
    return "-";
  }
};

export default function DirectorioClientView({ pacientes, user }: { pacientes: any[], user: UserProfile }) {
  const [searchRut, setSearchRut] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");
  const [tab, setTab] = useState<"activos" | "egresados" | "pendientes">("activos");
  const [isEgresando, setIsEgresando] = useState<string | null>(null);
  const [isValidando, setIsValidando] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState<any | null>(null);
  const [formData, setFormData] = useState<PacienteData>({
    rut: "", dv: "", nombre_completo: "", fecha_nacimiento: "", sexo: "MASCULINO", sector: "ARQUILHUE", telefono: "", direccion: "", es_pad: false
  });
  const [motivoEgreso, setMotivoEgreso] = useState("Fallecimiento");
  const [loading, setLoading] = useState(false);

  // Get distinct sectors for the filter
  const sectors = useMemo(() => {
    const s = new Set(pacientes.map(p => p.sector));
    return ["Todos", ...Array.from(s).sort()];
  }, [pacientes]);

  const filtered = useMemo(() => {
    return pacientes.filter(p => {
      let matchTab = false;
      if (tab === "activos") matchTab = (p as any).estado === "ACTIVO" && (p as any).estado_registro === "OFICIAL";
      if (tab === "egresados") matchTab = (p as any).estado === "EGRESADO";
      if (tab === "pendientes") matchTab = (p as any).estado_registro === "PROVISORIO";
      
      const qRut = searchRut.replace(/[-.]/g, "").toLowerCase();
      const matchRut = p.rut.toLowerCase().includes(qRut);
      const matchName = p.nombre_completo.toLowerCase().includes(searchName.toLowerCase());
      const matchSector = filterSector === "Todos" || p.sector === filterSector;
      return matchTab && matchRut && matchName && matchSector;
    });
  }, [pacientes, searchRut, searchName, filterSector, tab]);

  const handleEgreso = async () => {
    if (!isEgresando) return;
    setLoading(true);
    const res = await egresarPaciente(isEgresando, motivoEgreso);
    setLoading(false);
    if (!res.success) alert("Error al egresar: " + res.error);
  };

  const handleOpenValidar = (p: any) => {
    setIsValidando(p);
    setFormData({
      rut: p.rut,
      dv: p.dv,
      nombre_completo: p.nombre_completo,
      fecha_nacimiento: p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toISOString().split('T')[0] : "",
      sexo: p.sexo || "MASCULINO",
      sector: p.sector,
      telefono: p.telefono || "",
      direccion: p.direccion || "",
      es_pad: p.es_pad || false
    });
  };

  const handleValidarConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidando) return;
    setLoading(true);
    const res = await validarPaciente(
        isValidando.rut, 
        formData.rut, 
        formData.dv, 
        formData.nombre_completo, 
        formData.fecha_nacimiento || "", 
        formData.sexo, 
        formData.sector, 
        formData.telefono
    );
    setLoading(false);
    if (res.success) {
      setIsValidando(null);
    } else {
      alert("Error al validar: " + res.error);
    }
  };

  const handleOpenNuevo = () => {
    setIsEditing("NUEVO");
    setFormData({
      rut: "", dv: "", nombre_completo: "", fecha_nacimiento: "", sexo: "MASCULINO", sector: "ARQUILHUE", telefono: "", direccion: "", es_pad: false
    });
  };

  const handleOpenEdit = (p: any) => {
    setIsEditing(p);
    setFormData({
      rut: p.rut,
      dv: p.dv,
      nombre_completo: p.nombre_completo,
      fecha_nacimiento: p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toISOString().split('T')[0] : "",
      sexo: p.sexo || "MASCULINO",
      sector: p.sector,
      telefono: p.telefono || "",
      direccion: p.direccion || "",
      es_pad: p.es_pad || false
    });
  };

  const handleSavePaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await upsertPaciente(formData);
    setLoading(false);
    if (res.success) {
      setIsEditing(null);
    } else {
      alert("Error al guardar: " + res.error);
    }
  };

  const handleRechazar = async (rut: string) => {
    if (!confirm("¿Deseas rechazar y ELIMINAR este registro provisorio? Se perderá la vinculación clínica.")) return;
    setLoading(true);
    const res = await eliminarPacienteProvisorio(rut);
    setLoading(false);
    if (!res.success) alert("Error al eliminar: " + res.error);
  };

  // Derived stats
  const totalPacientes = pacientes.length;
  // This could be any other stat. For now let's mimic the prototype:
  const stat1 = totalPacientes; // Total
  const stat2 = pacientes.filter(p => p.sexo === "FEMENINO").length; // Females
  const stat3 = pacientes.filter(p => p.sexo === "MASCULINO").length; // Males
  const stat4 = pacientes.filter(p => {
    const age = calculateAge(p.fecha_nacimiento);
    return typeof age === 'number' ? age >= 65 : Number(age) >= 65;
  }).length; // Elderly

  return (
    <div className="flex flex-col space-y-6">
      <div className="px-6 pt-6 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <ClipboardList className="mr-2 text-blue-500" size={18} /> Gestión de Padrón
        </h2>
        {(user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO") && (
          <button 
            onClick={handleOpenNuevo}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-blue-700 transition shadow-lg shadow-blue-100"
          >
            <UserPlus size={16} className="mr-2" /> Nuevo Paciente
          </button>
        )}
      </div>
      {/* Target Stats Header to mimic prototype */}
      <div className="grid grid-cols-4 gap-4 px-6 pt-4">
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-800">{stat1.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Inscritos Totales</p>
        </div>
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-700">{stat2.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Mujeres</p>
        </div>
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-700">{stat3.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Hombres</p>
        </div>
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-700">{stat4.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Adultos Mayores (65+)</p>
        </div>
      </div>

      {/* Banner de Alerta para Pendientes */}
      {pacientes.some(p => p.estado_registro === 'PROVISORIO') && (
        <div className="mx-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between animate-pulse">
           <div className="flex items-center">
              <AlertCircle className="text-orange-500 mr-3" size={20} />
              <div>
                <p className="text-sm font-bold text-orange-800 uppercase tracking-tight">Atención Percápita</p>
                <p className="text-xs text-orange-600">Hay pacientes capturados en Box que requieren validación oficial.</p>
              </div>
           </div>
           <button onClick={() => setTab("pendientes")} className="text-xs font-black text-white bg-orange-500 px-4 py-2 rounded-xl hover:bg-orange-600 transition uppercase">
             Revisar Ahora
           </button>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="px-6 flex items-center space-x-1">
        <button 
          onClick={() => setTab("activos")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-bold transition-colors ${tab === "activos" ? 'bg-white text-blue-600 border-x border-t border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <CheckCircle size={14} className="mr-2" /> Población Activa
        </button>
        <button 
          onClick={() => setTab("egresados")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-bold transition-colors ${tab === "egresados" ? 'bg-white text-red-600 border-x border-t border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <History size={14} className="mr-2" /> Historial de Egresados
        </button>
        <button 
          onClick={() => setTab("pendientes")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-bold transition-colors ${tab === "pendientes" ? 'bg-white text-orange-600 border-x border-t border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          <UserCheck size={14} className="mr-2" /> Pendientes de Validación
        </button>
      </div>

      <div className="px-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Buscador y Filtros</h2>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
              <Search size={12} className="mr-1" /> Buscar por RUT (sin puntos)
            </label>
            <input 
              type="text" 
              value={searchRut}
              onChange={(e) => setSearchRut(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100" 
              placeholder="Ej: 17297171"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
              <Search size={12} className="mr-1" /> Buscar por Nombre o Apellido
            </label>
            <input 
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100" 
              placeholder="Ej: Daniela"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
              <MapPin size={12} className="mr-1" /> Filtrar por Sector
            </label>
            <select 
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <div className="flex justify-between items-end mb-2">
           <span className="text-sm text-slate-600 font-medium">
             {tab === "activos" ? 'Mostrando población bajo control vigente' : 'Mostrando pacientes egresados históricamente'} ({filtered.length})
           </span>
           <button className="text-slate-400 hover:text-slate-600"><Download size={16} /></button>
        </div>
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs whitespace-nowrap text-slate-600">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 uppercase font-medium text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-500">RUT</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Nombre Completo</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-center">Edad</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-center">Sexo</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Sector</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Teléfono</th>
                  {tab === "activos" ? (
                    (user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO") && (
                      <th className="px-4 py-3 font-semibold text-slate-500 text-center">Acciones</th>
                    )
                  ) : tab === "egresados" ? (
                    <>
                      <th className="px-4 py-3 font-semibold text-red-500">Motivo Egreso</th>
                      <th className="px-4 py-3 font-semibold text-red-500">Fecha Egreso</th>
                    </>
                  ) : (
                    <th className="px-4 py-3 font-semibold text-orange-500 text-center">Acción Percápita</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 500).map((p, i) => (
                  <tr key={i} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2 font-medium">{p.rut}-{p.dv}</td>
                    <td className="px-4 py-2 uppercase truncate" title={p.nombre_completo}>{p.nombre_completo}</td>
                    <td className="px-4 py-2 text-center">{calculateAge(p.fecha_nacimiento)}</td>
                    <td className="px-4 py-2 text-center uppercase">{p.sexo}</td>
                    <td className="px-4 py-2 uppercase truncate max-w-[150px]" title={p.sector}>{p.sector}</td>
                    <td className="px-4 py-2">{p.telefono || '-'}</td>
                    {tab === "activos" ? (
                      (user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO") && (
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                title="Editar Paciente"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button 
                                onClick={() => setIsEgresando(p.rut)}
                                className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                title="Egresar Paciente"
                            >
                                <UserMinus size={14} />
                            </button>
                          </div>
                        </td>
                      )
                    ) : tab === "egresados" ? (
                      <>
                        <td className="px-4 py-2 font-bold text-red-600 uppercase">{(p as any).motivo_egreso}</td>
                        <td className="px-4 py-2 font-mono text-[10px]">
                          {(p as any).fecha_egreso ? (() => {
                            const d = new Date((p as any).fecha_egreso);
                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                          })() : '-'}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handleOpenValidar(p)}
                            className="flex items-center bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition shadow-sm"
                          >
                            <ShieldCheck size={12} className="mr-1.5" /> Validar
                          </button>
                          <button 
                            onClick={() => handleRechazar(p.rut)}
                            className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-100"
                            title="Rechazar y Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                Visualizando los primeros 500 resultados por rendimiento.
              </div>
            )}
          </div>
        </div>
      </div>
    
      {/* Modal de Egreso */}
      {isEgresando && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center text-red-700">
                <AlertCircle className="mr-2" size={20} />
                <h3 className="font-bold">Egresar Paciente del Padrón</h3>
              </div>
              <button onClick={() => setIsEgresando(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Vas a egresar al paciente <span className="font-bold text-slate-900">{pacientes.find(p => p.rut === isEgresando)?.nombre_completo}</span> del registro oficial. Esta acción lo removerá de todos los programas activos.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Motivo del Egreso</label>
                <select 
                  value={motivoEgreso}
                  onChange={(e) => setMotivoEgreso(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-100"
                >
                  <option value="Fallecimiento">Fallecimiento</option>
                  <option value="Traslado">Traslado</option>
                  <option value="Error de Registro">Error de Registro</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex space-x-3">
              <button 
                onClick={() => setIsEgresando(null)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleEgreso}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar Egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Validación / Edición Percápita */}
      {(isValidando || isEditing) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={isValidando ? handleValidarConfirm : handleSavePaciente}>
                <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${isValidando ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                <div className={`flex items-center ${isValidando ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {isValidando ? <UserCheck className="mr-2" size={20} /> : <UserPlus className="mr-2" size={20} />}
                    <h3 className="font-bold">
                        {isValidando ? 'Validar Captura en Box' : (isEditing === "NUEVO" ? 'Nuevo Registro de Población' : 'Editar Datos de Población')}
                    </h3>
                </div>
                <button type="button" onClick={() => { setIsValidando(null); setIsEditing(null); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                    {/* Identidad */}
                    <div className="md:col-span-2 flex items-center space-x-2 text-slate-400 border-b border-slate-100 pb-2">
                        <Hash size={14} /> <span className="text-[10px] font-black uppercase">Identificación</span>
                    </div>
                    
                    <div className="flex space-x-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RUT (sin puntos)</label>
                            <input 
                                type="text" required value={formData.rut} 
                                onChange={e => setFormData({...formData, rut: e.target.value.replace(/[^0-9]/g, "")})}
                                maxLength={8}
                                placeholder="Ej: 12345678"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            />
                        </div>
                        <div className="w-16">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DV</label>
                            <input 
                                type="text" required value={formData.dv} 
                                onChange={e => setFormData({...formData, dv: e.target.value.replace(/[^0-9kK]/g, "").toUpperCase()})}
                                maxLength={1}
                                placeholder="K"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre Completo</label>
                        <input 
                            type="text" required value={formData.nombre_completo} 
                            onChange={e => setFormData({...formData, nombre_completo: e.target.value.slice(0, 100)})}
                            maxLength={100}
                            placeholder="EJ: JUAN PEREZ SOTO"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                        />
                    </div>

                    {/* Datos Clínicos Básicos */}
                    <div className="md:col-span-2 flex items-center space-x-2 text-slate-400 border-b border-slate-100 pb-2 mt-4">
                        <Calendar size={14} /> <span className="text-[10px] font-black uppercase">Datos Demográficos</span>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Nacimiento</label>
                        <input 
                            type="date" required value={formData.fecha_nacimiento || ""} 
                            onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sexo</label>
                        <select 
                            value={formData.sexo} 
                            onChange={e => setFormData({...formData, sexo: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="MASCULINO">MASCULINO</option>
                            <option value="FEMENINO">FEMENINO</option>
                        </select>
                    </div>

                    {/* Ubicación y Contacto */}
                    <div className="md:col-span-2 flex items-center space-x-2 text-slate-400 border-b border-slate-100 pb-2 mt-4">
                        <MapPin size={14} /> <span className="text-[10px] font-black uppercase">Ubicación y Contacto</span>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sector Oficial</label>
                        <select 
                            value={formData.sector} 
                            onChange={e => setFormData({...formData, sector: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="ARQUILHUE">ARQUILHUE</option>
                            <option value="EMR CHABRANCO">EMR CHABRANCO</option>
                            <option value="EMR CURRIÑE">EMR CURRIÑE</option>
                            <option value="EMR HUEINAHUE">EMR HUEINAHUE</option>
                            <option value="ISLA HUAPI">ISLA HUAPI</option>
                            <option value="LLIFEN">LLIFEN</option>
                            <option value="LONCOPAN">LONCOPAN</option>
                            <option value="MAIHUE">MAIHUE</option>
                            <option value="NONTUELA">NONTUELA</option>
                            <option value="SECTOR 1">SECTOR 1</option>
                            <option value="SECTOR 2">SECTOR 2</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                        <input 
                            type="text" value={formData.telefono} 
                            onChange={e => setFormData({...formData, telefono: e.target.value.replace(/[^0-9+]/g, "")})}
                            maxLength={12}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: +56912345678"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</label>
                        <input 
                            type="text" value={formData.direccion} 
                            onChange={e => setFormData({...formData, direccion: e.target.value.slice(0, 150)})}
                            maxLength={150}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            placeholder="Ej: CALLE FAKE 123"
                        />
                    </div>

                    <div className="md:col-span-2 mt-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                                type="checkbox" checked={formData.es_pad} 
                                onChange={e => setFormData({...formData, es_pad: e.target.checked})}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-slate-700">Pertenece al Programa de Atención Domiciliaria (PAD)</span>
                        </label>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 flex space-x-3 border-t border-slate-100">
                    <button 
                        type="button" onClick={() => { setIsValidando(null); setIsEditing(null); }}
                        className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={loading}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-colors shadow-lg disabled:opacity-50 ${isValidando ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
                    >
                        {loading ? 'Procesando...' : (isValidando ? 'Validar y Oficializar' : 'Guardar Cambios')}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

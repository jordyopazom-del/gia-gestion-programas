"use client";

import { useState, useMemo } from "react";
import { Search, MapPin, Download, UserMinus, History, CheckCircle, AlertCircle, X } from "lucide-react";
import { egresarPaciente } from "@/actions/pacientesActions";
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
  const [tab, setTab] = useState<"activos" | "egresados">("activos");
  const [isEgresando, setIsEgresando] = useState<string | null>(null);
  const [motivoEgreso, setMotivoEgreso] = useState("Fallecimiento");
  const [loading, setLoading] = useState(false);

  // Get distinct sectors for the filter
  const sectors = useMemo(() => {
    const s = new Set(pacientes.map(p => p.sector));
    return ["Todos", ...Array.from(s).sort()];
  }, [pacientes]);

  const filtered = useMemo(() => {
    return pacientes.filter(p => {
      const matchTab = tab === "activos" ? (p as any).estado === "ACTIVO" : (p as any).estado === "EGRESADO";
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
    if (res.success) {
      setIsEgresando(null);
    } else {
      alert("Error al egresar: " + res.error);
    }
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
                  ) : (
                    <>
                      <th className="px-4 py-3 font-semibold text-red-500">Motivo Egreso</th>
                      <th className="px-4 py-3 font-semibold text-red-500">Fecha Egreso</th>
                    </>
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
                          <button 
                            onClick={() => setIsEgresando(p.rut)}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Egresar Paciente"
                          >
                            <UserMinus size={14} />
                          </button>
                        </td>
                      )
                    ) : (
                      <>
                        <td className="px-4 py-2 font-bold text-red-600 uppercase">{(p as any).motivo_egreso}</td>
                        <td className="px-4 py-2 font-mono text-[10px]">
                          {(p as any).fecha_egreso ? (() => {
                            const d = new Date((p as any).fecha_egreso);
                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                          })() : '-'}
                        </td>
                      </>
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
    </div>
  );
}

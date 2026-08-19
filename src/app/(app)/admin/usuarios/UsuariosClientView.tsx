"use client";

import { useState } from "react";
import { UserProfile, UserRole, crearUsuario, eliminarUsuario, procesarSolicitud, desactivarUsuario } from "@/actions/userActions";
import { UserPlus, Trash2, Key, ShieldCheck, User, Briefcase, Contact, X, AlertCircle, Edit2, CheckCircle, XCircle, Clock } from "lucide-react";

export default function UsuariosClientView({ 
  usuarios: initialUsuarios, 
  solicitudes: initialSolicitudes 
}: { 
  usuarios: UserProfile[], 
  solicitudes: any[] 
}) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [solicitudes, setSolicitudes] = useState(initialSolicitudes);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'solicitudes'>(initialSolicitudes.length > 0 ? 'solicitudes' : 'usuarios');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado para procesar aprobación
  const [isAprobar, setIsAprobar] = useState<any>(null);
  const [showAprobado, setShowAprobado] = useState<any>(null);
  const [selectedRol, setSelectedRol] = useState<UserRole>("CLINICO");

  // Estado para granularidad de accesos
  const [formAccesos, setFormAccesos] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    rut: "",
    nombre: "",
    email: "",
    profesion: "",
    rol: "CLINICO" as UserRole,
    password: ""
  });

  const handleEdit = (u: UserProfile) => {
    setFormData({
      rut: u.rut,
      nombre: u.nombre || "",
      email: u.email || "",
      profesion: u.profesion || "",
      rol: u.rol,
      password: "" 
    });
    setFormAccesos(u.accesos || []);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleNew = () => {
    setFormData({
      rut: "",
      nombre: "",
      email: "",
      profesion: "",
      rol: "CLINICO",
      password: ""
    });
    setFormAccesos([]);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleAccesoToggle = (key: string, checked: boolean) => {
    if (checked) {
      setFormAccesos([...formAccesos, key]);
    } else {
      setFormAccesos(formAccesos.filter(item => item !== key));
    }
  };

  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, "");
    if (clean.length > 9) clean = clean.slice(0, 9);
    if (clean.length > 1) {
      const body = clean.slice(0, -1);
      const dv = clean.slice(-1).toUpperCase();
      return `${body}-${dv}`;
    }
    return clean.toUpperCase();
  };

  const normalizeText = (text: string) => {
    return text
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const normalizedData = {
      ...formData,
      nombre: formData.nombre.toUpperCase().trim(),
      profesion: normalizeText(formData.profesion),
      accesos: formAccesos
    };

    const res = await crearUsuario(normalizedData);
    setLoading(false);
    if (res.success) {
      setShowModal(false);
      window.location.reload();
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (rut: string) => {
    if (!confirm("¿Está seguro de eliminar este acceso?")) return;
    const res = await eliminarUsuario(rut);
    if (res.success) {
      window.location.reload();
    } else if (res.error === "REFERENCED_ERROR") {
      if (confirm("Este funcionario tiene registros clínicos guardados. No es posible eliminarlo físicamente para resguardar la legalidad de los datos.\n\n¿Desea DESACTIVAR su cuenta en su lugar? (Esto bloqueará su acceso pero mantendrá sus firmas en el historial).")) {
        setLoading(true);
        const descRes = await desactivarUsuario(rut);
        setLoading(false);
        if (descRes.success) {
          alert("Acceso desactivado con éxito.");
          window.location.reload();
        } else {
          alert(descRes.error || "Ocurrió un error al desactivar.");
        }
      }
    } else {
      alert(res.error || "Ocurrió un error al eliminar.");
    }
  };

  const handleProcesar = async (id: number, accion: 'APROBAR' | 'RECHAZAR') => {
    if (accion === 'RECHAZAR' && !confirm("¿Está seguro de rechazar esta solicitud?")) return;
    
    setLoading(true);
    const res = await procesarSolicitud(id, accion, accion === 'APROBAR' ? selectedRol : undefined);
    setLoading(false);
    
    if (res.success) {
      if (accion === 'APROBAR') {
        setShowAprobado(isAprobar);
        setIsAprobar(null);
      } else {
        window.location.reload();
      }
    } else {
      alert(res.error);
    }
  };

  const rolesConfig: Record<UserRole, { color: string; label: string }> = {
    ADMINISTRADOR: { color: "bg-purple-100 text-purple-700 border-purple-200", label: "Jefe de SOME" },
    ADMINISTRATIVO: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Administrativo Percápita" },
    REFERENTE: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Referente Técnico" },
    CLINICO: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Profesional Clínico" },
    INACTIVO: { color: "bg-red-50 text-red-600 border-red-100", label: "Acceso Bloqueado" }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'usuarios' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          Usuarios Activos ({usuarios.length})
        </button>
        <button 
          onClick={() => setActiveTab('solicitudes')}
          className={`px-8 py-4 text-sm font-bold transition-all flex items-center ${activeTab === 'solicitudes' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          Solicitudes Pendientes
          {solicitudes.length > 0 && (
            <span className="ml-2 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center animate-pulse">
              {solicitudes.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'usuarios' && (
        <>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-700 flex items-center">
              <ShieldCheck size={18} className="mr-2 text-purple-600" /> Funcionarios Autorizados ({usuarios.length})
            </h2>
            <button 
              onClick={handleNew}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-bold shadow-lg shadow-purple-100 transition-all active:scale-95"
            >
              <UserPlus size={16} className="mr-2" /> Crear Nuevo Acceso
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">RUT / Identificador</th>
                  <th className="px-6 py-4">Nombre Completo</th>
                  <th className="px-6 py-4">Profesión / Cargo</th>
                  <th className="px-6 py-4">Rol en Sistema</th>
                  <th className="px-6 py-4">Módulos Habilitados</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.rut} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{u.rut}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mr-3 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 uppercase text-sm">{u.nombre}</span>
                          <span className="text-[10px] text-slate-400 lowercase">{u.email || 'sin correo'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 uppercase">{u.profesion}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${rolesConfig[u.rol].color}`}>
                        {rolesConfig[u.rol].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.rol === "ADMINISTRADOR" ? (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Acceso Maestro (Todo)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(!u.accesos || u.accesos.length === 0) && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-400 font-bold uppercase">Sin Módulos</span>
                          )}
                          {u.accesos?.includes("respiratorio") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-bold uppercase">Respi</span>
                          )}
                          {u.accesos?.includes("empam") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold uppercase">EMPAM</span>
                          )}
                          {u.accesos?.includes("mujer") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100 font-bold uppercase">Mujer</span>
                          )}
                          {u.accesos?.includes("oportunidad") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 font-bold uppercase">Oport.</span>
                          )}
                          {u.accesos?.includes("ecicep") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-bold uppercase">ECICEP</span>
                          )}
                          {u.accesos?.includes("infantil") && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 font-bold uppercase">Infantil</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" 
                          title="Editar Perfil"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.rut)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                          title="Eliminar Acceso"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'solicitudes' && (
        <div className="flex-1">
          {solicitudes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 space-y-3">
              <CheckCircle size={48} className="text-slate-200" />
              <p className="font-medium italic">No hay solicitudes pendientes por procesar</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {solicitudes.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase text-sm leading-tight">{s.nombre}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{s.rut}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center text-xs text-slate-600">
                        <Briefcase size={12} className="mr-2 text-slate-400" /> {s.profesion}
                      </div>
                      <div className="flex items-center text-xs text-blue-600 lowercase italic">
                        <Key size={12} className="mr-2 text-blue-300" /> {s.email}
                      </div>
                      <div className="flex items-center text-xs text-slate-400">
                        <Clock size={12} className="mr-2" /> {new Date(s.fecha_solicitud).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button 
                        onClick={() => setIsAprobar(s)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <CheckCircle size={14} className="mr-2" /> Aprobar
                      </button>
                      <button 
                        onClick={() => handleProcesar(s.id, 'RECHAZAR')}
                        className="flex-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <XCircle size={14} className="mr-2" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}



      {/* Modal Aprobación */}
      {isAprobar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Aprobar Funcionario</h3>
            <p className="text-sm text-slate-500 mb-6">Asigne el rol correspondiente para <strong>{isAprobar.nombre}</strong></p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rol del Sistema</label>
                <select 
                  value={selectedRol}
                  onChange={(e) => setSelectedRol(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  <option value="ADMINISTRADOR">Jefe de SOME</option>
                  <option value="ADMINISTRATIVO">Administrativo Percápita</option>
                  <option value="REFERENTE">Referente Técnico</option>
                  <option value="CLINICO">Profesional Clínico</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={() => setIsAprobar(null)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleProcesar(isAprobar.id, 'APROBAR')}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  {loading ? 'Procesando...' : 'Confirmar Acceso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Éxito con Credenciales */}
      {showAprobado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Acceso Autorizado!</h3>
            <p className="text-sm text-slate-500 mb-6">El funcionario ya puede ingresar a la plataforma.</p>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 text-left border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-widest">RUT de Usuario</span>
                <span className="font-mono font-bold text-slate-700">{showAprobado.rut}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Clave Temporal</span>
                <span className="font-mono font-bold text-blue-600">cesfam123</span>
              </div>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
            >
              Entendido y Copiado
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50/50">
              <h3 className="font-bold text-slate-800 flex items-center italic">
                {isEditing ? (
                  <><Edit2 size={20} className="mr-2 text-purple-600" /> Editar Perfil: {formData.nombre}</>
                ) : (
                  <><UserPlus size={20} className="mr-2 text-purple-600" /> Configurar Nuevo Usuario</>
                )}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                    <Contact size={12} className="mr-1" /> RUT (Ej: 12345678-9)
                  </label>
                  <input 
                    required
                    disabled={isEditing}
                    type="text"
                    value={formData.rut}
                    onChange={(e) => setFormData({...formData, rut: formatRut(e.target.value)})}
                    placeholder="12345678-9"
                    className={`w-full border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 transition-all outline-none font-mono ${isEditing ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                    <ShieldCheck size={12} className="mr-1" /> Rol Asignado
                  </label>
                  <select 
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value as UserRole})}
                    className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                  >
                    <option value="ADMINISTRADOR">Jefe de SOME</option>
                    <option value="ADMINISTRATIVO">Administrativo Percápita</option>
                    <option value="REFERENTE">Referente Técnico</option>
                    <option value="CLINICO">Profesional Clínico</option>
                    <option value="INACTIVO">Acceso Bloqueado / Desactivado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  <User size={12} className="mr-1" /> Nombre Completo
                </label>
                <input 
                  required
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value.toUpperCase()})}
                  placeholder="JUAN PEREZ"
                  maxLength={100}
                  className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  <Briefcase size={12} className="mr-1" /> Profesión / Cargo
                </label>
                <input 
                  required
                  type="text"
                  value={formData.profesion}
                  onChange={(e) => setFormData({...formData, profesion: e.target.value.toUpperCase()})}
                  placeholder="MEDICO"
                  maxLength={100}
                  className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  <Key size={12} className="mr-1" /> Correo Electrónico
                </label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})}
                  placeholder="ejemplo@redsalud.gob.cl"
                  maxLength={100}
                  className="w-full bg-slate-50 border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>

              {formData.rol !== "ADMINISTRADOR" && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100/80 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest mb-2 select-none">
                    <ShieldCheck size={12} className="mr-1 text-purple-600" /> Módulos Habilitados
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={formAccesos.includes("respiratorio")}
                        onChange={(e) => handleAccesoToggle("respiratorio", e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span>Prog. Respiratorio</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={formAccesos.includes("empam")}
                        onChange={(e) => handleAccesoToggle("empam", e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span>Adulto Mayor (EMPAM)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={formAccesos.includes("infantil")}
                        onChange={(e) => handleAccesoToggle("infantil", e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span>Prog. Infantil</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={formAccesos.includes("mujer")}
                        onChange={(e) => handleAccesoToggle("mujer", e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span>Prog. de la Mujer</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={formAccesos.includes("oportunidad")}
                        onChange={(e) => handleAccesoToggle("oportunidad", e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span>Oport. de Atención</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={formAccesos.includes("ecicep")}
                        onChange={(e) => handleAccesoToggle("ecicep", e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span>Estratificación ECICEP</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  <Key size={12} className="mr-1" /> {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Temporal'}
                </label>
                <input 
                  required={!isEditing}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder={isEditing ? "Dejar en blanco para no cambiar" : "********"}
                  maxLength={50}
                  className="w-full bg-slate-100 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (isEditing ? 'Actualizar Perfil' : 'Crear Acceso')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

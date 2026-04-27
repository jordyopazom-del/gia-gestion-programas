"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, cambiarPasswordAction } from "@/actions/authActions";
import { solicitarAcceso } from "@/actions/userActions";
import { Activity, UserPlus, X, Contact, User, Briefcase, Key, CheckCircle, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estados para Solicitud
  const [showSolicitud, setShowSolicitud] = useState(false);
  const [solicitudData, setSolicitudData] = useState({ rut: "", nombre: "", email: "", profesion: "" });
  const [solicitudLoading, setSolicitudLoading] = useState(false);
  const [solicitudSuccess, setSolicitudSuccess] = useState(false);

  // Estados para Cambio de Clave Obligatorio
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass, setNewPass] = useState({ p1: "", p2: "" });
  const [changeLoading, setChangeLoading] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await loginAction(rut, password);
    
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else if (res?.mustChangePassword) {
      setLoading(false);
      setShowChangePass(true);
    } else {
      router.push("/dashboard");
    }
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.p1 !== newPass.p2) {
      alert("Las contraseñas no coinciden");
      return;
    }
    if (newPass.p1.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setChangeLoading(true);
    const res = await cambiarPasswordAction(newPass.p1);
    setChangeLoading(false);

    if (res.success) {
      router.push("/dashboard");
    } else {
      alert(res.error);
    }
  };

  const handleSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setSolicitudLoading(true);
    const res = await solicitarAcceso({
      ...solicitudData,
      nombre: solicitudData.nombre.toUpperCase().trim(),
      profesion: solicitudData.profesion.toUpperCase().trim()
    });
    setSolicitudLoading(false);
    if (res.success) {
      setSolicitudSuccess(true);
      setTimeout(() => {
        setShowSolicitud(false);
        setSolicitudSuccess(false);
        setSolicitudData({ rut: "", nombre: "", email: "", profesion: "" });
      }, 3000);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-slate-100">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
            <Activity size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">GIA Health Systems</h1>
          <p className="mt-1 text-sm text-slate-500 italic">Gestión Clínica Inteligente</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RUT Funcionario</label>
            <input
              type="text"
              value={rut}
              onChange={(e) => setRut(formatRut(e.target.value))}
              placeholder="12345678-9"
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 shadow-md active:scale-[0.98]"
          >
            {loading ? "Autenticando..." : "Ingresar a la Plataforma"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button 
            onClick={() => setShowSolicitud(true)}
            className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center mx-auto"
          >
            <UserPlus size={16} className="mr-2" /> ¿No tienes cuenta? Solicita acceso aquí
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400 uppercase tracking-tighter">
          Uso exclusivo para personal clínico autorizado de la red.
        </p>
      </div>

      {/* Modal Cambio de Clave Obligatorio */}
      {showChangePass && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-blue-100">
            <div className="p-8 text-center bg-blue-600 text-white">
              <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-sm">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">Cambio Obligatorio</h3>
              <p className="text-blue-100 text-xs">Por seguridad, debes establecer una contraseña privada en tu primer ingreso.</p>
            </div>
            
            <form onSubmit={handleChangePass} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  <Key size={12} className="mr-1" /> Nueva Contraseña
                </label>
                <input 
                  required
                  type="password"
                  value={newPass.p1}
                  onChange={(e) => setNewPass({...newPass, p1: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  <CheckCircle size={12} className="mr-1" /> Repetir Contraseña
                </label>
                <input 
                  required
                  type="password"
                  value={newPass.p2}
                  onChange={(e) => setNewPass({...newPass, p2: e.target.value})}
                  placeholder="Debe ser idéntica"
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>

              <button 
                type="submit"
                disabled={changeLoading}
                className="w-full px-4 py-4 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 mt-4 active:scale-[0.98]"
              >
                {changeLoading ? 'Guardando...' : 'Actualizar y Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Solicitud */}
      {showSolicitud && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <h3 className="font-bold text-slate-800 flex items-center italic">
                <UserPlus size={20} className="mr-2 text-blue-600" /> Solicitar Nuevo Acceso
              </h3>
              <button onClick={() => setShowSolicitud(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSolicitud} className="p-8 space-y-5">
              {solicitudSuccess ? (
                <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Activity size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">¡Solicitud Enviada!</h4>
                    <p className="text-sm text-slate-500 px-4">Tu solicitud ha sido enviada al Jefe de SOME. Te notificaremos una vez que sea aprobada.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                      <Contact size={12} className="mr-1" /> Tu RUT (Ej: 12345678-9)
                    </label>
                    <input 
                      required
                      type="text"
                      value={solicitudData.rut}
                      onChange={(e) => setSolicitudData({...solicitudData, rut: formatRut(e.target.value)})}
                      placeholder="12345678-9"
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 transition-all outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                      <User size={12} className="mr-1" /> Nombre Completo
                    </label>
                    <input 
                      required
                      type="text"
                      value={solicitudData.nombre}
                      onChange={(e) => setSolicitudData({...solicitudData, nombre: e.target.value.toUpperCase()})}
                      placeholder="JUAN PEREZ"
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                      <Contact size={12} className="mr-1" /> Correo Electrónico
                    </label>
                    <input 
                      required
                      type="email"
                      value={solicitudData.email}
                      onChange={(e) => setSolicitudData({...solicitudData, email: e.target.value})}
                      placeholder="ejemplo@redsalud.gob.cl"
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                      <Briefcase size={12} className="mr-1" /> Profesión / Cargo
                    </label>
                    <input 
                      required
                      type="text"
                      value={solicitudData.profesion}
                      onChange={(e) => setSolicitudData({...solicitudData, profesion: e.target.value.toUpperCase()})}
                      placeholder="MEDICO, ENFERMERO, ETC."
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none uppercase"
                    />
                  </div>

                  <div className="pt-4 flex space-x-3">
                    <button 
                      type="button"
                      onClick={() => setShowSolicitud(false)}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={solicitudLoading}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                      {solicitudLoading ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

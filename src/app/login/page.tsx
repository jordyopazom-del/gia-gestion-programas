"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, cambiarPasswordAction, getPreguntaAction, resetPasswordAction } from "@/actions/authActions";
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
  const [newPass, setNewPass] = useState({ p1: "", p2: "", pregunta: "", respuesta: "" });
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Estados para Recuperación (Olvidé mi clave)
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: RUT, 2: Respuesta + Clave
  const [forgotData, setForgotData] = useState({ rut: "", pregunta: "", respuesta: "", p1: "", p2: "" });
  const [forgotLoading, setForgotLoading] = useState(false);

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
    if (!newPass.pregunta || !newPass.respuesta) {
      alert("Debes configurar una pregunta y respuesta de seguridad");
      return;
    }

    setChangeLoading(true);

    const timeoutId = setTimeout(() => {
      setChangeLoading(false);
      alert("⚠️ El servidor tardó demasiado. Intenta nuevamente.");
    }, 12000);

    try {
      // Usar fetch directo en lugar de Server Action para evitar conflictos RSC
      const res = await fetch("/api/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuevaPass: newPass.p1,
          pregunta: newPass.pregunta,
          respuesta: newPass.respuesta,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (data.success) {
        setChangeSuccess(true);
        setChangeLoading(false);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 600);
      } else {
        setChangeLoading(false);
        alert(data.error || "Error al guardar la configuración inicial");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setChangeLoading(false);
      alert("Error de red. Verifica tu conexión e intenta nuevamente.");
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const res = await getPreguntaAction(forgotData.rut);
    setForgotLoading(false);
    
    if (res.success) {
      setForgotData({ ...forgotData, pregunta: res.pregunta || "" });
      setForgotStep(2);
    } else {
      alert(res.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotData.p1 !== forgotData.p2) {
      alert("Las contraseñas no coinciden");
      return;
    }
    setForgotLoading(true);
    const res = await resetPasswordAction(forgotData.rut, forgotData.respuesta, forgotData.p1);
    setForgotLoading(false);

    if (res.success) {
      alert("¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.");
      setShowForgot(false);
      setForgotStep(1);
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
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Logo CESFAM" className="h-24 w-24 mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-slate-800">GIA Belarmina</h1>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Gestión Integral APS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RUT Funcionario</label>
            <input
              type="text"
              value={rut}
              onChange={(e) => setRut(formatRut(e.target.value))}
              placeholder="12345678-9"
              maxLength={10}
              required
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
              <button 
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={50}
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

        <div className="mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed text-center">
            💡 <strong>¿Primera vez ingresando?</strong> Si tu solicitud de acceso ya fue aprobada por el Administrador, inicia sesión con tu RUT y la contraseña provisoria <strong className="text-blue-600 font-bold">cesfam123</strong>.
          </p>
        </div>
        
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
              <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">Configuración Inicial</h3>
              <p className="text-blue-100 text-[10px]">Establece tu contraseña y una pregunta de seguridad para recuperar el acceso si lo olvidas.</p>
            </div>
            
            <form onSubmit={handleChangePass} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                    <Key size={10} className="mr-1" /> Nueva Clave
                  </label>
                  <input 
                    required
                    type="password"
                    value={newPass.p1}
                    onChange={(e) => setNewPass({...newPass, p1: e.target.value})}
                    placeholder="Mínimo 6 carac."
                    maxLength={50}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                    <CheckCircle size={10} className="mr-1" /> Repetir
                  </label>
                  <input 
                    required
                    type="password"
                    value={newPass.p2}
                    onChange={(e) => setNewPass({...newPass, p2: e.target.value})}
                    placeholder="Idéntica"
                    maxLength={50}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1 border-t pt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  Pregunta de Seguridad
                </label>
                <select 
                  required
                  value={newPass.pregunta}
                  onChange={(e) => setNewPass({...newPass, pregunta: e.target.value})}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  <option value="">Selecciona una pregunta...</option>
                  <option value="¿Cuál es el nombre de tu primera mascota?">¿Cuál es el nombre de tu primera mascota?</option>
                  <option value="¿En qué ciudad nacieron tus padres?">¿En qué ciudad nacieron tus padres?</option>
                  <option value="¿Cuál era el nombre de tu escuela primaria?">¿Cuál era el nombre de tu escuela primaria?</option>
                  <option value="¿Cuál es tu color favorito de la infancia?">¿Cuál es tu color favorito de la infancia?</option>
                  <option value="¿Cuál fue tu primer trabajo?">¿Cuál fue tu primer trabajo?</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center tracking-widest">
                  Tu Respuesta
                </label>
                <input 
                  required
                  type="text"
                  value={newPass.respuesta}
                  onChange={(e) => setNewPass({...newPass, respuesta: e.target.value})}
                  placeholder="Escribe la respuesta aquí"
                  maxLength={100}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-200 outline-none uppercase"
                />
                <p className="text-[9px] text-slate-400 italic mt-1">* Recuerda esta respuesta, es la única forma de recuperar tu clave sin ayuda del Admin.</p>
              </div>

              <button 
                type="submit"
                disabled={changeLoading || changeSuccess}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg mt-2 flex items-center justify-center ${
                  changeSuccess 
                    ? 'bg-emerald-500 text-white shadow-emerald-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                } disabled:opacity-70`}
              >
                {changeLoading ? (
                  <>Guardando...</>
                ) : changeSuccess ? (
                  <>
                    <CheckCircle size={18} className="mr-2 animate-bounce" /> ¡Configuración Exitosa!
                  </>
                ) : (
                  'Finalizar y Entrar'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Olvidé mi Clave */}
      {showForgot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h3 className="font-bold text-slate-800 flex items-center">
                <ShieldAlert size={20} className="mr-2 text-blue-600" /> Recuperar Acceso
              </h3>
              <button onClick={() => { setShowForgot(false); setForgotStep(1); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              {forgotStep === 1 ? (
                <form onSubmit={handleForgotStep1} className="space-y-4">
                  <p className="text-xs text-slate-500 mb-4">Ingresa tu RUT para identificar tu cuenta y pregunta de seguridad.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RUT Funcionario</label>
                    <input 
                      required
                      type="text"
                      value={forgotData.rut}
                      onChange={(e) => setForgotData({...forgotData, rut: formatRut(e.target.value)})}
                      placeholder="12345678-9"
                      maxLength={10}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none font-mono"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg"
                  >
                    {forgotLoading ? 'Buscando...' : 'Continuar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Tu Pregunta de Seguridad:</p>
                    <p className="text-sm font-bold text-blue-800">{forgotData.pregunta}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tu Respuesta</label>
                    <input 
                      required
                      type="text"
                      value={forgotData.respuesta}
                      onChange={(e) => setForgotData({...forgotData, respuesta: e.target.value})}
                      placeholder="Respuesta secreta"
                      maxLength={100}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nueva Clave</label>
                      <input 
                        required
                        type="password"
                        value={forgotData.p1}
                        onChange={(e) => setForgotData({...forgotData, p1: e.target.value})}
                        maxLength={50}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Repetir</label>
                      <input 
                        required
                        type="password"
                        value={forgotData.p2}
                        onChange={(e) => setForgotData({...forgotData, p2: e.target.value})}
                        maxLength={50}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg mt-4"
                  >
                    {forgotLoading ? 'Restableciendo...' : 'Cambiar Clave y Entrar'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-full text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                  >
                    Volver atrás
                  </button>
                </form>
              )}
            </div>
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
                    <p className="text-xs text-slate-500 px-4 mt-2 leading-relaxed">
                      Tu solicitud ha sido enviada al Administrador. Una vez que aprueben tu acceso, podrás ingresar utilizando tu RUT y la contraseña provisoria: <strong className="text-blue-600 font-bold">cesfam123</strong>.
                    </p>
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
                      maxLength={10}
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
                      maxLength={100}
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
                      maxLength={100}
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
                      maxLength={100}
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

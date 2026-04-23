"use client";

import { useState } from "react";
import { UserPlus, Users, Trash2, Shield, Activity } from "lucide-react";
import { crearUsuario, eliminarUsuario } from "@/actions/usuariosActions";

export default function UsuariosClientView({ initialUsuarios }: { initialUsuarios: any[] }) {
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const result = await crearUsuario(formData);

    if (result.success) {
      setSuccess("Usuario creado exitosamente.");
      e.currentTarget.reset();
      // Recargar página para mostrar nuevo usuario
      window.location.reload();
    } else {
      setError(result.error || "Error al crear usuario.");
      setLoading(false);
    }
  };

  const handleDelete = async (rut: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${rut}?`)) return;
    
    const result = await eliminarUsuario(rut);
    if (result.success) {
      setUsuarios(usuarios.filter((u) => u.rut !== rut));
    } else {
      alert(result.error || "Error al eliminar usuario");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="bg-blue-600 p-3 rounded-lg text-white">
          <Shield size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Administración de Accesos</h1>
          <p className="text-slate-500">Gestión de usuarios y credenciales para la plataforma clínica GIA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario de Creación */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <UserPlus className="mr-2 text-blue-600" size={20} />
              Nuevo Profesional
            </h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                <input required name="rut" placeholder="Ej: 12345678-9" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input required name="nombre" placeholder="Ej: Dra. María Pérez" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Profesión</label>
                <input name="profesion" placeholder="Ej: Médico Familiar" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol en Sistema</label>
                <select name="rol" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="CLINICO">CLÍNICO (Gestión de Pacientes)</option>
                  <option value="ADMIN">ADMIN (Configuración y Accesos)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Acceso</label>
                <input required type="password" name="password" placeholder="••••••••" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
              {success && <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100">{success}</div>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {loading ? <Activity className="animate-spin mr-2" size={20} /> : <UserPlus className="mr-2" size={20} />}
                {loading ? "Creando..." : "Crear Acceso"}
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Users className="mr-2 text-blue-600" size={20} />
                Directorio de Accesos ({usuarios.length})
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Funcionario</th>
                    <th className="px-6 py-4 font-medium">Profesión</th>
                    <th className="px-6 py-4 font-medium">Rol</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        No hay usuarios registrados. Usa el panel para agregar uno.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((user) => (
                      <tr key={user.rut} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{user.nombre}</div>
                          <div className="text-sm text-slate-500">{user.rut}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{user.profesion || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {user.rol}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(user.rut)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                            title="Revocar acceso"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

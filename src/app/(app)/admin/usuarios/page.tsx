import { listarUsuarios, listarSolicitudes } from "@/actions/userActions";
import UsuariosClientView from "./UsuariosClientView";
import { Shield } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const resultUsers = await listarUsuarios();
  const resultRequests = await listarSolicitudes();
  
  const usuarios = resultUsers.success ? resultUsers.data : [];
  const solicitudes = resultRequests.success ? resultRequests.data : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-4">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Administración de Accesos</h1>
            <p className="text-slate-500">Gestión de roles y funcionarios de la plataforma</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[600px]">
        <UsuariosClientView usuarios={usuarios || []} solicitudes={solicitudes || []} />
      </div>
    </div>
  );
}

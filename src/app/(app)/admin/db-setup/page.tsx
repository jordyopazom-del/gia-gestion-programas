import { getCurrentUser } from "@/actions/userActions";
import DbSetupClient from "./DbSetupClient";
import { ShieldAlert } from "lucide-react";

export default async function DbSetupPage() {
  const user = await getCurrentUser();

  if (!user || user.rol !== "ADMINISTRADOR") {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white border border-red-200 rounded-xl shadow-sm">
        <div className="flex items-center space-x-4 text-red-600 mb-4">
          <ShieldAlert size={36} />
          <h1 className="text-2xl font-bold">Acceso Restringido</h1>
        </div>
        <p className="text-slate-600">
          Esta herramienta está reservada exclusivamente para usuarios con el rol de <strong>ADMINISTRADOR</strong>. 
          Tu cuenta actual ({user?.nombre || "No autenticado"}) no posee los privilegios necesarios.
        </p>
      </div>
    );
  }

  return <DbSetupClient />;
}

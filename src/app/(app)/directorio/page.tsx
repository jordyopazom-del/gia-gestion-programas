import { Suspense } from "react";
import { getDirectorioCompleto } from "@/actions/pacientesActions";
import CargaPadronWrapper from "./CargaPadronWrapper";
import DirectorioClientView from "./DirectorioClientView";
import { Users } from "lucide-react";
import { getCurrentUser, UserProfile } from "@/lib/currentUser";
import SkeletonDashboard from "@/components/SkeletonDashboard";

export const dynamic = 'force-dynamic';

async function DirectorioDataWrapper({ user }: { user: UserProfile }) {
  const pacientes = await getDirectorioCompleto();
  return <DirectorioClientView pacientes={pacientes} user={user} />;
}

export default async function DirectorioPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <div className="flex items-center mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-4">
          <Users size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Directorio de Población</h1>
          <p className="text-slate-500">Padrón Único Territorial y Carga de Novedades</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {user?.rol === "ADMINISTRADOR" || user?.rol === "ADMINISTRATIVO" ? (
          <div className="w-full xl:w-1/3">
            <CargaPadronWrapper />
          </div>
        ) : null}

        <div className="w-full">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <Suspense fallback={<SkeletonDashboard showHeader={false} />}>
              <DirectorioDataWrapper user={user!} />
            </Suspense>
          </div>
        </div>
      </div>

    </div>
  );
}


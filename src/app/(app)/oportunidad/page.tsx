import { Suspense } from "react";
import { getOportunidadesHoy } from "@/actions/agendaActions";
import OportunidadClientView from "./OportunidadClientView";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { getLocalDateString } from "@/lib/dateUtils";
import SkeletonDashboard from "@/components/SkeletonDashboard";

export const dynamic = 'force-dynamic';

async function OportunidadDataWrapper({ hoy }: { hoy: string }) {
  const { data = [], error } = await getOportunidadesHoy(hoy);
  return <OportunidadClientView initialData={data} initialDate={hoy} />;
}

export default async function OportunidadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("oportunidad");
  if (!hasAccess) redirect("/dashboard");

  // Por defecto cargamos la fecha de hoy
  const hoy = getLocalDateString();

  return (
    <Suspense fallback={<SkeletonDashboard title="Oportunidad y Agendamiento" subtitle="Buscando oportunidades de horas..." />}>
      <OportunidadDataWrapper hoy={hoy} />
    </Suspense>
  );
}

import { getOportunidadesHoy } from "@/actions/agendaActions";
import OportunidadClientView from "./OportunidadClientView";
import { getCurrentUser } from "@/actions/userActions";
import { redirect } from "next/navigation";
import { getLocalDateString } from "@/lib/dateUtils";

export const dynamic = 'force-dynamic';

export default async function OportunidadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("oportunidad");
  if (!hasAccess) redirect("/dashboard");

  // Por defecto cargamos la fecha de hoy
  const hoy = getLocalDateString();
  const { data = [], error } = await getOportunidadesHoy(hoy);

  return <OportunidadClientView initialData={data} initialDate={hoy} />;
}

import { getOportunidadesHoy } from "@/actions/agendaActions";
import OportunidadClientView from "./OportunidadClientView";
import { getCurrentUser } from "@/actions/userActions";
import { redirect } from "next/navigation";

export default async function OportunidadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("oportunidad");
  if (!hasAccess) redirect("/dashboard");

  // Por defecto cargamos la fecha de hoy
  const hoy = new Date().toISOString().split('T')[0];
  const { data = [], error } = await getOportunidadesHoy(hoy);

  return <OportunidadClientView initialData={data} initialDate={hoy} />;
}

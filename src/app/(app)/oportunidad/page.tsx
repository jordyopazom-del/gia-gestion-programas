import { getOportunidadesHoy } from "@/actions/agendaActions";
import OportunidadClientView from "./OportunidadClientView";

export default async function OportunidadPage() {
  // Por defecto cargamos la fecha de hoy
  const hoy = new Date().toISOString().split('T')[0];
  const { data = [], error } = await getOportunidadesHoy(hoy);

  return <OportunidadClientView initialData={data} initialDate={hoy} />;
}

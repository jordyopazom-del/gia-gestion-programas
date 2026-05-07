import { getCurrentUser } from "@/actions/userActions";
import { redirect } from "next/navigation";
import NuevoRespiratorioClient from "./NuevoRespiratorioClient";

export default async function NuevoRespiratorioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NuevoRespiratorioClient user={user} />;
}

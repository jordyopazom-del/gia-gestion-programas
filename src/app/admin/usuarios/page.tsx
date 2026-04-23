import { getUsuarios } from "@/actions/usuariosActions";
import UsuariosClientView from "./UsuariosClientView";

export default async function UsuariosPage() {
  const result = await getUsuarios();
  // Casting to expected type
  const usuarios = result.success && result.data ? result.data as any[] : [];

  return <UsuariosClientView initialUsuarios={usuarios} />;
}

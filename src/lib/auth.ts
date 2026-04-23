import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("gia_auth_token")?.value;
  if (!token) return null;
  return { rut: token };
}

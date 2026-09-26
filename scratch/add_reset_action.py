import sys

with open('src/actions/userActions.ts', 'r') as f:
    content = f.read()

new_action = """
export async function resetearPasswordAdmin(rut: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    const user = await sql`SELECT nombre, email FROM gia_usuarios WHERE rut = ${rut}`;
    if (user.length === 0) return { error: "Usuario no encontrado" };

    const { nombre, email } = user[0];

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let temporalPass = '';
    for (let i = 0; i < 6; i++) temporalPass += chars.charAt(Math.floor(Math.random() * chars.length));

    const hashedPass = hashPassword(temporalPass);

    await sql`
      UPDATE gia_usuarios 
      SET password = ${hashedPass}, debe_cambiar_password = TRUE 
      WHERE rut = ${rut}
    `;

    return { success: true, temporalPass, nombre, email };
  } catch (error) {
    return { error: "Error al resetear contraseña" };
  }
}

// SOLICITUDES DE ACCESO
export async function solicitarAcceso"""

content = content.replace('// SOLICITUDES DE ACCESO\nexport async function solicitarAcceso', new_action)

with open('src/actions/userActions.ts', 'w') as f:
    f.write(content)

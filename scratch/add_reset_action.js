const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/actions/userActions.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newAction = `

export async function resetearPasswordAdmin(rut: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
    return { error: "No autorizado" };
  }

  try {
    const user = await sql\`SELECT nombre, email FROM gia_usuarios WHERE rut = \${rut}\`;
    if (user.length === 0) return { error: "Usuario no encontrado" };

    const { nombre, email } = user[0];

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let temporalPass = '';
    for (let i = 0; i < 6; i++) temporalPass += chars.charAt(Math.floor(Math.random() * chars.length));

    const hashedPass = hashPassword(temporalPass);

    await sql\`
      UPDATE gia_usuarios 
      SET password = \${hashedPass}, debe_cambiar_password = TRUE 
      WHERE rut = \${rut}
    \`;

    return { success: true, temporalPass, nombre, email };
  } catch (error) {
    return { error: "Error al resetear contraseña" };
  }
}
`;

content = content.replace(
  'export async function solicitarAcceso',
  newAction + '\n// SOLICITUDES DE ACCESO\nexport async function solicitarAcceso'
);

// We need to also clean up the comment // SOLICITUDES DE ACCESO that was before it
content = content.replace('// SOLICITUDES DE ACCESO\n\n\nexport async function', '// SOLICITUDES DE ACCESO\nexport async function');

fs.writeFileSync(filePath, content);

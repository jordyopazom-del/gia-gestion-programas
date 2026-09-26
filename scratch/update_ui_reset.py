import re

with open('src/app/(app)/admin/usuarios/UsuariosClientView.tsx', 'r') as f:
    content = f.read()

# 1. Update import
content = content.replace(
    'import { UserProfile, UserRole, crearUsuario, eliminarUsuario, procesarSolicitud, desactivarUsuario } from "@/actions/userActions";',
    'import { UserProfile, UserRole, crearUsuario, eliminarUsuario, procesarSolicitud, desactivarUsuario, resetearPasswordAdmin } from "@/actions/userActions";'
)

# 2. Add handleReset function after handleDelete
handle_reset = """
  const handleReset = async (rut: string) => {
    if (!confirm("¿Está seguro de resetear la contraseña de este usuario? Se generará una nueva clave temporal.")) return;
    
    setLoading(true);
    const res = await resetearPasswordAdmin(rut);
    setLoading(false);
    
    if (res.success) {
      setShowAprobado({ 
        rut, 
        nombre: res.nombre, 
        email: res.email, 
        temporalPass: res.temporalPass,
        isReset: true
      });
    } else {
      alert(res.error || "Ocurrió un error.");
    }
  };
"""
content = content.replace('const handleProcesar = async', handle_reset + '\n  const handleProcesar = async')

# 3. Add button in table
button_reset = """                        <button 
                          onClick={() => handleReset(u.rut)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="Resetear Clave"
                        >
                          <Key size={16} />
                        </button>
"""
content = content.replace('<Trash2 size={16} />\n                        </button>\n                      </div>', '<Trash2 size={16} />\n                        </button>\n' + button_reset + '                      </div>')

# 4. Update modal text
content = content.replace('¡Acceso Autorizado!', '{showAprobado.isReset ? \'¡Contraseña Reseteada!\' : \'¡Acceso Autorizado!\'}')
content = content.replace('El funcionario ya puede ingresar a la plataforma.', '{showAprobado.isReset ? \'La clave temporal ha sido generada.\' : \'El funcionario ya puede ingresar a la plataforma.\'}')

# Update mailto link
old_mailto = "mailto:${showAprobado.email || ''}?subject=Acceso Aprobado - GIA CESFAM&body=Hola ${showAprobado.nombre || ''},%0D%0A%0D%0ATu acceso a la plataforma GIA ha sido aprobado.%0D%0A%0D%0ATu clave temporal para ingresar es: ${showAprobado.temporalPass || ''}%0D%0A%0D%0AEl sistema te pedirá cambiarla al ingresar por primera vez.%0D%0A%0D%0ASaludos."
new_mailto = "mailto:${showAprobado.email || ''}?subject=${showAprobado.isReset ? 'Reinicio de Clave' : 'Acceso Aprobado'} - GIA CESFAM&body=Hola ${showAprobado.nombre || ''},%0D%0A%0D%0A${showAprobado.isReset ? 'Tu contraseña para la plataforma GIA ha sido reseteada.' : 'Tu acceso a la plataforma GIA ha sido aprobado.'}%0D%0A%0D%0ATu clave temporal para ingresar es: ${showAprobado.temporalPass || ''}%0D%0A%0D%0AEl sistema te pedirá cambiarla al ingresar.%0D%0A%0D%0ASaludos."
content = content.replace(old_mailto, new_mailto)

with open('src/app/(app)/admin/usuarios/UsuariosClientView.tsx', 'w') as f:
    f.write(content)

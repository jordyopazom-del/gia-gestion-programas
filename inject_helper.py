with open('src/app/(app)/infantil/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

helper = """
  const esVencido = (p: InfantilData) => {
    if (p.estado_programa === 'INASISTENTE') return true;
    
    const fechasRaw = [
      p.prox_control_medico,
      p.prox_control_enfermera,
      p.prox_control_nutri,
      p.prox_control_dental
    ];
    
    const fechas = fechasRaw.filter(f => f !== null) as string[];
    if (fechas.length === 0) return true; // Sin agendar = Brecha

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    for (const dateStr of fechas) {
      if (!dateStr) continue;
      const d = parseLocalDate(dateStr);
      const dYear = d.getFullYear();
      const dMonth = d.getMonth();
      if (dYear < currentYear || (dYear === currentYear && dMonth < currentMonth)) {
        return true;
      }
    }
    return false;
  };
"""

content = content.replace('const brechas = activos.filter(p => esVencido(p));', helper + '\n  const brechas = activos.filter(p => esVencido(p));')

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

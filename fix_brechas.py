import re

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix brechas
content = re.sub(
    r'const brechas = activos\.filter\(p => \{\n    if \(\!p\.proximo_control\) return true;\n    const proxControl = new Date\(p\.proximo_control\);\n    const hoy = new Date\(\);\n    return proxControl < hoy \|\| p\.estado_programa === \'INASISTENTE\';\n  \}\);',
    r'const brechas = activos.filter(p => esVencido(p));',
    content
)

# Also fix the `// Agrupación` part if it uses `proximo_control`
# Oh wait, are there any other `p.proximo_control` occurrences? Let's check.

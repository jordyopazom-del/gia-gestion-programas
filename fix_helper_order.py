import re

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract esVencido
match = re.search(r'(const esVencido = \(p: InfantilData\) => \{[\s\S]*?\};\n)', content)
if match:
    es_vencido_func = match.group(1)
    content = content.replace(es_vencido_func, '')
    
    # insert before const brechas = 
    content = content.replace('const brechas = activos.filter(p => esVencido(p));', es_vencido_func + '\n  const brechas = activos.filter(p => esVencido(p));')

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


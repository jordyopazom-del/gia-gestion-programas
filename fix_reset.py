import re

with open('src/app/(app)/infantil/nuevo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'setProximoControl\(""\);\n\s*setEstamentoProximoControl\(""\);',
    r'setProxControlMedico("");\n        setProxControlEnfermera("");\n        setProxControlNutri("");\n        setProxControlDental("");',
    content
)

with open('src/app/(app)/infantil/nuevo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

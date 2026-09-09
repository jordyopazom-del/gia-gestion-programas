import re

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace parseLocalDate in esVencido and getEstadoBadge
# Actually, the string is just 'YYYY-MM' or 'YYYY-MM-DD'. If it's prox_control, it's 'YYYY-MM-DD' since we saved it as `${editProxControlMedico}-01`. Wait, no, we saved it as 'YYYY-MM-01'. 
# So dateStr.split('-') will give [year, month, day].
helper_parse = """
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = parts[2] ? Number(parts[2]) : 1;
  return new Date(y, m, d);
};
"""
# inject right before `export default function InfantilClientView`
content = content.replace('export default function InfantilClientView', helper_parse + '\nexport default function InfantilClientView')

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


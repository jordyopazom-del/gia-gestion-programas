import re

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix brechas filter
brechas_old = r'const brechas = activos\.filter\(p => \{\s*if \(!p\.proximo_control\) return true;\s*const proxControl = new Date\(p\.proximo_control\);\s*const hoy = new Date\(\);\s*return proxControl < hoy \|\| p\.estado_programa === \'INASISTENTE\';\s*\}\);'
content = re.sub(brechas_old, r'const brechas = activos.filter(p => esVencido(p));', content)

# 2. Fix filterEstado logic
filter_estado_old = r'if \(!isItInasistente\) \{\s*if \(p\.proximo_control\) \{\s*const proxControl = new Date\(p\.proximo_control\);\s*const hoy = new Date\(\);\s*const proxYear = proxControl\.getUTCFullYear\(\);\s*const proxMonth = proxControl\.getUTCMonth\(\);\s*const hoyYear = hoy\.getFullYear\(\);\s*const hoyMonth = hoy\.getMonth\(\);\s*if \(proxYear < hoyYear \|\| \(proxYear === hoyYear && proxMonth < hoyMonth\)\) \{\s*isVencido = true;\s*\}\s*\} else if \(!p\.proximo_control\) \{\s*isVencido = true;\s*\}\s*\}'
filter_estado_new = r'if (!isItInasistente) { isVencido = esVencido(p); }'
content = re.sub(filter_estado_old, filter_estado_new, content)

# 3. Fix the leftover td block which seems to be the old Próximo Control block that didn't get removed!
# Oh wait, my previous regex for the table columns replaced it, but maybe I had TWO instances? 
# Let's remove the block:
#                       {p.proximo_control && (
#                         <div className="flex flex-col mt-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
# ...
#                       )}
leftover_old = r'\{p\.proximo_control && \(\s*<div className="flex flex-col mt-1\.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">\s*<span className="text-\[9px\] font-black text-slate-400 uppercase tracking-wide">Próximo Control</span>\s*<div className="flex items-center gap-1 mt-0\.5 text-slate-700">\s*<Calendar className="h-3 w-3 text-slate-400" />\s*<span className="font-bold text-\[10px\] uppercase">\{formatMesAno\(p\.proximo_control\)\}</span>\s*\{p\.estamento_proximo_control && <span className="text-\[9px\] font-semibold text-slate-500 bg-slate-100 px-1 rounded ml-1">\{p\.estamento_proximo_control\}</span>\}\s*</div>\s*</div>\s*\)\}'
content = re.sub(leftover_old, '', content)

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


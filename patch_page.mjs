import fs from 'fs';

let content = fs.readFileSync('src/app/(app)/mujer/page.tsx', 'utf8');
content = content.replace(
  'import { getMujerDashboardData } from "@/actions/mujerActions";',
  'import { getMujerDashboardData, getEmbarazadasData } from "@/actions/mujerActions";'
);
content = content.replace(
  'const data = await getMujerDashboardData();',
  'const data = await getMujerDashboardData();\n  const embarazadasData = await getEmbarazadasData();'
);
content = content.replace(
  '<MujerClientView initialData={data.data || []} user={user} />',
  '<MujerClientView initialData={data.data || []} initialEmbarazadasData={embarazadasData.data || []} user={user} />'
);

fs.writeFileSync('src/app/(app)/mujer/page.tsx', content);
console.log("page.tsx parcheado");

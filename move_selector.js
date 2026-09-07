const fs = require('fs');

const path = './src/app/(app)/mujer/components/FormularioAtencionMujer.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '          {/* Selector Predictivo de Profesional Responsable / Matrón(a) */}';
const endMarker = '          </div>\n\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const block = content.slice(startIndex, endIndex + '          </div>\n\n'.length);
  // Remove it from original place
  content = content.slice(0, startIndex) + content.slice(endIndex + '          </div>\n\n'.length);
  
  // Find where to put it
  const targetMarker = '      {tipoIngreso === "PAP" && (\n';
  const targetIndex = content.indexOf(targetMarker);
  
  if (targetIndex !== -1) {
    const wrappedBlock = `      {tipoIngreso !== "SELECCION" && (\n        <div className={\`\${isModal ? '' : 'bg-white p-6 rounded-2xl shadow-sm border border-slate-200'} mb-6\`}>\n${block}        </div>\n      )}\n\n`;
    content = content.slice(0, targetIndex) + wrappedBlock + content.slice(targetIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Success");
  } else {
    console.log("Could not find target marker");
  }
} else {
  console.log("Could not find block", startIndex, endIndex);
}

import * as xlsx from 'xlsx';

const filePath = './scratch/REPORTE_ESTRATIFICACION_ESTAB_CESFAM_FUTRONO.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
if (data.length > 0) {
  const headers = data[0];
  console.log("Headers encontrados en el Excel:");
  headers.forEach((header: any, i: number) => {
    console.log(`[${i}] ${header}`);
  });
  
  if (data.length > 1) {
    console.log("\nEjemplo primera fila de datos:");
    console.log(data[1]);
  }
} else {
  console.log("El archivo parece estar vacío.");
}

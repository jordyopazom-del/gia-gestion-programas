import * as XLSX from 'xlsx';
const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
const workbook = XLSX.readFile(filePath);
let totalRows = 0;
for (const sheetName of workbook.SheetNames) {
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  totalRows += data.length;
}
console.log('Total de registros en todas las pestañas:', totalRows);

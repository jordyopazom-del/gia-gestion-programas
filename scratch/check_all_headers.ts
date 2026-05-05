import * as XLSX from 'xlsx';
const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
const workbook = XLSX.readFile(filePath);
for (const sheetName of workbook.SheetNames) {
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  if (data[0]) {
    console.log(`${sheetName}:`, data[0][0]); // the very first column header
  }
}

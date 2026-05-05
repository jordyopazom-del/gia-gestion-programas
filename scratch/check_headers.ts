import * as XLSX from 'xlsx';
const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
if (data.length > 0) {
  console.log('Headers in first row:', Object.keys(data[0]));
}

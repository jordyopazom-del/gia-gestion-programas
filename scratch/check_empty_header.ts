import * as XLSX from 'xlsx';
const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
const workbook = XLSX.readFile(filePath);
const data = XLSX.utils.sheet_to_json(workbook.Sheets['JUNIO 2025']);
console.log('Keys for JUNIO 2025 row 1:', Object.keys(data[0]));

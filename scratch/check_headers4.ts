import * as XLSX from 'xlsx';
const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['MARZO 2026 '];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Headers in MARZO 2026:', data[0]);

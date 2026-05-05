import * as XLSX from 'xlsx';
const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
const workbook = XLSX.readFile(filePath);
// check the exact sheet the user sent a screenshot of "MARZO 2026"
const sheetName = 'MARZO 2026';
const sheet = workbook.Sheets[sheetName];
if (sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Headers in MARZO 2026:', data[0]);
  console.log('Row 2 in MARZO 2026:', data[1]);
  console.log('Row 3 in MARZO 2026:', data[2]);
} else {
  console.log('Sheet MARZO 2026 not found');
}

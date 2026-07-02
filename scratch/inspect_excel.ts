import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = '/Users/jopazo/Downloads/Corte percápita abril 2026.xlsx';

function run() {
  try {
    console.log("Leyendo archivo:", filePath);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log("Hojas disponibles:", workbook.SheetNames);
    console.log("Leyendo hoja:", sheetName);
    
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length === 0) {
      console.log("El archivo está vacío.");
      return;
    }
    
    console.log("\n--- ENCABEZADOS ENCONTRADOS ---");
    const headers = data[0];
    console.log(headers);
    
    console.log("\n--- PRIMERAS 3 FILAS DE DATOS ---");
    for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
      console.log(`Fila ${i}:`, data[i]);
    }
    
  } catch (error) {
    console.error("Error al leer el archivo Excel:", error);
  }
}

run();

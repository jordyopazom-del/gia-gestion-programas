/**
 * Decodificador Inteligente de Códigos Diagnósticos de Anatomía Patológica (PAP / Citología Cervical)
 * Sistema de Codificación Alfanumérica de Servicios de Salud / Laboratorios Base (Chile).
 */

export interface DecodificacionPap {
  codigoOriginal: string;
  codigoLimpio: string;
  diagnostico: string;
  diagnosticoCodigo?: string;
  adecuacion: "SATISFACTORIA" | "INSATISFACTORIA" | "SIN_ZONA_TRANSFORMACION" | "PENDIENTE";
  adecuacionDescripcion: string;
  adecuacionCodigo?: string;
  motivoInsatisfactoria?: string;
  microbiologia: string[];
  conducta: string[];
  conductaCodigo?: string;
  esPatologico: boolean;
  esInsatisfactorio: boolean;
  periodicidadSugeridaMeses: number; // 36, 12, 6, 0 (0 = derivar/repetir inmediato)
  textoResumen: string;
}

// Diccionario de Diagnósticos Citológicos Principales
export const DIAGNOSTICOS_CITOLOGIA: Record<string, { label: string; patologico: boolean }> = {
  "A1": { label: "Probable Lesión IntraEpitelial de Bajo Grado (Cambios celulares por HPV)", patologico: true },
  "AL": { label: "NIE I + Condiloma (Correlación)", patologico: true },
  "A": { label: "Probable Lesión IntraEpitelial de Bajo Grado (NIE I / Displasia Leve)", patologico: true },
  "BL": { label: "NIE II + Condiloma (Correlación)", patologico: true },
  "B": { label: "Probable Lesión IntraEpitelial de Alto Grado (NIE II / Displasia Moderada)", patologico: true },
  "CL": { label: "NIE III + Condiloma (Correlación)", patologico: true },
  "C": { label: "Probable Lesión IntraEpitelial de Alto Grado (NIE III / Displasia Severa / Ca in situ)", patologico: true },
  "D0": { label: "Probable Adenocarcinoma Endocervical in situ", patologico: true },
  "D1": { label: "Probable Adenocarcinoma de origen Endocervical", patologico: true },
  "D2": { label: "Probable Adenocarcinoma de origen Endometrial", patologico: true },
  "D3": { label: "Probable Carcinoma Adenoescamoso", patologico: true },
  "DL": { label: "Probable Adenocarcinoma + Condiloma", patologico: true },
  "D": { label: "Probable Adenocarcinoma", patologico: true },
  "E1": { label: "Probable Carcinoma Indiferenciado", patologico: true },
  "E2": { label: "Probable Tumor Maligno Extracervical", patologico: true },
  "EL": { label: "Probable Carcinoma Escamoso + Condiloma", patologico: true },
  "E": { label: "Probable Carcinoma Escamoso", patologico: true },
  "H1": { label: "Células Escamosas Atípicas de Significado Indeterminado (ASCUS)", patologico: true },
  "H2": { label: "Células Escamosas Atípicas", patologico: true },
  "H3": { label: "Células Glandulares Atípicas de Significado Indeterminado (AGUS)", patologico: true },
  "H4": { label: "Células Glandulares Atípicas sugerentes de Neoplasia Maligna", patologico: true },
  "I": { label: "Negativo para Células Neoplásicas (Normal)", patologico: false },
  "F1": { label: "Frotis Atrófico", patologico: false },
  "F7": { label: "Paciente con 2° PAP HPV", patologico: false },
  "F8": { label: "Muestra inadecuada para evaluación hormonal", patologico: false },
  "F9": { label: "Índice de Maduración no corresponde a la edad", patologico: false },
  "TU": { label: "Tumor maligno (Correlación)", patologico: true },
  "ZL": { label: "Trozos sueltos de epitelio neoplásicos y condiloma", patologico: true },
  "Z": { label: "Trozos sueltos de epitelio neoplásicos", patologico: true },
};

// Diccionario de Calidad / Adecuación de Muestra
export const ADECUACION_MUESTRA: Record<string, { label: string; tipo: "SATISFACTORIA" | "INSATISFACTORIA" | "SIN_ZONA_TRANSFORMACION"; motivo?: string }> = {
  "G8": { label: "Muestra Satisfactoria", tipo: "SATISFACTORIA" },
  "G7": { label: "No se observan células Endocervicales ni Metaplásicas (Sin Zona de Transformación)", tipo: "SIN_ZONA_TRANSFORMACION" },
  "G0": { label: "Muestra Inadecuada: Contiene sólo células endocervicales", tipo: "INSATISFACTORIA", motivo: "CELULARIDAD_INADECUADA" },
  "G1": { label: "Muestra Inadecuada: Escasa celularidad", tipo: "INSATISFACTORIA", motivo: "CELULARIDAD_ESCASA" },
  "G2": { label: "Muestra Inadecuada: Hemorrágica", tipo: "INSATISFACTORIA", motivo: "HEMORRAGICO" },
  "G3": { label: "Muestra Inadecuada: Exceso inflamatorio", tipo: "INSATISFACTORIA", motivo: "INFLAMATORIO" },
  "G4": { label: "Muestra Inadecuada: Mal fijada", tipo: "INSATISFACTORIA", motivo: "MALA_FIJACION" },
  "G5": { label: "Muestra Inadecuada: Escasa y Hemorrágica", tipo: "INSATISFACTORIA", motivo: "HEMORRAGICO_ESCASA" },
  "G6": { label: "Muestra Inadecuada: Escasa e Inflamatoria", tipo: "INSATISFACTORIA", motivo: "INFLAMATORIO_ESCASA" },
  "G9": { label: "Muestra Inadecuada: Placa Quebrada", tipo: "INSATISFACTORIA", motivo: "PLACA_QUEBRADA" },
};

// Diccionario de Microbiología, Inflamación y Otros Hallazgos
export const HALLAZGOS_MICRO: Record<string, { label: string; patologico?: boolean }> = {
  "J1": { label: "Reacción Inflamatoria Inespecífica" },
  "J2": { label: "Reacción Inflamatoria por Trichomonas" },
  "J3": { label: "Reacción Inflamatoria sugerente de Herpes Simplex" },
  "J4": { label: "Reacción Inflamatoria por Gardnerella Vaginalis" },
  "J5": { label: "Reacción Inflamatoria por Candida spp." },
  "J6": { label: "Reacción Inflamatoria por Actinomyces" },
  "J7": { label: "Reacción Inflamatoria sugerente de cervicitis folicular" },
  "K1": { label: "Presencia de células disqueratósicas" },
  "K3": { label: "Cambios celulares asociados a Reparación" },
  "K": { label: "Alteraciones degenerativas por efecto de Radiación" },
  "L1": { label: "Atipias sugerentes de infección por Herpes simplex" },
  "L2": { label: "Atipias sugerentes de infección por VPH" },
  "L3": { label: "Cambios celulares sugerentes de proceso reactivo" },
  "L4": { label: "Cambios celulares sugerentes de LIE de Bajo Grado", patologico: true },
  "L5": { label: "No se puede descartar LIE de Alto Grado", patologico: true },
  "L6": { label: "No se puede descartar LIE de Alto Grado y/o CA Invasor", patologico: true },
  "L7": { label: "Sugiere cambios en células endocervicales" },
  "L8": { label: "Sugiere cambios en células endometriales" },
  "L9": { label: "Sugiere cambios en células de origen no definido" },
  "N1": { label: "Numerosos histiocitos" },
  "N2": { label: "Presencia de células endometriales en postmenopausia" },
  "N": { label: "Presencia de células endometriales fuera de fase menstrual" },
};

// Diccionario de Conductas y Recomendaciones
export const CONDUCTAS_LAB: Record<string, { label: string; meses?: number; upc?: boolean }> = {
  "O3": { label: "Tratar condiciones locales y controlar en 6 meses", meses: 6 },
  "O2": { label: "Tratar la inflamación y repetir para precisar diagnóstico", meses: 0 },
  "O4": { label: "Tratar la inflamación y repetir para precisar diagnóstico", meses: 0 },
  "O": { label: "Tratar la inflamación", meses: 6 },
  "S1": { label: "Control citológico en 6 meses", meses: 6 },
  "S2": { label: "Solicita control citológico después de 6 meses", meses: 6 },
  "S": { label: "Control en 1 año", meses: 12 },
  "P2": { label: "Repetir después de 1 semana con tratamiento estrogénico", meses: 0 },
  "P1": { label: "Repetir para precisar diagnóstico", meses: 0 },
  "P": { label: "Repetir muestra", meses: 0 },
  "Q1": { label: "Repetir para descartar carcinoma", meses: 0, upc: true },
  "Q": { label: "Repetir para descartar neoplasia intraepitelial", meses: 0, upc: true },
  "R1": { label: "Repetir para descartar patología endometrial", meses: 0 },
  "R2": { label: "Repetir en la segunda mitad del ciclo", meses: 0 },
  "R": { label: "Repetir para descartar patología endocervical", meses: 0 },
  "T1": { label: "Si hay lesión clínica se sugiere colposcopía y biopsia (UPC)", upc: true },
  "T2": { label: "Citar a Hospital / UPC", upc: true },
  "T3": { label: "Citar a Hospital / UPC", upc: true },
  "T4": { label: "Citar a Hospital / UPC", upc: true },
  "T": { label: "Citar a Patología Cervical (UPC - GES)", upc: true },
  "U1": { label: "Completar estudio con biopsia dirigida por colposcopía (UPC)", upc: true },
  "U2": { label: "Curetaje endocervical (UPC)", upc: true },
  "U3": { label: "Colposcopía y curetaje fraccionado (UPC)", upc: true },
  "U4": { label: "Curetaje endocervical (UPC)", upc: true },
  "U": { label: "Completar estudio con colposcopía y biopsia (UPC)", upc: true },
  "V1": { label: "Curetaje fraccionado (UPC)", upc: true },
  "V": { label: "Conización diagnóstica (UPC)", upc: true },
};

/**
 * Decodifica una cadena de código compuesto de laboratorio (ej: 'IG8J5O3', 'IG7', 'AG8T')
 */
export function decodificarCodigoPap(codigoRaw: string): DecodificacionPap {
  if (!codigoRaw || !codigoRaw.trim()) {
    return {
      codigoOriginal: "",
      codigoLimpio: "",
      diagnostico: "PENDIENTE DE RESULTADO",
      adecuacion: "PENDIENTE",
      adecuacionDescripcion: "Pendiente",
      microbiologia: [],
      conducta: [],
      esPatologico: false,
      esInsatisfactorio: false,
      periodicidadSugeridaMeses: 36,
      textoResumen: "Sin código ingresado",
    };
  }

  const codigo = codigoRaw.trim().toUpperCase().replace(/[\s\-_]/g, "");
  let remaining = codigo;

  let diagnostico = "Negativo para Células Neoplásicas";
  let diagnosticoCodigo: string | undefined;
  let esPatologico = false;

  let adecuacion: "SATISFACTORIA" | "INSATISFACTORIA" | "SIN_ZONA_TRANSFORMACION" | "PENDIENTE" = "SATISFACTORIA";
  let adecuacionDescripcion = "Muestra Satisfactoria";
  let adecuacionCodigo = "G8";
  let motivoInsatisfactoria: string | undefined;
  let esInsatisfactorio = false;

  const microbiologia: string[] = [];
  const conducta: string[] = [];
  let periodicidadSugeridaMeses = 36;

  // 1. Extraer adecuación G (G0 - G9)
  const gMatch = remaining.match(/G[0-9]/);
  if (gMatch) {
    const gCode = gMatch[0];
    const adecInfo = ADECUACION_MUESTRA[gCode];
    if (adecInfo) {
      adecuacionCodigo = gCode;
      adecuacionDescripcion = adecInfo.label;
      adecuacion = adecInfo.tipo;
      motivoInsatisfactoria = adecInfo.motivo;
      if (adecInfo.tipo === "INSATISFACTORIA") {
        esInsatisfactorio = true;
        periodicidadSugeridaMeses = 0;
      } else if (adecInfo.tipo === "SIN_ZONA_TRANSFORMACION") {
        periodicidadSugeridaMeses = 12; // G7 -> 1 año
      }
    }
    remaining = remaining.replace(gCode, "");
  }

  // 2. Extraer Diagnóstico Citológico Principal (Tokens ordenados de mayor longitud a menor)
  const diagKeys = Object.keys(DIAGNOSTICOS_CITOLOGIA).sort((a, b) => b.length - a.length);
  for (const k of diagKeys) {
    if (remaining.startsWith(k)) {
      diagnosticoCodigo = k;
      const diagInfo = DIAGNOSTICOS_CITOLOGIA[k];
      diagnostico = diagInfo.label;
      if (diagInfo.patologico) {
        esPatologico = true;
        periodicidadSugeridaMeses = 0; // Patológico requiere derivación, no periodicidad normal
      }
      remaining = remaining.slice(k.length);
      break;
    }
  }

  // 3. Extraer Hallazgos microbiológicos (J, K, L, N)
  const microKeys = Object.keys(HALLAZGOS_MICRO).sort((a, b) => b.length - a.length);
  for (const k of microKeys) {
    if (remaining.includes(k)) {
      const microInfo = HALLAZGOS_MICRO[k];
      microbiologia.push(`${k}: ${microInfo.label}`);
      if (microInfo.patologico) {
        esPatologico = true;
      }
      remaining = remaining.replace(k, "");
    }
  }

  // 4. Extraer Conductas / Recomendaciones (O, S, T, U, V, P, Q, R)
  const conductaKeys = Object.keys(CONDUCTAS_LAB).sort((a, b) => b.length - a.length);
  for (const k of conductaKeys) {
    if (remaining.includes(k)) {
      const condInfo = CONDUCTAS_LAB[k];
      conducta.push(`${k}: ${condInfo.label}`);
      if (condInfo.upc) {
        esPatologico = true;
      }
      if (condInfo.meses !== undefined && !esPatologico) {
        periodicidadSugeridaMeses = condInfo.meses;
      }
      remaining = remaining.replace(k, "");
    }
  }

  // Si no se especificó diagnóstico pero empieza por I o no es patológico
  if (!diagnosticoCodigo && codigo.startsWith("I")) {
    diagnosticoCodigo = "I";
    diagnostico = "Negativo para Células Neoplásicas (Normal)";
  }

  // Construir resumen legible
  const partesResumen: string[] = [];
  partesResumen.push(diagnostico);
  partesResumen.push(adecuacionDescripcion);
  if (microbiologia.length > 0) {
    partesResumen.push(`Hallazgos: ${microbiologia.join(", ")}`);
  }
  if (conducta.length > 0) {
    partesResumen.push(`Conducta: ${conducta.join(", ")}`);
  }

  return {
    codigoOriginal: codigoRaw,
    codigoLimpio: codigo,
    diagnostico,
    diagnosticoCodigo,
    adecuacion,
    adecuacionDescripcion,
    adecuacionCodigo,
    motivoInsatisfactoria,
    microbiologia,
    conducta,
    esPatologico,
    esInsatisfactorio,
    periodicidadSugeridaMeses,
    textoResumen: partesResumen.join(" | "),
  };
}

import { PurchaseDocumentType } from '../models/compras.model';

export const TIPOS_DOCUMENTO: Record<PurchaseDocumentType, string> = {
  CREDITO_FISCAL: 'Crédito fiscal',
  NOTA_CREDITO: 'Nota de crédito'
};

export const CONDICIONES_OPERACION: Record<number, string> = {
  1: 'Contado',
  2: 'Crédito',
  3: 'Otro'
};

// Motivos de rechazo de la importación (reason)
export const MOTIVOS_RECHAZO: Record<string, string> = {
  INVALID_FILE: 'Solo se aceptan archivos .json',
  INVALID_JSON: 'El archivo no es un JSON válido',
  INVALID_STRUCTURE: 'El archivo no es un DTE válido',
  UNSUPPORTED_TYPE: 'Tipo de documento no soportado (solo créditos fiscales y notas de crédito)',
  TEST_ENVIRONMENT: 'Es un documento de pruebas, no tiene validez',
  MISSING_STAMP: 'No tiene sello de recepción de Hacienda',
  RECEIVER_MISMATCH: 'El documento no está emitido a nombre del negocio (NRC distinto)',
  DUPLICATE: 'El documento ya estaba registrado o venía repetido en esta carga',
  INTERNAL_ERROR: 'Error inesperado al guardar; intenta de nuevo'
};

// Advertencias (warnings[].code)
export const ADVERTENCIAS: Record<string, string> = {
  MH_OBSERVATIONS: 'Hacienda lo recibió con observaciones (el documento es válido)',
  TOTALS_MISMATCH: 'Los totales del documento no cuadran (error del proveedor; el documento es válido)',
  PENDING_LINK: 'Nota de crédito pendiente de vincular: falta importar su crédito fiscal',
  HAS_CREDIT_NOTES: 'Este crédito fiscal tiene notas de crédito activas que siguen contando en los reportes'
};

// Códigos cuyo message original sirve como detalle técnico (qué campo falta o qué observó Hacienda)
export const CODIGOS_CON_DETALLE = new Set(['INVALID_STRUCTURE', 'MH_OBSERVATIONS', 'TOTALS_MISMATCH']);

export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// YYYY-MM-DD → dd/MM/yyyy sin pasar por Date (new Date('2026-10-13') es medianoche UTC y se corre un día)
export function formatearFechaDte(fecha: string | null | undefined): string {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-');
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha;
}

// YYYY-MM → índice de mes (0-11)
export function indiceMes(mes: string): number {
  return Number(mes.split('-')[1]) - 1;
}

// Unidades de medida del DTE (catálogo CAT-014 de Hacienda) que aparecen en las compras
export const UNIDADES_MEDIDA: Record<number, { nombre: string; corto: string }> = {
  36: { nombre: 'Libra', corto: 'lb' },
  59: { nombre: 'Unidad', corto: 'u' },
  99: { nombre: 'Otra', corto: 'u.m.' }
};

export function unidadMedida(codigo: number): { nombre: string; corto: string } {
  return UNIDADES_MEDIDA[codigo] ?? { nombre: `Unidad ${codigo}`, corto: 'u.m.' };
}

// Periodos del análisis de precios (últimos N meses o todo el historial)
export const PERIODOS_PRODUCTOS: { id: number | 'all'; label: string }[] = [
  { id: 3, label: 'Últimos 3 meses' },
  { id: 6, label: 'Últimos 6 meses' },
  { id: 12, label: 'Últimos 12 meses' },
  { id: 24, label: 'Últimos 24 meses' },
  { id: 'all', label: 'Todo el historial' }
];

// Qué tan confiable es la tendencia según el R² de la regresión
export function confianzaTendencia(r2: number): { label: string; clase: string } {
  if (r2 >= 0.5) return { label: 'Confianza alta', clase: 'text-success' };
  if (r2 >= 0.2) return { label: 'Confianza media', clase: 'text-warning' };
  return { label: 'Confianza baja', clase: 'text-secondary' };
}

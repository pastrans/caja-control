// DTOs del Backend (/api/v1/suppliers, /purchase-documents, /purchase-reports)
// Las fechas sin hora (issueDate, lastIssueDate...) llegan como YYYY-MM-DD y se manejan como texto

export type PurchaseDocumentType = 'CREDITO_FISCAL' | 'NOTA_CREDITO';
export type PurchaseDocumentStatus = 'active' | 'voided' | 'all';

// ---------- Proveedores ----------

export interface SupplierDTO {
  id: number;
  nit: string;
  nrc: string | null;
  name: string;
  commercialName: string | null;
  activityCode: string | null;
  activityDescription: string | null;
  phone: string | null;
  email: string | null;
  lastIssueDate: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Documentos ----------

export interface DteWarning {
  code: string;
  message: string;
}

export interface PurchaseTotals {
  nonSubjectTotal: number;
  exemptTotal: number;
  taxedTotal: number;
  discountTotal: number;
  subtotal: number;
  ivaAmount: number;
  ivaPerceived: number;
  ivaWithheld: number;
  incomeTaxWithheld: number;
  operationTotal: number;
  total: number;
}

export interface PurchaseUserSummary {
  id: number;
  name: string;
}

export interface PurchaseVoidInfo {
  voidedAt: string;
  reason: string;
  voidedBy: PurchaseUserSummary | null;
}

export interface PurchaseDocumentDTO {
  id: number;
  type: PurchaseDocumentType;
  generationCode: string;
  controlNumber: string;
  receptionStamp: string;
  schemaVersion: number;
  issueDate: string;
  issueTime: string;
  currency: string;
  receiverNrc: string;
  operationCondition: number;
  totals: PurchaseTotals;
  supplier: { id: number; name: string; nit: string };
  warnings: DteWarning[];   // Solo MH_OBSERVATIONS y TOTALS_MISMATCH
  pendingLinks: string[];   // Códigos de créditos fiscales aún no registrados
  voided: PurchaseVoidInfo | null;
  importedBy: PurchaseUserSummary | null;
  createdAt: string;
}

export interface PurchaseItemDTO {
  itemNumber: number;
  itemType: number;
  code: string | null;
  description: string;
  quantity: number;
  unitOfMeasure: number;
  unitPrice: number;
  discount: number;
  nonSubjectSale: number;
  exemptSale: number;
  taxedSale: number;
  relatedDocumentCode: string | null;
}

// Referencia corta a otro documento (crédito fiscal relacionado o nota de crédito)
export interface PurchaseDocumentReference {
  id: number;
  generationCode: string;
  controlNumber: string;
  issueDate: string;
  total: number;
  voided: boolean;
}

export interface PurchaseRelatedDocumentDTO {
  relatedType: string;
  generationType: number; // 1 físico, 2 electrónico
  relatedDocumentNumber: string;
  relatedIssueDate: string;
  document: PurchaseDocumentReference | null; // null: pendiente de vincular o documento físico
}

export interface PurchaseDocumentDetailDTO extends PurchaseDocumentDTO {
  items: PurchaseItemDTO[];
  relatedDocuments: PurchaseRelatedDocumentDTO[];
  creditNotes: PurchaseDocumentReference[];
}

export interface VoidPurchaseDocumentResponse {
  document: PurchaseDocumentDetailDTO;
  warnings: DteWarning[]; // Puede traer HAS_CREDIT_NOTES
}

// Filtros del listado; todos opcionales
export interface PurchaseDocumentFilters {
  type?: PurchaseDocumentType;
  supplierId?: number;
  from?: string;
  to?: string;
  status?: PurchaseDocumentStatus;
  withWarnings?: boolean;
  pendingLink?: boolean;
}

// ---------- Importación ----------

export interface ImportSummary {
  received: number;
  imported: number;
  rejected: number;
  withWarnings: number;
}

export interface ImportResultImported {
  file: string;
  status: 'imported';
  documentId: number;
  type: PurchaseDocumentType;
  generationCode: string;
  linkedCreditNotes: number;
  warnings: DteWarning[];
}

export interface ImportResultRejected {
  file: string;
  status: 'rejected';
  reason: string;
  message: string;
}

export type ImportResult = ImportResultImported | ImportResultRejected;

export interface ImportResponse {
  summary: ImportSummary;
  results: ImportResult[];
}

// ---------- Reportes ----------

export interface ReportBlock {
  documents: number;
  taxed: number;
  exempt: number;
  nonSubject: number;
  iva: number;
  ivaPerceived: number;
  ivaWithheld: number;
  total: number;
}

export interface ReportNet extends Omit<ReportBlock, 'documents'> {
  ivaCredit: number; // iva + ivaPerceived
}

export interface ReportTotals {
  creditosFiscales: ReportBlock;
  notasCredito: ReportBlock;
  net: ReportNet;
}

export interface IvaSummaryMonth extends ReportTotals {
  month: string; // YYYY-MM
}

export interface IvaSummaryDTO {
  year: number;
  receiverNrc: string | null;
  supplierId: number | null;
  months: IvaSummaryMonth[];
  total: ReportTotals;
}

export interface PurchaseSummaryDTO extends ReportTotals {
  from: string;
  to: string;
  receiverNrc: string | null;
  supplierId: number | null;
}

export interface SupplierReportRow {
  supplierId: number;
  name: string;
  nit: string;
  creditosFiscales: number;
  notasCredito: number;
  taxed: number;
  exempt: number;
  nonSubject: number;
  iva: number;
  ivaPerceived: number;
  ivaWithheld: number;
  total: number;
  ivaCredit: number;
  percentage: number;
}

export interface BySupplierDTO {
  from: string;
  to: string;
  receiverNrc: string | null;
  supplierId: number | null;
  total: number;
  suppliers: SupplierReportRow[];
}

// Rango opcional: sin fechas el backend usa el mes en curso (zona del negocio)
export interface ReportRange {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

// ---------- Productos (análisis de precios) ----------

export type PriceTrendDirection = 'up' | 'down' | 'flat';
export type ProductSort = 'spent' | 'change' | 'trend' | 'name' | 'recent';
export type ProductPeriod = number | 'all'; // Últimos N meses o todo el historial

export interface ProductPriceTrend {
  pctPerMonth: number;
  slopePerMonth: number;
  r2: number; // 0-1: qué tanto siguen los precios la línea
  direction: PriceTrendDirection;
  startPrice: number; // Valor de la línea en la primera compra
  endPrice: number;   // Valor de la línea en la última compra
}

export interface ProductPriceStatsDTO {
  key: string; // supplierId:unitOfMeasure:código
  supplierId: number;
  supplierName: string;
  ref: string;
  name: string;
  unitOfMeasure: number;
  purchases: number;
  quantity: number;
  spent: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  firstDate: string;
  firstPrice: number;
  lastDate: string;
  lastPrice: number;
  previousPrice: number | null;
  changePct: number;
  lastChangePct: number | null;
  trend: ProductPriceTrend | null; // null: menos de 4 compras o menos de 60 días
  variants: number; // Variantes unidas (sus compras ya están sumadas)
}

export interface ProductsTrendSummary {
  products: number;
  rising: number;
  falling: number;
  flat: number;
  insufficient: number;
}

export interface PurchaseProductsDTO {
  months: number | null;
  from: string;
  to: string;
  supplierId: number | null;
  summary: ProductsTrendSummary;
  page: number;
  limit: number;
  total: number;
  data: ProductPriceStatsDTO[];
}

export interface PurchaseProductFilters {
  period?: ProductPeriod;
  supplierId?: number;
  search?: string;
  sort?: ProductSort;
  order?: 'asc' | 'desc';
}

export interface ProductPricePointDTO {
  date: string;
  documentId: number;
  controlNumber: string;
  quantity: number;
  amount: number;
  unitPrice: number;
}

export interface ProductPriceMonthDTO {
  month: string; // YYYY-MM
  purchases: number;
  quantity: number;
  spent: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface ProductPriceProjectionDTO {
  date: string;
  price: number;
}

export interface ProductHistoryDTO {
  months: number | null;
  from: string;
  to: string;
  product: ProductPriceStatsDTO; // Si se pidió una variante, es su producto principal
  variants: ProductVariantInfoDTO[];
  points: ProductPricePointDTO[];
  monthly: ProductPriceMonthDTO[];
  projection: ProductPriceProjectionDTO[];
}

// ---------- Variantes (el mismo producto con otro código o nombre) ----------

// Un producto por separado, con todo su historial
export interface ProductSummaryDTO {
  key: string;
  ref: string;
  name: string;
  unitOfMeasure: number;
  purchases: number;
  firstDate: string;
  lastDate: string;
  lastPrice: number;
}

export interface ProductVariantInfoDTO extends ProductSummaryDTO {
  createdAt: string;
  createdBy: string;
}

export interface ProductMergeDTO {
  supplierId: number;
  supplierName: string;
  product: ProductSummaryDTO;
  variants: ProductVariantInfoDTO[];
}

export interface ProductMergeSuggestionDTO {
  supplierId: number;
  supplierName: string;
  signature: string;    // Se envía para descartar la sugerencia
  suggestedKey: string; // Principal sugerido: el que tiene más compras
  sameUnit: boolean;    // false: mezcla unidades de medida con precio parecido (revisar antes de unir)
  products: ProductSummaryDTO[];
}

export interface MergeProductsResultDTO {
  key: string; // Producto principal
  variants: number;
}

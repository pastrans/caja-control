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

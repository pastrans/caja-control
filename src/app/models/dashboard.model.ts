// DTOs del Backend (/api/v1/dashboard)
export type GroupBy = 'day' | 'week' | 'month';

export interface PeriodSummary {
  total: number;
  count: number;
  averageTicket: number;
}

export interface DashboardSummaryDTO {
  timezone: string;
  generatedAt: string;
  today: PeriodSummary;
  week: PeriodSummary;
  month: PeriodSummary;
  year: PeriodSummary;
}

export interface EmployeeSalesDTO {
  employeeId: number;
  name: string;
  available: boolean;
  total: number;
  count: number;
  averageTicket: number;
  percentage: number;
}

export interface SalesByEmployeeDTO {
  from: string;
  to: string;
  total: number;
  count: number;
  employees: EmployeeSalesDTO[];
}

export interface EmployeeSalesPointDTO {
  employeeId: number;
  total: number;
  count: number;
}

export interface SalesPointDTO {
  period: string; // YYYY-MM-DD (inicio del periodo)
  total: number;
  count: number;
  byEmployee: EmployeeSalesPointDTO[]; // Solo empleados con ventas en el periodo
}

export interface SalesOverTimeDTO {
  from: string;
  to: string;
  groupBy: GroupBy;
  employeeIds: number[] | null;
  total: number;
  count: number;
  data: SalesPointDTO[];
}

// Filtros que envía la UI
export interface DashboardRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

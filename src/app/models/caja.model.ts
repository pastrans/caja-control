export interface DenominationRecord {
  valor: number;
  cantidad: number;
}

export interface CajaRecord {
  id: number;
  date: Date;
  amountToCharge: number;
  cashProvided: number;
  changeReturned: number;
  empleadoId: number;
  empleadoNombre: string;
  nota: string;
  denominations: DenominationRecord[];
}

export interface CashInOutRecord {
  id: number;
  type: 'Entrada' | 'Salida';
  amount: number;
  reason: string;
  date: Date;
}

export interface DenominationRecord {
  valor: number;
  cantidad: number;
}

export interface CashInOutRecord {
  id: number;
  type: 'Entrada' | 'Salida';
  amount: number;
  reason: string;
  date: Date;
}

export interface Opening {
  date: Date;
  denominations: DenominationRecord[];
  cash: number;
  note?: string;
}

export interface Closing {
  date: Date;
  denominations: DenominationRecord[];
  cashProvided: number;
  difference: number;
}

export interface TransactionRecord {
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

export interface CajaRecord {
  id: number;
  opening: Opening;
  closing?: Closing;
  transactions: TransactionRecord[];
  cashInOut: CashInOutRecord[];
}

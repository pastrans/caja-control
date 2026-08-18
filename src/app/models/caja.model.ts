// 1. DTOs del Backend
export interface DenominationDTO {
  value: number;
  quantity: number;
}

export interface CashInOutDTO {
  id: number;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  date: string;
  note: string | null;
}

export interface TransactionDTO {
  id: number;
  amountToCharge: number;
  cashProvided: number;
  changeReturned: number;
  date: string;
  note: string | null;
  denominations: DenominationDTO[];
  employee: { id: number; name: string; };
}

export interface OpeningDTO {
  id: number;
  cash: number;
  date: string;
  note: string | null;
  denominations: DenominationDTO[];
}

export interface ClosingDTO {
  id: number;
  cashProvided: number;
  difference: number;
  note: string | null;
  createdAt: string; // La API lo envía como createdAt
  denominations: DenominationDTO[];
}

export interface CashRegisterDTO {
  id: number;
  status: 'OPEN' | 'CLOSED';
  opening: OpeningDTO;
  closing?: ClosingDTO;
  transactions: TransactionDTO[];
  cashInOut: CashInOutDTO[];
}

// 2. Modelos del Frontend (Tus modelos adaptados)
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
  note?: string;
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
  note?: string;
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
  status: 'OPEN' | 'CLOSED';
  opening: Opening;
  closing?: Closing;
  transactions: TransactionRecord[];
  cashInOut: CashInOutRecord[];
}

// 3. Adapter / Mapper
export class CajaMapper {
  static mapDenominations(dtos: DenominationDTO[]): DenominationRecord[] {
    if (!dtos) return [];
    return dtos.map(d => ({ valor: d.value, cantidad: d.quantity }));
  }

  static fromDTO(dto: CashRegisterDTO): CajaRecord {
    return {
      id: dto.id,
      status: dto.status,
      opening: {
        date: new Date(dto.opening.date),
        cash: dto.opening.cash,
        note: dto.opening.note || '',
        denominations: this.mapDenominations(dto.opening.denominations)
      },
      closing: dto.closing ? {
        date: new Date(dto.closing.createdAt),
        cashProvided: dto.closing.cashProvided,
        difference: dto.closing.difference,
        note: dto.closing.note || '',
        denominations: this.mapDenominations(dto.closing.denominations)
      } : undefined,
      transactions: (dto.transactions || []).map(t => ({
        id: t.id,
        date: new Date(t.date),
        amountToCharge: t.amountToCharge,
        cashProvided: t.cashProvided,
        changeReturned: t.changeReturned,
        empleadoId: t.employee.id,
        empleadoNombre: t.employee.name,
        nota: t.note || '',
        denominations: this.mapDenominations(t.denominations)
      })),
      cashInOut: (dto.cashInOut || []).map(c => ({
        id: c.id,
        type: c.type === 'IN' ? 'Entrada' : 'Salida',
        amount: c.amount,
        reason: c.reason,
        date: new Date(c.date),
        note: c.note || ''
      }))
    };
  }
}
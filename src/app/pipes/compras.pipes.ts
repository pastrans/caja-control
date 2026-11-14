import { Pipe, PipeTransform } from '@angular/core';
import { PurchaseDocumentType } from '../models/compras.model';
import {
  ADVERTENCIAS,
  CONDICIONES_OPERACION,
  MOTIVOS_RECHAZO,
  TIPOS_DOCUMENTO,
  formatearFechaDte
} from '../utils/compras.utils';

// Fechas sin hora del DTE (issueDate, lastIssueDate...): YYYY-MM-DD → dd/MM/yyyy
@Pipe({ name: 'fechaDte', standalone: true })
export class FechaDtePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatearFechaDte(value);
  }
}

@Pipe({ name: 'tipoDocumento', standalone: true })
export class TipoDocumentoPipe implements PipeTransform {
  transform(value: PurchaseDocumentType): string {
    return TIPOS_DOCUMENTO[value] ?? value;
  }
}

@Pipe({ name: 'condicionOperacion', standalone: true })
export class CondicionOperacionPipe implements PipeTransform {
  transform(value: number): string {
    return CONDICIONES_OPERACION[value] ?? `Código ${value}`;
  }
}

@Pipe({ name: 'motivoRechazo', standalone: true })
export class MotivoRechazoPipe implements PipeTransform {
  transform(value: string): string {
    return MOTIVOS_RECHAZO[value] ?? value;
  }
}

@Pipe({ name: 'advertencia', standalone: true })
export class AdvertenciaPipe implements PipeTransform {
  transform(value: string): string {
    return ADVERTENCIAS[value] ?? value;
  }
}

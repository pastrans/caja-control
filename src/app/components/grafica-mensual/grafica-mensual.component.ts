import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IvaSummaryMonth } from '../../models/compras.model';
import { MESES_CORTOS, MESES_LARGOS, indiceMes } from '../../utils/compras.utils';

export type MetricaMensual = 'total' | 'ivaCredit';

interface Barra {
  mes: string;
  etiqueta: string;
  detalle: string;
  valor: number;
  altura: number; // % del máximo
  documentos: number;
}

// Barras de los 12 meses del resumen de IVA (valores netos)
@Component({
  selector: 'app-grafica-mensual',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grafica-mensual.component.html',
  styleUrl: './grafica-mensual.component.css'
})
export class GraficaMensualComponent {
  private readonly meses = signal<IvaSummaryMonth[]>([]);
  private readonly metricaActual = signal<MetricaMensual>('total');

  @Input({ required: true }) set datos(value: IvaSummaryMonth[]) { this.meses.set(value ?? []); }
  @Input() set metrica(value: MetricaMensual) { this.metricaActual.set(value); }

  hoveredIndex = signal<number | null>(null);

  barras = computed<Barra[]>(() => {
    const metrica = this.metricaActual();
    const valores = this.meses().map(m => m.net[metrica]);
    const max = Math.max(...valores, 0);

    return this.meses().map((m, i) => {
      const idx = indiceMes(m.month);
      return {
        mes: m.month,
        etiqueta: MESES_CORTOS[idx],
        detalle: `${MESES_LARGOS[idx]} ${m.month.slice(0, 4)}`,
        valor: valores[i],
        // Las notas de crédito pueden dejar un mes en negativo: se dibuja sin altura
        altura: max > 0 ? Math.max(valores[i], 0) / max * 100 : 0,
        documentos: m.creditosFiscales.documents + m.notasCredito.documents
      };
    });
  });

  maxY = computed(() => Math.max(...this.barras().map(b => b.valor), 0));
  sinDatos = computed(() => this.barras().every(b => b.valor === 0));

  // Líneas guía en la mitad y el máximo del eje
  escalaY = computed(() => {
    const max = this.maxY();
    return max > 0 ? [max / 2, max] : [];
  });

  posicionTooltip(index: number): number {
    const total = this.barras().length;
    const centro = ((index + 0.5) / total) * 100;
    return Math.min(Math.max(centro, 12), 88);
  }
}

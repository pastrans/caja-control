import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductPricePointDTO, ProductPriceProjectionDTO, ProductPriceTrend, ProductReturnDTO } from '../../models/compras.model';
import { MESES_CORTOS, formatearFechaDte } from '../../utils/compras.utils';

// Coordenadas del SVG (viewBox): el gráfico escala al ancho del contenedor
const W = 800;
const H = 280;
const M = { top: 16, right: 16, bottom: 28, left: 64 };
const MAX_ETIQUETAS_X = 8;

interface Marca { x: number; y: number; }
// Compra, o devolución si trae `devolucion` (se dibuja en la fecha de la nota de crédito, al precio de la compra)
interface PuntoGrafica extends Marca { punto: ProductPricePointDTO; devolucion?: ProductReturnDTO; }
interface Etiqueta { pos: number; texto: string; }

// Fechas YYYY-MM-DD a número de día (UTC) sin pasar por la zona horaria local
const dia = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

// Precio de cada compra, línea de tendencia, proyección punteada y devoluciones (notas de crédito sobre una compra)
@Component({
  selector: 'app-grafica-precios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grafica-precios.component.html',
  styleUrl: './grafica-precios.component.css'
})
export class GraficaPreciosComponent {
  private readonly puntosEntrada = signal<ProductPricePointDTO[]>([]);
  private readonly tendenciaEntrada = signal<ProductPriceTrend | null>(null);
  private readonly proyeccionEntrada = signal<ProductPriceProjectionDTO[]>([]);

  @Input({ required: true }) set puntos(value: ProductPricePointDTO[]) { this.puntosEntrada.set(value ?? []); }
  @Input() set tendencia(value: ProductPriceTrend | null) { this.tendenciaEntrada.set(value); }
  @Input() set proyeccion(value: ProductPriceProjectionDTO[]) { this.proyeccionEntrada.set(value ?? []); }
  @Input() unidad = 'u';

  readonly W = W;
  readonly H = H;
  readonly M = M;

  hovered = signal<PuntoGrafica | null>(null);

  private escalas = computed(() => {
    const puntos = this.puntosEntrada();
    const tendencia = this.tendenciaEntrada();
    const proyeccion = this.proyeccionEntrada();
    if (puntos.length === 0) return null;

    const xMin = dia(puntos[0].date);
    const devoluciones = puntos.flatMap(p => p.returns.map(r => dia(r.date)));
    const xMax = Math.max(dia(puntos[puntos.length - 1].date), ...proyeccion.map(p => dia(p.date)), ...devoluciones, xMin + 1);

    const precios = [
      ...puntos.map(p => p.unitPrice),
      ...(tendencia ? [tendencia.startPrice, tendencia.endPrice] : []),
      ...proyeccion.map(p => p.price)
    ];
    let yMin = Math.min(...precios);
    let yMax = Math.max(...precios);
    const margen = (yMax - yMin) * 0.1 || yMax * 0.05 || 1;
    yMin = Math.max(0, yMin - margen);
    yMax = yMax + margen;

    const x = (d: number) => M.left + ((d - xMin) / (xMax - xMin)) * (W - M.left - M.right);
    const y = (precio: number) => M.top + (1 - (precio - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);
    return { xMin, xMax, yMin, yMax, x, y };
  });

  marcas = computed<PuntoGrafica[]>(() => {
    const e = this.escalas();
    if (!e) return [];
    return this.puntosEntrada().map(punto => ({ punto, x: e.x(dia(punto.date)), y: e.y(punto.unitPrice) }));
  });

  lineaPrecios = computed(() => this.marcas().map(m => `${m.x},${m.y}`).join(' '));

  // Una marca por cada nota de crédito, a la altura del precio de la compra que modifica
  marcasDevolucion = computed<PuntoGrafica[]>(() => {
    const e = this.escalas();
    if (!e) return [];
    return this.marcas().flatMap(m => m.punto.returns.map(devolucion => ({
      punto: m.punto,
      devolucion,
      x: e.x(dia(devolucion.date)),
      y: m.y
    })));
  });

  // Triángulo hacia abajo centrado en la marca
  triangulo(m: Marca): string {
    return `${m.x - 5},${m.y - 4} ${m.x + 5},${m.y - 4} ${m.x},${m.y + 5}`;
  }

  // Para unir la devolución con su compra
  marcaDeCompra(m: PuntoGrafica): PuntoGrafica | undefined {
    return this.marcas().find(c => c.punto.documentId === m.punto.documentId);
  }

  hayDevoluciones = computed(() => this.marcasDevolucion().length > 0);

  lineaTendencia = computed(() => {
    const e = this.escalas();
    const t = this.tendenciaEntrada();
    const puntos = this.puntosEntrada();
    if (!e || !t || puntos.length === 0) return null;
    return {
      x1: e.x(dia(puntos[0].date)), y1: e.y(t.startPrice),
      x2: e.x(dia(puntos[puntos.length - 1].date)), y2: e.y(t.endPrice)
    };
  });

  // Arranca donde termina la tendencia y sigue con los precios estimados
  marcasProyeccion = computed<Marca[]>(() => {
    const e = this.escalas();
    const linea = this.lineaTendencia();
    if (!e || !linea) return [];
    return this.proyeccionEntrada().map(p => ({ x: e.x(dia(p.date)), y: e.y(p.price) }));
  });

  lineaProyeccion = computed(() => {
    const linea = this.lineaTendencia();
    const marcas = this.marcasProyeccion();
    if (!linea || marcas.length === 0) return '';
    return [`${linea.x2},${linea.y2}`, ...marcas.map(m => `${m.x},${m.y}`)].join(' ');
  });

  etiquetasY = computed<Etiqueta[]>(() => {
    const e = this.escalas();
    if (!e) return [];
    return [0, 1, 2, 3].map(i => {
      const precio = e.yMin + ((e.yMax - e.yMin) * i) / 3;
      return { pos: e.y(precio), texto: `$${precio.toFixed(precio < 10 ? 2 : 0)}` };
    });
  });

  // Primer día de cada mes dentro del rango, espaciados para no encimarse
  etiquetasX = computed<Etiqueta[]>(() => {
    const e = this.escalas();
    if (!e) return [];
    const inicio = new Date(e.xMin * 86_400_000);
    const meses: Etiqueta[] = [];
    let anio = inicio.getUTCFullYear();
    let mes = inicio.getUTCMonth() + 1;
    while (true) {
      if (mes > 11) { mes = 0; anio++; }
      const d = Date.UTC(anio, mes, 1) / 86_400_000;
      if (d > e.xMax) break;
      meses.push({ pos: e.x(d), texto: `${MESES_CORTOS[mes]} ${String(anio).slice(2)}` });
      mes++;
    }
    const paso = Math.ceil(meses.length / MAX_ETIQUETAS_X) || 1;
    return meses.filter((_, i) => i % paso === 0);
  });

  onMouseMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;

    let cercano: PuntoGrafica | null = null;
    for (const m of [...this.marcas(), ...this.marcasDevolucion()]) {
      if (!cercano || Math.abs(m.x - x) < Math.abs(cercano.x - x)) cercano = m;
    }
    this.hovered.set(cercano);
  }

  fecha(valor: string): string {
    return formatearFechaDte(valor);
  }

  // Posición del tooltip en % del contenedor, sin salirse por los lados
  tooltipLeft(m: Marca): number {
    return Math.min(Math.max((m.x / W) * 100, 14), 86);
  }

  tooltipTop(m: Marca): number {
    return (m.y / H) * 100;
  }
}

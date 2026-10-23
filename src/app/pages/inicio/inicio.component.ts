import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { DashboardService } from '../../services/dashboard.service';
import { EmpleadosService } from '../../services/empleados.service';
import { Empleado } from '../../models/empleado.model';
import {
  DashboardRange,
  DashboardSummaryDTO,
  EmployeeSalesDTO,
  GroupBy,
  PeriodSummary,
  SalesOverTimeDTO,
  SalesPointDTO
} from '../../models/dashboard.model';

type Preset = '7d' | '15d' | 'mes' | 'mesPasado' | 'trimestre' | '6m' | 'anio' | 'custom';

interface KpiCard {
  label: string;
  icon: string;
  data: PeriodSummary;
}

// Una serie de la gráfica: un empleado, o "Otros" si ya no quedan colores
interface Serie {
  clave: string;
  nombre: string;
  color: string;
  orden: number; // posición en la pila, de abajo hacia arriba
}

interface Segmento extends Serie {
  total: number;
  count: number;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAX_ETIQUETAS_X = 8;

// Paleta categórica para fondo oscuro (validada: separación para daltonismo y contraste >= 3:1).
// Orden fijo y nunca se recicla: del empleado 9 en adelante se agrupan en "Otros"
const PALETA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTROS: Serie = { clave: 'otros', nombre: 'Otros', color: '#6c757d', orden: PALETA.length };

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDropdownModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly empleadosService = inject(EmpleadosService);

  // Estados de UI
  errorMessage = signal<string | null>(null);
  isLoadingSummary = signal<boolean>(true);
  isLoadingEmpleados = signal<boolean>(true);
  isLoadingSerie = signal<boolean>(true);
  vistaTabla = signal<boolean>(false);
  hoveredIndex = signal<number | null>(null);

  // Filtros
  preset = signal<Preset>('mes');
  range = signal<DashboardRange>(this.rangoDePreset('mes'));
  groupBy = signal<GroupBy>('day');
  employeeIds = signal<number[]>([]); // vacío = todos los empleados

  // Datos
  summary = signal<DashboardSummaryDTO | null>(null);
  empleados = signal<EmployeeSalesDTO[]>([]);
  serie = signal<SalesOverTimeDTO | null>(null);
  // Todos los empleados (activos e inactivos): solo para asignar colores estables
  todosEmpleados = signal<Empleado[]>([]);

  // Evita que una respuesta vieja pise a una más reciente al cambiar filtros rápido
  private empleadosReq = 0;
  private serieReq = 0;

  // Cada periodo trae la agrupación que mejor se lee para su tamaño (se puede cambiar a mano)
  readonly presets: { id: Preset; label: string; groupBy?: GroupBy }[] = [
    { id: '7d', label: 'Últimos 7 días', groupBy: 'day' },
    { id: '15d', label: 'Últimos 15 días', groupBy: 'day' },
    { id: 'mes', label: 'Mes en curso', groupBy: 'day' },
    { id: 'mesPasado', label: 'Mes pasado', groupBy: 'day' },
    { id: 'trimestre', label: 'Trimestre en curso', groupBy: 'week' },
    { id: '6m', label: 'Últimos 6 meses', groupBy: 'month' },
    { id: 'anio', label: 'Año en curso', groupBy: 'month' },
    { id: 'custom', label: 'Personalizado' }
  ];

  readonly agrupaciones: { id: GroupBy; label: string }[] = [
    { id: 'day', label: 'Día' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' }
  ];

  kpis = computed<KpiCard[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Hoy', icon: 'bi-sun', data: s.today },
      { label: 'Esta semana', icon: 'bi-calendar-week', data: s.week },
      { label: 'Este mes', icon: 'bi-calendar-month', data: s.month },
      { label: 'Este año', icon: 'bi-calendar3', data: s.year }
    ];
  });

  // Color por ID de empleado (no por ranking): no cambia al filtrar ni al cambiar el rango
  private posiciones = computed(() => {
    const ids = this.todosEmpleados().length > 0
      ? this.todosEmpleados().map(e => e.id)
      : this.empleados().map(e => e.employeeId);
    return new Map([...ids].sort((a, b) => a - b).map((id, i) => [id, i]));
  });

  empleadosSeleccionados = computed(() =>
    this.employeeIds().map(id => ({ id, ...this.serieDe(id), nombre: this.nombreDe(id) }))
  );

  etiquetaFiltroEmpleados = computed(() => {
    const ids = this.employeeIds();
    if (ids.length === 0) return 'Todos los empleados';
    if (ids.length === 1) return this.nombreDe(ids[0]);
    return `${ids.length} empleados`;
  });

  // Escala "redonda" del eje Y: 4 líneas guía con pasos de 1, 2, 2.5, 5 o 10
  escalaY = computed<number[]>(() => {
    const max = Math.max(0, ...(this.serie()?.data ?? []).map(p => p.total));
    if (max === 0) return [0, 25, 50, 75, 100];
    const aprox = max / 4;
    const potencia = Math.pow(10, Math.floor(Math.log10(aprox)));
    const n = aprox / potencia;
    const paso = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * potencia;
    return [0, 1, 2, 3, 4].map(i => i * paso);
  });

  maxY = computed(() => this.escalaY()[this.escalaY().length - 1]);

  barras = computed(() => {
    const data = this.serie()?.data ?? [];
    const max = this.maxY();
    const salto = Math.ceil(data.length / MAX_ETIQUETAS_X);
    return data.map((p, i) => ({
      ...p,
      altura: max > 0 ? (p.total / max) * 100 : 0,
      etiqueta: this.formatearPeriodo(p.period),
      mostrarEtiqueta: i % salto === 0,
      segmentos: this.segmentosDe(p)
    }));
  });

  // Series presentes en la gráfica, en el orden de la pila (la leyenda solo se muestra con 2 o más)
  leyenda = computed<Serie[]>(() => {
    const series = new Map<string, Serie>();
    for (const b of this.barras()) {
      for (const s of b.segmentos) series.set(s.clave, s);
    }
    return [...series.values()].sort((a, b) => a.orden - b.orden);
  });

  ngOnInit(): void {
    this.cargarSummary();
    this.cargarDatosDelRango();
    this.cargarTodosEmpleados();
  }

  refrescar(): void {
    this.cargarSummary();
    this.cargarDatosDelRango();
  }

  // --- Filtros ---

  seleccionarPreset(preset: Preset): void {
    this.preset.set(preset);
    // "Personalizado" conserva el rango actual: se ajusta con los campos de fecha
    if (preset === 'custom') return;

    this.range.set(this.rangoDePreset(preset));
    this.groupBy.set(this.presets.find(p => p.id === preset)?.groupBy ?? 'day');
    this.cargarDatosDelRango();
  }

  cambiarFecha(campo: 'from' | 'to', valor: string): void {
    if (!valor) return;
    this.preset.set('custom');
    this.range.update(r => ({ ...r, [campo]: valor }));

    if (this.range().from > this.range().to) {
      this.errorMessage.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.cargarDatosDelRango();
  }

  seleccionarAgrupacion(groupBy: GroupBy): void {
    this.groupBy.set(groupBy);
    this.cargarSerie();
  }

  // Clic en un empleado (lista o desplegable): lo agrega al filtro; clic otra vez lo quita
  toggleEmpleado(id: number): void {
    const ids = this.employeeIds();
    this.employeeIds.set(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    this.cargarSerie();
  }

  limpiarEmpleados(): void {
    if (this.employeeIds().length === 0) return;
    this.employeeIds.set([]);
    this.cargarSerie();
  }

  estaSeleccionado(id: number): boolean {
    return this.employeeIds().includes(id);
  }

  // --- Series y colores ---

  serieDe(id: number): Serie {
    const posicion = this.posiciones().get(id);
    if (posicion === undefined || posicion >= PALETA.length) return OTROS;
    return { clave: String(id), nombre: this.nombreDe(id), color: PALETA[posicion], orden: posicion };
  }

  private nombreDe(id: number): string {
    return this.empleados().find(e => e.employeeId === id)?.name
      ?? this.todosEmpleados().find(e => e.id === id)?.nombre
      ?? `Empleado ${id}`;
  }

  // Segmentos de una barra, de abajo hacia arriba en el orden fijo de la paleta
  private segmentosDe(punto: SalesPointDTO): Segmento[] {
    const segmentos = new Map<string, Segmento>();
    for (const venta of punto.byEmployee ?? []) {
      const serie = this.serieDe(venta.employeeId);
      const segmento = segmentos.get(serie.clave) ?? { ...serie, total: 0, count: 0 };
      segmento.total = Math.round((segmento.total + venta.total) * 100) / 100;
      segmento.count += venta.count;
      segmentos.set(serie.clave, segmento);
    }
    return [...segmentos.values()].sort((a, b) => a.orden - b.orden);
  }

  totalDeSerie(segmentos: Segmento[], clave: string): number {
    return segmentos.find(s => s.clave === clave)?.total ?? 0;
  }

  // --- Carga de datos ---

  private cargarSummary(): void {
    this.isLoadingSummary.set(true);
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        this.summary.set(res);
        this.isLoadingSummary.set(false);
      },
      error: (err) => {
        this.mostrarError(err, 'Error al cargar el resumen de ventas.');
        this.isLoadingSummary.set(false);
      }
    });
  }

  private cargarDatosDelRango(): void {
    this.errorMessage.set(null);
    this.cargarEmpleados();
    this.cargarSerie();
  }

  private cargarEmpleados(): void {
    const req = ++this.empleadosReq;
    this.isLoadingEmpleados.set(true);

    this.dashboardService.getSalesByEmployee(this.range()).subscribe({
      next: (res) => {
        if (req !== this.empleadosReq) return;
        this.empleados.set(res.employees);
        this.isLoadingEmpleados.set(false);
      },
      error: (err) => {
        if (req !== this.empleadosReq) return;
        this.mostrarError(err, 'Error al cargar las ventas por empleado.');
        this.isLoadingEmpleados.set(false);
      }
    });
  }

  private cargarSerie(): void {
    const req = ++this.serieReq;
    this.isLoadingSerie.set(true);
    this.hoveredIndex.set(null);

    this.dashboardService.getSalesOverTime(this.range(), this.groupBy(), this.employeeIds()).subscribe({
      next: (res) => {
        if (req !== this.serieReq) return;
        this.serie.set(res);
        this.isLoadingSerie.set(false);
      },
      error: (err) => {
        if (req !== this.serieReq) return;
        this.mostrarError(err, 'Error al cargar la gráfica de ventas.');
        this.serie.set(null);
        this.isLoadingSerie.set(false);
      }
    });
  }

  // Si falla, los colores se asignan con los empleados del rango (pueden cambiar entre rangos)
  private cargarTodosEmpleados(): void {
    this.empleadosService.getEmpleados(1, 100).subscribe({
      next: (res) => this.todosEmpleados.set(res.empleados),
      error: () => this.todosEmpleados.set([])
    });
  }

  private mostrarError(err: any, fallback: string): void {
    // El dashboard responde { error }, el resto de la API { message }
    this.errorMessage.set(err.error?.error || err.error?.message || fallback);
  }

  // --- Utilidades de fechas ---

  // Los rangos "Últimos N" terminan hoy e incluyen el día de hoy;
  // mes, trimestre y año son de calendario (desde su primer día hasta hoy)
  private rangoDePreset(preset: Preset): DashboardRange {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();
    const dia = hoy.getDate();
    let desde: Date;
    let hasta = hoy;

    switch (preset) {
      case '7d': desde = new Date(anio, mes, dia - 6); break;
      case '15d': desde = new Date(anio, mes, dia - 14); break;
      case 'mesPasado':
        desde = new Date(anio, mes - 1, 1);
        hasta = new Date(anio, mes, 0); // día 0 = último día del mes anterior
        break;
      case 'trimestre': desde = new Date(anio, Math.floor(mes / 3) * 3, 1); break;
      case '6m': {
        // Mismo día de hace 6 meses; si ese mes es más corto, su último día (ej. 31 ago -> 28 feb)
        const ultimoDia = new Date(anio, mes - 5, 0).getDate();
        desde = new Date(anio, mes - 6, Math.min(dia, ultimoDia));
        break;
      }
      case 'anio': desde = new Date(anio, 0, 1); break;
      default: desde = new Date(anio, mes, 1); // mes en curso
    }
    return { from: this.aISO(desde), to: this.aISO(hasta) };
  }

  private aISO(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
  }

  // 'YYYY-MM-DD' se formatea a mano: new Date('YYYY-MM-DD') es UTC y puede correr un día
  formatearPeriodo(period: string): string {
    const [anio, mes, dia] = period.split('-').map(Number);
    const nombreMes = MESES[mes - 1];

    switch (this.serie()?.groupBy) {
      case 'month': return `${nombreMes} ${String(anio).slice(2)}`;
      case 'week': return `Sem. ${dia} ${nombreMes}`;
      default: return `${dia} ${nombreMes}`;
    }
  }

  // Mantiene el tooltip dentro de la gráfica en los extremos
  posicionTooltip(index: number): number {
    const total = this.barras().length;
    const centro = ((index + 0.5) / total) * 100;
    return Math.min(85, Math.max(15, centro));
  }
}

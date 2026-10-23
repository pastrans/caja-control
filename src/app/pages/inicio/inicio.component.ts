import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import {
  DashboardRange,
  DashboardSummaryDTO,
  EmployeeSalesDTO,
  GroupBy,
  PeriodSummary,
  SalesOverTimeDTO
} from '../../models/dashboard.model';

type Preset = '7d' | '15d' | 'mes' | 'mesPasado' | 'trimestre' | '6m' | 'anio' | 'custom';

interface KpiCard {
  label: string;
  icon: string;
  data: PeriodSummary;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MAX_ETIQUETAS_X = 8;

// Agrupación automática según los días del rango, para no dibujar demasiadas barras:
// hasta 15 días por día, hasta ~3 meses por semana y más de eso por mes
const MAX_DIAS_POR_DIA = 15;
const MAX_DIAS_POR_SEMANA = 92;

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

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
  groupBy = signal<GroupBy>(this.agrupacionPara(this.range()));
  employeeId = signal<number | null>(null);

  // Datos
  summary = signal<DashboardSummaryDTO | null>(null);
  empleados = signal<EmployeeSalesDTO[]>([]);
  serie = signal<SalesOverTimeDTO | null>(null);

  // Evita que una respuesta vieja pise a una más reciente al cambiar filtros rápido
  private empleadosReq = 0;
  private serieReq = 0;

  readonly presets: { id: Preset; label: string }[] = [
    { id: '7d', label: 'Últimos 7 días' },
    { id: '15d', label: 'Últimos 15 días' },
    { id: 'mes', label: 'Mes en curso' },
    { id: 'mesPasado', label: 'Mes pasado' },
    { id: 'trimestre', label: 'Trimestre en curso' },
    { id: '6m', label: 'Últimos 6 meses' },
    { id: 'anio', label: 'Año en curso' },
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

  empleadoSeleccionado = computed(() =>
    this.empleados().find(e => e.employeeId === this.employeeId()) ?? null
  );

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
      detalle: this.detallarPeriodo(p.period),
      mostrarEtiqueta: i % salto === 0
    }));
  });

  ngOnInit(): void {
    this.cargarSummary();
    this.cargarDatosDelRango();
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
    this.groupBy.set(this.agrupacionPara(this.range()));
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
    this.groupBy.set(this.agrupacionPara(this.range()));
    this.cargarDatosDelRango();
  }

  seleccionarAgrupacion(groupBy: GroupBy): void {
    this.groupBy.set(groupBy);
    this.cargarSerie();
  }

  // Clic en la lista de empleados: filtra la gráfica; clic otra vez lo quita
  toggleEmpleado(id: number | null): void {
    this.employeeId.set(this.employeeId() === id ? null : id);
    this.cargarSerie();
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

    this.dashboardService.getSalesOverTime(this.range(), this.groupBy(), this.employeeId()).subscribe({
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

  // Los botones Día/Semana/Mes siguen permitiendo cambiarla a mano
  private agrupacionPara({ from, to }: DashboardRange): GroupBy {
    const [a1, m1, d1] = from.split('-').map(Number);
    const [a2, m2, d2] = to.split('-').map(Number);
    const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000) + 1;

    if (dias <= MAX_DIAS_POR_DIA) return 'day';
    if (dias <= MAX_DIAS_POR_SEMANA) return 'week';
    return 'month';
  }

  private aISO(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
  }

  // Las fechas 'YYYY-MM-DD' se manejan en UTC para que la zona horaria del navegador no corra un día

  // Etiqueta corta del eje X: el primer día del periodo que cae dentro del rango
  formatearPeriodo(period: string): string {
    const { inicio } = this.diasDelPeriodo(period);

    if (this.serie()?.groupBy === 'month') {
      return `${MESES[inicio.getUTCMonth()]} ${String(inicio.getUTCFullYear()).slice(2)}`;
    }
    return `${inicio.getUTCDate()} ${MESES[inicio.getUTCMonth()]}`;
  }

  // Etiqueta completa (tooltip y tabla): los días que realmente cubre la barra
  detallarPeriodo(period: string): string {
    const { inicio, fin, completo } = this.diasDelPeriodo(period);
    const anio = fin.getUTCFullYear();

    switch (this.serie()?.groupBy) {
      case 'month': {
        const mes = `${MESES_LARGOS[inicio.getUTCMonth()]} ${anio}`;
        return completo ? mes : `${mes} (${inicio.getUTCDate()} – ${fin.getUTCDate()})`;
      }
      case 'week': {
        const mismoAnio = inicio.getUTCFullYear() === anio;
        const mismoMes = mismoAnio && inicio.getUTCMonth() === fin.getUTCMonth();
        const desde = mismoMes
          ? `${inicio.getUTCDate()}`
          : `${inicio.getUTCDate()} ${MESES[inicio.getUTCMonth()]}${mismoAnio ? '' : ` ${inicio.getUTCFullYear()}`}`;
        return `${desde} – ${fin.getUTCDate()} ${MESES[fin.getUTCMonth()]} ${anio}`;
      }
      default:
        return `${DIAS_SEMANA[inicio.getUTCDay()]} ${inicio.getUTCDate()} ${MESES[inicio.getUTCMonth()]} ${anio}`;
    }
  }

  // Días que cubre un periodo (día, semana de lunes a domingo o mes), recortados al rango consultado
  private diasDelPeriodo(period: string): { inicio: Date; fin: Date; completo: boolean } {
    const aFecha = (iso: string) => {
      const [a, m, d] = iso.split('-').map(Number);
      return new Date(Date.UTC(a, m - 1, d));
    };
    const inicioPeriodo = aFecha(period);
    const finPeriodo = new Date(inicioPeriodo);

    switch (this.serie()?.groupBy) {
      case 'week': finPeriodo.setUTCDate(finPeriodo.getUTCDate() + 6); break;
      case 'month': finPeriodo.setUTCMonth(finPeriodo.getUTCMonth() + 1, 0); break;
    }

    const desde = this.serie() ? aFecha(this.serie()!.from) : inicioPeriodo;
    const hasta = this.serie() ? aFecha(this.serie()!.to) : finPeriodo;
    const inicio = inicioPeriodo < desde ? desde : inicioPeriodo;
    const fin = finPeriodo > hasta ? hasta : finPeriodo;

    return {
      inicio,
      fin,
      completo: inicio.getTime() === inicioPeriodo.getTime() && fin.getTime() === finPeriodo.getTime()
    };
  }

  // Mantiene el tooltip dentro de la gráfica en los extremos
  posicionTooltip(index: number): number {
    const total = this.barras().length;
    const centro = ((index + 0.5) / total) * 100;
    return Math.min(85, Math.max(15, centro));
  }
}

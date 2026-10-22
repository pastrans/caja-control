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

type Preset = '7d' | '30d' | 'mes' | 'anio' | 'custom';

interface KpiCard {
  label: string;
  icon: string;
  data: PeriodSummary;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAX_ETIQUETAS_X = 8;

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
  groupBy = signal<GroupBy>('day');
  employeeId = signal<number | null>(null);

  // Datos
  summary = signal<DashboardSummaryDTO | null>(null);
  empleados = signal<EmployeeSalesDTO[]>([]);
  serie = signal<SalesOverTimeDTO | null>(null);

  // Evita que una respuesta vieja pise a una más reciente al cambiar filtros rápido
  private empleadosReq = 0;
  private serieReq = 0;

  readonly presets: { id: Preset; label: string }[] = [
    { id: '7d', label: '7 días' },
    { id: '30d', label: '30 días' },
    { id: 'mes', label: 'Este mes' },
    { id: 'anio', label: 'Este año' }
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
    this.range.set(this.rangoDePreset(preset));
    this.groupBy.set(preset === 'anio' ? 'month' : 'day');
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

  private rangoDePreset(preset: Preset): DashboardRange {
    const hoy = new Date();
    const desde = new Date(hoy);

    switch (preset) {
      case '7d': desde.setDate(hoy.getDate() - 6); break;
      case '30d': desde.setDate(hoy.getDate() - 29); break;
      case 'anio': desde.setMonth(0, 1); break;
      default: desde.setDate(1);
    }
    return { from: this.aISO(desde), to: this.aISO(hoy) };
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

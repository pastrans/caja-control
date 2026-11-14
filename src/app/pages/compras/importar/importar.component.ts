import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseDocumentsService } from '../../../services/purchase-documents.service';
import { ImportResult } from '../../../models/compras.model';
import { AdvertenciaPipe, MotivoRechazoPipe, TipoDocumentoPipe } from '../../../pipes/compras.pipes';
import { CODIGOS_CON_DETALLE } from '../../../utils/compras.utils';

// El backend acepta hasta 100 archivos de 1 MB por petición: la selección se envía en lotes de ese tamaño
const TAMANO_LOTE = 100;
const MAX_TAMANO = 1024 * 1024; // 1 MB
const MAX_ARCHIVOS_LISTA = 100; // La lista de selección solo muestra los primeros
const TAMANO_PAGINA = 50;

type FiltroResultado = 'todos' | 'rechazados' | 'advertencias' | 'noEnviados';

// Archivo cuyo lote no llegó al backend (error de red, 4xx/5xx o envío detenido): se puede reintentar
interface ResultadoNoEnviado {
  file: string;
  status: 'failed';
  message: string;
  archivo: File;
}

type ResultadoArchivo = ImportResult | ResultadoNoEnviado;

@Component({
  selector: 'app-importar',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbPaginationModule, NgbTooltipModule, AdvertenciaPipe, MotivoRechazoPipe, TipoDocumentoPipe],
  templateUrl: './importar.component.html',
  styles: [`
    .zona-carga { border: 2px dashed var(--bs-border-color); transition: border-color .15s, background-color .15s; }
    .zona-carga.arrastrando { border-color: var(--bs-primary); background: var(--bs-tertiary-bg); }
  `]
})
export class ImportarComponent implements OnDestroy {
  private readonly purchaseDocumentsService = inject(PurchaseDocumentsService);

  readonly tamanoLote = TAMANO_LOTE;
  readonly maxArchivosLista = MAX_ARCHIVOS_LISTA;
  readonly tamanoPagina = TAMANO_PAGINA;
  readonly codigosConDetalle = CODIGOS_CON_DETALLE;

  // Selección
  archivos = signal<File[]>([]);
  descartados = signal<string[]>([]); // Archivos .json que no pasaron la validación local
  ignorados = signal<number>(0);      // Archivos que no son .json (p. ej. los PDF de la carpeta)
  arrastrando = signal<boolean>(false);
  leyendoCarpeta = signal<boolean>(false);

  // Envío por lotes
  isUploading = signal<boolean>(false);
  detenerSolicitado = signal<boolean>(false);
  totalArchivosEnvio = signal<number>(0);
  totalLotes = signal<number>(0);
  loteActual = signal<number>(0);      // 1-based
  progresoLote = signal<number>(0);    // 0-100 de la subida del lote en curso
  archivosEnviados = signal<number>(0); // Archivos de lotes ya respondidos
  errorMessage = signal<string | null>(null);
  private envio?: Subscription;

  // Resultado acumulado de todos los lotes
  resultados = signal<ResultadoArchivo[]>([]);
  filtro = signal<FiltroResultado>('todos');
  paginaResultados = signal<number>(1);

  listaVisible = computed(() => this.archivos().slice(0, MAX_ARCHIVOS_LISTA));
  tamanoTotal = computed(() => this.archivos().reduce((sum, f) => sum + f.size, 0));
  lotesSeleccion = computed(() => Math.ceil(this.archivos().length / TAMANO_LOTE));

  progresoGeneral = computed(() => {
    const total = this.totalArchivosEnvio();
    return total > 0 ? Math.round((this.archivosEnviados() / total) * 100) : 0;
  });

  resumen = computed(() => {
    const r = this.resultados();
    return {
      received: r.length,
      imported: r.filter(x => x.status === 'imported').length,
      rejected: r.filter(x => x.status === 'rejected').length,
      withWarnings: r.filter(x => x.status === 'imported' && x.warnings.length > 0).length,
      noEnviados: r.filter(x => x.status === 'failed').length
    };
  });

  hayResultados = computed(() => this.resultados().length > 0);

  resultadosFiltrados = computed(() => {
    const r = this.resultados();
    switch (this.filtro()) {
      case 'rechazados': return r.filter(x => x.status === 'rejected');
      case 'advertencias': return r.filter(x => x.status === 'imported' && x.warnings.length > 0);
      case 'noEnviados': return r.filter(x => x.status === 'failed');
      default: return r;
    }
  });

  paginaVisible = computed(() => {
    const inicio = (this.paginaResultados() - 1) * TAMANO_PAGINA;
    return this.resultadosFiltrados().slice(inicio, inicio + TAMANO_PAGINA);
  });

  // Cerrar o recargar la pestaña a mitad del envío pierde los lotes que faltan
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isUploading()) event.preventDefault();
  }

  ngOnDestroy(): void {
    this.envio?.unsubscribe();
  }

  // Usado por el canDeactivate de la ruta
  puedeSalir(): boolean {
    return !this.isUploading()
      || confirm('Hay una importación en curso. Si sales, no se enviarán los lotes que faltan (lo ya importado queda guardado). ¿Deseas salir?');
  }

  // ---------- Selección ----------

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.isUploading()) this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.arrastrando.set(false);
    if (this.isUploading() || !event.dataTransfer) return;

    // Las entradas se leen antes de cualquier await: el navegador vacía dataTransfer al terminar el evento
    const entradas = Array.from(event.dataTransfer.items)
      .map(item => item.webkitGetAsEntry())
      .filter((e): e is FileSystemEntry => e !== null);

    if (entradas.length === 0) {
      this.agregarArchivos(Array.from(event.dataTransfer.files));
      return;
    }

    this.leyendoCarpeta.set(true);
    try {
      const archivos = (await Promise.all(entradas.map(e => this.leerEntrada(e)))).flat();
      this.agregarArchivos(archivos);
    } catch {
      this.errorMessage.set('No se pudo leer la carpeta. Intenta con el botón "Seleccionar carpeta".');
    } finally {
      this.leyendoCarpeta.set(false);
    }
  }

  // Sirve para el selector de archivos y para el de carpeta (webkitdirectory incluye subcarpetas)
  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.agregarArchivos(Array.from(input.files));
    }
    input.value = ''; // Permite volver a elegir lo mismo
  }

  // Recorre una carpeta arrastrada, incluidas sus subcarpetas
  private async leerEntrada(entrada: FileSystemEntry): Promise<File[]> {
    if (entrada.isFile) {
      return [await new Promise<File>((resolve, reject) => (entrada as FileSystemFileEntry).file(resolve, reject))];
    }
    if (!entrada.isDirectory) return [];

    const lector = (entrada as FileSystemDirectoryEntry).createReader();
    const hijos: FileSystemEntry[] = [];
    // readEntries devuelve los hijos por tandas (unas 100): se llama hasta que regrese vacío
    while (true) {
      const tanda = await new Promise<FileSystemEntry[]>((resolve, reject) => lector.readEntries(resolve, reject));
      if (tanda.length === 0) break;
      hijos.push(...tanda);
    }
    return (await Promise.all(hijos.map(h => this.leerEntrada(h)))).flat();
  }

  // Valida en el navegador para no esperar al backend por errores obvios
  private agregarArchivos(nuevos: File[]): void {
    const actuales = this.archivos();
    const claves = new Set(actuales.map(f => this.clave(f)));
    const validos: File[] = [];
    const descartados: string[] = [];
    let ignorados = 0;

    for (const file of nuevos) {
      if (!file.name.toLowerCase().endsWith('.json')) {
        ignorados++;
      } else if (file.size > MAX_TAMANO) {
        descartados.push(`${file.name}: supera 1 MB`);
      } else if (claves.has(this.clave(file))) {
        descartados.push(`${file.name}: ya está en la lista`);
      } else {
        claves.add(this.clave(file));
        validos.push(file);
      }
    }

    this.archivos.set([...actuales, ...validos]);
    this.descartados.set(descartados);
    this.ignorados.set(ignorados);
    this.errorMessage.set(null);
  }

  private clave(file: File): string {
    return `${file.name}|${file.size}`;
  }

  quitarArchivo(file: File): void {
    this.archivos.update(lista => lista.filter(f => f !== file));
  }

  limpiarSeleccion(): void {
    this.archivos.set([]);
    this.descartados.set([]);
    this.ignorados.set(0);
  }

  // ---------- Envío ----------

  importar(): void {
    const archivos = this.archivos();
    if (archivos.length === 0 || this.isUploading()) return;

    this.resultados.set([]);
    this.limpiarSeleccion();
    this.iniciarEnvio(archivos);
  }

  reintentarNoEnviados(): void {
    if (this.isUploading()) return;

    const pendientes = this.resultados()
      .filter((r): r is ResultadoNoEnviado => r.status === 'failed')
      .map(r => r.archivo);
    if (pendientes.length === 0) return;

    this.resultados.update(lista => lista.filter(r => r.status !== 'failed'));
    this.iniciarEnvio(pendientes);
  }

  // Termina el lote en curso y no envía los siguientes
  detener(): void {
    this.detenerSolicitado.set(true);
  }

  private iniciarEnvio(archivos: File[]): void {
    const lotes: File[][] = [];
    for (let i = 0; i < archivos.length; i += TAMANO_LOTE) {
      lotes.push(archivos.slice(i, i + TAMANO_LOTE));
    }

    this.isUploading.set(true);
    this.detenerSolicitado.set(false);
    this.errorMessage.set(null);
    this.totalArchivosEnvio.set(archivos.length);
    this.totalLotes.set(lotes.length);
    this.archivosEnviados.set(0);
    this.filtro.set('todos');
    this.paginaResultados.set(1);

    this.enviarLote(lotes, 0);
  }

  // Un lote a la vez: en paralelo no se gana mucho y se carga la base de datos
  private enviarLote(lotes: File[][], indice: number): void {
    if (indice >= lotes.length) {
      this.finalizarEnvio();
      return;
    }

    if (this.detenerSolicitado()) {
      this.marcarNoEnviados(lotes.slice(indice).flat(), 'Envío detenido antes de mandar este archivo');
      this.finalizarEnvio();
      return;
    }

    const lote = lotes[indice];
    this.loteActual.set(indice + 1);
    this.progresoLote.set(0);

    this.envio = this.purchaseDocumentsService.importFiles(lote).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progresoLote.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response && event.body) {
          // results llega en el mismo orden que los archivos del lote
          this.resultados.update(lista => [...lista, ...event.body!.results]);
          this.archivosEnviados.update(n => n + lote.length);
          this.enviarLote(lotes, indice + 1);
        }
      },
      error: (err) => {
        const mensaje = err.status === 0
          ? 'Sin conexión con el servidor'
          : err.error?.error || `Error del servidor (${err.status})`;
        this.marcarNoEnviados(lote, mensaje);
        this.archivosEnviados.update(n => n + lote.length);

        // Sin conexión, con la sesión vencida o sin permisos fallarían todos los lotes que siguen
        if (err.status === 0 || err.status === 401 || err.status === 403) {
          const sinConexion = err.status === 0;
          this.marcarNoEnviados(lotes.slice(indice + 1).flat(),
            sinConexion ? 'No se envió: sin conexión con el servidor' : 'No se envió: la sesión no es válida');
          this.errorMessage.set(sinConexion
            ? 'La importación se detuvo porque se perdió la conexión con el servidor. Reintenta los no enviados cuando vuelva.'
            : 'La importación se detuvo porque la sesión no es válida. Inicia sesión y reintenta los no enviados.');
          this.finalizarEnvio();
          return;
        }
        // Un error propio del lote (400, 500...) no impide seguir con los demás
        this.enviarLote(lotes, indice + 1);
      }
    });
  }

  private marcarNoEnviados(archivos: File[], message: string): void {
    if (archivos.length === 0) return;
    const fallidos: ResultadoNoEnviado[] = archivos.map(archivo => ({ file: archivo.name, status: 'failed', message, archivo }));
    this.resultados.update(lista => [...lista, ...fallidos]);
  }

  private finalizarEnvio(): void {
    this.isUploading.set(false);
    this.detenerSolicitado.set(false);
    this.envio = undefined;

    // Abre la tabla en lo que hay que revisar
    const r = this.resumen();
    this.filtro.set(r.noEnviados > 0 ? 'noEnviados' : r.rejected > 0 ? 'rechazados' : 'todos');
    this.paginaResultados.set(1);
  }

  cambiarFiltro(filtro: FiltroResultado): void {
    this.filtro.set(filtro);
    this.paginaResultados.set(1);
  }

  nuevaImportacion(): void {
    this.resultados.set([]);
    this.filtro.set('todos');
    this.paginaResultados.set(1);
  }

  esImportado(r: ResultadoArchivo): r is Extract<ImportResult, { status: 'imported' }> {
    return r.status === 'imported';
  }

  esRechazado(r: ResultadoArchivo): r is Extract<ImportResult, { status: 'rejected' }> {
    return r.status === 'rejected';
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

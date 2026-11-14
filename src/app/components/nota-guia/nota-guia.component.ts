import { Component, Input } from '@angular/core';

export interface PasoGuia {
  titulo: string;
  texto: string;
  icono?: string; // Clase de Bootstrap Icons, por ejemplo 'bi-search'
}

// Nota de ayuda que explica una pantalla. Siempre visible (no se puede cerrar) y adaptable a cualquier ancho:
// los pasos usan una grilla que pasa de columnas a una sola columna sin depender de breakpoints fijos.
// Uso: <app-nota-guia titulo="..." [pasos]="..." [consejos]="...">Texto libre opcional</app-nota-guia>
@Component({
  selector: 'app-nota-guia',
  standalone: true,
  templateUrl: './nota-guia.component.html',
  styleUrl: './nota-guia.component.css'
})
export class NotaGuiaComponent {
  @Input() titulo = '';
  @Input() icono = 'bi-lightbulb';
  @Input() tipo: 'info' | 'aviso' = 'info';
  @Input() pasos: PasoGuia[] = [];
  @Input() consejos: string[] = []; // Puntos cortos que conviene tener presentes
}

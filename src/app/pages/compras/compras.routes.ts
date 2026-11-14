import { Routes } from '@angular/router';

// Módulo de compras (DTE): se carga bajo demanda y el roleGuard del padre lo limita a ADMIN
export const COMPRAS_ROUTES: Routes = [
  {
    path: 'importar',
    loadComponent: () => import('./importar/importar.component').then(m => m.ImportarComponent),
    // Pide confirmación si se sale con lotes pendientes de enviar
    canDeactivate: [(component: { puedeSalir: () => boolean }) => component.puedeSalir()]
  },
  {
    path: 'documentos',
    loadComponent: () => import('./documentos/documentos.component').then(m => m.DocumentosComponent)
  },
  {
    path: 'documentos/:id',
    loadComponent: () => import('./documento-detalle/documento-detalle.component').then(m => m.DocumentoDetalleComponent)
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./proveedores/proveedores.component').then(m => m.ProveedoresComponent)
  },
  {
    path: 'proveedores/:id',
    loadComponent: () => import('./proveedor-detalle/proveedor-detalle.component').then(m => m.ProveedorDetalleComponent)
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes/reportes.component').then(m => m.ReportesComponent)
  },
  { path: '', pathMatch: 'full', redirectTo: 'documentos' }
];

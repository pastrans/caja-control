import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NgbCollapseModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';

interface OpcionMenu {
  label: string;
  icono: string;
  ruta: string;
  activaEn?: string[];   // Otras rutas en las que se marca como activa (por defecto, solo la propia)
  excluye?: string[];    // Subrutas que pertenecen a otra opción
  roles?: string[];      // Sin roles: todos los usuarios autenticados
}

interface GrupoMenu {
  label: string;
  icono: string;
  opciones: OpcionMenu[];
}

// Menú principal: pocos grupos, cada uno con su submenú. Un grupo se muestra si el usuario ve al menos una opción
const MENU: GrupoMenu[] = [
  {
    label: 'Ventas',
    icono: 'bi-cash-coin',
    opciones: [
      { label: 'Resumen de ventas', icono: 'bi-speedometer2', ruta: '/inicio', roles: ['ADMIN'] },
      { label: 'Caja', icono: 'bi-wallet2', ruta: '/caja', activaEn: ['/abrir-caja'] },
      { label: 'Historial de cajas', icono: 'bi-clock-history', ruta: '/historial' }
    ]
  },
  {
    label: 'Compras',
    icono: 'bi-bag',
    opciones: [
      { label: 'Importar DTE', icono: 'bi-upload', ruta: '/compras/importar', roles: ['ADMIN'] },
      { label: 'Documentos', icono: 'bi-files', ruta: '/compras/documentos', roles: ['ADMIN'] },
      { label: 'Proveedores', icono: 'bi-truck', ruta: '/compras/proveedores', roles: ['ADMIN'] },
      { label: 'Reportes', icono: 'bi-graph-up', ruta: '/compras/reportes', roles: ['ADMIN'] }
    ]
  },
  {
    label: 'Productos',
    icono: 'bi-box-seam',
    opciones: [
      { label: 'Precios de productos', icono: 'bi-tags', ruta: '/compras/productos', excluye: ['/compras/productos/variantes'], roles: ['ADMIN'] },
      { label: 'Unir variantes', icono: 'bi-intersect', ruta: '/compras/productos/variantes', roles: ['ADMIN'] }
    ]
  },
  {
    label: 'Administración',
    icono: 'bi-gear',
    opciones: [
      { label: 'Empleados', icono: 'bi-person-badge', ruta: '/empleados', roles: ['ADMIN'] },
      { label: 'Usuarios', icono: 'bi-people', ruta: '/usuarios', roles: ['ADMIN'] }
    ]
  }
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgbCollapseModule, NgbDropdownModule],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  isMenuCollapsed = true;

  // Ruta actual sin query ni fragmento, para marcar la opción y el grupo activos
  private readonly ruta = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => this.soloRuta(e.urlAfterRedirects))
    ),
    { initialValue: this.soloRuta(this.router.url) }
  );

  // Solo los grupos y opciones que el rol del usuario puede ver
  readonly menu = computed(() => {
    this.authService.userRole(); // Recalcula al cambiar de usuario
    return MENU
      .map(grupo => ({ ...grupo, opciones: grupo.opciones.filter(o => !o.roles || this.authService.hasRole(o.roles)) }))
      .filter(grupo => grupo.opciones.length > 0);
  });

  opcionActiva(opcion: OpcionMenu): boolean {
    const ruta = this.ruta();
    if (opcion.excluye?.some(r => this.dentroDe(ruta, r))) return false;
    return [opcion.ruta, ...(opcion.activaEn ?? [])].some(r => this.dentroDe(ruta, r));
  }

  grupoActivo(grupo: GrupoMenu): boolean {
    return grupo.opciones.some(o => this.opcionActiva(o));
  }

  // En el celular, el menú se cierra al elegir una opción
  cerrarMenu(): void {
    this.isMenuCollapsed = true;
  }

  getRoleLabel(role?: string): string {
    if (!role) return '';
    return role === 'ADMIN' ? 'Admin' : 'Cajero';
  }

  onLogout(): void {
    this.cerrarMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // /compras/documentos/5 está dentro de /compras/documentos; /compras/documentosX no
  private dentroDe(ruta: string, base: string): boolean {
    return ruta === base || ruta.startsWith(`${base}/`);
  }

  private soloRuta(url: string): string {
    return url.split(/[?#]/)[0];
  }
}

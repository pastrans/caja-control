import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';
import { CajaComponent } from './pages/caja/caja.component';
import { AbrirCajaComponent } from './pages/abrir-caja/abrir-caja.component';
import { HistorialComponent } from './pages/historial/historial.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { EmpleadosComponent } from './pages/empleados/empleados.component';
import { ForbiddenComponent } from './pages/forbidden/forbidden.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { publicGuard } from './guards/public.guard';

export const routes: Routes = [
  { path: 'login', 
    component: LoginComponent,
    canActivate: [publicGuard] },                       //  Protege contra accesos autenticados
  { path: 'forbidden', component: ForbiddenComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'caja', component: CajaComponent },
      { path: 'abrir-caja', component: AbrirCajaComponent },
      { path: 'historial', component: HistorialComponent },
      { 
        path: 'usuarios', 
        component: UsuariosComponent, 
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      { 
        path: 'empleados', 
        component: EmpleadosComponent, 
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      { path: '', redirectTo: 'caja', pathMatch: 'full' }
    ]
  },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '/404' }
];
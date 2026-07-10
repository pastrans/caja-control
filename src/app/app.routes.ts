import { Routes } from '@angular/router';
import { CajaComponent } from './pages/caja/caja.component';
import { AbrirCajaComponent } from './pages/abrir-caja/abrir-caja.component';
import { HistorialComponent } from './pages/historial/historial.component';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: MainLayoutComponent,
    children: [
      { path: 'caja', component: CajaComponent },
      { path: 'abrir-caja', component: AbrirCajaComponent },
      { path: 'historial', component: HistorialComponent },
      { path: '', redirectTo: 'caja', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
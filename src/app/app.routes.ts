import { Routes } from '@angular/router';
import { CajaComponent } from './components/caja/caja.component';
import { AbrirCajaComponent } from './components/abrir-caja/abrir-caja.component';
import { HistorialComponent } from './components/historial/historial.component';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

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
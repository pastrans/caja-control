import { Routes } from '@angular/router';
import { CajaComponent } from './componets/caja/caja.component';
import { AbrirCajaComponent } from './componets/abrir-caja/abrir-caja.component';
import { HistorialComponent } from './componets/historial/historial.component';
import { LoginComponent } from './componets/login/login.component';
import { MainLayoutComponent } from './componets/main-layout/main-layout.component';

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
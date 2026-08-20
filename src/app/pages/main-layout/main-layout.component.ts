import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgbCollapseModule],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  
  isMenuCollapsed = true;
  
  getRoleLabel(role?: string): string {
    if (!role) return '';
    return role === 'ADMIN' ? 'Admin' : 'Cajero';
  }
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
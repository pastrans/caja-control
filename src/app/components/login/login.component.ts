import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styles: `
    .login-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f8f9fa;
    }
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      // Redirige a la página de caja al iniciar sesión
      this.router.navigate(['/caja']);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}

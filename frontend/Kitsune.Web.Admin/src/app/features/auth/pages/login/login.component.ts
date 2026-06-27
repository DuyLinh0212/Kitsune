import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly showPassword = signal(false);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    login: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { login, password } = this.loginForm.getRawValue();

    this.authService.login({ login, password }).subscribe({
      next: (response) => {
        if (!response.user.roles.includes('ADMIN')) {
          this.authService.logout().subscribe({
            next: () => {
              this.isSubmitting.set(false);
              this.errorMessage.set('Tài khoản này không có quyền vào trang quản trị.');
            }
          });
        } else {
          this.isSubmitting.set(false);
          this.successMessage.set(`Đăng nhập thành công. Xin chào ${response.user.fullName || response.user.username}.`);
          void this.router.navigateByUrl('/home');
        }
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        const msg = (error as any)?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.';
        if (msg.includes('Invalid login credentials') || msg.includes('Invalid credentials')) {
          this.errorMessage.set('Thông tin đăng nhập không chính xác.');
        } else {
          this.errorMessage.set(msg);
        }
      }
    });
  }

  protected hasError(controlName: 'login' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }
}

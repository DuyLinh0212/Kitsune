import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value as string | null;
    const confirmPassword = control.get('confirmPassword')?.value as string | null;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  };

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [this.passwordMatchValidator] }
  );

  protected submit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { fullName, email, username, password } = this.registerForm.getRawValue();
    this.authService.register({ fullName, email, username, password }).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        if (!response.user.roles.includes('ADMIN')) {
          this.authService.logout().subscribe({
            next: () => {
              this.errorMessage.set('Tài khoản tạo mới phải là ADMIN.');
            }
          });
          return;
        }
        this.successMessage.set('Tạo admin thành công.');
        void this.router.navigateByUrl('/home');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        const msg = (error as any)?.message ?? 'Tạo admin thất bại.';
        this.errorMessage.set(msg);
      }
    });
  }

  protected hasError(name: 'fullName' | 'email' | 'username' | 'password' | 'confirmPassword'): boolean {
    const control = this.registerForm.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected hasPasswordMismatch(): boolean {
    return this.registerForm.hasError('passwordMismatch') && (this.registerForm.dirty || this.registerForm.touched);
  }

  protected togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }
}

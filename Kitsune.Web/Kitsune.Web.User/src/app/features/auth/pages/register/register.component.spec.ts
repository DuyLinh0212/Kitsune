import { provideLocationMocks } from '@angular/common/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should show a validation message when submitted with invalid form', () => {
    // Arrange
    (component as any).registerForm.patchValue({
      fullName: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false
    } as any);

    // Act
    (component as any).submit();

    // Assert
    expect(authServiceSpy.register).not.toHaveBeenCalled();
    expect((component as any).errorMessage()).toBe('Bạn cần đồng ý với điều khoản dịch vụ.');
  });

  it('should call register when form is valid', () => {
    // Arrange
    authServiceSpy.register.and.returnValue(
      of({
        accessToken: 'token',
        expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
        user: {
          id: 1,
          username: 'lindev',
          email: 'tienben9123@gmail.com',
          fullName: 'Nguyen Duy Linh',
          avatarUrl: null,
          isVerified: false,
          roles: ['USER']
        }
      })
    );

    (component as any).registerForm.patchValue({
      fullName: 'Nguyen Duy Linh',
      email: 'tienben9123@gmail.com',
      username: 'LFCxLynwa',
      password: 'password123',
      confirmPassword: 'password123',
      agreeTerms: true
    } as any);

    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));

    // Act
    (component as any).submit();

    // Assert
    expect(authServiceSpy.register).toHaveBeenCalledOnceWith({
      fullName: 'Nguyen Duy Linh',
      email: 'tienben9123@gmail.com',
      username: 'LFCxLynwa',
      password: 'password123'
    });
    expect((component as any).successMessage()).toContain('Đăng ký thành công');
  });

  it('should surface backend error when register fails', () => {
    // Arrange
    authServiceSpy.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Username already exists.' } }))
    );

    (component as any).registerForm.patchValue({
      fullName: 'Nguyen Duy Linh',
      email: 'tienben9123@gmail.com',
      username: 'LFCxLynwa',
      password: 'password123',
      confirmPassword: 'password123',
      agreeTerms: true
    } as any);

    // Act
    (component as any).submit();

    // Assert
    expect(authServiceSpy.register).toHaveBeenCalled();
    expect((component as any).errorMessage()).toBe('Username already exists.');
  });
});

import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdminUserService, AdminUserDto, CreateUserDto, UpdateUserDto } from '../../../../core/services/admin-user.service';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  private readonly adminUserService = inject(AdminUserService);
  private readonly fb = inject(FormBuilder);

  protected readonly users = signal<AdminUserDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchQuery = signal('');
  protected readonly roleFilter = signal('ALL');

  protected readonly modalVisible = signal(false);
  protected readonly modalMode = signal<ModalMode>('create');
  protected readonly editingId = signal<number | null>(null);
  protected readonly modalSaving = signal(false);
  protected readonly modalError = signal('');

  protected readonly userForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', Validators.maxLength(100)],
    password: ['', [Validators.minLength(6), Validators.maxLength(100)]],
    roles: [['USER'] as string[]],
  });

  protected readonly deleteConfirmId = signal<number | null>(null);

  protected readonly detailVisible = signal(false);
  protected readonly detailUser = signal<AdminUserDto | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailLogs = signal<{ action: string; description: string | null; timestamp: string }[]>([]);

  readonly ROLE_OPTIONS = ['ADMIN', 'USER'];

  constructor() {
    this.loadUsers();
  }

  ngOnInit(): void {}

  protected loadUsers(): void {
    this.isLoading.set(true);
    this.adminUserService.getUsers({
      search: this.searchQuery() || undefined,
      role: this.roleFilter() !== 'ALL' ? this.roleFilter() : undefined,
    }).subscribe({
      next: (u) => { this.isLoading.set(false); this.users.set(u); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.loadUsers();
  }

  protected onRoleFilterChange(value: string): void {
    this.roleFilter.set(value);
    this.loadUsers();
  }

  protected openCreateModal(): void {
    this.modalMode.set('create');
    this.editingId.set(null);
    this.modalError.set('');
    this.userForm.reset({ username: '', email: '', fullName: '', password: '', roles: ['USER'] });
    this.modalVisible.set(true);
  }

  protected openEditModal(user: AdminUserDto): void {
    this.modalMode.set('edit');
    this.editingId.set(user.id);
    this.modalError.set('');
    this.userForm.reset({
      username: user.username,
      email: user.email,
      fullName: user.fullName ?? '',
      password: '',
      roles: user.roles,
    });
    this.modalVisible.set(true);
  }

  protected closeModal(): void {
    this.modalVisible.set(false);
    this.editingId.set(null);
    this.modalError.set('');
  }

  protected submitForm(): void {
    if (this.userForm.invalid || this.modalSaving()) return;

    this.modalSaving.set(true);
    this.modalError.set('');

    if (this.modalMode() === 'create') {
      const dto: CreateUserDto = {
        username: this.userForm.value.username!,
        email: this.userForm.value.email!,
        password: this.userForm.value.password ?? 'KitsuneAdmin123',
        fullName: this.userForm.value.fullName || null,
      };
      this.adminUserService.createUser(dto).subscribe({
        next: (user) => {
          const roles = this.userForm.value.roles as string[];
          if (roles && roles.length > 0) {
            this.adminUserService.updateRoles(user.id, roles).subscribe({
              next: () => {
                this.modalSaving.set(false);
                this.closeModal();
                this.loadUsers();
              }
            });
          } else {
            this.modalSaving.set(false);
            this.closeModal();
            this.loadUsers();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.modalError.set(err.error?.message ?? 'Không thể tạo người dùng.');
          this.modalSaving.set(false);
        }
      });
    } else {
      const dto: UpdateUserDto = {
        username: this.userForm.value.username ?? undefined,
        email: this.userForm.value.email ?? undefined,
        fullName: this.userForm.value.fullName || null,
      };
      this.adminUserService.updateUser(this.editingId()!, dto).subscribe({
        next: () => {
          const roles = this.userForm.value.roles as string[];
          if (roles) {
            this.adminUserService.updateRoles(this.editingId()!, roles).subscribe({
              next: () => {
                this.modalSaving.set(false);
                this.closeModal();
                this.loadUsers();
              }
            });
          } else {
            this.modalSaving.set(false);
            this.closeModal();
            this.loadUsers();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.modalError.set(err.error?.message ?? 'Không thể cập nhật người dùng.');
          this.modalSaving.set(false);
        }
      });
    }
  }

  protected toggleVerified(user: AdminUserDto): void {
    this.adminUserService.updateVerification(user.id, !user.isVerified).subscribe({
      next: (updated) => { user.isVerified = updated.isVerified; },
      error: () => {}
    });
  }

  protected toggleActive(user: AdminUserDto): void {
    this.adminUserService.updateActive(user.id, !user.isActive).subscribe({
      next: (updated) => { user.isActive = updated.isActive; },
      error: () => {}
    });
  }

  protected toggleRole(user: AdminUserDto, role: string): void {
    const newRoles = user.roles.includes(role)
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role];
    this.adminUserService.updateRoles(user.id, newRoles).subscribe({
      next: () => this.loadUsers(),
      error: () => {}
    });
  }

  protected confirmDelete(user: AdminUserDto): void {
    this.deleteConfirmId.set(user.id);
  }

  protected cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  protected executeDelete(): void {
    const id = this.deleteConfirmId();
    if (id == null) return;
    this.adminUserService.deleteUser(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.users.update((list) => list.filter((u) => u.id !== id));
        if (this.detailUser()?.id === id) {
          this.detailVisible.set(false);
          this.detailUser.set(null);
        }
      },
      error: () => { this.deleteConfirmId.set(null); }
    });
  }

  protected openDetail(user: AdminUserDto): void {
    this.detailUser.set(user);
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.adminUserService.getActivityLogs(user.id, 20).subscribe({
      next: (logs) => {
        this.detailLogs.set(logs);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLogs.set([]);
        this.detailLoading.set(false);
      }
    });
  }

  protected closeDetail(): void {
    this.detailVisible.set(false);
    this.detailUser.set(null);
  }

  /** Toggle a role in the form's roles array (used in modal form). */
  protected onRoleCheckboxChange(role: string): void {
    const current = (this.userForm.value.roles as string[]) ?? [];
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    this.userForm.patchValue({ roles: updated });
  }

  protected get filteredUsers(): AdminUserDto[] {
    const q = this.searchQuery().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const matchSearch = !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.fullName ?? '').toLowerCase().includes(q);
      const matchRole = role === 'ALL' || u.roles.includes(role);
      return matchSearch && matchRole;
    });
  }

  protected get initials(): string {
    const u = this.detailUser();
    if (!u) return '?';
    const name = u.fullName || u.username;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  protected roleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'MODERATOR': return 'badge-mod';
      default: return 'badge-user';
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminUserService, AdminUserDto } from '../../../../core/services/admin-user.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent {
  private readonly adminUserService = inject(AdminUserService);

  protected readonly users = signal<AdminUserDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchQuery = signal('');
  protected readonly roleFilter = signal('ALL');

  constructor() {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.isLoading.set(true);
    this.adminUserService.getUsers().subscribe({
      next: (u) => { this.isLoading.set(false); this.users.set(u); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected get filteredUsers(): AdminUserDto[] {
    const q = this.searchQuery().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const matchSearch = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = role === 'ALL' || u.roles.includes(role);
      return matchSearch && matchRole;
    });
  }

  protected toggleBan(user: AdminUserDto): void {
    this.adminUserService.updateVerification(user.id, !user.isVerified).subscribe({
      next: (updated) => { user.isVerified = updated.isVerified; },
      error: () => {}
    });
  }

  protected toggleRole(user: AdminUserDto, role: string): void {
    const newRoles = user.roles.includes(role)
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role];
    this.adminUserService.updateRoles(user.id, { roles: newRoles }).subscribe({
      next: (updated) => { user.roles = updated.roles; },
      error: () => {}
    });
  }
}

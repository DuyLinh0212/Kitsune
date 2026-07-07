// frontend/Kitsune.Web.User/src/app/shared/layout/main-layout/main-layout.component.ts
import { Component, signal, output, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  readonly sidebarCollapsed = signal(false);
  readonly userMenuOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  onNavClick(): void {
    if (window.innerWidth <= 768) {
      this.sidebarCollapsed.set(true);
    }
    this.userMenuOpen.set(false);
  }

  onDocClick(): void {
    this.userMenuOpen.set(false);
  }
}

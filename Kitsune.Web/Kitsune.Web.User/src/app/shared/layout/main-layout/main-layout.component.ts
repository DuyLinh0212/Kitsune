import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  readonly sidebarCollapsed = signal(typeof window !== 'undefined' && window.innerWidth <= 768);

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  onNavClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarCollapsed.set(true);
    }
  }
}

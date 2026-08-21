import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly currentTheme = signal<ThemeMode>('light');

  constructor() {
    // Determine initial theme
    const saved = localStorage.getItem('kitsune-theme') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      this.currentTheme.set(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.currentTheme.set('dark');
    }

    // Effect to apply class to documentElement (HTML tag) and save to local storage
    effect(() => {
      const theme = this.currentTheme();
      localStorage.setItem('kitsune-theme', theme);
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    });
  }

  toggleTheme() {
    this.currentTheme.update(t => t === 'light' ? 'dark' : 'light');
  }
}

// Kitsune.Web/Kitsune.Web.User/src/app/core/services/usage-tracking.service.ts

import { Injectable } from '@angular/core';

const USAGE_PREFIX = 'kitsune.usage.seconds.';

@Injectable({ providedIn: 'root' })
export class UsageTrackingService {
  private activeSince: number | null = null;

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    this.activeSince = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      } else {
        this.activeSince = Date.now();
      }
    });
    window.addEventListener('beforeunload', () => this.flush());
    window.setInterval(() => this.flush(), 15_000);
  }

  getWeekHours(): number[] {
    this.flush();
    if (typeof window === 'undefined') return Array<number>(7).fill(0);
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - index));
      const seconds = Number(window.localStorage.getItem(`${USAGE_PREFIX}${this.dateKey(date)}`) ?? 0);
      return Number.isFinite(seconds) ? seconds / 3600 : 0;
    });
  }

  private flush(): void {
    if (typeof window === 'undefined' || this.activeSince === null) return;
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - this.activeSince) / 1000));
    this.activeSince = now;
    if (elapsedSeconds === 0) return;

    const key = `${USAGE_PREFIX}${this.dateKey(new Date())}`;
    const current = Number(window.localStorage.getItem(key) ?? 0);
    window.localStorage.setItem(key, String((Number.isFinite(current) ? current : 0) + elapsedSeconds));
  }

  private dateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../../../../core/supabase/supabase.client';

interface LogEntry {
  id: number;
  userId: number;
  username: string;
  action: string;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-system-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-logs.component.html',
  styleUrl: './system-logs.component.css'
})
export class SystemLogsComponent {
  protected readonly logs = signal<LogEntry[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchQuery = signal('');
  protected readonly actionFilter = signal('ALL');

  constructor() {
    this.loadLogs();
  }

  protected loadLogs(): void {
    this.isLoading.set(true);
    from(
      supabase
        .from('UserActivityLogs')
        .select('Id, UserId, Action, Description, CreatedAt, Users:UserId(Username)')
        .order('CreatedAt', { ascending: false })
        .limit(200)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => {
          const user = r['Users'] as { Username: string } | null;
          return {
            id: r['Id'] as number,
            userId: r['UserId'] as number,
            username: user?.Username ?? 'Unknown',
            action: r['Action'] as string,
            description: (r['Description'] as string) ?? '',
            createdAt: r['CreatedAt'] as string
          };
        });
      })
    ).subscribe({
      next: (logs) => { this.isLoading.set(false); this.logs.set(logs); },
      error: (e: Error) => { this.isLoading.set(false); this.errorMessage.set(e.message); }
    });
  }

  protected get filteredLogs(): LogEntry[] {
    const q = this.searchQuery().toLowerCase();
    const action = this.actionFilter();
    return this.logs().filter((l) => {
      const matchSearch = !q || l.username.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
      const matchAction = action === 'ALL' || l.action === action;
      return matchSearch && matchAction;
    });
  }
}

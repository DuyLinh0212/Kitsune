import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type LookupFrameMode = 'vocabulary' | 'kanji' | 'grammar';

interface LookupFrameTab {
  readonly id: LookupFrameMode;
  readonly label: string;
  readonly route: string;
}

@Component({
  selector: 'app-lookup-frame',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lookup-frame.component.html',
  styleUrl: './lookup-frame.component.css',
})
export class LookupFrameComponent {
  readonly activeMode = input.required<LookupFrameMode>();
  readonly query = input('');
  readonly placeholder = input('Nhập từ khóa cần tra cứu...');
  readonly resultCount = input<number | null>(null);
  readonly queryChange = output<string>();
  readonly search = output<void>();

  readonly tabs: readonly LookupFrameTab[] = [
    { id: 'vocabulary', label: 'Từ vựng', route: '/vocabulary' },
    { id: 'kanji', label: 'Hán tự', route: '/kanji' },
    { id: 'grammar', label: 'Ngữ pháp', route: '/grammar' },
  ];

  onInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  clear(): void {
    this.queryChange.emit('');
  }
}

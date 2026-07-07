import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { supabase } from '../../../../core/supabase/supabase.client';

@Component({
  selector: 'app-kanji-stroke-writer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kanji-stroke-writer.component.html',
  styleUrl: './kanji-stroke-writer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanjiStrokeWriterComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() character: string | null = null;
  @Input() width = 260;
  @Input() height = 260;

  @ViewChild('writerHost') private writerHost?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);

  private activeCharacter: string | null = null;
  private hasView = false;
  private loadVersion = 0;
  private animationTimers: Array<ReturnType<typeof setTimeout>> = [];

  readonly isLoading = signal(true);
  readonly isReady = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.hasView = true;
    void this.syncWriter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.hasView) return;

    if (changes['character'] || changes['width'] || changes['height']) {
      void this.syncWriter();
    }
  }

  ngOnDestroy(): void {
    this.loadVersion += 1;
    this.clearAnimationTimer();
  }

  async replayAnimation(): Promise<void> {
    if (this.isLoading() || this.errorMessage() || !this.writerHost) return;
    this.animateSvgPaths();
  }

  retry(): void {
    void this.syncWriter(true);
  }

  private async syncWriter(forceReload = false): Promise<void> {
    if (!this.hasView || !isPlatformBrowser(this.platformId) || !this.writerHost) return;

    const nextCharacter = this.character?.trim() ?? '';
    const currentVersion = ++this.loadVersion;

    if (!nextCharacter) {
      this.resetStage();
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.isReady.set(false);
    this.errorMessage.set(null);

    try {
      const bucketPath = this.resolveBucketPath(nextCharacter);
      const { data } = supabase.storage.from('kanji-strokes').getPublicUrl(bucketPath);
      const response = await fetch(data.publicUrl, { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`Cannot fetch stroke svg for ${nextCharacter}`);
      }

      const svgMarkup = await response.text();
      if (currentVersion !== this.loadVersion) return;

      this.mountSvg(svgMarkup);

      this.activeCharacter = nextCharacter;
      this.isLoading.set(false);
      this.isReady.set(true);

      await this.waitForPaint();
      if (currentVersion !== this.loadVersion) return;

      this.animateSvgPaths();
    } catch (error) {
      if (currentVersion !== this.loadVersion) return;

      this.resetStage();
      this.activeCharacter = null;
      this.isLoading.set(false);
      this.isReady.set(false);
      this.errorMessage.set('Không tải được dữ liệu nét viết cho chữ này.');
      console.error('Failed to load kanji stroke data', error);
    }
  }

  private resetStage(): void {
    this.clearAnimationTimer();
    if (this.writerHost) {
      this.writerHost.nativeElement.innerHTML = '';
    }
  }

  private mountSvg(svgMarkup: string): void {
    if (!this.writerHost) return;

    this.resetStage();
    this.writerHost.nativeElement.innerHTML = svgMarkup;

    const svg = this.writerHost.nativeElement.querySelector('svg');
    if (!svg) {
      throw new Error('SVG markup is invalid');
    }

    svg.setAttribute('width', String(this.width));
    svg.setAttribute('height', String(this.height));
    svg.setAttribute('viewBox', svg.getAttribute('viewBox') || '0 0 109 109');
    svg.classList.add('stroke-stage__svg');

    const numberGroup = svg.querySelector('[id^="kvg:StrokeNumbers_"]');
    numberGroup?.setAttribute('style', 'font-size:8;fill:#94a3b8');
  }

  private animateSvgPaths(): void {
    if (!this.writerHost) return;

    const paths = Array.from(
      this.writerHost.nativeElement.querySelectorAll<SVGPathElement>('svg [id*="-s"]')
    );

    if (paths.length === 0) return;

    this.clearAnimationTimer();

    paths.forEach((path, index) => {
      const length = path.getTotalLength();
      path.style.stroke = this.resolveStrokeColor(index);
      path.style.strokeWidth = '3.2';
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.opacity = '1';
      path.style.transition =
        'stroke-dashoffset 980ms cubic-bezier(0.22, 1, 0.36, 1), stroke 260ms ease';
    });

    paths.forEach((path, index) => {
      const timer = setTimeout(() => {
        path.style.strokeDashoffset = '0';
      }, index * 720);
      this.animationTimers.push(timer);
    });
  }

  private resolveBucketPath(character: string): string {
    const codePoint = character.codePointAt(0);
    if (!codePoint) {
      throw new Error('Missing character code point');
    }

    return `${codePoint.toString(16).padStart(5, '0').toLowerCase()}.svg`;
  }

  private resolveStrokeColor(index: number): string {
    const palette = ['#2563eb', '#ea580c', '#111827', '#22c55e', '#7c3aed', '#0f766e'];
    return palette[index % palette.length];
  }

  private clearAnimationTimer(): void {
    for (const timer of this.animationTimers) {
      clearTimeout(timer);
    }
    this.animationTimers = [];
  }

  private waitForPaint(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 120);
    });
  }
}

import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild, signal } from '@angular/core';

interface DrawingPoint {
  x: number;
  y: number;
}

interface DrawingStroke {
  points: DrawingPoint[];
}

interface ExpectedStroke {
  path: Path2D;
  bounds: DOMRect;
  ink: Uint8ClampedArray;
  inkWidth: number;
  inkHeight: number;
}

interface SvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StrokeNormalization {
  source: DOMRect;
  target: DOMRect;
}

@Component({
  selector: 'app-kanji-drawing-review',
  standalone: true,
  templateUrl: './kanji-drawing-review.component.html',
  styleUrl: './kanji-drawing-review.component.css',
})
export class KanjiDrawingReviewComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) character = '';
  @Input() strokeCount: number | null = null;
  @Input() disabled = false;
  @Output() readonly checked = new EventEmitter<boolean>();
  @ViewChild('drawingCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<{ correct: boolean; message: string } | null>(null);
  readonly showHint = signal(false);
  readonly drawnStrokeCount = signal(0);
  readonly expectedStrokeCount = signal(0);

  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private expectedStrokes: ExpectedStroke[] = [];
  private viewBox: SvgViewBox = { x: 0, y: 0, width: 109, height: 109 };
  private userStrokes: DrawingStroke[] = [];
  private activeStroke: DrawingStroke | null = null;
  private activeTouchId: number | null = null;
  private requestToken = 0;

  ngAfterViewInit(): void {
    this.canvas = this.canvasRef?.nativeElement ?? null;
    this.resizeCanvas();
    void this.loadStrokes();
  }

  ngOnChanges(): void {
    if (this.canvas) {
      void this.loadStrokes();
    }
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.supportsPointerEvents()) return;
    if (this.disabled || this.isLoading() || this.error()) return;
    const canvas = this.canvas;
    if (!canvas) return;

    this.claimGesture(event);
    canvas.setPointerCapture(event.pointerId);
    this.activeStroke = { points: [this.pointerPoint(event)] };
    this.feedback.set(null);
    this.redraw();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.supportsPointerEvents()) return;
    if (!this.activeStroke || this.disabled) return;
    this.claimGesture(event);
    this.activeStroke.points.push(this.pointerPoint(event));
    this.redraw();
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.supportsPointerEvents()) return;
    const canvas = this.canvas;
    if (!this.activeStroke || !canvas) return;

    this.claimGesture(event);
    this.activeStroke.points.push(this.pointerPoint(event));
    this.finishActiveStroke();
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    this.redraw();
  }

  onTouchStart(event: TouchEvent): void {
    if (this.supportsPointerEvents()) return;
    if (this.disabled || this.isLoading() || this.error() || this.activeStroke) return;
    const touch = event.changedTouches.item(0);
    if (!touch) return;

    this.claimGesture(event);
    this.activeTouchId = touch.identifier;
    this.activeStroke = { points: [this.touchPoint(touch)] };
    this.feedback.set(null);
    this.redraw();
  }

  onTouchMove(event: TouchEvent): void {
    if (this.supportsPointerEvents() || !this.activeStroke || this.disabled) return;
    const touch = this.findActiveTouch(event);
    if (!touch) return;

    this.claimGesture(event);
    this.activeStroke.points.push(this.touchPoint(touch));
    this.redraw();
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.supportsPointerEvents() || !this.activeStroke) return;
    const touch = this.findActiveTouch(event);
    if (touch) this.activeStroke.points.push(this.touchPoint(touch));

    this.claimGesture(event);
    this.finishActiveStroke();
    this.activeTouchId = null;
    this.redraw();
  }

  onTouchCancel(event: TouchEvent): void {
    if (this.supportsPointerEvents() || !this.activeStroke) return;

    this.claimGesture(event);
    this.activeStroke = null;
    this.activeTouchId = null;
    this.redraw();
  }

  clear(): void {
    if (this.disabled) return;
    this.userStrokes = [];
    this.activeStroke = null;
    this.drawnStrokeCount.set(0);
    this.feedback.set(null);
    this.redraw();
  }

  revealHint(): void {
    this.showHint.set(true);
    this.redraw();
  }

  checkDrawing(): void {
    if (this.disabled || this.isLoading() || this.error()) return;

    const expectedCount = this.expectedStrokes.length;
    if (this.userStrokes.length !== expectedCount) {
      this.report(false, `Cần viết đủ ${expectedCount} nét. Bạn đã viết ${this.userStrokes.length} nét.`);
      return;
    }

    const normalization = this.createStrokeNormalization();
    const isCorrect = normalization !== null && this.matchesExpectedStrokesInAnyOrder(normalization);
    this.report(
      isCorrect,
      isCorrect
        ? 'Chính xác! Các nét viết đã tạo đúng chữ Kanji.'
        : 'Nét viết chưa khớp. Xem gợi ý để đối chiếu rồi thử lại ở lần sau.'
    );
  }

  private matchesExpectedStrokesInAnyOrder(normalization: StrokeNormalization): boolean {
    const matchedUserByExpected = Array<number>(this.expectedStrokes.length).fill(-1);

    const assignExpectedStroke = (userIndex: number, visited: boolean[]): boolean => {
      const userStroke = this.userStrokes[userIndex];
      for (let expectedIndex = 0; expectedIndex < this.expectedStrokes.length; expectedIndex += 1) {
        if (visited[expectedIndex]) continue;
        if (!this.matchesExpectedStroke(userStroke, this.expectedStrokes[expectedIndex], normalization)) continue;

        visited[expectedIndex] = true;
        const matchedUserIndex = matchedUserByExpected[expectedIndex];
        if (matchedUserIndex === -1 || assignExpectedStroke(matchedUserIndex, visited)) {
          matchedUserByExpected[expectedIndex] = userIndex;
          return true;
        }
      }
      return false;
    };

    return this.userStrokes.every((_, userIndex) =>
      assignExpectedStroke(userIndex, Array<boolean>(this.expectedStrokes.length).fill(false)),
    );
  }

  private async loadStrokes(): Promise<void> {
    const character = this.character.trim();
    const token = ++this.requestToken;
    this.isLoading.set(true);
    this.error.set(null);
    this.feedback.set(null);
    this.showHint.set(false);
    this.userStrokes = [];
    this.activeStroke = null;
    this.drawnStrokeCount.set(0);

    if (!character || typeof window === 'undefined') {
      this.finishWithError('Không có dữ liệu Kanji để luyện viết.', token);
      return;
    }

    const codePoint = character.codePointAt(0);
    if (!codePoint) {
      this.finishWithError('Không đọc được ký tự Kanji.', token);
      return;
    }

    const hex = codePoint.toString(16).padStart(5, '0').toLowerCase();
    const url = `https://wzwwopifwhijewbmyywz.supabase.co/storage/v1/object/public/kanji-strokes/${hex}.svg`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markup = await response.text();
      if (token !== this.requestToken) return;

      const parsed = this.parseSvgStrokes(markup);
      if (parsed.strokes.length === 0) throw new Error('empty strokes');

      this.expectedStrokes = parsed.strokes;
      this.expectedStrokeCount.set(parsed.strokes.length);
      this.viewBox = parsed.viewBox;
      this.isLoading.set(false);
      this.redraw();
    } catch {
      this.finishWithError('Không tải được dữ liệu nét viết cho chữ này.', token);
    }
  }

  private finishWithError(message: string, token: number): void {
    if (token !== this.requestToken) return;
    this.expectedStrokes = [];
    this.expectedStrokeCount.set(0);
    this.isLoading.set(false);
    this.error.set(message);
    this.redraw();
  }

  private parseSvgStrokes(markup: string): { strokes: ExpectedStroke[]; viewBox: SvgViewBox } {
    const document = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const svg = document.querySelector('svg');
    const viewBoxParts = (svg?.getAttribute('viewBox') ?? '0 0 109 109')
      .trim()
      .split(/\s+/)
      .map(Number);
    const viewBox: SvgViewBox = viewBoxParts.length === 4 && viewBoxParts.every(Number.isFinite)
      ? { x: viewBoxParts[0], y: viewBoxParts[1], width: viewBoxParts[2], height: viewBoxParts[3] }
      : { x: 0, y: 0, width: 109, height: 109 };

    const strokes = Array.from(document.querySelectorAll('path'))
      .filter((element) => (element.getAttribute('id') ?? '').includes('-s'))
      .map((element) => element.getAttribute('d')?.trim() ?? '')
      .filter(Boolean)
      .map((d) => {
        const path = new Path2D(d);
        return this.createExpectedStroke(path, viewBox);
      });

    return { strokes, viewBox };
  }

  private createExpectedStroke(path: Path2D, viewBox: SvgViewBox): ExpectedStroke {
    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = Math.ceil(viewBox.width);
    measureCanvas.height = Math.ceil(viewBox.height);
    const context = measureCanvas.getContext('2d');
    if (!context) {
      return {
        path,
        bounds: new DOMRect(viewBox.x, viewBox.y, viewBox.width, viewBox.height),
        ink: new Uint8ClampedArray(),
        inkWidth: 0,
        inkHeight: 0,
      };
    }

    context.translate(-viewBox.x, -viewBox.y);
    context.strokeStyle = '#000';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke(path);
    const pixels = context.getImageData(0, 0, measureCanvas.width, measureCanvas.height).data;
    let minX = measureCanvas.width;
    let minY = measureCanvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < measureCanvas.height; y += 1) {
      for (let x = 0; x < measureCanvas.width; x += 1) {
        if (pixels[(y * measureCanvas.width + x) * 4 + 3] === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return {
      path,
      bounds: maxX < 0
        ? new DOMRect(viewBox.x, viewBox.y, viewBox.width, viewBox.height)
        : new DOMRect(minX + viewBox.x, minY + viewBox.y, maxX - minX + 1, maxY - minY + 1),
      ink: pixels,
      inkWidth: measureCanvas.width,
      inkHeight: measureCanvas.height,
    };
  }

  private matchesExpectedStroke(
    stroke: DrawingStroke,
    expected: ExpectedStroke,
    normalization: StrokeNormalization
  ): boolean {
    if (stroke.points.length < 3) return false;
    const sample = stroke.points.filter((_, index) =>
      index === 0 || index === stroke.points.length - 1 || index % 2 === 0
    );
    const expectedBounds = expected.bounds;
    const tolerance = Math.min(
      24,
      Math.max(10, Math.max(expectedBounds.width, expectedBounds.height) * 0.30)
    );
    let inkHits = 0;
    let boundsHits = 0;

    for (const point of sample) {
      const svgPoint = this.normalizePoint(this.toSvgPoint(point), normalization);
      if (this.isExpectedInkNearby(expected, svgPoint, tolerance)) inkHits += 1;
      if (
        svgPoint.x >= expectedBounds.left - tolerance * 1.25 &&
        svgPoint.x <= expectedBounds.right + tolerance * 1.25 &&
        svgPoint.y >= expectedBounds.top - tolerance * 1.25 &&
        svgPoint.y <= expectedBounds.bottom + tolerance * 1.25
      ) {
        boundsHits += 1;
      }
    }

    return inkHits / sample.length >= 0.25 && boundsHits / sample.length >= 0.50;
  }

  private createStrokeNormalization(): StrokeNormalization | null {
    const userPoints = this.userStrokes.flatMap((stroke) =>
      stroke.points.map((point) => this.toSvgPoint(point))
    );
    if (userPoints.length === 0 || this.expectedStrokes.length === 0) return null;

    const source = this.pointsBounds(userPoints);
    const target = this.expectedStrokes
      .map((stroke) => stroke.bounds)
      .reduce((bounds, current) => this.unionBounds(bounds, current));
    return { source, target };
  }

  private pointsBounds(points: DrawingPoint[]): DOMRect {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return new DOMRect(left, top, Math.max(...xs) - left, Math.max(...ys) - top);
  }

  private unionBounds(left: DOMRect, right: DOMRect): DOMRect {
    const x = Math.min(left.left, right.left);
    const y = Math.min(left.top, right.top);
    const maxX = Math.max(left.right, right.right);
    const maxY = Math.max(left.bottom, right.bottom);
    return new DOMRect(x, y, maxX - x, maxY - y);
  }

  private normalizePoint(point: DrawingPoint, normalization: StrokeNormalization): DrawingPoint {
    const { source, target } = normalization;
    return {
      x: source.width > 1
        ? target.left + ((point.x - source.left) / source.width) * target.width
        : target.left + target.width / 2,
      y: source.height > 1
        ? target.top + ((point.y - source.top) / source.height) * target.height
        : target.top + target.height / 2,
    };
  }

  private isExpectedInkNearby(
    expected: ExpectedStroke,
    point: DrawingPoint,
    tolerance: number
  ): boolean {
    if (expected.inkWidth === 0 || expected.inkHeight === 0) return false;

    const centerX = Math.round(point.x - this.viewBox.x);
    const centerY = Math.round(point.y - this.viewBox.y);
    const radius = Math.ceil(tolerance);
    const squaredRadius = radius * radius;
    const minX = Math.max(0, centerX - radius);
    const maxX = Math.min(expected.inkWidth - 1, centerX + radius);
    const minY = Math.max(0, centerY - radius);
    const maxY = Math.min(expected.inkHeight - 1, centerY + radius);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const distanceX = x - centerX;
        const distanceY = y - centerY;
        if (distanceX * distanceX + distanceY * distanceY > squaredRadius) continue;
        if (expected.ink[(y * expected.inkWidth + x) * 4 + 3] > 0) return true;
      }
    }
    return false;
  }

  private report(correct: boolean, message: string): void {
    this.feedback.set({ correct, message });
    if (!correct) this.showHint.set(true);
    this.redraw();
    this.checked.emit(correct);
  }

  private pointerPoint(event: PointerEvent): DrawingPoint {
    return this.clientPoint(event.clientX, event.clientY);
  }

  private touchPoint(touch: Touch): DrawingPoint {
    return this.clientPoint(touch.clientX, touch.clientY);
  }

  private clientPoint(clientX: number, clientY: number): DrawingPoint {
    const rect = this.canvas?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
  }

  private findActiveTouch(event: TouchEvent): Touch | null {
    for (let index = 0; index < event.changedTouches.length; index += 1) {
      const touch = event.changedTouches.item(index);
      if (touch?.identifier === this.activeTouchId) return touch;
    }
    return null;
  }

  private finishActiveStroke(): void {
    if (this.activeStroke && this.activeStroke.points.length > 2) {
      this.userStrokes.push(this.activeStroke);
      this.drawnStrokeCount.set(this.userStrokes.length);
    }
    this.activeStroke = null;
  }

  private supportsPointerEvents(): boolean {
    return typeof window !== 'undefined' && 'PointerEvent' in window;
  }

  private claimGesture(event: Event): void {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
  }

  private resizeCanvas(): void {
    const canvas = this.canvas;
    if (!canvas || typeof window === 'undefined') return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.context = context;
    this.redraw();
  }

  private redraw(): void {
    const canvas = this.canvas;
    const context = this.context;
    if (!canvas || !context) return;
    const { width, height } = canvas.getBoundingClientRect();
    context.clearRect(0, 0, width, height);
    this.drawGrid(context, width, height);

    const strokes = this.activeStroke ? [...this.userStrokes, this.activeStroke] : this.userStrokes;
    context.strokeStyle = '#7c2d12';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    }

    if (this.showHint() && this.expectedStrokes.length > 0) {
      const transform = this.canvasTransform(width, height);
      context.save();
      context.translate(transform.x, transform.y);
      context.scale(transform.scale, transform.scale);
      context.translate(-this.viewBox.x, -this.viewBox.y);
      context.strokeStyle = 'rgba(143, 62, 37, 0.28)';
      context.lineWidth = 3.5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      this.expectedStrokes.forEach((stroke) => context.stroke(stroke.path));
      context.restore();
    }
  }

  private drawGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.save();
    context.strokeStyle = 'rgba(147, 99, 58, 0.22)';
    context.lineWidth = 1;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.moveTo(0, 0);
    context.lineTo(width, height);
    context.moveTo(width, 0);
    context.lineTo(0, height);
    context.stroke();
    context.restore();
  }

  private canvasTransform(width: number, height: number): { x: number; y: number; scale: number } {
    const scale = Math.min(width / this.viewBox.width, height / this.viewBox.height) * 0.84;
    return {
      x: (width - this.viewBox.width * scale) / 2,
      y: (height - this.viewBox.height * scale) / 2,
      scale,
    };
  }

  private toSvgPoint(point: DrawingPoint): DrawingPoint {
    const canvas = this.canvas;
    if (!canvas) return point;
    const rect = canvas.getBoundingClientRect();
    const transform = this.canvasTransform(rect.width, rect.height);
    return {
      x: (point.x - transform.x) / transform.scale + this.viewBox.x,
      y: (point.y - transform.y) / transform.scale + this.viewBox.y,
    };
  }
}

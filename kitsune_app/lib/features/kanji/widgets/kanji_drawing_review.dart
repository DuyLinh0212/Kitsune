import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:kitsune_app/core/network/supabase_client.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:path_drawing/path_drawing.dart';
import 'package:xml/xml.dart';

class KanjiDrawingReview extends StatefulWidget {
  const KanjiDrawingReview({
    super.key,
    required this.character,
    required this.onChecked,
    this.strokeCount,
    this.disabled = false,
  });

  final String character;
  final ValueChanged<bool> onChecked;
  final int? strokeCount;
  final bool disabled;

  @override
  State<KanjiDrawingReview> createState() => _KanjiDrawingReviewState();
}

class _KanjiDrawingReviewState extends State<KanjiDrawingReview> {
  bool _isLoading = true;
  String? _error;
  String? _feedback;
  bool? _isCorrect;
  bool _showHint = false;
  List<Path> _expectedStrokes = const [];
  Size _viewBox = const Size(109, 109);
  List<List<Offset>> _strokes = [];
  List<Offset>? _activeStroke;
  Size _drawingSize = Size.zero;
  int _loadToken = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant KanjiDrawingReview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.character != widget.character) {
      _load();
    }
  }

  Future<void> _load() async {
    final token = ++_loadToken;
    final character = widget.character.trim();
    setState(() {
      _isLoading = true;
      _error = null;
      _feedback = null;
      _isCorrect = null;
      _showHint = false;
      _expectedStrokes = const [];
      _strokes = [];
      _activeStroke = null;
    });

    if (character.isEmpty) {
      _finishWithError('Không có dữ liệu Kanji để luyện viết.', token);
      return;
    }

    final hex =
        character.runes.first.toRadixString(16).padLeft(5, '0').toLowerCase();
    final client = SupabaseClient();
    final url =
        '${client.baseUrl}/storage/v1/object/public/kanji-strokes/$hex.svg';

    try {
      final response = await client.dio.get<String>(
        url,
        options: Options(
          responseType: ResponseType.plain,
          validateStatus: (status) => status == 200 || status == 404,
        ),
      );
      if (!mounted || token != _loadToken) return;
      if (response.statusCode == 404 ||
          response.data == null ||
          response.data!.trim().isEmpty) {
        _finishWithError('Không có dữ liệu nét viết cho chữ này.', token);
        return;
      }

      final parsed = _parseStrokes(response.data!);
      if (parsed.strokes.isEmpty) {
        _finishWithError('Không có dữ liệu nét viết cho chữ này.', token);
        return;
      }
      setState(() {
        _isLoading = false;
        _expectedStrokes = parsed.strokes;
        _viewBox = parsed.viewBox;
      });
    } catch (_) {
      _finishWithError('Không tải được dữ liệu nét viết.', token);
    }
  }

  void _finishWithError(String message, int token) {
    if (!mounted || token != _loadToken) return;
    setState(() {
      _isLoading = false;
      _error = message;
      _expectedStrokes = const [];
    });
  }

  _ParsedStrokes _parseStrokes(String markup) {
    final document = XmlDocument.parse(markup);
    final svg = document.findAllElements('svg').firstOrNull;
    var viewBox = const Size(109, 109);
    final parts =
        svg?.getAttribute('viewBox')?.trim().split(RegExp(r'\s+')) ?? const [];
    if (parts.length == 4) {
      final width = double.tryParse(parts[2]);
      final height = double.tryParse(parts[3]);
      if (width != null && height != null && width > 0 && height > 0) {
        viewBox = Size(width, height);
      }
    }

    final paths = <Path>[];
    for (final element in document.findAllElements('path')) {
      if (!(element.getAttribute('id') ?? '').contains('-s')) continue;
      final d = element.getAttribute('d');
      if (d == null || d.trim().isEmpty) continue;
      try {
        paths.add(parseSvgPathData(d));
      } catch (_) {
        // Skip malformed paths and retain usable KanjiVG strokes.
      }
    }
    return _ParsedStrokes(strokes: paths, viewBox: viewBox);
  }

  void _beginStroke(Offset point) {
    if (widget.disabled || _isLoading || _error != null) return;
    setState(() {
      _feedback = null;
      _isCorrect = null;
      _activeStroke = [point];
    });
  }

  void _extendStroke(Offset point) {
    if (_activeStroke == null || widget.disabled) return;
    setState(() => _activeStroke!.add(point));
  }

  void _finishStroke(Offset point) {
    final active = _activeStroke;
    if (active == null) return;
    active.add(point);
    setState(() {
      if (active.length > 2) _strokes = [..._strokes, active];
      _activeStroke = null;
    });
  }

  void _cancelStroke() {
    final active = _activeStroke;
    if (active != null) _finishStroke(active.last);
  }

  void _clear() {
    if (widget.disabled) return;
    setState(() {
      _strokes = [];
      _activeStroke = null;
      _feedback = null;
      _isCorrect = null;
    });
  }

  void _check(Size size) {
    if (widget.disabled || _isLoading || _error != null) return;
    final expectedCount = _expectedStrokes.length;
    if (_strokes.length != expectedCount) {
      _report(false,
          'Cần viết đủ $expectedCount nét. Bạn đã viết ${_strokes.length} nét.');
      return;
    }

    final normalization = _createStrokeNormalization(size);
    final correct = normalization != null &&
        _matchesExpectedStrokesInAnyOrder(size, normalization);
    _report(
      correct,
      correct
          ? 'Chính xác! Các nét viết đã tạo đúng chữ Kanji.'
          : 'Nét viết chưa khớp. Xem gợi ý để đối chiếu rồi luyện lại ở lần sau.',
    );
  }

  bool _matchesExpectedStrokesInAnyOrder(
      Size size, _StrokeNormalization normalization) {
    final matchedUserByExpected = List<int>.filled(_expectedStrokes.length, -1);

    bool assignExpectedStroke(int userIndex, List<bool> visited) {
      for (var expectedIndex = 0;
          expectedIndex < _expectedStrokes.length;
          expectedIndex += 1) {
        if (visited[expectedIndex] ||
            !_matchesExpectedStroke(_strokes[userIndex],
                _expectedStrokes[expectedIndex], size, normalization)) {
          continue;
        }

        visited[expectedIndex] = true;
        final matchedUserIndex = matchedUserByExpected[expectedIndex];
        if (matchedUserIndex == -1 ||
            assignExpectedStroke(matchedUserIndex, visited)) {
          matchedUserByExpected[expectedIndex] = userIndex;
          return true;
        }
      }
      return false;
    }

    for (var userIndex = 0; userIndex < _strokes.length; userIndex += 1) {
      if (!assignExpectedStroke(
          userIndex, List<bool>.filled(_expectedStrokes.length, false))) {
        return false;
      }
    }
    return true;
  }

  bool _matchesExpectedStroke(List<Offset> stroke, Path expected, Size size,
      _StrokeNormalization normalization) {
    if (stroke.length < 3) return false;
    final expectedBounds = expected.getBounds();
    final tolerance = min(
      24.0,
      max(10.0, max(expectedBounds.width, expectedBounds.height) * 0.30),
    );
    final expectedPoints = _sampleExpectedPath(expected);
    if (expectedPoints.isEmpty) return false;
    final sample = <Offset>[
      for (var index = 0; index < stroke.length; index += 2) stroke[index],
      stroke.last,
    ];
    var pathHits = 0;
    var boundsHits = 0;
    for (final point in sample) {
      final svgPoint = normalization.apply(_toSvgPoint(point, size));
      if (expectedPoints.any((expectedPoint) =>
          (expectedPoint - svgPoint).distance <= tolerance)) {
        pathHits += 1;
      }
      if (Rect.fromLTRB(
        expectedBounds.left - tolerance * 1.25,
        expectedBounds.top - tolerance * 1.25,
        expectedBounds.right + tolerance * 1.25,
        expectedBounds.bottom + tolerance * 1.25,
      ).contains(svgPoint)) {
        boundsHits += 1;
      }
    }
    return pathHits / sample.length >= 0.25 &&
        boundsHits / sample.length >= 0.50;
  }

  List<Offset> _sampleExpectedPath(Path path) {
    final points = <Offset>[];
    for (final metric in path.computeMetrics()) {
      for (var distance = 0.0; distance < metric.length; distance += 2) {
        final tangent = metric.getTangentForOffset(distance);
        if (tangent != null) points.add(tangent.position);
      }
      final end = metric.getTangentForOffset(metric.length);
      if (end != null) points.add(end.position);
    }
    return points;
  }

  _StrokeNormalization? _createStrokeNormalization(Size size) {
    final userPoints = <Offset>[
      for (final stroke in _strokes)
        for (final point in stroke) _toSvgPoint(point, size),
    ];
    if (userPoints.isEmpty || _expectedStrokes.isEmpty) return null;

    final source = _pointsBounds(userPoints);
    var target = _expectedStrokes.first.getBounds();
    for (final stroke in _expectedStrokes.skip(1)) {
      final bounds = stroke.getBounds();
      target = Rect.fromLTRB(
        min(target.left, bounds.left),
        min(target.top, bounds.top),
        max(target.right, bounds.right),
        max(target.bottom, bounds.bottom),
      );
    }
    return _StrokeNormalization(source: source, target: target);
  }

  Rect _pointsBounds(List<Offset> points) {
    var left = points.first.dx;
    var right = points.first.dx;
    var top = points.first.dy;
    var bottom = points.first.dy;
    for (final point in points.skip(1)) {
      left = min(left, point.dx);
      right = max(right, point.dx);
      top = min(top, point.dy);
      bottom = max(bottom, point.dy);
    }
    return Rect.fromLTRB(left, top, right, bottom);
  }

  void _report(bool correct, String message) {
    setState(() {
      _isCorrect = correct;
      _feedback = message;
      if (!correct) _showHint = true;
    });
    widget.onChecked(correct);
  }

  Offset _toSvgPoint(Offset point, Size size) {
    final transform = _transform(size);
    return Offset(
      (point.dx - transform.dx) / transform.scale,
      (point.dy - transform.dy) / transform.scale,
    );
  }

  _CanvasTransform _transform(Size size) {
    final scale =
        min(size.width / _viewBox.width, size.height / _viewBox.height) * 0.84;
    return _CanvasTransform(
      scale: scale,
      dx: (size.width - _viewBox.width * scale) / 2,
      dy: (size.height - _viewBox.height * scale) / 2,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Vẽ từng nét vào ô trống, không có chữ mờ làm mẫu.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: KitsuneColors.primarySurface,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '${_strokes.length}/${_expectedStrokes.isEmpty ? widget.strokeCount ?? '—' : _expectedStrokes.length} nét',
                style:
                    const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppTheme.space12),
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 340),
            child: SizedBox(
              height: MediaQuery.sizeOf(context).height < 700 ? 190 : 250,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  _drawingSize =
                      Size(constraints.maxWidth, constraints.maxHeight);
                  return DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFDF8),
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                      border: Border.all(color: KitsuneColors.surfaceBorder),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: IgnorePointer(
                              ignoring: widget.disabled ||
                                  _isLoading ||
                                  _error != null,
                              child: RawGestureDetector(
                                behavior: HitTestBehavior.opaque,
                                gestures: {
                                  _DrawingGestureRecognizer:
                                      GestureRecognizerFactoryWithHandlers<
                                          _DrawingGestureRecognizer>(
                                    _DrawingGestureRecognizer.new,
                                    (recognizer) {
                                      recognizer
                                        ..onStart = _beginStroke
                                        ..onUpdate = _extendStroke
                                        ..onEnd = _finishStroke
                                        ..onCancel = _cancelStroke;
                                    },
                                  ),
                                },
                                child: CustomPaint(
                                  painter: _KanjiDrawingPainter(
                                    strokes: _activeStroke == null
                                        ? _strokes
                                        : [..._strokes, _activeStroke!],
                                    expectedStrokes: _expectedStrokes,
                                    viewBox: _viewBox,
                                    showHint: _showHint,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          if (_isLoading)
                            const Center(child: KitsuneLoadingFox(size: 50))
                          else if (_error != null)
                            Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child:
                                    Text(_error!, textAlign: TextAlign.center),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
        const SizedBox(height: AppTheme.space12),
        Wrap(
          alignment: WrapAlignment.end,
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton(
                onPressed: widget.disabled || _isLoading ? null : _clear,
                child: const Text('Xóa nét')),
            OutlinedButton(
              onPressed: widget.disabled || _isLoading
                  ? null
                  : () => setState(() => _showHint = true),
              child: const Text('Xem gợi ý'),
            ),
            ElevatedButton(
              onPressed: widget.disabled ||
                      _isLoading ||
                      _error != null ||
                      _strokes.isEmpty
                  ? null
                  : () => _check(_drawingSize),
              child: const Text('Kiểm tra nét'),
            ),
          ],
        ),
        if (_feedback != null) ...[
          const SizedBox(height: AppTheme.space12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (_isCorrect ?? false)
                  ? KitsuneColors.successSurface
                  : KitsuneColors.errorSurface,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Text(
              _feedback!,
              style: TextStyle(
                color: (_isCorrect ?? false)
                    ? KitsuneColors.success
                    : KitsuneColors.error,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Captures drawing pointers before the enclosing scroll view can claim them.
class _DrawingGestureRecognizer extends EagerGestureRecognizer {
  ValueChanged<Offset>? onStart;
  ValueChanged<Offset>? onUpdate;
  ValueChanged<Offset>? onEnd;
  VoidCallback? onCancel;

  @override
  void addAllowedPointer(PointerDownEvent event) {
    super.addAllowedPointer(event);
    onStart?.call(event.localPosition);
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event is PointerMoveEvent) {
      onUpdate?.call(event.localPosition);
    } else if (event is PointerUpEvent) {
      onEnd?.call(event.localPosition);
      stopTrackingPointer(event.pointer);
    } else if (event is PointerCancelEvent) {
      onCancel?.call();
      stopTrackingPointer(event.pointer);
    }
  }
}

class _ParsedStrokes {
  const _ParsedStrokes({required this.strokes, required this.viewBox});

  final List<Path> strokes;
  final Size viewBox;
}

class _CanvasTransform {
  const _CanvasTransform(
      {required this.scale, required this.dx, required this.dy});

  final double scale;
  final double dx;
  final double dy;
}

class _StrokeNormalization {
  const _StrokeNormalization({required this.source, required this.target});

  final Rect source;
  final Rect target;

  Offset apply(Offset point) {
    return Offset(
      source.width > 1
          ? target.left +
              ((point.dx - source.left) / source.width) * target.width
          : target.center.dx,
      source.height > 1
          ? target.top +
              ((point.dy - source.top) / source.height) * target.height
          : target.center.dy,
    );
  }
}

class _KanjiDrawingPainter extends CustomPainter {
  const _KanjiDrawingPainter({
    required this.strokes,
    required this.expectedStrokes,
    required this.viewBox,
    required this.showHint,
  });

  final List<List<Offset>> strokes;
  final List<Path> expectedStrokes;
  final Size viewBox;
  final bool showHint;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = const Color(0x3894633A)
      ..strokeWidth = 1;
    canvas.drawLine(
        Offset(size.width / 2, 0), Offset(size.width / 2, size.height), grid);
    canvas.drawLine(
        Offset(0, size.height / 2), Offset(size.width, size.height / 2), grid);
    canvas.drawLine(Offset.zero, Offset(size.width, size.height), grid);
    canvas.drawLine(Offset(size.width, 0), Offset(0, size.height), grid);

    final scale =
        min(size.width / viewBox.width, size.height / viewBox.height) * 0.84;
    final dx = (size.width - viewBox.width * scale) / 2;
    final dy = (size.height - viewBox.height * scale) / 2;
    final ink = Paint()
      ..color = const Color(0xFF7C2D12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final stroke in strokes) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (final point in stroke.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(path, ink);
    }

    if (showHint) {
      canvas.save();
      canvas.translate(dx, dy);
      canvas.scale(scale);
      final hint = Paint()
        ..color = const Color(0x478F3E25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      for (final path in expectedStrokes) {
        canvas.drawPath(path, hint);
      }
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _KanjiDrawingPainter oldDelegate) {
    return oldDelegate.strokes != strokes ||
        oldDelegate.expectedStrokes != expectedStrokes ||
        oldDelegate.showHint != showHint;
  }
}

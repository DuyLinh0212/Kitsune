import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:kitsune_app/core/network/supabase_client.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:path_drawing/path_drawing.dart';
import 'package:xml/xml.dart';

const _kStrokeStaggerMs = 720;
const _kStrokeDurationMs = 980;
const _kStrokePalette = [
  Color(0xFF2563EB),
  Color(0xFFEA580C),
  Color(0xFF111827),
  Color(0xFF22C55E),
  Color(0xFF7C3AED),
  Color(0xFF0F766E),
];

class KanjiStrokeWriter extends StatefulWidget {
  const KanjiStrokeWriter({
    super.key,
    required this.character,
    this.width = 260,
    this.height = 260,
    this.compact = false,
  });

  final String character;
  final double width;
  final double height;
  final bool compact;

  @override
  State<KanjiStrokeWriter> createState() => _KanjiStrokeWriterState();
}

class _KanjiStrokeWriterState extends State<KanjiStrokeWriter>
    with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  String? _error;
  List<Path> _strokes = const [];
  Size _viewBox = const Size(109, 109);
  int _loadToken = 0;
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1));
    _load();
  }

  @override
  void didUpdateWidget(covariant KanjiStrokeWriter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.character != widget.character) {
      _load();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final token = ++_loadToken;
    final character = widget.character.trim();

    if (character.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoading = false;
        _error = 'Khong co du lieu kanji.';
        _strokes = const [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _strokes = const [];
    });

    final codePoint = character.runes.first;
    final hex = codePoint.toRadixString(16).padLeft(5, '0').toLowerCase();
    final client = SupabaseClient();
    final url = '${client.baseUrl}/storage/v1/object/public/kanji-strokes/$hex.svg';

    try {
      final response = await client.dio.get<String>(
        url,
        options: Options(
          responseType: ResponseType.plain,
          validateStatus: (status) => status == 200 || status == 404,
        ),
      );

      if (!mounted || token != _loadToken) {
        return;
      }

      if (response.statusCode == 404 || response.data == null || response.data!.trim().isEmpty) {
        setState(() {
          _isLoading = false;
          _error = 'Khong co du lieu net viet cho chu nay.';
          _strokes = const [];
        });
        return;
      }

      final parsed = _parseStrokes(response.data!);
      if (!mounted || token != _loadToken) {
        return;
      }

      if (parsed.strokes.isEmpty) {
        setState(() {
          _isLoading = false;
          _error = 'Khong co du lieu net viet cho chu nay.';
          _strokes = const [];
        });
        return;
      }

      setState(() {
        _isLoading = false;
        _error = null;
        _strokes = parsed.strokes;
        _viewBox = parsed.viewBox;
      });
      _playAnimation();
    } catch (_) {
      if (!mounted || token != _loadToken) {
        return;
      }

      setState(() {
        _isLoading = false;
        _error = 'Khong tai duoc du lieu net viet.';
        _strokes = const [];
      });
    }
  }

  _ParsedStrokes _parseStrokes(String svgMarkup) {
    final document = XmlDocument.parse(svgMarkup);
    final svgElements = document.findAllElements('svg');
    final svgElement = svgElements.isEmpty ? null : svgElements.first;

    var viewBox = const Size(109, 109);
    final viewBoxAttr = svgElement?.getAttribute('viewBox');
    if (viewBoxAttr != null) {
      final parts = viewBoxAttr.trim().split(RegExp(r'\s+'));
      if (parts.length == 4) {
        final w = double.tryParse(parts[2]);
        final h = double.tryParse(parts[3]);
        if (w != null && h != null && w > 0 && h > 0) {
          viewBox = Size(w, h);
        }
      }
    }

    final strokes = <Path>[];
    for (final element in document.findAllElements('path')) {
      final id = element.getAttribute('id') ?? '';
      if (!id.contains('-s')) {
        continue;
      }
      final d = element.getAttribute('d');
      if (d == null || d.trim().isEmpty) {
        continue;
      }
      try {
        strokes.add(parseSvgPathData(d));
      } catch (_) {}
    }

    return _ParsedStrokes(strokes: strokes, viewBox: viewBox);
  }

  void _playAnimation() {
    final totalMs = _kStrokeStaggerMs * (_strokes.length - 1) + _kStrokeDurationMs;
    _controller
      ..duration = Duration(milliseconds: totalMs)
      ..reset()
      ..forward();
  }

  void _replay() {
    if (_isLoading || _error != null || _strokes.isEmpty) {
      return;
    }
    _playAnimation();
  }

  Widget _buildDrawingBox() {
    return Container(
      width: widget.width,
      height: widget.height,
      padding: EdgeInsets.all(widget.compact ? 6 : 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF7),
        borderRadius: BorderRadius.circular(widget.compact ? 14 : 18),
        border: Border.all(
          color: _error != null
              ? KitsuneColors.error.withValues(alpha: 0.35)
              : KitsuneColors.surfaceBorder,
        ),
      ),
      child: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _GridPainter())),
          Positioned.fill(
            child: _isLoading
                ? Center(
                    child: SizedBox(
                      width: widget.compact ? 18 : 24,
                      height: widget.compact ? 18 : 24,
                      child: const CircularProgressIndicator(strokeWidth: 2.2),
                    ),
                  )
                : _strokes.isNotEmpty
                    ? Center(
                        child: AnimatedBuilder(
                          animation: _controller,
                          builder: (context, _) {
                            final inset = widget.compact ? 12.0 : 20.0;
                            return CustomPaint(
                              size: Size(widget.width - inset, widget.height - inset),
                              painter: _StrokePainter(
                                strokes: _strokes,
                                viewBox: _viewBox,
                                progress: _controller.value,
                                totalDurationMs: _controller.duration!.inMilliseconds,
                              ),
                            );
                          },
                        ),
                      )
                    : Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.character,
                              style: TextStyle(
                                fontSize: widget.compact ? 40 : 54,
                                fontWeight: FontWeight.w800,
                                color: KitsuneColors.onSurface,
                              ),
                            ),
                            if (!widget.compact) ...[
                              const SizedBox(height: 8),
                              Text(
                                _error ?? 'Khong co du lieu net viet.',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: KitsuneColors.onSurfaceVariant,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 10),
                              OutlinedButton(
                                onPressed: _load,
                                child: const Text('Thu lai'),
                              ),
                            ],
                          ],
                        ),
                      ),
          ),
          if (widget.compact)
            Positioned(
              right: 2,
              top: 2,
              child: Material(
                color: KitsuneColors.surface.withValues(alpha: 0.85),
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: (_isLoading || _error != null) ? null : _replay,
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.replay_rounded,
                      size: 16,
                      color: (_isLoading || _error != null)
                          ? KitsuneColors.onSurfaceVariant.withValues(alpha: 0.4)
                          : KitsuneColors.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.compact) {
      return _buildDrawingBox();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'THU TU NET',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.1,
                      color: KitsuneColors.error,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Tung net duoc ve cham de de quan sat.',
                    style: const TextStyle(fontSize: 11, color: KitsuneColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: (_isLoading || _error != null) ? null : _replay,
              tooltip: 'Phat lai net viet',
              icon: const Icon(Icons.replay_rounded, size: 20),
              style: IconButton.styleFrom(
                backgroundColor: KitsuneColors.surface,
                side: const BorderSide(color: KitsuneColors.surfaceBorder),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppTheme.space10),
        _buildDrawingBox(),
      ],
    );
  }
}

class _ParsedStrokes {
  const _ParsedStrokes({required this.strokes, required this.viewBox});

  final List<Path> strokes;
  final Size viewBox;
}

class _StrokePainter extends CustomPainter {
  _StrokePainter({
    required this.strokes,
    required this.viewBox,
    required this.progress,
    required this.totalDurationMs,
  });

  final List<Path> strokes;
  final Size viewBox;
  final double progress;
  final int totalDurationMs;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = (size.width / viewBox.width < size.height / viewBox.height)
        ? size.width / viewBox.width
        : size.height / viewBox.height;
    final dx = (size.width - viewBox.width * scale) / 2;
    final dy = (size.height - viewBox.height * scale) / 2;

    canvas.save();
    canvas.translate(dx, dy);
    canvas.scale(scale);

    final elapsedMs = progress * totalDurationMs;

    for (var index = 0; index < strokes.length; index++) {
      final startMs = index * _kStrokeStaggerMs;
      final strokeProgress = ((elapsedMs - startMs) / _kStrokeDurationMs).clamp(0.0, 1.0);
      if (strokeProgress <= 0) {
        continue;
      }

      final eased = Curves.easeOutCubic.transform(strokeProgress);
      final path = strokes[index];
      final metrics = path.computeMetrics();
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = _kStrokePalette[index % _kStrokePalette.length];

      for (final metric in metrics) {
        final extractLength = metric.length * eased;
        if (extractLength <= 0) {
          continue;
        }
        canvas.drawPath(metric.extractPath(0, extractLength), paint);
      }
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _StrokePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.strokes != strokes;
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final borderPaint = Paint()
      ..color = const Color(0x33B91C1C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    final centerPaint = Paint()
      ..color = const Color(0x22B91C1C)
      ..strokeWidth = 1;

    final dashedRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(4, 4, size.width - 8, size.height - 8),
      const Radius.circular(12),
    );
    canvas.drawRRect(dashedRect, borderPaint..color = const Color(0x33C9B89C));

    canvas.drawLine(
      Offset(size.width / 2, 0),
      Offset(size.width / 2, size.height),
      centerPaint,
    );
    canvas.drawLine(
      Offset(0, size.height / 2),
      Offset(size.width, size.height / 2),
      centerPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

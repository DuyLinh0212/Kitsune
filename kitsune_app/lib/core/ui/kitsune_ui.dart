import 'package:flutter/material.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';

String kitsuneInitials(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) {
    return '?';
  }

  final parts = trimmed.split(RegExp(r'\s+'));
  if (parts.length == 1) {
    return parts.first.substring(0, 1).toUpperCase();
  }

  return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
      .toUpperCase();
}

/// Flat cream→paper wash. No floating decoration — the content is the design.
class KitsuneBackdrop extends StatelessWidget {
  const KitsuneBackdrop({
    super.key,
    required this.child,
    this.padding,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            KitsuneColors.background,
            Color(0xFFF9F1E3),
          ],
          stops: [0, 1],
        ),
      ),
      child: Padding(
        padding: padding ?? EdgeInsets.zero,
        child: child,
      ),
    );
  }
}

/// Page hero: title + subtitle + optional trailing action. No eyebrow label —
/// the [KitsuneTailMark] beside the title carries the brand mark instead.
class KitsuneHeroCard extends StatelessWidget {
  const KitsuneHeroCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.accent = KitsuneColors.primary,
    this.margin,
    this.titleStyle,
  });

  final String title;
  final String subtitle;
  final Widget? trailing;
  final Color accent;
  final EdgeInsetsGeometry? margin;
  final TextStyle? titleStyle;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: margin,
      padding: const EdgeInsets.all(AppTheme.space20),
      decoration: BoxDecoration(
        color: KitsuneColors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: KitsuneColors.surfaceBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A2B2018),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                KitsuneTailMark(color: accent),
                const SizedBox(height: AppTheme.space10),
                Text(
                  title,
                  style: titleStyle ??
                      textTheme.headlineMedium?.copyWith(height: 1.12),
                ),
                const SizedBox(height: AppTheme.space8),
                Text(
                  subtitle,
                  style: textTheme.bodyMedium?.copyWith(
                    color: KitsuneColors.onSurfaceVariant,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: AppTheme.space16),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class KitsuneSurface extends StatelessWidget {
  const KitsuneSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppTheme.space16),
    this.margin,
    this.color,
    this.onTap,
    this.radius = AppTheme.radiusMd,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final VoidCallback? onTap;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final box = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: color ?? KitsuneColors.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: KitsuneColors.surfaceBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x142B2018),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );

    if (onTap == null) {
      return box;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(radius),
        onTap: onTap,
        child: box,
      ),
    );
  }
}

/// Section title with the [KitsuneTailMark] accent in place of an eyebrow
/// label, an optional informative subtitle, and an optional trailing action.
class KitsuneSectionHeader extends StatelessWidget {
  const KitsuneSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.accent = KitsuneColors.primary,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  KitsuneTailMark(color: accent),
                  const SizedBox(width: AppTheme.space8),
                  Flexible(
                    child: Text(title, style: textTheme.titleLarge),
                  ),
                ],
              ),
              if (subtitle != null) ...[
                const SizedBox(height: AppTheme.space6),
                Text(
                  subtitle!,
                  style: textTheme.bodySmall?.copyWith(
                    color: KitsuneColors.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (actionLabel != null && onAction != null)
          TextButton(
            onPressed: onAction,
            child: Text(actionLabel!),
          ),
      ],
    );
  }
}

class KitsuneSearchField extends StatelessWidget {
  const KitsuneSearchField({
    super.key,
    required this.controller,
    required this.hintText,
    this.focusNode,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
  });

  final TextEditingController controller;
  final String hintText;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: controller.text.isNotEmpty
            ? IconButton(
                onPressed: onClear,
                icon: const Icon(Icons.close_rounded),
              )
            : null,
      ),
      onChanged: onChanged,
      onSubmitted: onSubmitted,
    );
  }
}

class KitsuneEmptyState extends StatelessWidget {
  const KitsuneEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: KitsuneSurface(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.space20,
          vertical: AppTheme.space24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: KitsuneColors.surfaceVariant,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(icon, size: 34, color: KitsuneColors.onSurfaceVariant),
            ),
            const SizedBox(height: AppTheme.space16),
            Text(
              title,
              style: textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppTheme.space8),
            Text(
              message,
              style: textTheme.bodyMedium?.copyWith(
                color: KitsuneColors.onSurfaceVariant,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              const SizedBox(height: AppTheme.space20),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

class KitsuneMetricPill extends StatelessWidget {
  const KitsuneMetricPill({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.space12,
        vertical: AppTheme.space10,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppTheme.space8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(value, style: AppTheme.numeralStyle(fontSize: 13, color: color)),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  color: KitsuneColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class KitsuneStatTile extends StatelessWidget {
  const KitsuneStatTile({
    super.key,
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return KitsuneSurface(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.space12,
        vertical: AppTheme.space16,
      ),
      child: Column(
        children: [
          Text(
            value,
            style: AppTheme.numeralStyle(fontSize: 22, color: color),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppTheme.space4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: KitsuneColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class KitsuneActionBadge extends StatelessWidget {
  const KitsuneActionBadge({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    this.isActive = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.space12,
        vertical: AppTheme.space10,
      ),
      decoration: BoxDecoration(
        color: isActive ? color.withValues(alpha: 0.16) : KitsuneColors.surfaceVariant,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(
          color: isActive ? color.withValues(alpha: 0.38) : KitsuneColors.surfaceBorder,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: isActive ? color : KitsuneColors.onSurfaceVariant),
          const SizedBox(width: AppTheme.space8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: isActive ? color : KitsuneColors.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

/// The Kitsune signature: a small tapered fox-tail flick. Used beside every
/// hero/section title and as the active bottom-nav indicator — nowhere else.
class KitsuneTailMark extends StatelessWidget {
  const KitsuneTailMark({
    super.key,
    this.color = KitsuneColors.primary,
    this.size = 16,
  });

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size * 0.78,
      child: CustomPaint(painter: _TailMarkPainter(color: color)),
    );
  }
}

class _TailMarkPainter extends CustomPainter {
  _TailMarkPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(size.width * 0.05, size.height * 0.94)
      ..cubicTo(
        size.width * 0.00,
        size.height * 0.55,
        size.width * 0.20,
        size.height * 0.04,
        size.width * 0.62,
        size.height * 0.02,
      )
      ..cubicTo(
        size.width * 1.00,
        size.height * 0.00,
        size.width * 1.02,
        size.height * 0.32,
        size.width * 0.84,
        size.height * 0.40,
      )
      ..cubicTo(
        size.width * 0.62,
        size.height * 0.50,
        size.width * 0.38,
        size.height * 0.46,
        size.width * 0.26,
        size.height * 0.70,
      )
      ..cubicTo(
        size.width * 0.20,
        size.height * 0.83,
        size.width * 0.18,
        size.height * 0.94,
        size.width * 0.05,
        size.height * 0.94,
      )
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _TailMarkPainter oldDelegate) => oldDelegate.color != color;
}

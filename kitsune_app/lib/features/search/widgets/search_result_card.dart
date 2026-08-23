import 'package:flutter/material.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';

class SearchResultCard extends StatelessWidget {
  const SearchResultCard({
    super.key,
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.accent,
    required this.icon,
    required this.onTap,
    this.meta = const [],
    this.isJapaneseTitle = false,
  });

  final String kind;
  final String title;
  final String subtitle;
  final Color accent;
  final IconData icon;
  final VoidCallback onTap;
  final List<String> meta;
  final bool isJapaneseTitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: KitsuneColors.surface,
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: KitsuneColors.surfaceBorder),
          borderRadius: const BorderRadius.only(
            topRight: Radius.circular(22),
            topLeft: Radius.circular(8),
            bottomLeft: Radius.circular(8),
            bottomRight: Radius.circular(8),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: accent, size: 23),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        kind.toUpperCase(),
                        style: TextStyle(
                          color: accent,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        title,
                        style: isJapaneseTitle
                            ? AppTheme.japaneseStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: KitsuneColors.onSurface,
                              )
                            : Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: KitsuneColors.onSurfaceVariant,
                              height: 1.4,
                            ),
                      ),
                      if (meta.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: meta
                              .where((item) => item.trim().isNotEmpty)
                              .map(
                                (item) => Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: accent.withValues(alpha: .08),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    item,
                                    style: TextStyle(
                                      color: accent,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 14,
                  color: KitsuneColors.onSurfaceMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

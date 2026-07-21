import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/features/kanji/widgets/kanji_stroke_writer.dart';
import 'package:kitsune_app/providers/providers.dart';

class KanjiSearchPage extends ConsumerStatefulWidget {
  const KanjiSearchPage({super.key});

  @override
  ConsumerState<KanjiSearchPage> createState() => _KanjiSearchPageState();
}

class _KanjiSearchPageState extends ConsumerState<KanjiSearchPage> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  Timer? _debounce;
  bool _isSearching = false;
  List<KanjiDetailDto> _results = [];
  KanjiDetailDto? _selected;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _scheduleSearch(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 320), () {
      _search(query);
    });
  }

  Future<void> _search(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        _results = [];
        _selected = null;
        _isSearching = false;
      });
      return;
    }

    if (mounted) {
      setState(() => _isSearching = true);
    }

    try {
      final api = ref.read(kitsuneApiProvider);
      final items = await api.searchKanji(trimmed);
      if (!mounted) {
        return;
      }
      setState(() {
        _results = items;
        _selected = items.isNotEmpty ? items.first : null;
        _isSearching = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _isSearching = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Loi tim kanji: $error'),
          backgroundColor: KitsuneColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kanji')),
      body: KitsuneBackdrop(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                children: [
                  const KitsuneHeroCard(
                    title: 'Xem net, nghia va bo thu trong cung mot nhip doc.',
                    subtitle:
                        'Tap trung vao mot ky tu tai mot thoi diem de hieu cach no duoc tao thanh va duoc dung ra sao.',
                    accent: KitsuneColors.secondary,
                  ),
                  const SizedBox(height: AppTheme.space16),
                  KitsuneSearchField(
                    controller: _searchController,
                    focusNode: _searchFocusNode,
                    hintText: 'Tim theo chu, am Han Viet hoac nghia...',
                    onChanged: (value) {
                      setState(() {});
                      _scheduleSearch(value);
                    },
                    onSubmitted: _search,
                    onClear: () {
                      _debounce?.cancel();
                      _searchController.clear();
                      _search('');
                      setState(() {});
                    },
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isSearching
                  ? const KitsuneLoadingFox(message: 'Đang tìm Kanji...', size: 96)
                  : _results.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(16),
                          child: KitsuneEmptyState(
                            icon: Icons.text_fields_rounded,
                            title: 'Tim mot kanji de bat dau',
                            message:
                                'Ban co the tra theo chu, nghia hoac am Han Viet de mo chi tiet ngay.',
                          ),
                        )
                      : LayoutBuilder(
                          builder: (context, constraints) {
                            final isWide = constraints.maxWidth >= 900;
                            if (isWide) {
                              return Row(
                                children: [
                                  SizedBox(
                                    width: 280,
                                    child: _buildResultList(scrollable: true),
                                  ),
                                  const VerticalDivider(width: 1),
                                  Expanded(
                                    child: SingleChildScrollView(
                                      padding: const EdgeInsets.fromLTRB(12, 0, 16, 20),
                                      child: _buildSelectedDetail(),
                                    ),
                                  ),
                                ],
                              );
                            }

                            return ListView(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                              children: [
                                _buildSelectedDetail(),
                                const SizedBox(height: AppTheme.space16),
                                const KitsuneSectionHeader(
                                  title: 'Ket qua tra cuu',
                                  subtitle: 'Cham vao mot muc de thay doi bang chi tiet ben tren.',
                                  accent: KitsuneColors.primary,
                                ),
                                const SizedBox(height: AppTheme.space12),
                                _buildResultList(scrollable: false),
                              ],
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultList({required bool scrollable}) {
    return ListView.builder(
      shrinkWrap: !scrollable,
      physics: scrollable
          ? const AlwaysScrollableScrollPhysics()
          : const NeverScrollableScrollPhysics(),
      padding: scrollable
          ? const EdgeInsets.fromLTRB(16, 0, 12, 20)
          : EdgeInsets.zero,
      itemCount: _results.length,
      itemBuilder: (_, index) {
        final kanji = _results[index];
        final isSelected = _selected?.id == kanji.id;
        final accent =
            KitsuneColors.jlptColors[kanji.jlptLevel] ?? KitsuneColors.primary;

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: KitsuneSurface(
            color:
                isSelected ? KitsuneColors.primarySurface : KitsuneColors.surface,
            onTap: () => setState(() => _selected = kanji),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Center(
                    child: Text(
                      kanji.character,
                      style: AppTheme.japaneseStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: accent,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppTheme.space12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        kanji.amHanViet,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: AppTheme.space4),
                      Text(
                        kanji.meaning,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (kanji.jlptLevel != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: KitsuneColors.jlptSurfaces[kanji.jlptLevel],
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'N${kanji.jlptLevel}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: accent,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSelectedDetail() {
    final kanji = _selected;
    if (kanji == null) {
      return const KitsuneEmptyState(
        icon: Icons.translate_rounded,
        title: 'Chua co ky tu nao duoc chon',
        message: 'Cham vao mot ket qua de mo bang chi tiet va theo doi net viet.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KitsuneSurface(
          padding: const EdgeInsets.all(AppTheme.space20),
          child: Column(
            children: [
              Text(
                kanji.character,
                style: AppTheme.japaneseStyle(
                  fontSize: 88,
                  fontWeight: FontWeight.w800,
                  color: KitsuneColors.onSurface,
                ),
              ),
              const SizedBox(height: AppTheme.space8),
              Text(
                kanji.amHanViet,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: KitsuneColors.secondary,
                ),
              ),
              const SizedBox(height: AppTheme.space8),
              Text(
                kanji.meaning,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: KitsuneColors.onSurfaceVariant,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.space20),
              KanjiStrokeWriter(
                character: kanji.character,
                width: 180,
                height: 180,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTheme.space12),
        KitsuneSurface(
          child: Column(
            children: [
              _detailRow('Nghia', kanji.meaning),
              if (kanji.onyomi?.trim().isNotEmpty == true)
                _detailRow('Am On', kanji.onyomi!),
              if (kanji.kunyomi?.trim().isNotEmpty == true)
                _detailRow('Am Kun', kanji.kunyomi!),
              _detailRow('So net', '${kanji.strokeCount}'),
              if (kanji.jlptLevel != null)
                _detailRow('JLPT', 'N${kanji.jlptLevel}'),
              if (kanji.mnemonic?.trim().isNotEmpty == true)
                _detailRow('Ghi nho', kanji.mnemonic!, isLast: true)
              else
                _detailRow('Am Han Viet', kanji.amHanViet, isLast: true),
            ],
          ),
        ),
        const SizedBox(height: AppTheme.space12),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => Navigator.pushNamed(context, '/kanji/${kanji.id}'),
            icon: const Icon(Icons.open_in_new_rounded),
            label: const Text('Mo man chi tiet'),
          ),
        ),
        if (kanji.radical != null) ...[
          const SizedBox(height: AppTheme.space12),
          KitsuneSurface(
            child: Row(
              children: [
                Container(
                  width: 62,
                  height: 62,
                  decoration: BoxDecoration(
                    color: KitsuneColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Center(
                    child: Text(
                      kanji.radical!.radicalCharacter,
                      style: AppTheme.japaneseStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.onSurface,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppTheme.space12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bo thu',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                      const SizedBox(height: AppTheme.space4),
                      Text(
                        kanji.radical!.radicalName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (kanji.radical!.englishName?.trim().isNotEmpty == true)
                        Text(
                          kanji.radical!.englishName!,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _detailRow(String label, String value, {bool isLast = false}) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 72,
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: KitsuneColors.onSurfaceVariant,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    color: KitsuneColors.onSurface,
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (!isLast) const Divider(height: 1),
      ],
    );
  }
}

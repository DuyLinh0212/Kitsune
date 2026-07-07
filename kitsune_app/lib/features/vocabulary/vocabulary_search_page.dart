import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/providers.dart';

class VocabularySearchPage extends ConsumerStatefulWidget {
  const VocabularySearchPage({super.key});

  @override
  ConsumerState<VocabularySearchPage> createState() =>
      _VocabularySearchPageState();
}

class _VocabularySearchPageState extends ConsumerState<VocabularySearchPage> {
  final _searchController = TextEditingController();
  List<VocabularyDto> _results = [];
  List<VocabularyDto> _randomItems = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadRandom();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRandom() async {
    final items =
        await ref.read(kitsuneApiProvider).getRandomVocabulary(limit: 20);
    if (mounted) {
      setState(() => _randomItems = items);
    }
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _isSearching = false;
      });
      return;
    }

    setState(() => _isSearching = true);
    try {
      final items = await ref
          .read(kitsuneApiProvider)
          .searchVocabulary(query.trim());
      if (mounted) {
        setState(() => _results = items);
      }
    } finally {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayItems = _results.isNotEmpty ? _results : _randomItems;
    final isShowingRandom = _results.isEmpty;

    return Scaffold(
      appBar: AppBar(title: const Text('Từ vựng')),
      body: KitsuneBackdrop(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                children: [
                  const KitsunePassportHeader(
                    eyebrow: 'Vocabulary search',
                    title: 'Tra nhanh, lưu đúng và quay lại ôn sau.',
                    subtitle:
                        'Tìm theo chữ Nhật, romaji hoặc nghĩa tiếng Việt rồi tiếp tục học ngay trong cùng một nhịp.',
                    accent: KitsuneColors.primary,
                  ),
                  const SizedBox(height: AppTheme.space16),
                  KitsuneSearchField(
                    controller: _searchController,
                    hintText: 'Tìm từ vựng...',
                    onChanged: (value) {
                      Future.delayed(const Duration(milliseconds: 320), () {
                        if (value == _searchController.text) {
                          _search(value);
                        }
                      });
                      setState(() {});
                    },
                    onClear: () {
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
                  ? const Center(child: CircularProgressIndicator())
                  : displayItems.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(16),
                          child: KitsuneEmptyState(
                            icon: Icons.menu_book_rounded,
                            title: 'Bắt đầu bằng một từ khóa',
                            message:
                                'Bạn có thể tìm theo tiếng Nhật, cách đọc hoặc nghĩa tiếng Việt.',
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: displayItems.length + 1,
                          itemBuilder: (_, index) {
                            if (index == 0) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: KitsuneSectionHeader(
                                  title: isShowingRandom
                                      ? 'Khám phá ngẫu nhiên'
                                      : 'Kết quả phù hợp',
                                  subtitle: isShowingRandom
                                      ? 'Một vài thẻ để bạn mở rộng vốn từ khi chưa nhập từ khóa.'
                                      : '${displayItems.length} mục khớp với truy vấn hiện tại.',
                                  accent: isShowingRandom
                                      ? KitsuneColors.stamp
                                      : KitsuneColors.secondary,
                                ),
                              );
                            }

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _buildVocabCard(displayItems[index - 1]),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVocabCard(VocabularyDto vocab) {
    return KitsuneSurface(
      onTap: () => Navigator.pushNamed(context, '/vocabulary/${vocab.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vocab.word,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: KitsuneColors.onSurface,
                      ),
                    ),
                    if (vocab.pronunciation != null) ...[
                      const SizedBox(height: AppTheme.space4),
                      Text(
                        vocab.pronunciation!,
                        style: const TextStyle(
                          fontSize: 14,
                          color: KitsuneColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppTheme.space16),
              Container(
                constraints: const BoxConstraints(maxWidth: 160),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: KitsuneColors.secondarySurface,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  vocab.meaning,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: KitsuneColors.secondary,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
          if (vocab.kanjiComponents.isNotEmpty) ...[
            const SizedBox(height: AppTheme.space14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: vocab.kanjiComponents.map((component) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: KitsuneColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    '${component.character} • ${component.amHanViet}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: KitsuneColors.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: AppTheme.space14),
          Row(
            children: [
              Text(
                'Mo chi tiet',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: KitsuneColors.primary,
                    ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.arrow_forward_rounded,
                size: 16,
                color: KitsuneColors.primary,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/grammar.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/features/search/widgets/search_result_card.dart';
import 'package:kitsune_app/providers/providers.dart';

enum SearchCategory { all, vocabulary, kanji, grammar }

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  Timer? _debounce;
  int _requestToken = 0;
  bool _isLoading = true;
  SearchCategory _category = SearchCategory.all;

  List<VocabularyDto> _vocabulary = const [];
  List<KanjiDetailDto> _kanji = const [];
  List<GrammarPoint> _grammar = const [];

  @override
  void initState() {
    super.initState();
    _loadDiscovery();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _loadDiscovery() async {
    final token = ++_requestToken;
    if (mounted) setState(() => _isLoading = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      final data = await Future.wait<dynamic>([
        api.getRandomVocabulary(limit: 8),
        api.getRandomKanji(limit: 8),
        api.searchGrammar(),
      ]);
      if (!mounted || token != _requestToken) return;
      setState(() {
        _vocabulary = data[0] as List<VocabularyDto>;
        _kanji = data[1] as List<KanjiDetailDto>;
        _grammar = (data[2] as List<GrammarPoint>).take(8).toList();
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted || token != _requestToken) return;
      setState(() => _isLoading = false);
      _showError(error);
    }
  }

  void _scheduleSearch(String value) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(
      const Duration(milliseconds: 300),
      () => _performSearch(value),
    );
  }

  Future<void> _performSearch(String rawQuery) async {
    final query = rawQuery.trim();
    if (query.isEmpty) {
      await _loadDiscovery();
      return;
    }

    final token = ++_requestToken;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      final data = await Future.wait<dynamic>([
        api.searchVocabulary(query, limit: 60),
        api.searchKanji(query, limit: 60),
        api.searchGrammar(query: query),
      ]);
      if (!mounted || token != _requestToken) return;
      setState(() {
        _vocabulary = data[0] as List<VocabularyDto>;
        _kanji = data[1] as List<KanjiDetailDto>;
        _grammar = data[2] as List<GrammarPoint>;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted || token != _requestToken) return;
      setState(() => _isLoading = false);
      _showError(error);
    }
  }

  void _clearSearch() {
    _debounce?.cancel();
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() {});
    _loadDiscovery();
  }

  void _showError(Object error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Không thể tìm kiếm: $error'),
        backgroundColor: KitsuneColors.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasQuery = _searchController.text.trim().isNotEmpty;
    return Scaffold(
      body: KitsuneBackdrop(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tra cứu',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Một ô tìm kiếm cho từ vựng, Kanji và ngữ pháp.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    KitsuneSearchField(
                      controller: _searchController,
                      focusNode: _searchFocusNode,
                      hintText: 'Nhập từ, Kanji, cách đọc hoặc mẫu ngữ pháp...',
                      onChanged: _scheduleSearch,
                      onSubmitted: _performSearch,
                      onClear: _clearSearch,
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: SearchCategory.values
                            .map(
                              (category) => Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: _CategoryPill(
                                  label: _categoryLabel(category),
                                  icon: _categoryIcon(category),
                                  isSelected: _category == category,
                                  onTap: () =>
                                      setState(() => _category = category),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: _isLoading
                      ? const Center(
                          key: ValueKey('search-loading'),
                          child: KitsuneLoadingFox(
                            message: 'Đang tìm trong thư viện...',
                            size: 82,
                          ),
                        )
                      : _buildResults(hasQuery),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResults(bool hasQuery) {
    final sections = <Widget>[];
    if (_category == SearchCategory.all ||
        _category == SearchCategory.vocabulary) {
      _appendSection(
        sections,
        title: 'Từ vựng',
        count: _vocabulary.length,
        children: _vocabulary.map(_buildVocabularyCard),
      );
    }
    if (_category == SearchCategory.all || _category == SearchCategory.kanji) {
      _appendSection(
        sections,
        title: 'Kanji',
        count: _kanji.length,
        children: _kanji.map(_buildKanjiCard),
      );
    }
    if (_category == SearchCategory.all ||
        _category == SearchCategory.grammar) {
      _appendSection(
        sections,
        title: 'Ngữ pháp',
        count: _grammar.length,
        children: _grammar.map(_buildGrammarCard),
      );
    }

    if (sections.isEmpty) {
      return KitsuneEmptyState(
        key: ValueKey('empty-$_category-$hasQuery'),
        icon: Icons.search_off_rounded,
        title: 'Chưa tìm thấy kết quả',
        message: 'Thử từ khóa ngắn hơn, cách đọc khác hoặc đổi loại nội dung.',
      );
    }

    return ListView(
      key: ValueKey('results-$_category-$hasQuery'),
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
      children: sections,
    );
  }

  void _appendSection(
    List<Widget> output, {
    required String title,
    required int count,
    required Iterable<Widget> children,
  }) {
    if (count == 0) return;
    output
      ..add(
        Padding(
          padding: const EdgeInsets.fromLTRB(2, 10, 2, 9),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                '$count kết quả',
                style: const TextStyle(
                  color: KitsuneColors.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      )
      ..addAll(children);
  }

  Widget _buildVocabularyCard(VocabularyDto vocab) {
    return SearchResultCard(
      kind: 'Từ vựng',
      title: vocab.word,
      subtitle: vocab.meaning,
      accent: KitsuneColors.primary,
      icon: Icons.menu_book_rounded,
      isJapaneseTitle: true,
      meta: [
        if (vocab.pronunciation?.trim().isNotEmpty == true)
          vocab.pronunciation!,
        ...vocab.kanjiComponents
            .take(2)
            .map((item) => '${item.character} · ${item.amHanViet}'),
      ],
      onTap: () => Navigator.pushNamed(context, '/vocabulary/${vocab.id}'),
    );
  }

  Widget _buildKanjiCard(KanjiDetailDto kanji) {
    return SearchResultCard(
      kind: 'Kanji',
      title: '${kanji.character}  ${kanji.amHanViet}',
      subtitle: kanji.meaning,
      accent:
          KitsuneColors.jlptColors[kanji.jlptLevel] ?? KitsuneColors.secondary,
      icon: Icons.grid_view_rounded,
      isJapaneseTitle: true,
      meta: [
        '${kanji.strokeCount} nét',
        if (kanji.onyomi?.trim().isNotEmpty == true) 'On: ${kanji.onyomi}',
        if (kanji.kunyomi?.trim().isNotEmpty == true) 'Kun: ${kanji.kunyomi}',
      ],
      onTap: () => Navigator.pushNamed(context, '/kanji/${kanji.id}'),
    );
  }

  Widget _buildGrammarCard(GrammarPoint grammar) {
    return SearchResultCard(
      kind: 'Ngữ pháp',
      title: grammar.title,
      subtitle: grammar.meaning,
      accent: KitsuneColors.stamp,
      icon: Icons.account_tree_rounded,
      isJapaneseTitle: true,
      meta: [
        if (grammar.jlptLevel != null) 'JLPT N${grammar.jlptLevel}',
        if (grammar.structure?.trim().isNotEmpty == true) grammar.structure!,
      ],
      onTap: () => _openGrammar(grammar),
    );
  }

  Future<void> _openGrammar(GrammarPoint grammar) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return DraggableScrollableSheet(
          initialChildSize: .72,
          minChildSize: .45,
          maxChildSize: .92,
          builder: (context, controller) {
            return Material(
              color: KitsuneColors.surface,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(28)),
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.all(AppTheme.space20),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          grammar.title,
                          style: AppTheme.japaneseStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(sheetContext),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                  Text(
                    grammar.meaning,
                    style: const TextStyle(
                      color: KitsuneColors.stamp,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (grammar.structure?.trim().isNotEmpty == true) ...[
                    const SizedBox(height: 14),
                    KitsuneSurface(
                      color: KitsuneColors.stampSurface,
                      child: Text(grammar.structure!,
                          style: Theme.of(context).textTheme.titleMedium),
                    ),
                  ],
                  if (grammar.explanation?.trim().isNotEmpty == true) ...[
                    const SizedBox(height: 16),
                    Text(grammar.explanation!,
                        style: const TextStyle(height: 1.6)),
                  ],
                  if (grammar.examples.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text('Ví dụ',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    for (final example in grammar.examples)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: KitsuneSurface(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                example.japaneseText,
                                style: AppTheme.japaneseStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (example.reading?.trim().isNotEmpty == true)
                                Text(example.reading!,
                                    style: const TextStyle(
                                        color: KitsuneColors.primary)),
                              if (example.meaningVi?.trim().isNotEmpty == true)
                                Text(example.meaningVi!,
                                    style:
                                        Theme.of(context).textTheme.bodySmall),
                            ],
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  String _categoryLabel(SearchCategory category) {
    switch (category) {
      case SearchCategory.all:
        return 'Tất cả';
      case SearchCategory.vocabulary:
        return 'Từ vựng';
      case SearchCategory.kanji:
        return 'Kanji';
      case SearchCategory.grammar:
        return 'Ngữ pháp';
    }
  }

  IconData _categoryIcon(SearchCategory category) {
    switch (category) {
      case SearchCategory.all:
        return Icons.auto_awesome_rounded;
      case SearchCategory.vocabulary:
        return Icons.menu_book_rounded;
      case SearchCategory.kanji:
        return Icons.grid_view_rounded;
      case SearchCategory.grammar:
        return Icons.account_tree_rounded;
    }
  }
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? KitsuneColors.primary : KitsuneColors.surface,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: isSelected
                  ? KitsuneColors.primary
                  : KitsuneColors.surfaceBorder,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? Colors.white : KitsuneColors.onSurface,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : KitsuneColors.onSurface,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

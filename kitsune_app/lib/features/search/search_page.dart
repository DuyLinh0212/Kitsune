import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/providers.dart';

enum SearchCategory {
  vocabulary,
  kanji,
}

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  static const int _pageSize = 50;

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final ScrollController _scrollController = ScrollController();

  Timer? _debounce;
  bool _isLoading = false;
  bool _isLoadingMore = false;
  int _requestToken = 0;
  SearchCategory _category = SearchCategory.vocabulary;

  List<VocabularyDto> _vocabularyResults = const [];
  List<KanjiDetailDto> _kanjiResults = const [];
  List<VocabularyDto> _vocabularyRandom = const [];
  List<KanjiDetailDto> _kanjiRandom = const [];

  int _vocabularyFetchSize = _pageSize;
  int _kanjiFetchSize = _pageSize;
  bool _hasMoreVocabulary = false;
  bool _hasMoreKanji = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_handleScroll);
    _loadRandomContent();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scrollController.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _handleScroll() {
    if (!_scrollController.hasClients) {
      return;
    }

    if (_scrollController.position.pixels <
        _scrollController.position.maxScrollExtent - 240) {
      return;
    }

    if (_isLoading || _isLoadingMore || !_isShowingSearchState) {
      return;
    }

    if (_category == SearchCategory.vocabulary && _hasMoreVocabulary) {
      _loadMore();
    } else if (_category == SearchCategory.kanji && _hasMoreKanji) {
      _loadMore();
    }
  }

  Future<void> _loadRandomContent() async {
    try {
      final api = ref.read(kitsuneApiProvider);
      final results = await Future.wait([
        api.getRandomVocabulary(limit: 10),
        api.getRandomKanji(limit: 10),
      ]);

      if (!mounted) {
        return;
      }

      setState(() {
        _vocabularyRandom = results[0] as List<VocabularyDto>;
        _kanjiRandom = results[1] as List<KanjiDetailDto>;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _vocabularyRandom = const [];
        _kanjiRandom = const [];
      });
    }
  }

  void _scheduleSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 320), () {
      _performSearch(value, reset: true);
    });
  }

  Future<void> _performSearch(
    String rawQuery, {
    required bool reset,
  }) async {
    final query = rawQuery.trim();
    final token = ++_requestToken;

    if (query.isEmpty) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
        _vocabularyResults = const [];
        _kanjiResults = const [];
        _hasMoreVocabulary = false;
        _hasMoreKanji = false;
        _vocabularyFetchSize = _pageSize;
        _kanjiFetchSize = _pageSize;
      });
      return;
    }

    if (reset) {
      setState(() {
        _isLoading = true;
        _isLoadingMore = false;
        if (_category == SearchCategory.vocabulary) {
          _vocabularyFetchSize = _pageSize;
        } else {
          _kanjiFetchSize = _pageSize;
        }
      });
    } else {
      setState(() => _isLoadingMore = true);
    }

    try {
      if (_category == SearchCategory.vocabulary) {
        final fetchSize = _vocabularyFetchSize;
        final items = await ref
            .read(kitsuneApiProvider)
            .searchVocabulary(query, limit: fetchSize);

        if (!mounted || token != _requestToken) {
          return;
        }

        setState(() {
          _vocabularyResults = items;
          _hasMoreVocabulary = items.length >= fetchSize;
          _isLoading = false;
          _isLoadingMore = false;
        });
        return;
      }

      final fetchSize = _kanjiFetchSize;
      final items = await ref
          .read(kitsuneApiProvider)
          .searchKanji(query, limit: fetchSize);

      if (!mounted || token != _requestToken) {
        return;
      }

      setState(() {
        _kanjiResults = items;
        _hasMoreKanji = items.length >= fetchSize;
        _isLoading = false;
        _isLoadingMore = false;
      });
    } catch (error) {
      if (!mounted || token != _requestToken) {
        return;
      }

      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Search failed: $error'),
          backgroundColor: KitsuneColors.error,
        ),
      );
    }
  }

  Future<void> _loadMore() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      return;
    }

    setState(() {
      if (_category == SearchCategory.vocabulary) {
        _vocabularyFetchSize += _pageSize;
      } else {
        _kanjiFetchSize += _pageSize;
      }
    });

    await _performSearch(query, reset: false);
  }

  void _switchCategory(SearchCategory category) {
    if (_category == category) {
      return;
    }

    setState(() {
      _category = category;
      _isLoading = false;
      _isLoadingMore = false;
    });

    if (_searchController.text.trim().isNotEmpty) {
      _performSearch(_searchController.text, reset: true);
    }
  }

  bool get _isShowingSearchState => _searchController.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final isVocabulary = _category == SearchCategory.vocabulary;

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
                      'Search',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: AppTheme.space6),
                    Text(
                      'Tra nhanh tu vung va kanji trong mot man hinh giong mot tu dien hoc tap.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: KitsuneColors.onSurfaceVariant,
                            height: 1.45,
                          ),
                    ),
                    const SizedBox(height: AppTheme.space16),
                    _MaziiSearchBar(
                      controller: _searchController,
                      focusNode: _searchFocusNode,
                      hintText: isVocabulary
                          ? 'Tim tu, cach doc hoac nghia...'
                          : 'Tim kanji, am Han Viet, onyomi, kunyomi...',
                      onChanged: (value) {
                        setState(() {});
                        _scheduleSearch(value);
                      },
                      onSubmitted: (value) => _performSearch(value, reset: true),
                      onClear: () {
                        _debounce?.cancel();
                        _searchController.clear();
                        _performSearch('', reset: true);
                        setState(() {});
                      },
                    ),
                    const SizedBox(height: AppTheme.space14),
                    Row(
                      children: [
                        Expanded(
                          child: _CategoryPill(
                            label: 'Vocabulary',
                            icon: Icons.menu_book_rounded,
                            isSelected: isVocabulary,
                            onTap: () => _switchCategory(SearchCategory.vocabulary),
                          ),
                        ),
                        const SizedBox(width: AppTheme.space10),
                        Expanded(
                          child: _CategoryPill(
                            label: 'Kanji',
                            icon: Icons.grid_view_rounded,
                            isSelected: !isVocabulary,
                            onTap: () => _switchCategory(SearchCategory.kanji),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.space18),
                  ],
                ),
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  child: _isLoading
                      ? const Center(
                          key: ValueKey('loading'),
                          child: CircularProgressIndicator(),
                        )
                      : _isShowingSearchState
                          ? KeyedSubtree(
                              key: ValueKey('results-$isVocabulary'),
                              child: isVocabulary
                                  ? _buildVocabularyResultsList()
                                  : _buildKanjiResultsList(),
                            )
                          : KeyedSubtree(
                              key: ValueKey('discover-$isVocabulary'),
                              child: isVocabulary
                                  ? _buildVocabularyDiscoveryList()
                                  : _buildKanjiDiscoveryList(),
                            ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVocabularyDiscoveryList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
      itemCount: _vocabularyRandom.length + 1,
      itemBuilder: (_, index) {
        if (index == 0) {
          return const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: KitsuneSectionHeader(
              title: 'Vocabulary picks',
              subtitle: 'Mo app la co the tra tu ngay, hoac xem nhanh vai muc de mo rong von tu.',
              accent: KitsuneColors.primary,
            ),
          );
        }

        return _buildVocabularyCard(_vocabularyRandom[index - 1]);
      },
    );
  }

  Widget _buildKanjiDiscoveryList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
      itemCount: _kanjiRandom.length + 1,
      itemBuilder: (_, index) {
        if (index == 0) {
          return const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: KitsuneSectionHeader(
              title: 'Kanji picks',
              subtitle: 'Tap vao bat ky chu nao de mo chi tiet, xem bo thu va net viet ngay.',
              accent: KitsuneColors.secondary,
            ),
          );
        }

        return _buildKanjiCard(_kanjiRandom[index - 1]);
      },
    );
  }

  Widget _buildVocabularyResultsList() {
    if (_vocabularyResults.isEmpty) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 28),
        child: KitsuneEmptyState(
          icon: Icons.search_off_rounded,
          title: 'Khong tim thay tu vung',
          message: 'Thu doi cach viet, romaji hoac nghia de mo rong ket qua.',
        ),
      );
    }

    final extraFooter = _hasMoreVocabulary || _isLoadingMore ? 1 : 0;

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
      itemCount: _vocabularyResults.length + 1 + extraFooter,
      itemBuilder: (_, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: KitsuneSectionHeader(
              title: 'Vocabulary results',
              subtitle:
                  '${_vocabularyResults.length} muc da nap. Cuon xuong de tai them neu con ket qua.',
              accent: KitsuneColors.primary,
            ),
          );
        }

        final dataIndex = index - 1;
        if (dataIndex < _vocabularyResults.length) {
          return _buildVocabularyCard(_vocabularyResults[dataIndex]);
        }

        return _LoadMoreFooter(
          isLoading: _isLoadingMore,
          hasMore: _hasMoreVocabulary,
          onTap: _loadMore,
        );
      },
    );
  }

  Widget _buildKanjiResultsList() {
    if (_kanjiResults.isEmpty) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 28),
        child: KitsuneEmptyState(
          icon: Icons.search_off_rounded,
          title: 'Khong tim thay kanji',
          message: 'Thu lai bang chu kanji, nghia, am Han Viet hoac cach doc.',
        ),
      );
    }

    final extraFooter = _hasMoreKanji || _isLoadingMore ? 1 : 0;

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
      itemCount: _kanjiResults.length + 1 + extraFooter,
      itemBuilder: (_, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: KitsuneSectionHeader(
              title: 'Kanji results',
              subtitle:
                  '${_kanjiResults.length} muc da nap. Cuon xuong de tai them neu con ket qua.',
              accent: KitsuneColors.secondary,
            ),
          );
        }

        final dataIndex = index - 1;
        if (dataIndex < _kanjiResults.length) {
          return _buildKanjiCard(_kanjiResults[dataIndex]);
        }

        return _LoadMoreFooter(
          isLoading: _isLoadingMore,
          hasMore: _hasMoreKanji,
          onTap: _loadMore,
        );
      },
    );
  }

  Widget _buildVocabularyCard(VocabularyDto vocab) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: KitsuneSurface(
        onTap: () => Navigator.pushNamed(context, '/vocabulary/${vocab.id}'),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
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
                          fontSize: 27,
                          fontWeight: FontWeight.w800,
                          color: KitsuneColors.onSurface,
                        ),
                      ),
                      if ((vocab.pronunciation ?? '').trim().isNotEmpty) ...[
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
                  constraints: const BoxConstraints(maxWidth: 150),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: KitsuneColors.primarySurface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    vocab.meaning,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: KitsuneColors.primaryDark,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
            if (vocab.kanjiComponents.isNotEmpty) ...[
              const SizedBox(height: AppTheme.space12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: vocab.kanjiComponents.take(4).map((component) {
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
                      '${component.character} - ${component.amHanViet}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.onSurface,
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
                  'Open detail',
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
      ),
    );
  }

  Widget _buildKanjiCard(KanjiDetailDto kanji) {
    final accent =
        KitsuneColors.jlptColors[kanji.jlptLevel] ?? KitsuneColors.secondary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: KitsuneSurface(
        onTap: () => Navigator.pushNamed(context, '/kanji/${kanji.id}'),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  kanji.character,
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    color: accent,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppTheme.space14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          kanji.amHanViet,
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    color: KitsuneColors.onSurface,
                                  ),
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
                  const SizedBox(height: AppTheme.space6),
                  Text(
                    kanji.meaning,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: KitsuneColors.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: AppTheme.space10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _MiniTag(
                        label: '${kanji.strokeCount} strokes',
                        color: accent,
                      ),
                      if ((kanji.onyomi ?? '').trim().isNotEmpty)
                        _MiniTag(
                          label: 'On: ${kanji.onyomi!}',
                          color: KitsuneColors.secondary,
                        ),
                      if ((kanji.kunyomi ?? '').trim().isNotEmpty)
                        _MiniTag(
                          label: 'Kun: ${kanji.kunyomi!}',
                          color: KitsuneColors.primary,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MaziiSearchBar extends StatelessWidget {
  const _MaziiSearchBar({
    required this.controller,
    required this.focusNode,
    required this.hintText,
    required this.onChanged,
    required this.onSubmitted,
    required this.onClear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String hintText;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: KitsuneColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: KitsuneColors.surfaceBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10152238),
            blurRadius: 18,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          const SizedBox(width: 14),
          const Icon(Icons.search_rounded, color: KitsuneColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              onChanged: onChanged,
              onSubmitted: onSubmitted,
              decoration: InputDecoration(
                hintText: hintText,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                fillColor: Colors.transparent,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          if (controller.text.isNotEmpty)
            IconButton(
              onPressed: onClear,
              icon: const Icon(Icons.close_rounded),
            )
          else
            const SizedBox(width: 12),
        ],
      ),
    );
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
    final background = isSelected
        ? KitsuneColors.onSurface
        : KitsuneColors.surface.withValues(alpha: 0.92);
    final foreground =
        isSelected ? Colors.white : KitsuneColors.onSurfaceVariant;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 14,
          ),
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isSelected
                  ? KitsuneColors.onSurface
                  : KitsuneColors.surfaceBorder,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: foreground),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: foreground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniTag extends StatelessWidget {
  const _MiniTag({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _LoadMoreFooter extends StatelessWidget {
  const _LoadMoreFooter({
    required this.isLoading,
    required this.hasMore,
    required this.onTap,
  });

  final bool isLoading;
  final bool hasMore;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (!hasMore) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 20),
      child: OutlinedButton(
        onPressed: onTap,
        child: const Text('Tai them'),
      ),
    );
  }
}

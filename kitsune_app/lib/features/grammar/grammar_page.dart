import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/grammar.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/grammar_provider.dart';

class GrammarPage extends ConsumerStatefulWidget {
  const GrammarPage({super.key});

  @override
  ConsumerState<GrammarPage> createState() => _GrammarPageState();
}

class _GrammarPageState extends ConsumerState<GrammarPage> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String _query = '';
  int? _jlptLevel;
  GrammarPoint? _selected;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _search(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _query = value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final filter = GrammarFilter(query: _query, jlptLevel: _jlptLevel);
    final grammarAsync = ref.watch(grammarPointsProvider(filter));

    return Scaffold(
      appBar: AppBar(title: const Text('Học ngữ pháp')),
      body: KitsuneBackdrop(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.space16),
          child: Column(
            children: [
              KitsuneSearchField(
                controller: _searchController,
                hintText: 'Tìm mẫu ngữ pháp hoặc nghĩa...',
                onChanged: _search,
                onClear: () {
                  _searchController.clear();
                  _search('');
                },
              ),
              const SizedBox(height: AppTheme.space12),
              SizedBox(
                height: 38,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [null, 5, 4, 3, 2, 1].map((level) {
                    final selected = _jlptLevel == level;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(level == null ? 'Tất cả' : 'N$level'),
                        selected: selected,
                        onSelected: (_) => setState(() => _jlptLevel = level),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: AppTheme.space12),
              Expanded(
                child: grammarAsync.when(
                  loading: () => const KitsuneLoadingFox(message: 'Đang tải ngữ pháp...'),
                  error: (_, __) => KitsuneEmptyState(
                    icon: Icons.error_outline_rounded,
                    title: 'Không thể tải ngữ pháp',
                    message: 'Kiểm tra kết nối rồi thử lại.',
                    action: ElevatedButton(
                      onPressed: () => ref.invalidate(grammarPointsProvider(filter)),
                      child: const Text('Thử lại'),
                    ),
                  ),
                  data: (items) {
                    if (items.isEmpty) {
                      return const KitsuneEmptyState(
                        icon: Icons.menu_book_outlined,
                        title: 'Chưa tìm thấy ngữ pháp',
                        message: 'Hãy thử mẫu khác hoặc đổi cấp độ JLPT.',
                      );
                    }
                    return ListView.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = items[index];
                        return _GrammarCard(
                          item: item,
                          onTap: () => setState(() => _selected = item),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      bottomSheet: _selected == null
          ? null
          : _GrammarDetailSheet(
              grammar: _selected!,
              onClose: () => setState(() => _selected = null),
            ),
    );
  }
}

class _GrammarCard extends StatelessWidget {
  const _GrammarCard({required this.item, required this.onTap});

  final GrammarPoint item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: KitsuneSurface(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(item.meaning, style: const TextStyle(color: KitsuneColors.onSurfaceVariant)),
                ],
              ),
            ),
            if (item.jlptLevel != null)
              Chip(label: Text('N${item.jlptLevel}')),
          ],
        ),
      ),
    );
  }
}

class _GrammarDetailSheet extends StatelessWidget {
  const _GrammarDetailSheet({required this.grammar, required this.onClose});

  final GrammarPoint grammar;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 16,
      color: KitsuneColors.surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * .72,
          child: ListView(
            padding: const EdgeInsets.all(AppTheme.space20),
            children: [
              Row(
                children: [
                  Expanded(child: Text(grammar.title, style: Theme.of(context).textTheme.headlineSmall)),
                  IconButton(onPressed: onClose, icon: const Icon(Icons.close_rounded)),
                ],
              ),
              Text(grammar.meaning, style: const TextStyle(color: KitsuneColors.primary, fontWeight: FontWeight.w700)),
              if (grammar.structure != null) ...[
                const SizedBox(height: 16),
                Text(grammar.structure!, style: Theme.of(context).textTheme.titleMedium),
              ],
              if (grammar.explanation != null) ...[
                const SizedBox(height: 16),
                Text(grammar.explanation!, style: const TextStyle(height: 1.6)),
              ],
              const SizedBox(height: 20),
              Text('Ví dụ', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...grammar.examples.map((example) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: KitsuneSurface(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(example.japaneseText, style: Theme.of(context).textTheme.titleMedium),
                          if (example.reading != null) Text(example.reading!, style: const TextStyle(color: KitsuneColors.primary)),
                          if (example.meaningVi != null) Text(example.meaningVi!, style: const TextStyle(color: KitsuneColors.onSurfaceVariant)),
                        ],
                      ),
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/exam_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class ExamListPage extends ConsumerStatefulWidget {
  const ExamListPage({super.key});

  @override
  ConsumerState<ExamListPage> createState() => _ExamListPageState();
}

class _ExamListPageState extends ConsumerState<ExamListPage> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String _query = '';
  int? _jlptLevel;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final filter = ExamFilter(query: _query, jlptLevel: _jlptLevel);
    final examsAsync = ref.watch(publicExamsProvider(filter));
    return Scaffold(
      appBar: AppBar(title: Text(strings.examsListTitle)),
      body: KitsuneBackdrop(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.space16),
          child: Column(
            children: [
              KitsuneSearchField(
                controller: _searchController,
                hintText: strings.searchExamsHint,
                onChanged: (value) {
                  _debounce?.cancel();
                  _debounce = Timer(const Duration(milliseconds: 300), () {
                    if (mounted) setState(() => _query = value);
                  });
                },
                onClear: () {
                  _searchController.clear();
                  setState(() => _query = '');
                },
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 38,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [null, 5, 4, 3, 2, 1].map((level) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(level == null ? strings.all : 'N$level'),
                      selected: _jlptLevel == level,
                      onSelected: (_) => setState(() => _jlptLevel = level),
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: examsAsync.when(
                  loading: () => KitsuneLoadingFox(message: strings.loadingExams),
                  error: (_, __) => KitsuneEmptyState(
                    icon: Icons.error_outline_rounded,
                    title: strings.cannotLoadExams,
                    message: strings.checkConnectionRetry,
                    action: ElevatedButton(
                      onPressed: () => ref.invalidate(publicExamsProvider(filter)),
                      child: Text(strings.retry),
                    ),
                  ),
                  data: (exams) => exams.isEmpty
                      ? KitsuneEmptyState(
                          icon: Icons.assignment_outlined,
                          title: strings.examNoExamsTitle,
                          message: strings.examNoExamsSubtitle,
                        )
                      : ListView.separated(
                          itemCount: exams.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final exam = exams[index];
                            final minutes = exam.timeLimitInSeconds == null
                                ? null
                                : (exam.timeLimitInSeconds! / 60).ceil();
                            return InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: () => Navigator.pushNamed(context, '/exams/${exam.id}'),
                              child: KitsuneSurface(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(child: Text(exam.title, style: Theme.of(context).textTheme.titleMedium)),
                                        if (exam.jlptLevel != null) Chip(label: Text('N${exam.jlptLevel}')),
                                      ],
                                    ),
                                    if (exam.description != null) ...[
                                      const SizedBox(height: 5),
                                      Text(exam.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: KitsuneColors.onSurfaceVariant)),
                                    ],
                                    const SizedBox(height: 10),
                                    Text(
                                      strings.formatExamMeta(exam.questionCount, minutes),
                                      style: const TextStyle(color: KitsuneColors.onSurfaceMuted),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

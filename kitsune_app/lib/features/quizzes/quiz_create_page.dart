import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/quiz_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class QuizCreatePage extends ConsumerStatefulWidget {
  const QuizCreatePage({super.key});

  @override
  ConsumerState<QuizCreatePage> createState() => _QuizCreatePageState();
}

class _QuizCreatePageState extends ConsumerState<QuizCreatePage> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _timeLimitController = TextEditingController();
  final _searchController = TextEditingController();
  int _step = 0;
  final Set<int> _selectedVocabIds = {};
  final Set<int> _selectedKanjiIds = {};
  final Set<String> _selectedModes = {};
  List<FolderDto> _folders = [];
  List<dynamic> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadFolders();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _timeLimitController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFolders() async {
    try {
      final api = ref.read(kitsuneApiProvider);
      final folders = await api.getFolders();
      if (mounted) {
        setState(() => _folders = folders);
      }
    } catch (_) {}
  }

  Future<void> _searchVocab(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isSearching = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      final results = await api.searchVocabulary(query.trim());
      if (mounted) {
        setState(() => _searchResults = results);
      }
    } finally {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  Future<void> _toggleFolderImport(FolderDto folder) async {
    final api = ref.read(kitsuneApiProvider);
    final folderItems = await api.getVocabulariesByFolder(folder.id);

    if (!mounted) {
      return;
    }

    setState(() {
      final ids = folderItems.map((item) => item.id).toSet();
      final containsAll = ids.every(_selectedVocabIds.contains);
      if (containsAll) {
        _selectedVocabIds.removeAll(ids);
      } else {
        _selectedVocabIds.addAll(ids);
      }
    });
  }

  Future<void> _createQuiz() async {
    if (_titleController.text.trim().isEmpty || _selectedModes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập tiêu đề và chọn ít nhất một chế độ'),
        ),
      );
      return;
    }

    try {
      final api = ref.read(kitsuneApiProvider);
      await api.createQuiz(
        title: _titleController.text.trim(),
        description: _descController.text.trim().isEmpty
            ? null
            : _descController.text.trim(),
        timeLimit: int.tryParse(_timeLimitController.text),
        modes: _selectedModes.toList(),
        vocabIds: _selectedVocabIds.toList(),
        kanjiIds: _selectedKanjiIds.toList(),
      );
      if (mounted) {
        ref.invalidate(myQuizzesProvider);
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: $error'),
            backgroundColor: KitsuneColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final steps = ['Thông tin', 'Nội dung', 'Chế độ'];

    return Scaffold(
      appBar: AppBar(title: const Text('Tạo quiz mới')),
      body: KitsuneBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            KitsuneHeroCard(
              title: 'Dựng một bộ quiz vừa sức và đúng mục tiêu học.',
              subtitle:
                  'Chọn nội dung, chọn chế độ hỏi và đóng gói thành một quiz có thể chơi lại nhiều lần.',
              accent: KitsuneColors.primary,
              trailing: Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: KitsuneColors.stampSurface,
                  borderRadius: BorderRadius.circular(26),
                ),
                child: Center(
                  child: Text(
                    '${_selectedVocabIds.length + _selectedKanjiIds.length}',
                    style: AppTheme.numeralStyle(
                      fontSize: 28,
                      color: KitsuneColors.primary,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppTheme.space20),
            Row(
              children: List.generate(steps.length, (index) {
                final isActive = _step == index;
                final isDone = _step > index;

                return Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(right: index == steps.length - 1 ? 0 : 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isActive
                            ? KitsuneColors.primarySurface
                            : KitsuneColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isActive || isDone
                              ? KitsuneColors.primary
                              : KitsuneColors.surfaceBorder,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${index + 1}',
                            style: AppTheme.numeralStyle(
                              fontSize: 16,
                              color: isDone || isActive
                                  ? KitsuneColors.primary
                                  : KitsuneColors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            steps[index],
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDone || isActive
                                  ? KitsuneColors.primary
                                  : KitsuneColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: AppTheme.space20),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: _buildStepContent(context),
            ),
            const SizedBox(height: AppTheme.space20),
            Row(
              children: [
                if (_step > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _step--),
                      child: const Text('Quay lại'),
                    ),
                  ),
                if (_step > 0) const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _step == 2
                        ? _createQuiz
                        : () => setState(() => _step++),
                    child: Text(_step == 2 ? 'Tạo quiz' : 'Tiếp theo'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent(BuildContext context) {
    switch (_step) {
      case 0:
        return KitsuneSurface(
          key: const ValueKey('step-0'),
          child: Column(
            children: [
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Tiêu đề quiz *',
                  prefixIcon: Icon(Icons.title_rounded),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _descController,
                decoration: const InputDecoration(
                  labelText: 'Mô tả',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _timeLimitController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Giới hạn thời gian (giây)',
                  prefixIcon: Icon(Icons.timer_outlined),
                  hintText: 'Để trống nếu không giới hạn',
                ),
              ),
            ],
          ),
        );
      case 1:
        return KitsuneSurface(
          key: const ValueKey('step-1'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const KitsuneSectionHeader(
                title: 'Chọn nội dung',
                subtitle:
                    'Bạn có thể import nhanh từ thư mục hoặc chọn tay từng mục từ ô tìm kiếm.',
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _folders.map((folder) {
                  final isImported = folder.vocabCount > 0;
                  return FilterChip(
                    label: Text('${folder.name} (${folder.vocabCount})'),
                    selected: isImported &&
                        _selectedVocabIds.isNotEmpty,
                    onSelected: (_) => _toggleFolderImport(folder),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              KitsuneSearchField(
                controller: _searchController,
                hintText: 'Tìm từ vựng để thêm...',
                onChanged: (value) {
                  _searchVocab(value);
                  setState(() {});
                },
                onClear: () {
                  _searchController.clear();
                  _searchVocab('');
                  setState(() {});
                },
              ),
              const SizedBox(height: 16),
              if (_isSearching)
                const Center(child: CircularProgressIndicator())
              else if (_searchResults.isEmpty)
                Text(
                  'Chưa có kết quả. Hãy gõ một từ khóa để bắt đầu thêm nội dung vào quiz.',
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                ..._searchResults.map((item) {
                  final isSelected = _selectedVocabIds.contains(item.id);
                  return CheckboxListTile(
                    value: isSelected,
                    activeColor: KitsuneColors.primary,
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.word ?? item.character ?? ''),
                    subtitle: Text(item.meaning),
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          _selectedVocabIds.add(item.id);
                        } else {
                          _selectedVocabIds.remove(item.id);
                        }
                      });
                    },
                  );
                }),
            ],
          ),
        );
      default:
        return KitsuneSurface(
          key: const ValueKey('step-2'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const KitsuneSectionHeader(
                title: 'Chọn chế độ hỏi',
                subtitle:
                    'Mỗi chế độ tạo ra một kiểu câu hỏi khác nhau. Chọn ít nhất một để hoàn tất quiz.',
              ),
              const SizedBox(height: 16),
              ...QuizMode.vocabModes.map(_modeTile),
              const SizedBox(height: 12),
              ...QuizMode.kanjiModes.map(_modeTile),
            ],
          ),
        );
    }
  }

  Widget _modeTile(QuizMode mode) {
    final isSelected = _selectedModes.contains(mode.code);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: KitsuneSurface(
        color: isSelected ? KitsuneColors.primarySurface : KitsuneColors.surface,
        onTap: () {
          setState(() {
            if (isSelected) {
              _selectedModes.remove(mode.code);
            } else {
              _selectedModes.add(mode.code);
            }
          });
        },
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: isSelected
                  ? KitsuneColors.primary
                  : KitsuneColors.onSurfaceVariant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                mode.code,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: KitsuneColors.onSurface,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

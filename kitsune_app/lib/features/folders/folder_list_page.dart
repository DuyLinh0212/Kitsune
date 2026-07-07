import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/folder_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class FolderListPage extends ConsumerWidget {
  const FolderListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final foldersAsync = ref.watch(foldersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Thư mục')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tạo thư mục'),
      ),
      body: KitsuneBackdrop(
        child: foldersAsync.when(
          data: (folders) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              children: [
                KitsunePassportHeader(
                  eyebrow: 'Folders',
                  title: '${folders.length} ngăn học đang chờ được mở lại.',
                  subtitle:
                      'Sắp xếp từ vựng theo chủ đề, theo bài hoặc theo mục tiêu cá nhân để việc ôn tập rõ ràng hơn.',
                  accent: KitsuneColors.primary,
                  trailing: Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: KitsuneColors.primarySurface,
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: const Icon(
                      Icons.folder_copy_rounded,
                      size: 42,
                      color: KitsuneColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppTheme.space20),
                if (folders.isEmpty)
                  KitsuneEmptyState(
                    icon: Icons.folder_open_rounded,
                    title: 'Chưa có thư mục nào',
                    message:
                        'Tạo thư mục đầu tiên để gom từ vựng theo chủ đề và lên nhịp ôn tập riêng.',
                    action: SizedBox(
                      width: 200,
                      child: ElevatedButton.icon(
                        onPressed: () => _showCreateDialog(context, ref),
                        icon: const Icon(Icons.create_new_folder_rounded),
                        label: const Text('Tạo thư mục'),
                      ),
                    ),
                  )
                else
                  ...folders.asMap().entries.map((entry) {
                    final index = entry.key;
                    final folder = entry.value;
                    final color = KitsuneColors
                        .folderColors[index % KitsuneColors.folderColors.length];

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: KitsuneSurface(
                        onTap: () =>
                            Navigator.pushNamed(context, '/folders/${folder.id}'),
                        child: Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: Icon(Icons.folder_rounded, color: color),
                            ),
                            const SizedBox(width: AppTheme.space12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    folder.name,
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: AppTheme.space4),
                                  Text(
                                    folder.description?.trim().isNotEmpty == true
                                        ? folder.description!
                                        : '${folder.vocabCount} từ vựng trong thư mục này',
                                    style: Theme.of(context).textTheme.bodySmall,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            PopupMenuButton<String>(
                              onSelected: (value) {
                                if (value == 'edit') {
                                  _showEditDialog(context, ref, folder);
                                } else if (value == 'delete') {
                                  _confirmDelete(context, ref, folder);
                                }
                              },
                              itemBuilder: (_) => const [
                                PopupMenuItem(
                                  value: 'edit',
                                  child: Text('Sửa thư mục'),
                                ),
                                PopupMenuItem(
                                  value: 'delete',
                                  child: Text('Xóa thư mục'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('Lỗi: $error')),
        ),
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final nameController = TextEditingController();
    final descController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Tạo thư mục mới'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Tên thư mục *',
                  prefixIcon: Icon(Icons.folder_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                decoration: const InputDecoration(
                  labelText: 'Mô tả',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(minimumSize: Size.zero),
              onPressed: () async {
                if (nameController.text.trim().isEmpty) {
                  return;
                }

                try {
                  final api = ref.read(kitsuneApiProvider);
                  await api.createFolder(
                    CreateFolderDto(
                      name: nameController.text.trim(),
                      description: descController.text.trim().isEmpty
                          ? null
                          : descController.text.trim(),
                    ),
                  );
                  ref.invalidate(foldersProvider);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                } catch (error) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('$error'),
                        backgroundColor: KitsuneColors.error,
                      ),
                    );
                  }
                }
              },
              child: const Text('Tạo'),
            ),
          ],
        );
      },
    );
  }

  void _showEditDialog(BuildContext context, WidgetRef ref, FolderDto folder) {
    final nameController = TextEditingController(text: folder.name);
    final descController = TextEditingController(text: folder.description ?? '');

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Sửa thư mục'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Tên thư mục',
                  prefixIcon: Icon(Icons.folder_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                decoration: const InputDecoration(
                  labelText: 'Mô tả',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(minimumSize: Size.zero),
              onPressed: () async {
                if (nameController.text.trim().isEmpty) {
                  return;
                }

                try {
                  final api = ref.read(kitsuneApiProvider);
                  await api.updateFolder(
                    folder.id,
                    UpdateFolderDto(
                      name: nameController.text.trim(),
                      description: descController.text.trim().isEmpty
                          ? null
                          : descController.text.trim(),
                    ),
                  );
                  ref.invalidate(foldersProvider);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                } catch (error) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('$error'),
                        backgroundColor: KitsuneColors.error,
                      ),
                    );
                  }
                }
              },
              child: const Text('Lưu'),
            ),
          ],
        );
      },
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, FolderDto folder) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Xóa thư mục'),
          content: Text(
            'Bạn có chắc muốn xóa "${folder.name}"? Tất cả từ vựng trong thư mục sẽ bị xóa.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: Size.zero,
                backgroundColor: KitsuneColors.error,
              ),
              onPressed: () async {
                try {
                  final api = ref.read(kitsuneApiProvider);
                  await api.deleteFolder(folder.id);
                  ref.invalidate(foldersProvider);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                } catch (error) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('$error'),
                        backgroundColor: KitsuneColors.error,
                      ),
                    );
                  }
                }
              },
              child: const Text('Xóa'),
            ),
          ],
        );
      },
    );
  }
}

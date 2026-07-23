import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kitsune_app/core/models/user.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/dashboard_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  bool _isUploadingAvatar = false;

  Future<void> _pickAndUploadAvatar(UserProfile user) async {
    if (_isUploadingAvatar) {
      return;
    }

    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 85,
    );
    if (picked == null) {
      return;
    }

    setState(() => _isUploadingAvatar = true);
    try {
      final bytes = await picked.readAsBytes();
      final api = ref.read(kitsuneApiProvider);
      final avatarUrl = await api.uploadAvatar(bytes, 'avatar.jpg');
      await api.updateProfile(avatarUrl: avatarUrl);
      ref.invalidate(authProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không tải được ảnh đại diện: $error'),
            backgroundColor: KitsuneColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user =
        authState.valueOrNull ?? ref.read(authProvider.notifier).currentUser;

    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Chưa đăng nhập')),
      );
    }

    final statsAsync = ref.watch(userStatsProvider(user.id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ sơ'),
        actions: [
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
              }
            },
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: KitsuneBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            KitsuneHeroCard(
              title: user.displayName,
              subtitle:
                  '@${user.username} • giữ nhịp học của bạn đồng bộ trên mọi màn từ vựng, kanji và quiz.',
              accent: KitsuneColors.secondary,
              trailing: GestureDetector(
                onTap: () => _pickAndUploadAvatar(user),
                child: Container(
                  width: 92,
                  height: 92,
                  decoration: BoxDecoration(
                    color: KitsuneColors.primarySurface,
                    borderRadius: BorderRadius.circular(28),
                    image: user.avatarUrl != null
                        ? DecorationImage(
                            image: NetworkImage(user.avatarUrl!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: Stack(
                    children: [
                      if (user.avatarUrl == null)
                        Center(
                          child: Text(
                            kitsuneInitials(user.displayName),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: KitsuneColors.primary,
                            ),
                          ),
                        ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: KitsuneColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: KitsuneColors.onPrimary,
                              width: 2,
                            ),
                          ),
                          child: _isUploadingAvatar
                              ? const KitsuneLoadingFox(size: 28)
                              : const Icon(
                                  Icons.camera_alt_rounded,
                                  size: 14,
                                  color: KitsuneColors.onPrimary,
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppTheme.space20),
            const KitsuneSectionHeader(
              title: 'Thống kê học tập',
              subtitle: 'Tổng hợp nhanh nhịp học hiện tại của bạn.',
              accent: KitsuneColors.primary,
            ),
            const SizedBox(height: AppTheme.space12),
            statsAsync.when(
              data: (stats) => Row(
                children: [
                  Expanded(
                    child: KitsuneStatTile(
                      label: 'Streak',
                      value: '${stats.streak}',
                      color: KitsuneColors.primary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: KitsuneStatTile(
                      label: 'XP',
                      value: '${stats.totalXP}',
                      color: KitsuneColors.stamp,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: KitsuneStatTile(
                      label: 'SRS đến hạn',
                      value: '${stats.srsCardsDue}',
                      color: KitsuneColors.warning,
                    ),
                  ),
                ],
              ),
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: KitsuneLoadingFox(message: 'Đang tải thống kê...', size: 72),
              ),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: AppTheme.space20),
            KitsuneSectionHeader(
              title: 'Thông tin tài khoản',
              subtitle: 'Những dữ liệu đang được dùng để cá nhân hóa hành trình học.',
              actionLabel: 'Chỉnh sửa',
              onAction: () => _showEditDialog(context, ref, user),
            ),
            const SizedBox(height: AppTheme.space12),
            KitsuneSurface(
              child: Column(
                children: [
                  _infoRow(
                    context,
                    icon: Icons.email_outlined,
                    label: 'Email',
                    value: user.email,
                  ),
                  const Divider(height: 1),
                  _infoRow(
                    context,
                    icon: Icons.shield_outlined,
                    label: 'Vai trò',
                    value: user.roles.join(', '),
                  ),
                  if (user.fullName != null) ...[
                    const Divider(height: 1),
                    _infoRow(
                      context,
                      icon: Icons.badge_outlined,
                      label: 'Họ tên',
                      value: user.fullName!,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space16),
            KitsuneSurface(
              color: KitsuneColors.stampSurface,
              child: Row(
                children: [
                  const Icon(
                    Icons.auto_awesome_rounded,
                    color: KitsuneColors.primary,
                  ),
                  const SizedBox(width: AppTheme.space12),
                  Expanded(
                    child: Text(
                      'Tên hiển thị đẹp và rõ sẽ giúp bạn nhận diện tốt hơn trên bảng xếp hạng và trong quiz cộng đồng.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space20),
            const KitsuneSectionHeader(
              title: 'Cài đặt',
              subtitle: 'Tùy chỉnh và thông tin ứng dụng.',
              accent: KitsuneColors.secondary,
            ),
            const SizedBox(height: AppTheme.space12),
            KitsuneSurface(
              child: Column(
                children: [
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: KitsuneColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.description_outlined, size: 20, color: KitsuneColors.onSurfaceVariant),
                    ),
                    title: const Text('Điều khoản dịch vụ'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _showTermsDialog(context),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.space16,
        vertical: AppTheme.space14,
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: KitsuneColors.surfaceVariant,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, size: 18, color: KitsuneColors.onSurfaceVariant),
          ),
          const SizedBox(width: AppTheme.space12),
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: KitsuneColors.onSurface,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  void _showEditDialog(BuildContext context, WidgetRef ref, UserProfile user) {
    final fullNameController = TextEditingController(text: user.fullName ?? '');

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Chỉnh sửa hồ sơ'),
          content: TextField(
            controller: fullNameController,
            decoration: const InputDecoration(
              labelText: 'Họ và tên',
              prefixIcon: Icon(Icons.person_outline_rounded),
            ),
            textCapitalization: TextCapitalization.words,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(minimumSize: Size.zero),
              onPressed: () async {
                try {
                  final api = ref.read(kitsuneApiProvider);
                  await api.updateProfile(
                    fullName: fullNameController.text.trim().isEmpty
                        ? null
                        : fullNameController.text.trim(),
                  );
                  ref.invalidate(authProvider);
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

  void _showTermsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Điều khoản dịch vụ'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text('1. Chấp nhận điều khoản', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Text('Bằng việc đăng ký tài khoản và sử dụng Kitsune, bạn đồng ý tuân thủ các điều khoản này.'),
                SizedBox(height: 12),
                Text('2. Quyền riêng tư & Dữ liệu', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Text('Chúng tôi lưu trữ thông tin cơ bản (email, tên) và tiến trình học tập của bạn để đồng bộ trên các thiết bị. Dữ liệu của bạn được bảo mật và không chia sẻ cho bên thứ ba vì mục đích quảng cáo.'),
                SizedBox(height: 12),
                Text('3. Sử dụng hợp lý', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Text('Bạn không được sử dụng các công cụ tự động (bot) để tạo tải giả hoặc phá hoại dịch vụ. Mọi hành vi vi phạm có thể dẫn đến việc khóa tài khoản vĩnh viễn mà không cần báo trước.'),
                SizedBox(height: 12),
                Text('4. Quyền sở hữu nội dung', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Text('Dữ liệu từ vựng và ngữ pháp do cộng đồng đóng góp thuộc quyền sở hữu chung. Mã nguồn và thiết kế của Kitsune thuộc quyền sở hữu của tác giả Nguyễn Duy Linh.'),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Đóng'),
            ),
          ],
        );
      },
    );
  }
}


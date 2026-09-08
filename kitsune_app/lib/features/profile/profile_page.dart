import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:kitsune_app/core/models/user.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/knowledge_graph_panel.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/dashboard_provider.dart';
import 'package:kitsune_app/providers/providers.dart';
import 'package:kitsune_app/providers/knowledge_provider.dart';

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
        final strings = ref.read(stringsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${strings.avatarUploadError}: $error'),
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
    final strings = ref.watch(stringsProvider);
    final currentLanguage = ref.watch(appLanguageProvider);

    if (user == null) {
      return Scaffold(
        body: Center(child: Text(strings.notLoggedIn)),
      );
    }

    final statsAsync = ref.watch(userStatsProvider(user.id));
    final knowledgeAsync = ref.watch(knowledgeGraphProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.profileTitle),
        actions: [
          IconButton(
            tooltip: strings.logout,
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  title: Text(strings.logoutConfirmTitle),
                  content: Text(strings.logoutConfirmMessage),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(dialogContext, false),
                      child: Text(strings.cancel),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        minimumSize: Size.zero,
                        backgroundColor: KitsuneColors.error,
                      ),
                      onPressed: () => Navigator.pop(dialogContext, true),
                      child: Text(strings.logout),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  Navigator.pushNamedAndRemoveUntil(
                      context, '/login', (_) => false);
                }
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
              subtitle: strings.profileHeroSubtitle(user.username),
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
            KitsuneSectionHeader(
              title: strings.studyStats,
              accent: KitsuneColors.primary,
            ),
            const SizedBox(height: AppTheme.space12),
            statsAsync.when(
              data: (stats) => Row(
                children: [
                  Expanded(
                    child: KitsuneStatTile(
                      label: strings.streakLabel,
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
                      label: strings.srsDueLabel,
                      value: '${stats.srsCardsDue}',
                      color: KitsuneColors.warning,
                    ),
                  ),
                ],
              ),
              loading: () => Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: KitsuneLoadingFox(
                    message: strings.loadingStats, size: 72),
              ),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: AppTheme.space20),
            KitsuneSectionHeader(
              title: strings.knowledgeMap,
              accent: KitsuneColors.success,
            ),
            const SizedBox(height: AppTheme.space12),
            knowledgeAsync.when(
              data: (graph) => KnowledgeGraphPanel(graph: graph),
              loading: () => KitsuneSurface(
                child: KitsuneLoadingFox(
                  message: strings.connectingKnowledgeGraph,
                  size: 68,
                ),
              ),
              error: (_, __) => KitsuneSurface(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(strings.cannotLoadKnowledgeGraph),
                    ),
                    TextButton(
                      onPressed: () => ref.invalidate(knowledgeGraphProvider),
                      child: Text(strings.retry),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppTheme.space20),
            KitsuneSectionHeader(
              title: strings.accountInfo,
              actionLabel: strings.edit,
              onAction: () => _showEditDialog(context, ref, user, strings),
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
                    label: strings.roleLabel,
                    value: user.roles.join(', '),
                  ),
                  if (user.fullName != null) ...[
                    const Divider(height: 1),
                    _infoRow(
                      context,
                      icon: Icons.badge_outlined,
                      label: strings.fullNameLabel,
                      value: user.fullName!,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space20),
            KitsuneSectionHeader(
              title: strings.appSettings,
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
                      child: const Icon(Icons.language_rounded,
                          size: 20, color: KitsuneColors.onSurfaceVariant),
                    ),
                    title: Text(strings.displayLanguage),
                    subtitle: Text('${currentLanguage.flag}  ${currentLanguage.displayName}'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _showLanguagePicker(context, ref, currentLanguage),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: KitsuneColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.description_outlined,
                          size: 20, color: KitsuneColors.onSurfaceVariant),
                    ),
                    title: Text(strings.termsOfService),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _showTermsDialog(context, strings),
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

  void _showEditDialog(
    BuildContext context,
    WidgetRef ref,
    UserProfile user,
    AppStrings strings,
  ) {
    final fullNameController = TextEditingController(text: user.fullName ?? '');

    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(strings.editProfileTitle),
          content: TextField(
            controller: fullNameController,
            decoration: InputDecoration(
              labelText: strings.fullNameLabel,
              prefixIcon: const Icon(Icons.person_outline_rounded),
            ),
            textCapitalization: TextCapitalization.words,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(strings.cancel),
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
                        content: Text('${strings.errorPrefix}: $error'),
                        backgroundColor: KitsuneColors.error,
                      ),
                    );
                  }
                }
              },
              child: Text(strings.save),
            ),
          ],
        );
      },
    );
  }

  void _showTermsDialog(BuildContext context, AppStrings strings) {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(strings.termsOfService),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(strings.termsTitle1,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(strings.termsBody1),
                const SizedBox(height: 12),
                Text(strings.termsTitle2,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(strings.termsBody2),
                const SizedBox(height: 12),
                Text(strings.termsTitle3,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(strings.termsBody3),
                const SizedBox(height: 12),
                Text(strings.termsTitle4,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(strings.termsBody4),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(strings.close),
            ),
          ],
        );
      },
    );
  }

  void _showLanguagePicker(
    BuildContext context,
    WidgetRef ref,
    AppLanguage currentLanguage,
  ) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: KitsuneColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        final strings = ref.watch(stringsProvider);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(
                    strings.selectLanguageTitle,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                const Divider(),
                ...AppLanguage.values.map((lang) {
                  final isSelected = lang == currentLanguage;
                  return ListTile(
                    leading: Text(
                      lang.flag,
                      style: const TextStyle(fontSize: 24),
                    ),
                    title: Text(
                      lang.displayName,
                      style: TextStyle(
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected
                            ? KitsuneColors.primary
                            : KitsuneColors.onSurface,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle_rounded,
                            color: KitsuneColors.primary)
                        : null,
                    onTap: () {
                      ref.read(appLanguageProvider.notifier).setLanguage(lang);
                      Navigator.pop(sheetContext);
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }
}

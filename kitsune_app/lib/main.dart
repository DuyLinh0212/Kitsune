import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/network/supabase_client.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/features/auth/forgot_password_page.dart';
import 'package:kitsune_app/features/auth/login_page.dart';
import 'package:kitsune_app/features/auth/register_page.dart';
import 'package:kitsune_app/features/folders/folder_detail_page.dart';
import 'package:kitsune_app/features/folders/folder_list_page.dart';
import 'package:kitsune_app/features/home/home_page.dart';
import 'package:kitsune_app/features/kanji/kanji_detail_page.dart';
import 'package:kitsune_app/features/leaderboard/leaderboard_page.dart';
import 'package:kitsune_app/features/profile/profile_page.dart';
import 'package:kitsune_app/features/quizzes/my_quizzes_page.dart';
import 'package:kitsune_app/features/quizzes/quiz_create_page.dart';
import 'package:kitsune_app/features/quizzes/quiz_list_page.dart';
import 'package:kitsune_app/features/quizzes/quiz_play_page.dart';
import 'package:kitsune_app/features/search/search_page.dart';
import 'package:kitsune_app/features/srs/srs_review_page.dart';
import 'package:kitsune_app/features/vocabulary/vocabulary_detail_page.dart';
import 'package:kitsune_app/providers/providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final supabaseClient = SupabaseClient();
  await supabaseClient.init();

  ErrorWidget.builder = (details) => _AppErrorCard(details: details);

  runApp(const ProviderScope(child: KitsuneApp()));
}

class _AppErrorCard extends StatelessWidget {
  const _AppErrorCard({required this.details});

  final FlutterErrorDetails details;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: KitsuneColors.errorSurface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline_rounded, color: KitsuneColors.error),
            const SizedBox(height: 8),
            Text(
              'Có lỗi khi hiển thị phần này.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: KitsuneColors.error,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            if (details.exceptionAsString().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                details.exceptionAsString(),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: KitsuneColors.error,
                    ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class KitsuneApp extends ConsumerWidget {
  const KitsuneApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'Kitsune',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: authState.when(
        data: (user) => user != null ? const MainScreen() : const LoginPage(),
        loading: () => const SplashScreen(),
        error: (_, __) => const LoginPage(),
      ),
      onGenerateRoute: (settings) {
        late final Widget page;

        switch (settings.name) {
          case '/login':
            page = const LoginPage();
            break;
          case '/register':
            page = const RegisterPage();
            break;
          case '/forgot_password':
            page = const ForgotPasswordPage();
            break;
          case '/main':
          case '/home':
            page = const MainScreen();
            break;
          case '/srs':
            page = const SrsReviewPage();
            break;
          case '/folders':
            page = const FolderListPage();
            break;
          case '/quizzes':
            page = const QuizListPage();
            break;
          case '/my_quizzes':
            page = const MyQuizzesPage();
            break;
          case '/quiz_create':
          case '/quizzes/create':
            page = const QuizCreatePage();
            break;
          case '/leaderboard':
            page = const LeaderboardPage();
            break;
          case '/profile':
            page = const ProfilePage();
            break;
          default:
            if (settings.name != null &&
                settings.name!.startsWith('/folders/')) {
              final id = int.tryParse(settings.name!.split('/').last) ?? 0;
              page = FolderDetailPage(folderId: id);
            } else if (settings.name != null &&
                settings.name!.startsWith('/vocabulary/')) {
              final id = int.tryParse(settings.name!.split('/').last) ?? 0;
              page = VocabularyDetailPage(vocabularyId: id);
            } else if (settings.name != null &&
                settings.name!.startsWith('/kanji/')) {
              final id = int.tryParse(settings.name!.split('/').last) ?? 0;
              page = KanjiDetailPage(kanjiId: id);
            } else if (settings.name != null &&
                settings.name!.startsWith('/quizzes/')) {
              final id = int.tryParse(settings.name!.split('/').last) ?? 0;
              page = QuizPlayPage(quizId: id);
            } else {
              page = const LoginPage();
            }
        }

        return MaterialPageRoute(builder: (_) => page, settings: settings);
      },
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: KitsuneBackdrop(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.space24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const KitsuneLoadingFox(size: 140),
                const SizedBox(height: AppTheme.space8),
                Text(
                  'Kitsune',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        color: KitsuneColors.primary,
                        fontFamily: AppTheme.displayFontFamily,
                      ),
                ),
                const SizedBox(height: AppTheme.space8),
                Text(
                  'Học tiếng Nhật mỗi ngày.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: KitsuneColors.onSurfaceVariant,
                      ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _NavItem {
  const _NavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

const _navItems = [
  _NavItem(
    icon: Icons.home_outlined,
    selectedIcon: Icons.home_rounded,
    label: 'Trang chủ',
  ),
  _NavItem(
    icon: Icons.search_rounded,
    selectedIcon: Icons.manage_search_rounded,
    label: 'Tìm kiếm',
  ),
  _NavItem(
    icon: Icons.repeat_rounded,
    selectedIcon: Icons.auto_awesome_motion_rounded,
    label: 'Ôn tập',
  ),
  _NavItem(
    icon: Icons.person_outline_rounded,
    selectedIcon: Icons.person_rounded,
    label: 'Cá nhân',
  ),
];

class _MainScreenState extends ConsumerState<MainScreen> {
  int _currentIndex = 0;

  late final List<Widget> _pages = const [
    HomePage(),
    SearchPage(),
    SrsReviewPage(),
    ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Container(
            height: 68,
            decoration: BoxDecoration(
              color: KitsuneColors.surface,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: KitsuneColors.surfaceBorder),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A2B2018),
                  blurRadius: 20,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: Row(
              children: List.generate(_navItems.length, (index) {
                final item = _navItems[index];
                final isSelected = index == _currentIndex;
                final tint =
                    isSelected ? KitsuneColors.primary : KitsuneColors.onSurfaceMuted;

                return Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(26),
                    onTap: () => setState(() => _currentIndex = index),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isSelected ? item.selectedIcon : item.icon,
                          color: tint,
                          size: 22,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: tint,
                          ),
                        ),
                        const SizedBox(height: 3),
                        SizedBox(
                          height: 6,
                          child: isSelected
                              ? const KitsuneTailMark(size: 14)
                              : null,
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

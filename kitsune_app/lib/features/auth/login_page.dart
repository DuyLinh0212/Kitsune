import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _loginController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authProvider.notifier).login(
            _loginController.text.trim(),
            _passwordController.text,
          );

      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/main');
      }
    } catch (error) {
      if (!mounted) return;
      final message = error.toString().replaceFirst('Exception: ', '');
      setState(() {
        _errorMessage = message;
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ),
            ],
          ),
          backgroundColor: KitsuneColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 4),
        ),
      );
    } finally {
      if (mounted && _isLoading) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showLanguageSelector(BuildContext context) {
    final currentLanguage = ref.read(appLanguageProvider);
    final strings = ref.read(stringsProvider);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        strings.selectLanguageTitle,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(sheetContext),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
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
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? KitsuneColors.primary : KitsuneColors.onSurface,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle_rounded, color: KitsuneColors.primary)
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

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final currentLang = ref.watch(appLanguageProvider);

    return Scaffold(
      body: KitsuneBackdrop(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppTheme.space20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Language Selector at top-right
                      Align(
                        alignment: Alignment.centerRight,
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(20),
                            onTap: () => _showLanguageSelector(context),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: KitsuneColors.surface,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: KitsuneColors.surfaceBorder,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    currentLang.flag,
                                    style: const TextStyle(fontSize: 16),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    currentLang.displayName,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: KitsuneColors.onSurface,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    size: 18,
                                    color: KitsuneColors.onSurfaceVariant,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppTheme.space12),

                      KitsuneHeroCard(
                        title: strings.loginTitle,
                        subtitle: strings.loginSubtitle,
                        trailing: Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: KitsuneColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Image.asset('assets/images/logo.png'),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppTheme.space20),

                      KitsuneSurface(
                        padding: const EdgeInsets.all(AppTheme.space20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Direct Inline Error Banner if login fails
                            if (_errorMessage != null) ...[
                              Container(
                                margin: const EdgeInsets.only(
                                  bottom: AppTheme.space16,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: KitsuneColors.errorSurface,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: KitsuneColors.error.withValues(
                                      alpha: 0.35,
                                    ),
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(
                                      Icons.error_outline_rounded,
                                      color: KitsuneColors.error,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: const TextStyle(
                                          color: KitsuneColors.error,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],

                            TextFormField(
                              controller: _loginController,
                              decoration: InputDecoration(
                                labelText: strings.loginAccountLabel,
                                prefixIcon: const Icon(
                                  Icons.person_outline_rounded,
                                ),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              onChanged: (_) {
                                if (_errorMessage != null) {
                                  setState(() => _errorMessage = null);
                                }
                              },
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return strings.loginRequiredUsername;
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppTheme.space16),
                            TextFormField(
                              controller: _passwordController,
                              decoration: InputDecoration(
                                labelText: strings.loginPasswordLabel,
                                prefixIcon: const Icon(
                                  Icons.lock_outline_rounded,
                                ),
                                suffixIcon: IconButton(
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                  ),
                                ),
                              ),
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              onChanged: (_) {
                                if (_errorMessage != null) {
                                  setState(() => _errorMessage = null);
                                }
                              },
                              onFieldSubmitted: (_) => _handleLogin(),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return strings.loginRequiredPassword;
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppTheme.space8),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {
                                  Navigator.of(
                                    context,
                                  ).pushNamed('/forgot_password');
                                },
                                child: Text(strings.loginForgotPassword),
                              ),
                            ),
                            const SizedBox(height: AppTheme.space8),
                            ElevatedButton(
                              onPressed: _isLoading ? null : _handleLogin,
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: KitsuneLoadingFox(size: 28),
                                    )
                                  : Text(strings.loginButton),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppTheme.space16),
                      KitsuneSurface(
                        padding: const EdgeInsets.all(AppTheme.space16),
                        color: KitsuneColors.stampSurface,
                        child: Row(
                          children: [
                            const Icon(
                              Icons.auto_stories_rounded,
                              color: KitsuneColors.primary,
                            ),
                            const SizedBox(width: AppTheme.space12),
                            Expanded(
                              child: Text(
                                strings.loginNoAccountPrompt,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            const SizedBox(width: AppTheme.space8),
                            TextButton(
                              onPressed: () {
                                Navigator.of(context).pushNamed('/register');
                              },
                              child: Text(strings.loginRegisterButton),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

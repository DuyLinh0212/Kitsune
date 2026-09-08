// kitsune_app/lib/features/auth/register_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/user.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _agreeTerms = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    final strings = ref.read(stringsProvider);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (!_agreeTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.registerTermsRequired),
          backgroundColor: KitsuneColors.error,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final payload = RegisterRequest(
      username: _usernameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
      fullName: _fullNameController.text.trim().isEmpty
          ? null
          : _fullNameController.text.trim(),
    );

    try {
      await ref.read(authProvider.notifier).register(payload);
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/main');
      }
    } catch (error) {
      if (!mounted) return;
      final rawMessage = error.toString().replaceFirst('Exception: ', '');
      final message = strings.mapAuthError(rawMessage);
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
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      appBar: AppBar(),
      body: KitsuneBackdrop(
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      KitsuneHeroCard(
                        title: strings.registerHeroTitle,
                        subtitle: strings.registerHeroSubtitle,
                        accent: KitsuneColors.secondary,
                      ),
                      const SizedBox(height: AppTheme.space20),
                      KitsuneSurface(
                        padding: const EdgeInsets.all(AppTheme.space20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              strings.registerAccountInfo,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: AppTheme.space16),
                            TextFormField(
                              controller: _usernameController,
                              decoration: InputDecoration(
                                labelText: strings.registerUsernameLabel,
                                prefixIcon: const Icon(Icons.person_outline_rounded),
                              ),
                              textInputAction: TextInputAction.next,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return strings.registerUsernameRequired;
                                }
                                if (value.trim().length < 2) {
                                  return strings.registerUsernameMinLength;
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppTheme.space16),
                            TextFormField(
                              controller: _emailController,
                              decoration: InputDecoration(
                                labelText: strings.registerEmailLabel,
                                prefixIcon: const Icon(Icons.email_outlined),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return strings.registerEmailRequired;
                                }
                                if (!value.contains('@')) {
                                  return strings.registerEmailInvalid;
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppTheme.space16),
                            TextFormField(
                              controller: _passwordController,
                              decoration: InputDecoration(
                                labelText: strings.registerPasswordLabel,
                                prefixIcon: const Icon(Icons.lock_outline_rounded),
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
                              textInputAction: TextInputAction.next,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return strings.registerPasswordRequired;
                                }
                                if (value.length < 6) {
                                  return strings.registerPasswordMinLength;
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppTheme.space16),
                            TextFormField(
                              controller: _fullNameController,
                              decoration: InputDecoration(
                                labelText: strings.registerFullNameLabel,
                                prefixIcon: const Icon(Icons.badge_outlined),
                              ),
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _handleRegister(),
                            ),
                            const SizedBox(height: AppTheme.space16),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Checkbox(
                                  value: _agreeTerms,
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() => _agreeTerms = val);
                                    }
                                  },
                                ),
                                Expanded(
                                  child: GestureDetector(
                                    onTap: () => _showTermsDialog(strings),
                                    child: RichText(
                                      text: TextSpan(
                                        style: Theme.of(context).textTheme.bodyMedium,
                                        children: [
                                          TextSpan(text: strings.registerAgreeTerms),
                                          TextSpan(
                                            text: strings.termsOfService,
                                            style: const TextStyle(
                                              color: KitsuneColors.primary,
                                              decoration: TextDecoration.underline,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppTheme.space20),
                            ElevatedButton(
                              onPressed: _isLoading ? null : _handleRegister,
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: KitsuneLoadingFox(size: 28),
                                    )
                                  : Text(strings.registerSubmitButton),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppTheme.space16),
                      KitsuneSurface(
                        padding: const EdgeInsets.all(AppTheme.space16),
                        color: KitsuneColors.secondarySurface,
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_outline_rounded,
                              color: KitsuneColors.secondary,
                            ),
                            const SizedBox(width: AppTheme.space12),
                            Expanded(
                              child: Text(
                                strings.registerAlreadyHaveAccount,
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: Text(strings.registerLoginNow),
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

  void _showTermsDialog(AppStrings strings) {
    showDialog(
      context: context,
      builder: (dialogCtx) {
        return AlertDialog(
          title: Text(strings.termsOfService),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(strings.termsTitle1, style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(strings.termsBody1),
                const SizedBox(height: 12),
                Text(strings.termsTitle2, style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(strings.termsBody2),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(),
              child: Text(strings.close),
            ),
          ],
        );
      },
    );
  }
}

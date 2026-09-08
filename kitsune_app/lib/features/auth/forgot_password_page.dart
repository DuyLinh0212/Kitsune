// kitsune_app/lib/features/auth/forgot_password_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() =>
      _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final strings = ref.read(stringsProvider);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      await ref
          .read(authProvider.notifier)
          .forgotPassword(_emailController.text.trim());

      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _sent = true;
      });
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
      setState(() {
        _isLoading = false;
      });
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
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 240),
                  child: _sent ? _buildSuccessState(context, strings) : _buildFormState(context, strings),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormState(BuildContext context, AppStrings strings) {
    return Column(
      key: const ValueKey('forgot-form'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KitsuneHeroCard(
          title: strings.forgotPasswordTitle,
          subtitle: strings.forgotPasswordSubtitle,
          accent: KitsuneColors.stamp,
        ),
        const SizedBox(height: AppTheme.space20),
        KitsuneSurface(
          padding: const EdgeInsets.all(AppTheme.space20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  strings.forgotPasswordEmailSection,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: AppTheme.space16),
                TextFormField(
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: strings.registerEmailLabel,
                    prefixIcon: const Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _handleSubmit(),
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
                const SizedBox(height: AppTheme.space20),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: KitsuneLoadingFox(size: 28),
                        )
                      : Text(strings.forgotPasswordSubmitButton),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessState(BuildContext context, AppStrings strings) {
    return Column(
      key: const ValueKey('forgot-success'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KitsuneHeroCard(
          title: strings.forgotPasswordSuccessTitle,
          subtitle: strings.forgotPasswordSuccessSubtitle(_emailController.text.trim()),
          accent: KitsuneColors.secondary,
        ),
        const SizedBox(height: AppTheme.space20),
        KitsuneSurface(
          padding: const EdgeInsets.all(AppTheme.space24),
          color: KitsuneColors.secondarySurface,
          child: Column(
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: KitsuneColors.surface,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.mark_email_read_outlined,
                  size: 36,
                  color: KitsuneColors.secondary,
                ),
              ),
              const SizedBox(height: AppTheme.space16),
              Text(
                strings.forgotPasswordSuccessTitle,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTheme.space8),
              Text(
                strings.forgotPasswordSuccessSubtitle(_emailController.text.trim()),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: KitsuneColors.onSurfaceVariant,
                      height: 1.5,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.space20),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(strings.forgotPasswordBackToLogin),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

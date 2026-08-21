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
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    await ref
        .read(authProvider.notifier)
        .forgotPassword(_emailController.text.trim());

    if (!mounted) {
      return;
    }

    setState(() {
      _isLoading = false;
      _sent = true;
    });
  }

  @override
  Widget build(BuildContext context) {
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
                  child: _sent ? _buildSuccessState(context) : _buildFormState(context),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormState(BuildContext context) {
    return Column(
      key: const ValueKey('forgot-form'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const KitsuneHeroCard(
          title: 'Lấy lại quyền truy cập thật gọn.',
          subtitle:
              'Nhập email để nhận liên kết đặt lại mật khẩu và quay lại hành trình học ngay khi sẵn sàng.',
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
                  'Email khôi phục',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: AppTheme.space16),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _handleSubmit(),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Vui lòng nhập email';
                    }
                    if (!value.contains('@')) {
                      return 'Email không hợp lệ';
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
                      : const Text('Gửi email đặt lại mật khẩu'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessState(BuildContext context) {
    return Column(
      key: const ValueKey('forgot-success'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const KitsuneHeroCard(
          title: 'Liên kết đã lên đường.',
          subtitle:
              'Kiểm tra hộp thư của bạn rồi quay lại đăng nhập sau khi đặt lại mật khẩu.',
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
                'Kiểm tra email',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppTheme.space8),
              Text(
                'Nếu chưa thấy thư, hãy kiểm tra mục spam hoặc thử gửi lại sau ít phút.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: KitsuneColors.onSurfaceVariant,
                      height: 1.5,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppTheme.space20),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Quay lại đăng nhập'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

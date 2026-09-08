import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kitsune_app/core/localization/app_strings.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/features/auth/forgot_password_page.dart';
import 'package:kitsune_app/features/auth/login_page.dart';
import 'package:kitsune_app/features/auth/register_page.dart';
import 'package:kitsune_app/main.dart';

void main() {
  group('Auth Pages Localization & Form Fields', () {
    for (final lang in AppLanguage.values) {
      testWidgets('LoginPage renders correctly in ${lang.displayName} (${lang.code})', (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              locale: lang.locale,
              supportedLocales: AppLanguage.values.map((l) => l.locale).toList(),
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              theme: AppTheme.lightTheme,
              home: const LoginPage(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(TextFormField), findsNWidgets(2));
        expect(find.text('Có lỗi khi hiển thị phần này.'), findsNothing);
      });

      testWidgets('RegisterPage renders correctly in ${lang.displayName} (${lang.code})', (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              locale: lang.locale,
              supportedLocales: AppLanguage.values.map((l) => l.locale).toList(),
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              theme: AppTheme.lightTheme,
              home: const RegisterPage(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(TextFormField), findsNWidgets(4));
        expect(find.text('Có lỗi khi hiển thị phần này.'), findsNothing);
      });

      testWidgets('ForgotPasswordPage renders correctly in ${lang.displayName} (${lang.code})', (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              locale: lang.locale,
              supportedLocales: AppLanguage.values.map((l) => l.locale).toList(),
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              theme: AppTheme.lightTheme,
              home: const ForgotPasswordPage(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(TextFormField), findsNWidgets(1));
        expect(find.text('Có lỗi khi hiển thị phần này.'), findsNothing);
      });
    }

    testWidgets('KitsuneApp renders without errors', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: KitsuneApp(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Có lỗi khi hiển thị phần này.'), findsNothing);
    });
  });
}

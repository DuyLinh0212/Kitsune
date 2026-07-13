import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class AppTheme {
  /// Body copy — Vietnamese UI text, buttons, inputs. Full diacritic coverage.
  static final String fontFamily = GoogleFonts.notoSans().fontFamily!;

  /// Numerals, wordmark, nav chrome — used sparingly via [numeralStyle].
  static final String displayFontFamily = GoogleFonts.manrope().fontFamily!;

  /// Japanese script — apply only to widgets rendering real kanji/kana.
  static final String japaneseFontFamily = GoogleFonts.notoSansJp().fontFamily!;

  /// Confident geometric numerals: streaks, XP, percentages, countdowns.
  static TextStyle numeralStyle({
    required double fontSize,
    FontWeight fontWeight = FontWeight.w800,
    Color? color,
    double? letterSpacing,
  }) {
    return GoogleFonts.manrope(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  /// Japanese script text: vocabulary words, kanji big-character, furigana.
  static TextStyle japaneseStyle({
    required double fontSize,
    FontWeight fontWeight = FontWeight.w600,
    Color? color,
    double? height,
  }) {
    return GoogleFonts.notoSansJp(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
    );
  }

  static const double space2 = 2;
  static const double space4 = 4;
  static const double space6 = 6;
  static const double space8 = 8;
  static const double space10 = 10;
  static const double space12 = 12;
  static const double space14 = 14;
  static const double space16 = 16;
  static const double space18 = 18;
  static const double space20 = 20;
  static const double space24 = 24;
  static const double space32 = 32;
  static const double space48 = 48;

  static const double radiusSm = 8.0;
  static const double radiusMd = 18.0;
  static const double radiusLg = 28.0;
  static const double radiusFull = 999.0;

  static const double buttonHeight = 52.0;
  static const double inputHeight = 56.0;

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: fontFamily,
      colorScheme: const ColorScheme.light(
        primary: KitsuneColors.primary,
        onPrimary: KitsuneColors.onPrimary,
        primaryContainer: KitsuneColors.primarySurface,
        onPrimaryContainer: KitsuneColors.primaryDark,
        secondary: KitsuneColors.secondary,
        onSecondary: Colors.white,
        secondaryContainer: KitsuneColors.secondarySurface,
        onSecondaryContainer: KitsuneColors.secondaryDark,
        tertiary: KitsuneColors.stamp,
        onTertiary: KitsuneColors.onSurface,
        tertiaryContainer: KitsuneColors.stampSurface,
        onTertiaryContainer: KitsuneColors.onSurface,
        surface: KitsuneColors.surface,
        onSurface: KitsuneColors.onSurface,
        surfaceContainerHighest: KitsuneColors.surfaceVariant,
        outlineVariant: KitsuneColors.surfaceBorder,
        error: KitsuneColors.error,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: KitsuneColors.background,
      canvasColor: KitsuneColors.background,
      splashColor: KitsuneColors.primarySurface,
      highlightColor: Colors.transparent,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: KitsuneColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: KitsuneColors.onSurface,
          fontFamily: fontFamily,
          letterSpacing: -0.3,
        ),
        iconTheme: const IconThemeData(
          color: KitsuneColors.onSurface,
          size: 22,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: KitsuneColors.surface,
        indicatorColor: KitsuneColors.primarySurface,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: KitsuneColors.primary, size: 22);
          }
          return const IconThemeData(
            color: KitsuneColors.onSurfaceMuted,
            size: 22,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: KitsuneColors.primary,
              fontFamily: fontFamily,
            );
          }
          return TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: KitsuneColors.onSurfaceMuted,
            fontFamily: fontFamily,
          );
        }),
        elevation: 0,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        height: 72,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: KitsuneColors.surface,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          side: const BorderSide(color: KitsuneColors.surfaceBorder),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: KitsuneColors.primary,
          foregroundColor: KitsuneColors.onPrimary,
          disabledBackgroundColor: KitsuneColors.surfaceStrong,
          disabledForegroundColor: KitsuneColors.onSurfaceVariant,
          minimumSize: const Size(double.infinity, buttonHeight),
          padding: const EdgeInsets.symmetric(
            horizontal: space24,
            vertical: space16,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          elevation: 0,
          textStyle: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            fontFamily: fontFamily,
            letterSpacing: 0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: KitsuneColors.onSurface,
          minimumSize: const Size(double.infinity, buttonHeight),
          padding: const EdgeInsets.symmetric(
            horizontal: space24,
            vertical: space16,
          ),
          side: const BorderSide(color: KitsuneColors.surfaceBorder, width: 1.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            fontFamily: fontFamily,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: KitsuneColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: space8, vertical: space4),
          textStyle: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            fontFamily: fontFamily,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: KitsuneColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: space16,
          vertical: space16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: KitsuneColors.surfaceBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: KitsuneColors.surfaceBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: KitsuneColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: KitsuneColors.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: KitsuneColors.error, width: 2),
        ),
        hintStyle: TextStyle(
          color: KitsuneColors.onSurfaceMuted,
          fontSize: 14,
          fontFamily: fontFamily,
        ),
        labelStyle: TextStyle(
          color: KitsuneColors.onSurfaceVariant,
          fontSize: 14,
          fontFamily: fontFamily,
        ),
        floatingLabelStyle: TextStyle(
          color: KitsuneColors.primary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          fontFamily: fontFamily,
        ),
        prefixIconColor: KitsuneColors.onSurfaceVariant,
        suffixIconColor: KitsuneColors.onSurfaceVariant,
        errorStyle: TextStyle(
          color: KitsuneColors.error,
          fontSize: 12,
          fontFamily: fontFamily,
        ),
      ),
      textTheme: TextTheme(
        displaySmall: TextStyle(
          fontSize: 38,
          fontWeight: FontWeight.w800,
          color: KitsuneColors.onSurface,
          letterSpacing: -0.8,
          fontFamily: fontFamily,
        ),
        headlineLarge: TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w700,
          color: KitsuneColors.onSurface,
          letterSpacing: -0.6,
          fontFamily: fontFamily,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: KitsuneColors.onSurface,
          letterSpacing: -0.4,
          fontFamily: fontFamily,
        ),
        headlineSmall: TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w600,
          color: KitsuneColors.onSurface,
          letterSpacing: -0.2,
          fontFamily: fontFamily,
        ),
        titleLarge: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: KitsuneColors.onSurface,
          letterSpacing: -0.1,
          fontFamily: fontFamily,
        ),
        titleMedium: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: KitsuneColors.onSurface,
          fontFamily: fontFamily,
        ),
        titleSmall: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: KitsuneColors.onSurface,
          fontFamily: fontFamily,
        ),
        bodyLarge: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w400,
          color: KitsuneColors.onSurface,
          fontFamily: fontFamily,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: KitsuneColors.onSurface,
          fontFamily: fontFamily,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: KitsuneColors.onSurfaceVariant,
          fontFamily: fontFamily,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: KitsuneColors.onSurface,
          fontFamily: fontFamily,
        ),
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: KitsuneColors.onSurfaceVariant,
          fontFamily: fontFamily,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: KitsuneColors.onSurfaceMuted,
          letterSpacing: 0.2,
          fontFamily: fontFamily,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: KitsuneColors.surfaceBorder,
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: KitsuneColors.surfaceVariant,
        selectedColor: KitsuneColors.primarySurface,
        labelStyle: TextStyle(
          fontSize: 13,
          fontFamily: fontFamily,
          color: KitsuneColors.onSurface,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusSm),
        ),
        side: const BorderSide(color: KitsuneColors.surfaceBorder),
        padding: const EdgeInsets.symmetric(horizontal: space8, vertical: space4),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: KitsuneColors.primary,
        linearTrackColor: KitsuneColors.surfaceVariant,
        circularTrackColor: KitsuneColors.surfaceVariant,
        linearMinHeight: 4,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: KitsuneColors.onSurface,
        contentTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontFamily: fontFamily,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: KitsuneColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: const BorderSide(color: KitsuneColors.surfaceBorder),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: KitsuneColors.primary,
        foregroundColor: Colors.white,
      ),
    );
  }
}

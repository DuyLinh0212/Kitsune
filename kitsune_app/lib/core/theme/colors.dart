import 'package:flutter/material.dart';

/// "Fox Den" palette — warm cream + fox-orange, tuned for a calm,
/// organized, intelligent study app. Field names are kept stable across
/// the app; only the hex values and a few additions changed.
class KitsuneColors {
  static const Color primary = Color(0xFFE2672B);
  static const Color primaryDark = Color(0xFFA8431A);
  static const Color primaryLight = Color(0xFFF1A374);
  static const Color primarySurface = Color(0xFFFBE4D3);

  static const Color secondary = Color(0xFF5F7A52);
  static const Color secondaryDark = Color(0xFF47603C);
  static const Color secondaryLight = Color(0xFF8FAA82);
  static const Color secondarySurface = Color(0xFFE7EEDF);

  static const Color stamp = Color(0xFFD9A441);
  static const Color stampSurface = Color(0xFFFBEED0);

  static const Color background = Color(0xFFF7EEDF);
  static const Color surface = Color(0xFFFFFBF2);
  static const Color surfaceVariant = Color(0xFFF0E4D0);
  static const Color surfaceBorder = Color(0xFFE6D8C2);
  static const Color surfaceStrong = Color(0xFFE3D3B8);

  static const Color onPrimary = Colors.white;
  static const Color onSurface = Color(0xFF2B2018);
  static const Color onSurfaceVariant = Color(0xFF6B5C48);
  static const Color onSurfaceMuted = Color(0xFF8C7B65);
  static const Color onBackground = Color(0xFF2B2018);

  static const Color success = Color(0xFF4F8B5C);
  static const Color successSurface = Color(0xFFE9F1E4);
  static const Color warning = Color(0xFFC98A12);
  static const Color warningSurface = Color(0xFFFBF0DC);
  static const Color error = Color(0xFFB23A2E);
  static const Color errorSurface = Color(0xFFFBE3DF);
  static const Color info = Color(0xFF3B6FA0);
  static const Color infoSurface = Color(0xFFE7EEF5);

  static const List<Color> srsLevelColors = [
    Color(0xFFB23A2E),
    Color(0xFFC9602A),
    Color(0xFFD9862B),
    Color(0xFFD9A441),
    Color(0xFFA3A83E),
    Color(0xFF7FA05A),
    Color(0xFF5F7A52),
    Color(0xFF3F6B4A),
  ];

  static const Map<int, Color> jlptColors = {
    1: Color(0xFFB23A2E),
    2: Color(0xFFC98A12),
    3: Color(0xFF4F8B5C),
    4: Color(0xFF3B6FA0),
    5: Color(0xFF5F7A52),
  };

  static const Map<int, Color> jlptSurfaces = {
    1: Color(0xFFFBE3DF),
    2: Color(0xFFFBF0DC),
    3: Color(0xFFE9F1E4),
    4: Color(0xFFE7EEF5),
    5: Color(0xFFE7EEDF),
  };

  static const List<Color> folderColors = [
    Color(0xFF3B6FA0),
    Color(0xFF5F7A52),
    Color(0xFFE2672B),
    Color(0xFFD9A441),
    Color(0xFFB23A2E),
    Color(0xFF8B5FBF),
    Color(0xFF2F8F82),
    Color(0xFF6B5C48),
  ];
}

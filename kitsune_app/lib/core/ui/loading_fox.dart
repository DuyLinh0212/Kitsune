// F:\NgDuyLinh\Personal_Project\Kitsune_Total\KitsunePlatform\kitsune_app\lib\core\ui\loading_fox.dart

import 'package:flutter/material.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:lottie/lottie.dart';

class KitsuneLoadingFox extends StatelessWidget {
  const KitsuneLoadingFox({
    super.key,
    this.message,
    this.size = 140,
  });

  final String? message;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Lottie.asset(
            'assets/lottie/happy_fox.json',
            width: size,
            height: size,
            repeat: true,
          ),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(
              message!,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: KitsuneColors.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

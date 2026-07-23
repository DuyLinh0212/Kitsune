// kitsune_app/lib/core/constants/supabase_config.dart

class SupabaseConfig {
  static const String url = String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://placeholder.supabase.co');
  static const String anonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: 'placeholder_key');

  static const String vocabSelect =
      'Id,FolderId,LanguageId,Word,Pronunciation,Meaning,SpecificData,CreatedAt,VocabularyFolder:FolderId(FolderName),Languages:LanguageId(LanguageCode,LanguageName),KanjiComponents:KanjiComponents(KanjiId,Kanji:KanjiId(Id,Character,AmHanViet),"Order")';

  static const String kanjiSelect =
      'Id,Character,Onyomi,Kunyomi,AmHanViet,Meaning,StrokeCount,JlptLevel,Mnemonic,Radical:RadicalId(Id,RadicalCharacter,RadicalName,EnglishName,Description)';

  static const String userProfileSelect =
      'Id, Username, Email, FullName, AvatarUrl, IsVerified, CreatedAt, User_Role(Role(RoleName))';

  static const String quizMetaSelect =
      'Id, Title, Description, TimeLimitInSeconds, CreatedAt, Creator:CreatorId(FullName, Username)';

  static const String grammarSelect =
      'Id,Title,Meaning,Structure,JlptLevel,Explanation,GrammarExamples(Id,JapaneseText,Reading,MeaningVi,OrderIndex)';

  static const String srsCardSelect =
      'Id, UserId, VocabularyId, KanjiId, BoxLevel, EaseFactor, IntervalDays, Repetitions, NextReviewDate';

  static const String kanjiComponentWithKanjiSelect =
      'VocabularyId, KanjiId, "Order", Kanji:KanjiId(Id, Character, AmHanViet, Meaning, StrokeCount, Onyomi, Kunyomi)';
}

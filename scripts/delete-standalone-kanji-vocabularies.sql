-- scripts/delete-standalone-kanji-vocabularies.sql
-- One-time data cleanup for legacy Vocabulary rows that are actually a single Kanji.
-- Run this in the Supabase SQL editor with an admin/service role connection.
-- The transaction either removes every dependent legacy record or rolls back entirely.

begin;

create temporary table cleanup_standalone_kanji_vocabularies on commit drop as
select vocabulary."Id"
from "Vocabularies" as vocabulary
join "Kanji" as kanji
  on kanji."Character" = btrim(vocabulary."Word")
where char_length(btrim(vocabulary."Word")) = 1;

select count(*) as standalone_kanji_vocabulary_count
from cleanup_standalone_kanji_vocabularies;

-- Preserve a valid Kanji SRS card when a legacy row incorrectly populated both keys.
update "SRSCards"
set "VocabularyId" = null
where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies)
  and "KanjiId" is not null;

-- These lesson items must go before their Vocabulary rows because LessonItems uses
-- ON DELETE RESTRICT. SrsCardLessons is removed by its existing cascade.
delete from "LessonItems"
where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies);

delete from "VocabularyBookmarks"
where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies);

delete from "Comments"
where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies);

delete from "KanjiComponents"
where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies);

delete from "SRSReviewLogs"
where "CardId" in (
  select "Id"
  from "SRSCards"
  where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies)
    and "KanjiId" is null
);

delete from "SRSCards"
where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies)
  and "KanjiId" is null;

-- Some installations have legacy QuizQuestions referencing a Vocabulary directly.
-- Remove those rows only when that optional column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'QuizQuestions'
      and column_name = 'VocabularyId'
  ) then
    execute 'delete from "QuizQuestions" where "VocabularyId" in (select "Id" from cleanup_standalone_kanji_vocabularies)';
  end if;
end;
$$;

delete from "Vocabularies"
where "Id" in (select "Id" from cleanup_standalone_kanji_vocabularies);

commit;

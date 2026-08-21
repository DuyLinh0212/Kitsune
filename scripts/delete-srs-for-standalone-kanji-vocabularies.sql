-- scripts/delete-srs-for-standalone-kanji-vocabularies.sql
-- One-time Supabase SQL Editor cleanup.
-- Deletes only SRS learning data for legacy Vocabulary cards whose entire word
-- is exactly one canonical Kanji (for example: 示). Proper KanjiId cards remain.

begin;

create temporary table standalone_kanji_srs_cards on commit drop as
select card."Id"
from "SRSCards" as card
join "Vocabularies" as vocabulary
  on vocabulary."Id" = card."VocabularyId"
join "Kanji" as kanji
  on kanji."Character" = btrim(vocabulary."Word")
where card."KanjiId" is null
  and char_length(btrim(vocabulary."Word")) = 1;

select count(*) as srs_cards_to_delete
from standalone_kanji_srs_cards;

-- Remove lesson provenance and review history before deleting the card itself.
delete from "SrsCardLessons"
where "CardId" in (select "Id" from standalone_kanji_srs_cards);

delete from "SRSReviewLogs"
where "CardId" in (select "Id" from standalone_kanji_srs_cards);

delete from "SRSCards"
where "Id" in (select "Id" from standalone_kanji_srs_cards);

commit;

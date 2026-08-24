-- Manual SQL Editor copy of supabase/migrations/20260824113000_learning_knowledge_graph.sql.
-- Keep this file synchronized with the CLI migration.

create extension if not exists pgcrypto;

create table if not exists "KnowledgeSkills" (
  "Code" text primary key,
  "Label" text not null check (char_length(trim("Label")) > 0),
  "Category" text not null check ("Category" in ('VOCABULARY', 'KANJI', 'GRAMMAR', 'READING')),
  "CreatedAt" timestamptz not null default now()
);

insert into "KnowledgeSkills" ("Code", "Label", "Category") values
  ('shape_meaning', 'Nhớ mặt chữ & nghĩa', 'KANJI'),
  ('word_recall', 'Gợi nhớ từ vựng', 'VOCABULARY'),
  ('vocab_context', 'Từ vựng trong ngữ cảnh', 'VOCABULARY'),
  ('on_reading', 'Âm On', 'KANJI'),
  ('kun_reading', 'Âm Kun', 'KANJI'),
  ('han_viet', 'Âm Hán Việt', 'KANJI'),
  ('handwriting', 'Viết Kanji', 'KANJI'),
  ('kanji_context', 'Kanji trong từ ghép', 'KANJI'),
  ('stroke_1_8', 'Kanji 1–8 nét', 'KANJI'),
  ('stroke_9_14', 'Kanji 9–14 nét', 'KANJI'),
  ('stroke_15_plus', 'Kanji trên 14 nét', 'KANJI'),
  ('on_kun_reading', 'Đọc Kanji', 'KANJI'),
  ('vocabulary', 'Vốn từ & sắc thái', 'VOCABULARY'),
  ('sentence_structure', 'Cấu trúc câu', 'GRAMMAR'),
  ('grammar', 'Ngữ pháp', 'GRAMMAR'),
  ('reading', 'Đọc hiểu', 'READING')
on conflict ("Code") do update set "Label" = excluded."Label", "Category" = excluded."Category";

create table if not exists "LearningEvidence" (
  "Id" uuid primary key default gen_random_uuid(),
  "UserId" int8 not null references "Users"("Id") on delete cascade,
  "SkillCode" text not null references "KnowledgeSkills"("Code") on delete restrict,
  "SourceType" text not null check ("SourceType" in ('SRS', 'EXAM', 'LEGACY')),
  "SourceCardId" int8 references "SRSCards"("Id") on delete cascade,
  "SourceAttemptId" int8 references "ExamAttempts"("Id") on delete cascade,
  "SourceQuestionId" int8 references "ExamQuestions"("Id") on delete set null,
  "SessionKey" uuid not null,
  "QuestionMode" text not null check (char_length(trim("QuestionMode")) > 0),
  "ItemType" text check ("ItemType" in ('VOCABULARY', 'KANJI', 'GRAMMAR', 'READING')),
  "VocabularyId" int8 references "Vocabularies"("Id") on delete set null,
  "KanjiId" int8 references "Kanji"("Id") on delete set null,
  "StrokeCount" int4 check ("StrokeCount" is null or "StrokeCount" >= 0),
  "IsCorrect" boolean not null,
  "ResponseTimeMs" int4 check ("ResponseTimeMs" is null or "ResponseTimeMs" >= 0),
  "Properties" jsonb not null default '{}'::jsonb,
  "OccurredAt" timestamptz not null default now(),
  "CreatedAt" timestamptz not null default now(),
  check (("SourceType" = 'SRS' and "SourceCardId" is not null and "SourceAttemptId" is null)
    or ("SourceType" = 'EXAM' and "SourceAttemptId" is not null and "SourceCardId" is null)
    or ("SourceType" = 'LEGACY' and "SourceAttemptId" is null and "SourceCardId" is null)),
  unique ("UserId", "SessionKey", "SkillCode")
);

create index if not exists "idx_learning_evidence_user_time" on "LearningEvidence" ("UserId", "OccurredAt" desc);
create index if not exists "idx_learning_evidence_user_skill" on "LearningEvidence" ("UserId", "SkillCode", "OccurredAt" desc);
create index if not exists "idx_learning_evidence_attempt" on "LearningEvidence" ("SourceAttemptId") where "SourceAttemptId" is not null;

alter table "KnowledgeSkills" enable row level security;
alter table "LearningEvidence" enable row level security;

drop policy if exists "KnowledgeSkills_read" on "KnowledgeSkills";
create policy "KnowledgeSkills_read" on "KnowledgeSkills" for select using (true);
drop policy if exists "LearningEvidence_owner_read" on "LearningEvidence";
create policy "LearningEvidence_owner_read" on "LearningEvidence" for select using ("UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email'));
drop policy if exists "LearningEvidence_owner_insert" on "LearningEvidence";
create policy "LearningEvidence_owner_insert" on "LearningEvidence" for insert with check ("UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email'));
drop policy if exists "LearningEvidence_owner_delete" on "LearningEvidence";
create policy "LearningEvidence_owner_delete" on "LearningEvidence" for delete using ("UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email'));

create or replace view "LearningKnowledgeStats" with (security_invoker = true) as
select evidence."UserId", skill."Code" as "SkillCode", skill."Label", skill."Category",
  count(*)::int4 as "Attempts", count(*) filter (where evidence."IsCorrect")::int4 as "Correct",
  round(count(*) filter (where evidence."IsCorrect")::numeric * 100 / nullif(count(*), 0))::int4 as "Score",
  max(evidence."OccurredAt") as "LastEvidenceAt"
from "LearningEvidence" evidence
join "KnowledgeSkills" skill on skill."Code" = evidence."SkillCode"
group by evidence."UserId", skill."Code", skill."Label", skill."Category";

grant select on "KnowledgeSkills", "LearningEvidence", "LearningKnowledgeStats" to authenticated;
grant insert, delete on "LearningEvidence" to authenticated;

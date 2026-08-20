-- Kitsune.Web/sql/005_topics_lessons_minigames.sql
-- Run manually in the Supabase SQL editor. Keeps VocabularyFolder intact while
-- v3 content is copied into topic/lesson membership and SRS becomes lesson-scoped.

create table if not exists "Topics" (
  "Id" bigint generated always as identity primary key,
  "Title" text not null check (char_length(trim("Title")) > 0),
  "Description" text,
  "ImageUrl" text,
  "JlptLevel" int4 check ("JlptLevel" between 1 and 5),
  "IsPublished" boolean not null default false,
  "CreatedBy" int8 references "Users"("Id") on delete set null,
  "CreatedAt" timestamptz not null default now(),
  "UpdatedAt" timestamptz not null default now()
);

create table if not exists "Lessons" (
  "Id" bigint generated always as identity primary key,
  "TopicId" int8 not null references "Topics"("Id") on delete cascade,
  "Title" text not null check (char_length(trim("Title")) > 0),
  "Description" text,
  "OrderIndex" int4 not null default 0,
  "EstimatedMinutes" int4 not null default 10 check ("EstimatedMinutes" between 1 and 180),
  "IsPublished" boolean not null default false,
  "CreatedAt" timestamptz not null default now(),
  unique ("TopicId", "OrderIndex")
);

create table if not exists "LessonItems" (
  "Id" bigint generated always as identity primary key,
  "LessonId" int8 not null references "Lessons"("Id") on delete cascade,
  "VocabularyId" int8 references "Vocabularies"("Id") on delete restrict,
  "KanjiId" int8 references "Kanji"("Id") on delete restrict,
  "SourceFolderId" int8 references "VocabularyFolder"("Id") on delete set null,
  "OrderIndex" int4 not null default 0,
  "ExampleSentence" text,
  "ExampleTranslation" text,
  "CreatedAt" timestamptz not null default now(),
  check (("VocabularyId" is not null)::int + ("KanjiId" is not null)::int = 1)
);

create unique index if not exists "uq_lesson_items_vocabulary"
  on "LessonItems" ("LessonId", "VocabularyId") where "VocabularyId" is not null;
create unique index if not exists "uq_lesson_items_kanji"
  on "LessonItems" ("LessonId", "KanjiId") where "KanjiId" is not null;

create table if not exists "UserLessonProgress" (
  "Id" bigint generated always as identity primary key,
  "UserId" int8 not null references "Users"("Id") on delete cascade,
  "LessonId" int8 not null references "Lessons"("Id") on delete cascade,
  "CompletedItemCount" int4 not null default 0 check ("CompletedItemCount" >= 0),
  "LastItemId" int8 references "LessonItems"("Id") on delete set null,
  "StartedAt" timestamptz not null default now(),
  "LastStudiedAt" timestamptz not null default now(),
  "CompletedAt" timestamptz,
  unique ("UserId", "LessonId")
);

-- A card can be reused across lessons while its scheduling history remains global.
-- This join makes queue loading lesson-scoped without duplicating legacy cards.
create table if not exists "SrsCardLessons" (
  "Id" bigint generated always as identity primary key,
  "UserId" int8 not null references "Users"("Id") on delete cascade,
  "CardId" int8 not null references "SRSCards"("Id") on delete cascade,
  "LessonItemId" int8 not null references "LessonItems"("Id") on delete cascade,
  "CreatedAt" timestamptz not null default now(),
  unique ("UserId", "LessonItemId")
);

create table if not exists "MinigameSessions" (
  "Id" bigint generated always as identity primary key,
  "UserId" int8 not null references "Users"("Id") on delete cascade,
  "GameType" text not null check ("GameType" in ('BUBBLE_POP', 'KANA_PATH', 'MEMORY_MATCH', 'LISTENING')),
  "Score" int4 not null default 0,
  "CorrectCount" int4 not null default 0,
  "WrongCount" int4 not null default 0,
  "DurationSeconds" int4 not null default 0,
  "CreatedAt" timestamptz not null default now()
);

create index if not exists "idx_lessons_topic" on "Lessons" ("TopicId", "OrderIndex");
create index if not exists "idx_lesson_items_lesson" on "LessonItems" ("LessonId", "OrderIndex");
create index if not exists "idx_progress_user" on "UserLessonProgress" ("UserId", "LessonId");
create index if not exists "idx_srs_card_lessons_lesson_item" on "SrsCardLessons" ("LessonItemId");
create index if not exists "idx_minigame_sessions_user" on "MinigameSessions" ("UserId", "CreatedAt" desc);

alter table "Topics" enable row level security;
alter table "Lessons" enable row level security;
alter table "LessonItems" enable row level security;
alter table "UserLessonProgress" enable row level security;
alter table "SrsCardLessons" enable row level security;
alter table "MinigameSessions" enable row level security;

drop policy if exists "Topics_read" on "Topics";
create policy "Topics_read" on "Topics" for select using (
  "IsPublished" = true or exists (
    select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
      and r."RoleName" = 'ADMIN'
  )
);
drop policy if exists "Topics_admin_write" on "Topics";
create policy "Topics_admin_write" on "Topics" for all using (
  exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
) with check (
  exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
);

drop policy if exists "Lessons_read" on "Lessons";
create policy "Lessons_read" on "Lessons" for select using (
  ("IsPublished" = true and exists (select 1 from "Topics" t where t."Id" = "TopicId" and t."IsPublished" = true))
  or exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
);
drop policy if exists "Lessons_admin_write" on "Lessons";
create policy "Lessons_admin_write" on "Lessons" for all using (
  exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
) with check (
  exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
);

drop policy if exists "LessonItems_read" on "LessonItems";
create policy "LessonItems_read" on "LessonItems" for select using (
  exists (select 1 from "Lessons" l join "Topics" t on t."Id" = l."TopicId"
    where l."Id" = "LessonId" and l."IsPublished" = true and t."IsPublished" = true)
  or exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
);
drop policy if exists "LessonItems_admin_write" on "LessonItems";
create policy "LessonItems_admin_write" on "LessonItems" for all using (
  exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
) with check (
  exists (select 1 from "User_Role" ur join "Roles" r on r."Id" = ur."RoleId"
    where ur."UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email') and r."RoleName" = 'ADMIN')
);

drop policy if exists "UserLessonProgress_owner" on "UserLessonProgress";
create policy "UserLessonProgress_owner" on "UserLessonProgress" for all using (
  "UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
) with check (
  "UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
);

drop policy if exists "SrsCardLessons_owner" on "SrsCardLessons";
create policy "SrsCardLessons_owner" on "SrsCardLessons" for all using (
  "UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
) with check (
  "UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
);

drop policy if exists "MinigameSessions_owner" on "MinigameSessions";
create policy "MinigameSessions_owner" on "MinigameSessions" for all using (
  "UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
) with check (
  "UserId" = (select "Id" from "Users" where "Email" = auth.jwt()->>'email')
);

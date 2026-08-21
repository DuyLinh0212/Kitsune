-- Keep lessons imported entirely from an already-learned folder at 100% progress.
create or replace function public.sync_learned_folder_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  folder_user_id bigint;
  lesson_item_count integer;
  last_lesson_item_id bigint;
begin
  if new."SourceFolderId" is null then
    return new;
  end if;

  select folder."UserId"
    into folder_user_id
  from "VocabularyFolder" as folder
  where folder."Id" = new."SourceFolderId";

  if folder_user_id is null then
    return new;
  end if;

  -- Every item in the lesson must come from folders owned by the same learner,
  -- and every vocabulary in each source folder must already have left box 0.
  if exists (
    select 1
    from "LessonItems" as lesson_item
    left join "VocabularyFolder" as source_folder
      on source_folder."Id" = lesson_item."SourceFolderId"
    where lesson_item."LessonId" = new."LessonId"
      and (
        lesson_item."SourceFolderId" is null
        or source_folder."UserId" is distinct from folder_user_id
        or not exists (
          select 1
          from "Vocabularies" as folder_vocabulary
          where folder_vocabulary."FolderId" = source_folder."Id"
        )
        or exists (
          select 1
          from "Vocabularies" as folder_vocabulary
          where folder_vocabulary."FolderId" = source_folder."Id"
            and not exists (
              select 1
              from "SRSCards" as card
              where card."UserId" = folder_user_id
                and card."VocabularyId" = folder_vocabulary."Id"
                and card."BoxLevel" > 0
            )
        )
      )
  ) then
    return new;
  end if;

  select count(*)::integer
    into lesson_item_count
  from "LessonItems"
  where "LessonId" = new."LessonId";

  select "Id"
    into last_lesson_item_id
  from "LessonItems"
  where "LessonId" = new."LessonId"
  order by "OrderIndex" desc, "Id" desc
  limit 1;

  insert into "UserLessonProgress" (
    "UserId",
    "LessonId",
    "CompletedItemCount",
    "LastItemId",
    "StartedAt",
    "LastStudiedAt",
    "CompletedAt"
  )
  values (
    folder_user_id,
    new."LessonId",
    lesson_item_count,
    last_lesson_item_id,
    now(),
    now(),
    now()
  )
  on conflict ("UserId", "LessonId") do update
  set "CompletedItemCount" = excluded."CompletedItemCount",
      "LastItemId" = excluded."LastItemId",
      "LastStudiedAt" = excluded."LastStudiedAt",
      "CompletedAt" = excluded."CompletedAt";

  return new;
end;
$$;

drop trigger if exists sync_learned_folder_lesson_progress_after_import on "LessonItems";
create trigger sync_learned_folder_lesson_progress_after_import
after insert or update of "LessonId", "SourceFolderId"
on "LessonItems"
for each row
execute function public.sync_learned_folder_lesson_progress();

-- One-time backfill for lessons that were imported before this trigger existed.
with eligible_lessons as (
  select distinct lesson_item."LessonId", source_folder."UserId"
  from "LessonItems" as lesson_item
  join "VocabularyFolder" as source_folder
    on source_folder."Id" = lesson_item."SourceFolderId"
  where not exists (
    select 1
    from "LessonItems" as checked_item
    left join "VocabularyFolder" as checked_folder
      on checked_folder."Id" = checked_item."SourceFolderId"
    where checked_item."LessonId" = lesson_item."LessonId"
      and (
        checked_item."SourceFolderId" is null
        or checked_folder."UserId" is distinct from source_folder."UserId"
        or not exists (
          select 1
          from "Vocabularies" as folder_vocabulary
          where folder_vocabulary."FolderId" = checked_folder."Id"
        )
        or exists (
          select 1
          from "Vocabularies" as folder_vocabulary
          where folder_vocabulary."FolderId" = checked_folder."Id"
            and not exists (
              select 1
              from "SRSCards" as card
              where card."UserId" = source_folder."UserId"
                and card."VocabularyId" = folder_vocabulary."Id"
                and card."BoxLevel" > 0
            )
        )
      )
  )
), completed_lessons as (
  select
    eligible."UserId",
    eligible."LessonId",
    count(lesson_item."Id")::integer as completed_item_count,
    (array_agg(lesson_item."Id" order by lesson_item."OrderIndex" desc, lesson_item."Id" desc))[1] as last_item_id
  from eligible_lessons as eligible
  join "LessonItems" as lesson_item
    on lesson_item."LessonId" = eligible."LessonId"
  group by eligible."UserId", eligible."LessonId"
)
insert into "UserLessonProgress" (
  "UserId",
  "LessonId",
  "CompletedItemCount",
  "LastItemId",
  "StartedAt",
  "LastStudiedAt",
  "CompletedAt"
)
select
  completed."UserId",
  completed."LessonId",
  completed.completed_item_count,
  completed.last_item_id,
  now(),
  now(),
  now()
from completed_lessons as completed
on conflict ("UserId", "LessonId") do update
set "CompletedItemCount" = excluded."CompletedItemCount",
    "LastItemId" = excluded."LastItemId",
    "LastStudiedAt" = excluded."LastStudiedAt",
    "CompletedAt" = excluded."CompletedAt";

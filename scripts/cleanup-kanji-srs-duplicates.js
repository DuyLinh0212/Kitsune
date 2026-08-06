const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const applyChanges = process.argv.includes('--apply');
const userIdArgument = process.argv.find((argument) => argument.startsWith('--user-id='));
const userId = userIdArgument ? Number(userIdArgument.split('=')[1]) : null;
const PAGE_SIZE = 500;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

if (userIdArgument && (!Number.isInteger(userId) || userId <= 0)) {
  console.error('--user-id must be a positive integer.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fetchFolderVocabularies() {
  const rows = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from('Vocabularies')
      .select('Id, FolderId, Word, SpecificData, KanjiComponents(KanjiId, Kanji:KanjiId(Character))')
      .not('FolderId', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw new Error(`Unable to read folder vocabularies: ${error.message}`);

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

function isKanjiOnlyVocabulary(row) {
  const specificData = row.SpecificData;
  const itemType = specificData?._kitsuneItemType;
  if (itemType === 'kanji') return true;
  if (itemType === 'vocabulary' || specificData != null) return false;

  const word = String(row.Word ?? '').trim();
  const components = Array.isArray(row.KanjiComponents) ? row.KanjiComponents : [];
  const character = components[0]?.Kanji?.Character;
  return Array.from(word).length === 1 && components.length === 1 && character === word;
}

async function fetchDuplicateCards(vocabularyIds) {
  const cards = [];

  for (let offset = 0; offset < vocabularyIds.length; offset += PAGE_SIZE) {
    const ids = vocabularyIds.slice(offset, offset + PAGE_SIZE);
    let query = supabase
      .from('SRSCards')
      .select('Id, UserId, VocabularyId, KanjiId')
      .in('VocabularyId', ids)
      .is('KanjiId', null);

    if (userId != null) query = query.eq('UserId', userId);

    const { data, error } = await query;
    if (error) throw new Error(`Unable to read SRS cards: ${error.message}`);
    cards.push(...(data ?? []));
  }

  return cards;
}

async function deleteInBatches(table, column, ids) {
  for (let offset = 0; offset < ids.length; offset += PAGE_SIZE) {
    const batch = ids.slice(offset, offset + PAGE_SIZE);
    const { error } = await supabase.from(table).delete().in(column, batch);
    if (error) throw new Error(`Unable to delete ${table}: ${error.message}`);
  }
}

async function main() {
  const folderVocabularies = await fetchFolderVocabularies();
  const kanjiRows = folderVocabularies.filter(isKanjiOnlyVocabulary);
  const kanjiVocabularyIds = kanjiRows.map((row) => row.Id);

  console.log(`Found ${kanjiRows.length} Kanji-only folder rows.`);
  if (kanjiRows.length > 0) {
    console.table(kanjiRows.map((row) => ({
      vocabularyId: row.Id,
      folderId: row.FolderId,
      word: row.Word,
    })));
  }

  if (kanjiVocabularyIds.length === 0) {
    console.log('No Kanji-only rows require cleanup.');
    return;
  }

  const duplicateCards = await fetchDuplicateCards(kanjiVocabularyIds);
  console.log(`Found ${duplicateCards.length} legacy VocabularyId SRS cards.`);
  if (duplicateCards.length > 0) console.table(duplicateCards);

  if (!applyChanges) {
    console.log('Dry run only. Re-run with --apply to delete these SRS cards and their review logs.');
    return;
  }

  const cardIds = duplicateCards.map((card) => card.Id);
  await deleteInBatches('SRSReviewLogs', 'CardId', cardIds);
  await deleteInBatches('SRSCards', 'Id', cardIds);
  console.log(`Deleted ${cardIds.length} legacy SRS cards and their review logs.`);
}

main().catch((error) => {
  console.error('Kanji SRS cleanup failed:', error.message);
  process.exit(1);
});

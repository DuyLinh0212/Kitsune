const { createClient } = require('@supabase/supabase-js');

const PAGE_SIZE = 500;
const applyChanges = process.argv.includes('--apply');
const userId = parsePositiveInteger(readArgument('--user-id'));
const from = parseDateArgument('--from', true);
const to = parseDateArgument('--to', false);
const requestedCardIds = parseCardIds(readArgument('--card-ids'));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  fail('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

if (userId == null) {
  fail('--user-id must be a positive integer.');
}

if (from == null) {
  fail('--from must be a valid ISO-8601 timestamp.');
}

if (to != null && to.getTime() < from.getTime()) {
  fail('--to must be after --from.');
}

if (applyChanges && requestedCardIds.length === 0) {
  fail('--apply requires an explicit --card-ids list from a dry-run result.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function readArgument(name) {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument ? argument.slice(name.length + 1).trim() : null;
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDateArgument(name, required) {
  const value = readArgument(name);
  if (!value) return required ? null : null;

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseCardIds(value) {
  if (!value) return [];

  const ids = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

  if (ids.length === 0 || ids.length !== value.split(',').length) {
    fail('--card-ids must be a comma-separated list of positive card IDs.');
  }

  return [...new Set(ids)];
}

function fail(message) {
  console.error(message);
  console.error('Usage: node scripts/reset-accidental-srs-learning.js --user-id=<id> --from=<ISO> [--to=<ISO>] [--card-ids=<id,id,...>] [--apply]');
  process.exit(1);
}

function isSameInstant(left, right) {
  const leftMs = Date.parse(left ?? '');
  const rightMs = Date.parse(right ?? '');
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && Math.abs(leftMs - rightMs) < 1000;
}

async function fetchInitialLearningLogs() {
  const logs = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from('SRSReviewLogs')
      .select('Id, CardId, Rating, OldBoxLevel, NewBoxLevel, ReviewedAt')
      .eq('OldBoxLevel', 0)
      .eq('NewBoxLevel', 1)
      .gte('ReviewedAt', from.toISOString())
      .order('ReviewedAt', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (to != null) query = query.lte('ReviewedAt', to.toISOString());
    if (requestedCardIds.length > 0) query = query.in('CardId', requestedCardIds);

    const { data, error } = await query;
    if (error) throw new Error(`Unable to read SRS review logs: ${error.message}`);

    logs.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return logs;
  }
}

async function fetchCards(cardIds) {
  if (cardIds.length === 0) return [];

  const cards = [];
  for (let offset = 0; offset < cardIds.length; offset += PAGE_SIZE) {
    const batch = cardIds.slice(offset, offset + PAGE_SIZE);
    const { data, error } = await supabase
      .from('SRSCards')
      .select('Id, UserId, VocabularyId, KanjiId, BoxLevel, EaseFactor, IntervalDays, Repetitions, NextReviewDate, LastReviewedAt')
      .eq('UserId', userId)
      .in('Id', batch);

    if (error) throw new Error(`Unable to read SRS cards: ${error.message}`);
    cards.push(...(data ?? []));
  }

  return cards;
}

async function fetchAllLogsForCards(cardIds) {
  if (cardIds.length === 0) return [];

  const logs = [];
  for (let offset = 0; offset < cardIds.length; offset += PAGE_SIZE) {
    const batch = cardIds.slice(offset, offset + PAGE_SIZE);
    const { data, error } = await supabase
      .from('SRSReviewLogs')
      .select('Id, CardId, OldBoxLevel, NewBoxLevel, ReviewedAt')
      .in('CardId', batch)
      .order('ReviewedAt', { ascending: true });

    if (error) throw new Error(`Unable to verify SRS review history: ${error.message}`);
    logs.push(...(data ?? []));
  }

  return logs;
}

function selectSafeCandidates(initialLogs, cards, allCardLogs) {
  const cardsById = new Map(cards.map((card) => [card.Id, card]));
  const logsByCardId = new Map();
  const initialLogsByCardId = new Map();
  for (const log of allCardLogs) {
    const logs = logsByCardId.get(log.CardId) ?? [];
    logs.push(log);
    logsByCardId.set(log.CardId, logs);
  }
  for (const log of initialLogs) {
    const logs = initialLogsByCardId.get(log.CardId) ?? [];
    logs.push(log);
    initialLogsByCardId.set(log.CardId, logs);
  }

  const safe = [];
  const skipped = [];

  for (const log of initialLogs) {
    const card = cardsById.get(log.CardId);
    if (!card) {
      skipped.push({ cardId: log.CardId, logId: log.Id, reason: 'Card does not belong to the supplied user.' });
      continue;
    }

    if ((initialLogsByCardId.get(card.Id) ?? []).length !== 1) {
      skipped.push({ cardId: card.Id, logId: log.Id, reason: 'Card has multiple matching initial-learning logs.' });
      continue;
    }

    const cardLogs = logsByCardId.get(card.Id) ?? [];
    const reviewedLater = cardLogs.some((entry) => Date.parse(entry.ReviewedAt) > Date.parse(log.ReviewedAt) + 1000);
    const stillAtInitialState =
      card.BoxLevel === 1 &&
      card.Repetitions === 1 &&
      Number(card.EaseFactor) === 2.5 &&
      Number(card.IntervalDays) === 1 &&
      isSameInstant(card.LastReviewedAt, log.ReviewedAt);

    if (reviewedLater) {
      skipped.push({ cardId: card.Id, logId: log.Id, reason: 'Card has a later review log.' });
      continue;
    }

    if (!stillAtInitialState) {
      skipped.push({ cardId: card.Id, logId: log.Id, reason: 'Card is no longer at the initial level-1 state.' });
      continue;
    }

    safe.push({ card, log });
  }

  return { safe, skipped };
}

async function resetCard(candidate) {
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('SRSCards')
    .update({
      BoxLevel: 0,
      EaseFactor: 2.5,
      IntervalDays: 0,
      Repetitions: 0,
      NextReviewDate: now,
      LastReviewedAt: null,
    })
    .eq('Id', candidate.card.Id)
    .eq('UserId', userId)
    .eq('BoxLevel', 1)
    .eq('Repetitions', 1)
    .eq('LastReviewedAt', candidate.card.LastReviewedAt);

  if (updateError) throw new Error(`Unable to reset card ${candidate.card.Id}: ${updateError.message}`);

  const { error: deleteError } = await supabase
    .from('SRSReviewLogs')
    .delete()
    .eq('Id', candidate.log.Id)
    .eq('CardId', candidate.card.Id);

  if (deleteError) throw new Error(`Card ${candidate.card.Id} was reset, but its log ${candidate.log.Id} could not be removed: ${deleteError.message}`);
}

async function main() {
  const initialLogs = await fetchInitialLearningLogs();
  const candidateCardIds = [...new Set(initialLogs.map((log) => log.CardId))];
  const cards = await fetchCards(candidateCardIds);
  const allCardLogs = await fetchAllLogsForCards(cards.map((card) => card.Id));
  const { safe, skipped } = selectSafeCandidates(initialLogs, cards, allCardLogs);

  console.log(`Found ${initialLogs.length} level-0 → level-1 log(s) in the requested time range.`);
  console.log(`Safe to reset: ${safe.length}. Skipped: ${skipped.length}.`);

  if (safe.length > 0) {
    console.table(safe.map(({ card, log }) => ({
      cardId: card.Id,
      logId: log.Id,
      vocabularyId: card.VocabularyId,
      kanjiId: card.KanjiId,
      reviewedAt: log.ReviewedAt,
    })));
    console.log(`Safe card IDs: ${safe.map(({ card }) => card.Id).join(',')}`);
  }

  if (skipped.length > 0) console.table(skipped);

  if (!applyChanges) {
    console.log('Dry run only. Review the IDs above, then run again with --card-ids=<safe ids> --apply.');
    return;
  }

  const safeIds = new Set(safe.map(({ card }) => card.Id));
  const missingIds = requestedCardIds.filter((cardId) => !safeIds.has(cardId));
  if (missingIds.length > 0) {
    throw new Error(`Refusing to apply: these requested card IDs are not safe candidates: ${missingIds.join(',')}`);
  }

  for (const candidate of safe) {
    await resetCard(candidate);
  }

  console.log(`Reset ${safe.length} card(s) to new and removed their matching accidental review log(s).`);
}

main().catch((error) => {
  console.error('Accidental SRS reset failed:', error.message);
  process.exit(1);
});

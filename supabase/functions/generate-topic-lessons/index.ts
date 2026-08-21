// supabase/functions/generate-topic-lessons/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  topic: string;
  lessonCount: number;
}

interface CatalogVocabulary {
  Id: number;
  Word: string;
  Pronunciation: string | null;
  Meaning: string;
  KanjiIds: number[];
}

interface GeneratedLesson {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  vocabularyIds?: number[];
  kanjiIds?: number[];
}

interface GeneratedPlan {
  topicDescription?: string;
  lessons?: GeneratedLesson[];
}

interface RetrievedCatalog { vocabularyIds?: number[]; }
interface TopicSearchPlan { terms?: string[]; }

interface GeminiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

class GeminiRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'GeminiRequestError';
  }
}

const preferredGeminiModels = [
  'models/gemini-3.1-flash-lite',
];
const minimumVocabularyPerLesson = 20;
const maximumVocabularyPerLesson = 30;
const maximumSearchTerms = 12;
const maximumCandidatesPerTerm = 450;

async function getGeminiErrorMessage(response: Response): Promise<string> {
  const responseText = await response.text();
  try {
    const payload = JSON.parse(responseText) as { error?: { message?: string } };
    if (payload.error?.message) return payload.error.message;
  } catch {
    // The fallback below preserves a non-JSON provider response for diagnostics.
  }
  return responseText.slice(0, 280) || 'Không có nội dung phản hồi từ Gemini.';
}

async function resolveGeminiModel(apiKey: string): Promise<string> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey },
  });
  if (!response.ok) {
    throw new Error(`Không thể đọc danh sách model Gemini (${response.status}): ${await getGeminiErrorMessage(response)}`);
  }

  const payload = await response.json() as { models?: GeminiModel[] };
  const availableModels = (payload.models ?? []).filter((model) => model.supportedGenerationMethods?.includes('generateContent'));
  const selectedModel = preferredGeminiModels.find((name) => availableModels.some((model) => model.name === name));
  if (!selectedModel) throw new Error('API key Gemini không có quyền dùng Gemini 3.1 Flash-Lite. Hãy tạo key có quyền truy cập model này trong Google AI Studio.');
  return selectedModel;
}

async function requestGeminiPlan(apiKey: string, model: string, prompt: string): Promise<Response> {
  const retryDelays = [700, 1600];
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 32768,
          },
        }),
      },
    );
    if (response.ok) return response;
    if ((response.status === 429 || response.status === 503) && attempt < retryDelays.length) {
      await response.body?.cancel().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
      continue;
    }
    throw new GeminiRequestError(response.status, `Gemini trả về lỗi ${response.status}: ${await getGeminiErrorMessage(response)}`);
  }
  throw new GeminiRequestError(503, 'Gemini đang bận sau nhiều lần thử. Vui lòng thử lại sau ít phút.');
}

function parseGeminiJson<T>(text: string): T {
  try { return JSON.parse(text) as T; } catch { /* Gemini may append prose after valid JSON. */ }
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error('Gemini không trả về JSON hợp lệ.');
  const opening = text[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === opening) depth += 1;
    if (char === closing) {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, index + 1)) as T;
    }
  }
  throw new Error('Gemini trả về JSON chưa hoàn chỉnh.');
}

async function getGeminiText(response: Response): Promise<string> {
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini không trả về nội dung.');
  return text;
}

function normalizeSearchTerm(term: string): string {
  return term.trim().replace(/[,%()."]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
}

async function buildTopicSearchTerms(apiKey: string, model: string, topic: string): Promise<string[]> {
  const prompt = [
    `Tạo bộ từ khóa để tìm từ vựng tiếng Nhật trong kho dữ liệu cho chủ đề “${topic}”.`,
    'Trả tối đa 11 từ/cụm từ tìm kiếm ngắn bằng tiếng Nhật hoặc tiếng Việt, gồm cả từ đồng nghĩa và các mảng con thiết thực.',
    'Không giải thích. Chỉ trả JSON: {"terms":[string]}.',
  ].join('\n');
  const result = parseGeminiJson<TopicSearchPlan>(await getGeminiText(await requestGeminiPlan(apiKey, model, prompt)));
  const terms = [topic, ...(result.terms ?? [])]
    .filter((term): term is string => typeof term === 'string')
    .map(normalizeSearchTerm)
    .filter(Boolean);
  return [...new Set(terms)].slice(0, maximumSearchTerms);
}

function scoreVocabularyMatch(vocabulary: CatalogVocabulary, terms: string[]): number {
  const searchable = `${vocabulary.Word} ${vocabulary.Pronunciation ?? ''} ${vocabulary.Meaning}`.toLocaleLowerCase();
  return terms.reduce((score, term, index) => searchable.includes(term.toLocaleLowerCase()) ? score + maximumSearchTerms - index : score, 0);
}

async function loadVocabularyCandidates(
  supabase: ReturnType<typeof createClient>,
  terms: string[],
  requiredVocabularyCount: number,
): Promise<CatalogVocabulary[]> {
  const responses = await Promise.all(terms.map(async (term) => {
    const pattern = `%${term}%`;
    return supabase
      .from('Vocabularies')
      .select('Id, Word, Pronunciation, Meaning')
      .or(`Word.ilike.${pattern},Pronunciation.ilike.${pattern},Meaning.ilike.${pattern}`)
      .limit(maximumCandidatesPerTerm);
  }));
  const byId = new Map<number, CatalogVocabulary>();
  for (const response of responses) {
    if (response.error) throw response.error;
    for (const vocabulary of response.data ?? []) {
      byId.set(vocabulary.Id, { ...vocabulary, KanjiIds: [] });
    }
  }
  const candidateLimit = Math.max(requiredVocabularyCount * 4, 500);
  return [...byId.values()]
    .map((vocabulary) => ({ vocabulary, score: scoreVocabularyMatch(vocabulary, terms) }))
    .sort((left, right) => right.score - left.score || left.vocabulary.Id - right.vocabulary.Id)
    .slice(0, candidateLimit)
    .map(({ vocabulary }) => vocabulary);
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('Thiếu phiên đăng nhập quản trị.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
      throw new Error('Edge Function chưa được cấu hình SUPABASE_URL, SUPABASE_ANON_KEY hoặc GEMINI_API_KEY.');
    }

    const body = await request.json() as GenerateRequest;
    const topic = body.topic?.trim();
    const lessonCount = Math.min(20, Math.max(1, Math.floor(body.lessonCount ?? 1)));
    if (!topic) throw new Error('Chủ đề không được để trống.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.email) throw new Error('Phiên đăng nhập không hợp lệ.');
    const { data: profile, error: profileError } = await supabase.from('Users').select('Id').eq('Email', authData.user.email).single();
    if (profileError) throw profileError;
    const { data: assignments, error: assignmentError } = await supabase.from('User_Role').select('RoleId').eq('UserId', profile.Id);
    if (assignmentError) throw assignmentError;
    const roleIds = (assignments ?? []).map((assignment) => assignment.RoleId);
    if (roleIds.length === 0) throw new Error('Chỉ quản trị viên mới có thể dùng trợ lý AI.');
    const { data: adminRole, error: roleError } = await supabase.from('Role').select('Id').in('Id', roleIds).eq('RoleName', 'ADMIN').maybeSingle();
    if (roleError) throw roleError;
    if (!adminRole) throw new Error('Chỉ quản trị viên mới có thể dùng trợ lý AI.');

    const geminiModel = await resolveGeminiModel(geminiApiKey);
    const requiredVocabularyCount = lessonCount * minimumVocabularyPerLesson;
    const searchTerms = await buildTopicSearchTerms(geminiApiKey, geminiModel, topic);
    if (!searchTerms.length) throw new Error('Không tạo được từ khóa để tìm học liệu cho chủ đề này.');
    const vocabularyCatalog = await loadVocabularyCandidates(supabase, searchTerms, requiredVocabularyCount);
    if (vocabularyCatalog.length < requiredVocabularyCount) {
      const shortfall = requiredVocabularyCount - vocabularyCatalog.length;
      const maximumLessonCount = Math.floor(vocabularyCatalog.length / minimumVocabularyPerLesson);
      throw new Error(
        `Đã tìm trên toàn bộ kho từ vựng theo “${searchTerms.join('”, “')}” nhưng chỉ có ${vocabularyCatalog.length} ứng viên cho chủ đề “${topic}”. `
        + `Cần ít nhất ${requiredVocabularyCount} từ cho ${lessonCount} Lesson (20 từ × ${lessonCount}, không lặp); còn thiếu ${shortfall}. `
        + `Với kết quả hiện tại chỉ tạo được tối đa ${maximumLessonCount} Lesson.`,
      );
    }
    const retrievalPrompt = [
      `Bạn là bộ truy hồi học liệu cho lộ trình tiếng Nhật chủ đề "${topic}".`,
      `Đây là các ứng viên đã được database tìm từ toàn bộ kho theo các từ khóa liên quan. Ưu tiên các từ trực tiếp và thực tế nhất cho chủ đề.`,
      `Chọn tối đa ${Math.min(vocabularyCatalog.length, lessonCount * maximumVocabularyPerLesson)} ID; không cần chọn đủ vì hệ thống sẽ bổ sung từ ứng viên hợp lệ còn lại.`,
      'Chỉ trả JSON: {"vocabularyIds":[number]}.',
      `VOCABULARY_CATALOG=${JSON.stringify(vocabularyCatalog)}`,
    ].join('\n');
    const retrieved = parseGeminiJson<RetrievedCatalog>(await getGeminiText(await requestGeminiPlan(geminiApiKey, geminiModel, retrievalPrompt)));
    const allVocabularyIds = new Set(vocabularyCatalog.map((entry) => entry.Id));
    const retrievedIds = [...new Set((retrieved.vocabularyIds ?? []).filter((id) => Number.isInteger(id) && allVocabularyIds.has(id)))];
    const orderedRetrievedIds = [...retrievedIds, ...vocabularyCatalog.map((entry) => entry.Id).filter((id) => !retrievedIds.includes(id))];
    const retrievedVocabularyCatalog = orderedRetrievedIds.map((id) => vocabularyCatalog.find((entry) => entry.Id === id)).filter((entry): entry is CatalogVocabulary => !!entry);
    const { data: components, error: componentError } = await supabase
      .from('KanjiComponents')
      .select('VocabularyId, KanjiId')
      .in('VocabularyId', orderedRetrievedIds)
      .order('Order');
    if (componentError) throw componentError;
    const kanjiByVocabulary = new Map<number, number[]>();
    for (const component of components ?? []) {
      const ids = kanjiByVocabulary.get(component.VocabularyId) ?? [];
      if (!ids.includes(component.KanjiId)) ids.push(component.KanjiId);
      kanjiByVocabulary.set(component.VocabularyId, ids);
    }
    const prompt = [
      `Tạo lộ trình tiếng Nhật về chủ đề "${topic}" gồm đúng ${lessonCount} bài học.`,
      `Mỗi bài bắt buộc chọn từ ${minimumVocabularyPerLesson} đến ${maximumVocabularyPerLesson} vocabularyIds khác nhau, phù hợp trực tiếp với chủ đề của bài.`,
      'Chỉ chọn ID có trong RETRIEVED_VOCABULARY_CATALOG. Không được bổ sung ID ngoài tập truy hồi này; phân bổ từ dễ đến khó và ưu tiên không lặp từ vựng giữa các bài.',
      'Hệ thống tự gắn Kanji từ các từ vựng đã chọn. Mỗi bài chỉ cần title, description, estimatedMinutes và vocabularyIds.',
      'Chỉ trả về JSON theo schema được cung cấp.',
      `RETRIEVED_VOCABULARY_CATALOG=${JSON.stringify(retrievedVocabularyCatalog)}`,
    ].join('\n');

    const generated = parseGeminiJson<GeneratedPlan>(await getGeminiText(await requestGeminiPlan(geminiApiKey, geminiModel, prompt)));
    // Gemini occasionally returns one fewer or one extra lesson despite a strict prompt.
    // Keep the request deterministic for the admin: trim extras and let the catalog-backed
    // normalizer complete any missing lesson rather than rejecting an otherwise usable plan.
    const generatedLessons = Array.isArray(generated.lessons) ? generated.lessons.slice(0, lessonCount) : [];
    while (generatedLessons.length < lessonCount) generatedLessons.push({});
    const vocabularyIds = new Set(retrievedVocabularyCatalog.map((entry) => entry.Id));
    const usedVocabularyIds = new Set<number>();
    const safePlan = {
      topicDescription: typeof generated.topicDescription === 'string' ? generated.topicDescription : '',
      lessons: generatedLessons.map((lesson, index) => {
        const safeVocabularyIds = [...new Set((lesson.vocabularyIds ?? []).filter((id) => Number.isInteger(id) && vocabularyIds.has(id)))]
          .filter((id) => !usedVocabularyIds.has(id))
          .slice(0, maximumVocabularyPerLesson);
        for (const vocabularyId of orderedRetrievedIds) {
          if (safeVocabularyIds.length >= minimumVocabularyPerLesson) break;
          if (!usedVocabularyIds.has(vocabularyId) && !safeVocabularyIds.includes(vocabularyId)) safeVocabularyIds.push(vocabularyId);
        }
        if (safeVocabularyIds.length < minimumVocabularyPerLesson) throw new Error('Kho ứng viên thay đổi trong lúc tạo lộ trình. Không có Topic hoặc Lesson nào được lưu.');
        for (const vocabularyId of safeVocabularyIds) usedVocabularyIds.add(vocabularyId);
        const safeKanjiIds = new Set<number>();
        for (const vocabularyId of safeVocabularyIds) {
          for (const kanjiId of kanjiByVocabulary.get(vocabularyId) ?? []) safeKanjiIds.add(kanjiId);
        }
        return {
          title: typeof lesson.title === 'string' && lesson.title.trim() ? lesson.title.trim() : `Bài ${index + 1}`,
          description: typeof lesson.description === 'string' ? lesson.description.trim() : '',
          estimatedMinutes: Math.min(180, Math.max(1, Math.floor(lesson.estimatedMinutes ?? 10))),
          vocabularyIds: safeVocabularyIds,
          kanjiIds: [...safeKanjiIds],
        };
      }),
    };

    return new Response(JSON.stringify(safePlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tạo lộ trình bằng AI.';
    console.error('[generate-topic-lessons]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: error instanceof GeminiRequestError ? error.status : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
});

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

interface CatalogKanji {
  Id: number;
  Character: string;
  AmHanViet: string;
  Meaning: string;
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

    const [
      { data: vocabularies, error: vocabularyError },
      { data: kanji, error: kanjiError },
      { data: components, error: componentError },
    ] = await Promise.all([
      supabase.from('Vocabularies').select('Id, Word, Pronunciation, Meaning').limit(500),
      supabase.from('Kanji').select('Id, Character, AmHanViet, Meaning').limit(350),
      supabase.from('KanjiComponents').select('VocabularyId, KanjiId').order('Order').limit(5000),
    ]);
    if (vocabularyError) throw vocabularyError;
    if (kanjiError) throw kanjiError;
    if (componentError) throw componentError;

    const kanjiByVocabulary = new Map<number, number[]>();
    for (const component of components ?? []) {
      const ids = kanjiByVocabulary.get(component.VocabularyId) ?? [];
      if (!ids.includes(component.KanjiId)) ids.push(component.KanjiId);
      kanjiByVocabulary.set(component.VocabularyId, ids);
    }
    const vocabularyCatalog = (vocabularies ?? []).map((entry) => ({
      ...entry,
      KanjiIds: kanjiByVocabulary.get(entry.Id) ?? [],
    })) as CatalogVocabulary[];
    const kanjiCatalog = (kanji ?? []) as CatalogKanji[];
    if (vocabularyCatalog.length < minimumVocabularyPerLesson) {
      throw new Error(`Kho dữ liệu cần ít nhất ${minimumVocabularyPerLesson} từ vựng để tạo một bài học.`);
    }
    const geminiModel = await resolveGeminiModel(geminiApiKey);
    const retrievalPrompt = [
      `Bạn là bộ truy hồi học liệu cho lộ trình tiếng Nhật chủ đề "${topic}".`,
      `Chỉ chọn vocabularyIds có ý nghĩa trực tiếp cho chủ đề. Loại hoàn toàn từ không liên quan, kể cả từ phổ biến nhưng sai lĩnh vực.`,
      `Cần tối đa ${Math.min(vocabularyCatalog.length, lessonCount * maximumVocabularyPerLesson)} ID để đủ ${lessonCount} bài; nếu kho không đủ từ liên quan, chỉ trả về số ID liên quan thực sự.`,
      'Chỉ trả JSON: {"vocabularyIds":[number]}.',
      `VOCABULARY_CATALOG=${JSON.stringify(vocabularyCatalog)}`,
    ].join('\n');
    const retrieved = parseGeminiJson<RetrievedCatalog>(await getGeminiText(await requestGeminiPlan(geminiApiKey, geminiModel, retrievalPrompt)));
    const allVocabularyIds = new Set(vocabularyCatalog.map((entry) => entry.Id));
    const retrievedIds = [...new Set((retrieved.vocabularyIds ?? []).filter((id) => Number.isInteger(id) && allVocabularyIds.has(id)))];
    if (retrievedIds.length < minimumVocabularyPerLesson) {
      throw new Error(`Kho học liệu chưa có đủ ${minimumVocabularyPerLesson} từ liên quan trực tiếp đến chủ đề “${topic}”.`);
    }
    const retrievedVocabularyCatalog = vocabularyCatalog.filter((entry) => retrievedIds.includes(entry.Id));
    const prompt = [
      `Tạo lộ trình tiếng Nhật về chủ đề "${topic}" gồm đúng ${lessonCount} bài học.`,
      `Mỗi bài bắt buộc chọn từ ${minimumVocabularyPerLesson} đến ${maximumVocabularyPerLesson} vocabularyIds khác nhau, phù hợp trực tiếp với chủ đề của bài.`,
      'Chỉ chọn ID có trong RETRIEVED_VOCABULARY_CATALOG. Không được bổ sung ID ngoài tập truy hồi này; phân bổ từ dễ đến khó và ưu tiên không lặp từ vựng giữa các bài.',
      'KanjiIds phải chứa toàn bộ KanjiIds thuộc các từ vựng đã chọn, cộng thêm Kanji liên quan nếu cần, và tuyệt đối không lặp ID trong cùng bài.',
      'Mỗi bài có title, description, estimatedMinutes, vocabularyIds và kanjiIds. Chỉ trả về JSON theo schema được cung cấp.',
      `RETRIEVED_VOCABULARY_CATALOG=${JSON.stringify(retrievedVocabularyCatalog)}`,
      `KANJI_CATALOG=${JSON.stringify(kanjiCatalog)}`,
    ].join('\n');

    const generated = parseGeminiJson<GeneratedPlan>(await getGeminiText(await requestGeminiPlan(geminiApiKey, geminiModel, prompt)));
    // Gemini occasionally returns one fewer or one extra lesson despite a strict prompt.
    // Keep the request deterministic for the admin: trim extras and let the catalog-backed
    // normalizer complete any missing lesson rather than rejecting an otherwise usable plan.
    const generatedLessons = Array.isArray(generated.lessons) ? generated.lessons.slice(0, lessonCount) : [];
    while (generatedLessons.length < lessonCount) generatedLessons.push({});
    const vocabularyIds = new Set(retrievedVocabularyCatalog.map((entry) => entry.Id));
    const kanjiIds = new Set(kanjiCatalog.map((entry) => entry.Id));
    const usedVocabularyIds = new Set<number>();
    const safePlan = {
      topicDescription: typeof generated.topicDescription === 'string' ? generated.topicDescription : '',
      lessons: generatedLessons.map((lesson, index) => {
        const safeVocabularyIds = [...new Set((lesson.vocabularyIds ?? []).filter((id) => Number.isInteger(id) && vocabularyIds.has(id)))]
          .filter((id) => !usedVocabularyIds.has(id))
          .slice(0, maximumVocabularyPerLesson);
        if (safeVocabularyIds.length < minimumVocabularyPerLesson) {
          throw new Error(`Gemini chưa chọn đủ ${minimumVocabularyPerLesson} từ liên quan cho Bài ${index + 1}. Hãy thử tạo lại.`);
        }
        for (const vocabularyId of safeVocabularyIds) usedVocabularyIds.add(vocabularyId);
        const safeKanjiIds = new Set((lesson.kanjiIds ?? []).filter((id) => Number.isInteger(id) && kanjiIds.has(id)));
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

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

    const [{ data: vocabularies, error: vocabularyError }, { data: kanji, error: kanjiError }] = await Promise.all([
      supabase.from('Vocabularies').select('Id, Word, Pronunciation, Meaning').limit(500),
      supabase.from('Kanji').select('Id, Character, AmHanViet, Meaning').limit(350),
    ]);
    if (vocabularyError) throw vocabularyError;
    if (kanjiError) throw kanjiError;

    const vocabularyCatalog = (vocabularies ?? []) as CatalogVocabulary[];
    const kanjiCatalog = (kanji ?? []) as CatalogKanji[];
    const prompt = [
      `Tạo lộ trình tiếng Nhật về chủ đề "${topic}" gồm đúng ${lessonCount} bài học.`,
      'Chỉ chọn ID có trong catalog. Phân bổ từ dễ đến khó, không lặp ID giữa các bài.',
      'Mỗi bài có title, description, estimatedMinutes, vocabularyIds và kanjiIds.',
      'Trả về JSON thuần theo schema {"topicDescription":string,"lessons":[{"title":string,"description":string,"estimatedMinutes":number,"vocabularyIds":number[],"kanjiIds":number[]}]} mà không dùng markdown.',
      `VOCABULARY_CATALOG=${JSON.stringify(vocabularyCatalog)}`,
      `KANJI_CATALOG=${JSON.stringify(kanjiCatalog)}`,
    ].join('\n');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.35 },
        }),
      },
    );
    if (!geminiResponse.ok) {
      throw new Error(`Gemini trả về lỗi ${geminiResponse.status}.`);
    }
    const geminiPayload = await geminiResponse.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini không trả về kế hoạch bài học.');

    const generated = JSON.parse(text) as GeneratedPlan;
    if (!Array.isArray(generated.lessons) || generated.lessons.length !== lessonCount) {
      throw new Error('Gemini không trả về đúng số bài học yêu cầu.');
    }
    const vocabularyIds = new Set(vocabularyCatalog.map((entry) => entry.Id));
    const kanjiIds = new Set(kanjiCatalog.map((entry) => entry.Id));
    const safePlan = {
      topicDescription: typeof generated.topicDescription === 'string' ? generated.topicDescription : '',
      lessons: generated.lessons.map((lesson, index) => ({
        title: typeof lesson.title === 'string' && lesson.title.trim() ? lesson.title.trim() : `Bài ${index + 1}`,
        description: typeof lesson.description === 'string' ? lesson.description.trim() : '',
        estimatedMinutes: Math.min(180, Math.max(1, Math.floor(lesson.estimatedMinutes ?? 10))),
        vocabularyIds: [...new Set((lesson.vocabularyIds ?? []).filter((id) => Number.isInteger(id) && vocabularyIds.has(id)))],
        kanjiIds: [...new Set((lesson.kanjiIds ?? []).filter((id) => Number.isInteger(id) && kanjiIds.has(id)))],
      })),
    };

    return new Response(JSON.stringify(safePlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tạo lộ trình bằng AI.';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
});

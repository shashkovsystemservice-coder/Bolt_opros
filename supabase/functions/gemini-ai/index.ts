import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// The function to call Google Gemini API, now with a dynamic model name
async function callGeminiAI(prompt: string, apiKey: string, modelName: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Google Gemini API Error Response:", errorBody);
    throw new Error(`Google Gemini API error: ${errorBody.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
    let text = data.candidates[0].content.parts[0].text;
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith("```")) {
      text = text.substring(3, text.length - 3).trim();
    }
    return text;
  }
  throw new Error("Invalid or empty response structure from Gemini API");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, data } = await req.json();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured in Supabase secrets.");
    }

    // Create a Supabase admin client to securely fetch settings
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Fetch the active AI model from system_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('active_ai_model')
      .single();

    if (settingsError) throw new Error(`Database error: ${settingsError.message}`);
    if (!settings || !settings.active_ai_model) {
      throw new Error("Active AI model is not configured in system settings.");
    }
    const activeModel = settings.active_ai_model;

    let result;

    switch (action) {
      case "generate-survey": {
        const { topic, questionCount } = data;
        const prompt = `Создай опрос на тему "${topic}" с ${questionCount} вопросами. Верни ответ строго в формате JSON массива объектов, где каждый объект имеет поля:\n- "question": текст вопроса\n- "type": тип вопроса ("text" для открытых вопросов, "radio" для выбора одного варианта, "checkbox" для множественного выбора)\n- "options": массив вариантов ответа (только для типов "radio" и "checkbox"), может быть пустым массивом для типа "text"\n\nИспользуй разные типы вопросов. Вопросы должны быть релевантными, профессиональными и помогать получить полезную информацию по теме. Верни только JSON без дополнительного текста.`;

        const rawJson = await callGeminiAI(prompt, apiKey, activeModel);
        result = { questions: JSON.parse(rawJson) };
        break;
      }

      case "clean-answer": {
        const { question, rawAnswer } = data;
        const prompt = `Пользователь отвечал на вопрос: "${question}"\n\nОтвет пользователя (может содержать паразитные слова, повторы, быть неструктурированным): "${rawAnswer}"\n\nТвоя задача:\n1. Убрать паразитные слова (эээ, ммм, ну, короче и т.д.)\n2. Исправить очевидные ошибки транскрипции\n3. Структурировать ответ, сохраняя смысл\n4. Сделать текст читабельным и грамотным\n\nВерни только очищенный и отформатированный ответ, без дополнительных комментариев.`;

        const cleanedText = await callGeminiAI(prompt, apiKey, activeModel);
        result = { cleanedAnswer: cleanedText.trim() };
        break;
      }

      case "analyze-responses": {
        const { surveyTitle, questions, responses } = data;
        const prompt = `Проанализируй результаты опроса "${surveyTitle}".\n\nВопросы и ответы:\n${JSON.stringify({ questions, responses }, null, 2)}\n\nПредоставь:\n1. Краткое резюме (2-3 предложения)\n2. Ключевые инсайты и паттерны в ответах\n3. Статистику по каждому вопросу\n4. Рекомендации на основе полученных данных\n\nВерни ответ в формате JSON с полями:\n- "summary": краткое резюме\n- "insights": массив ключевых инсайтов\n- "statistics": объект со статистикой по вопросам\n- "recommendations": массив рекомендаций`;

        const rawJson = await callGeminiAI(prompt, apiKey, activeModel);
        result = { analysis: JSON.parse(rawJson) };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(
      JSON.stringify({ error: `Server-side error: ${error.message}` }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

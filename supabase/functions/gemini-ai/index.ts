import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let result;

    switch (action) {
      case "generate-survey": {
        const { topic, questionCount } = data;
        const prompt = `Создай опрос на тему "${topic}" с ${questionCount} вопросами. Верни ответ строго в формате JSON массива объектов, где каждый объект имеет поля:
- "question": текст вопроса
- "type": тип вопроса ("text" для открытых вопросов, "radio" для выбора одного варианта, "checkbox" для множественного выбора)
- "options": массив вариантов ответа (только для типов "radio" и "checkbox"), может быть пустым массивом для типа "text"

Используй разные типы вопросов. Вопросы должны быть релевантными, профессиональными и помогать получить полезную информацию по теме. Верни только JSON без дополнительного текста.`;
        
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        
        // Extract JSON from response (remove markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```\n?/g, '');
        }
        
        result = { questions: JSON.parse(jsonText) };
        break;
      }

      case "clean-answer": {
        const { question, rawAnswer } = data;
        const prompt = `Пользователь отвечал на вопрос: "${question}"

Ответ пользователя (может содержать паразитные слова, повторы, быть неструктурированным): "${rawAnswer}"

Твоя задача:
1. Убрать паразитные слова (эээ, ммм, ну, короче и т.д.)
2. Исправить очевидные ошибки транскрипции
3. Структурировать ответ, сохраняя смысл
4. Сделать текст читабельным и грамотным

Верни только очищенный и отформатированный ответ, без дополнительных комментариев.`;
        
        const response = await model.generateContent(prompt);
        result = { cleanedAnswer: response.response.text().trim() };
        break;
      }

      case "analyze-responses": {
        const { surveyTitle, questions, responses } = data;
        const prompt = `Проанализируй результаты опроса "${surveyTitle}".

Вопросы и ответы:
${JSON.stringify({ questions, responses }, null, 2)}

Предоставь:
1. Краткое резюме (2-3 предложения)
2. Ключевые инсайты и паттерны в ответах
3. Статистику по каждому вопросу
4. Рекомендации на основе полученных данных

Верни ответ в формате JSON с полями:
- "summary": краткое резюме
- "insights": массив ключевых инсайтов
- "statistics": объект со статистикой по вопросам
- "recommendations": массив рекомендаций`;
        
        const response = await model.generateContent(prompt);
        let text = response.response.text().trim();
        
        // Extract JSON from response
        if (text.startsWith('```json')) {
          text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/```\n?/g, '');
        }
        
        result = { analysis: JSON.parse(text) };
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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
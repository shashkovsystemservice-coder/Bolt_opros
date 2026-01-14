import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from '../_utils/supabase.ts';
import { corsHeaders } from "../_utils/cors.ts";
import { GOOGLE_GEMINI_API_KEY } from "../_utils/constants.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, prompt, numQuestions } = await req.json();

    if (action === 'generate-survey') {
      if (!prompt || !numQuestions) {
        return new Response(JSON.stringify({ error: "'prompt' and 'numQuestions' are required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
        });
      }

      const { data: settingsData, error: settingsError } = await supabaseAdmin.from('system_settings').select('active_ai_model').limit(1);
      if (settingsError) throw new Error(`DB error: ${settingsError.message}`);
      const active_ai_model = settingsData?.[0]?.active_ai_model;
      if (!active_ai_model) throw new Error('No active AI model configured.');

      const { data: activePrompts, error: promptError } = await supabaseAdmin.from('meta_prompts').select('prompt_text').eq('is_active', true).limit(1);
      if (promptError) throw new Error(`DB error: ${promptError.message}`);
      const active_meta_prompt = activePrompts?.[0]?.prompt_text;
      if (!active_meta_prompt) throw new Error('No active meta prompt found.');

      const finalPrompt = active_meta_prompt.replace('${prompt}', prompt).replace('${numQuestions}', numQuestions.toString());
      console.log("Final prompt sent to AI:", finalPrompt);

      const modelToUse = active_ai_model.startsWith('models/') ? active_ai_model.substring('models/'.length) : active_ai_model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
      const requestBody = { contents: [{ parts: [{ text: finalPrompt }] }] };

      const geminiApiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!geminiApiResponse.ok) {
        const errorText = await geminiApiResponse.text();
        throw new Error(`Google API Error: ${geminiApiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiApiResponse.json();
      const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawContent) {
        throw new Error('Could not extract content from Google API response.');
      }

      // ИСПРАВЛЕНИЕ: Извлекаем чистый JSON из ответа AI
      const jsonStart = rawContent.indexOf('{');
      const jsonEnd = rawContent.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        console.error("AI response did not contain a valid JSON object:", rawContent);
        throw new Error('AI response did not contain a valid JSON object.');
      }

      const jsonString = rawContent.substring(jsonStart, jsonEnd + 1);

      // Возвращаем клиенту уже очищенную JSON-строку
      return new Response(JSON.stringify({ generated_survey: jsonString }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: `Unknown or missing action` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
  } catch (error) {
    console.error("Edge function critical error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

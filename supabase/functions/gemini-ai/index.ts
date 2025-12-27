import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from '../_utils/supabase.ts';
import { corsHeaders } from "../_utils/cors.ts";
import { GOOGLE_GEMINI_API_KEY } from "../_utils/constants.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case 'generate-survey': {
        const { prompt, questionsCount } = data;
        if (!prompt || !questionsCount) {
          return new Response(JSON.stringify({ error: "prompt and questionsCount are required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
          });
        }

        const { data: settingsData, error: settingsError } = await supabaseAdmin
          .from('system_settings')
          .select('active_ai_model')
          .limit(1);

        if (settingsError) throw new Error(`Database error fetching settings: ${settingsError.message}`);
        if (!settingsData || settingsData.length === 0) throw new Error('No system settings found.');
        const active_ai_model = settingsData[0].active_ai_model;
        if (!active_ai_model) throw new Error('No active AI model configured in system settings.');

        const { data: activePrompts, error: promptError } = await supabaseAdmin
            .from('meta_prompts')
            .select('prompt_text')
            .eq('is_active', true)
            .limit(1);

        if (promptError) throw new Error(`Database error fetching prompts: ${promptError.message}`);
        if (!activePrompts || activePrompts.length === 0) throw new Error('No active meta prompt found in the database.');
        
        const active_meta_prompt = activePrompts[0].prompt_text;
        if (!active_meta_prompt) throw new Error('Active meta prompt text is empty.');

        const finalPrompt = active_meta_prompt
          .replace('${prompt}', prompt)
          .replace('${numQuestions}', questionsCount.toString());

        const modelToUse = active_ai_model.startsWith('models/')
          ? active_ai_model.substring('models/'.length)
          : active_ai_model;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

        const requestBody = {
          contents: [{
            parts: [{
              text: finalPrompt
            }]
          }]
        };

        const geminiApiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!geminiApiResponse.ok) {
          const errorText = await geminiApiResponse.text();
          throw new Error(`Google API Error: ${geminiApiResponse.status} ${geminiApiResponse.statusText} - ${errorText}`);
        }

        const geminiData = await geminiApiResponse.json();
        const generatedContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedContent) {
          throw new Error('Could not extract generated text from Google API response.');
        }

        return new Response(JSON.stringify({ generated_survey: generatedContent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

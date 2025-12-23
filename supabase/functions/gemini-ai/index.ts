
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from '../_utils/supabase.ts';
import { corsHeaders } from "../_utils/cors.ts";

// We only need the API key for authentication with Google's Generative Language API
import { GOOGLE_GEMINI_API_KEY } from "../_utils/constants.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case 'discover-models': {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_GEMINI_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Google API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const fullModelData = await response.json();

        return new Response(JSON.stringify(fullModelData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'check-model-availability': {
        const { modelName } = data;
        if (!modelName) {
          return new Response(JSON.stringify({ error: "modelName is required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
          });
        }
        
        const normalizedModelName = modelName.startsWith('models/')
          ? modelName.substring('models/'.length)
          : modelName;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModelName}?key=${GOOGLE_GEMINI_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
           const errorText = await response.text();
           let errorMessage = `Google API Error (${response.status}): ${errorText}`;
           try {
             const errorJson = JSON.parse(errorText);
             if (errorJson.error && errorJson.error.message) {
               errorMessage = errorJson.error.message;
             }
           } catch (e) { /* ignore parsing error, use raw text */ }
           
           return new Response(JSON.stringify({ error: errorMessage }), {
             headers: { ...corsHeaders, "Content-Type": "application/json" },
             status: 400 
           });
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'generate-survey': {
        const { prompt, questionsCount, isInteractive } = data;
        if (!prompt || !questionsCount) {
          return new Response(JSON.stringify({ error: "prompt and questionsCount are required" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400
          });
        }

        const { data: settings, error: settingsError } = await supabaseAdmin
          .from('system_settings')
          .select('active_ai_model, generate_survey_meta_prompt')
          .single();

        if (settingsError) {
          throw new Error(`Database error: Could not fetch system settings. ${settingsError.message}`);
        }

        const { active_ai_model, generate_survey_meta_prompt } = settings;

        if (!active_ai_model) {
          throw new Error('No active AI model configured in system settings.');
        }
        if (!generate_survey_meta_prompt) {
          throw new Error('No survey generation meta prompt configured in system settings.');
        }
        
        // Construct the final prompt by replacing placeholders
        const finalPrompt = generate_survey_meta_prompt
          .replace(/\[SURVEY_TOPIC\]/gi, prompt)
          .replace(/\[QUESTIONS_COUNT\]/gi, questionsCount.toString());

        // Normalize model name for the API call
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

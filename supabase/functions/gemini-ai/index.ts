
import { createClient } from 'jsr:@supabase/supabase-js@2';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    const { action, data } = reqBody;
    if (!action) throw new Error("Missing 'action' parameter.");

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("CRITICAL: GEMINI_API_KEY is not set.");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const callGoogleApi = async (prompt: string, modelName: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error("Google API Error:", responseText);
        try {
          const errorBody = JSON.parse(responseText);
          throw new Error(errorBody.error?.message || `Google API Error: ${response.status}`);
        } catch {
          throw new Error(`Google API request failed: ${response.status}. Details: ${responseText}`);
        }
      }
      return response.json();
    };

    if (action === 'test-model') {
      const { modelName } = data || {};
      if (!modelName) throw new Error("`modelName` is required for 'test-model'.");
      await callGoogleApi("test", modelName);
      return new Response(
        JSON.stringify({ status: 'success', message: `Model '${modelName}' is accessible.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate-survey') {
      const { user_prompt, num_questions } = data || {};
      if (!user_prompt || !num_questions) {
        throw new Error("`user_prompt` and `num_questions` are required for 'generate-survey'.");
      }
      
      const [settingsRes, metaPromptRes] = await Promise.all([
          supabaseClient.from('system_settings').select('active_ai_model').single(),
          supabaseClient.from('meta_prompts').select('prompt_text').eq('prompt_name', 'generate-survey').single()
      ]);

      if (settingsRes.error || !settingsRes.data?.active_ai_model) {
           throw new Error("Failed to get active AI model from system_settings.");
      }
      const modelName = settingsRes.data.active_ai_model;

      if (metaPromptRes.error || !metaPromptRes.data) {
          throw new Error("Failed to get 'generate-survey' meta prompt from database.");
      }
      const metaPromptTemplate = metaPromptRes.data.prompt_text;

      const finalPrompt = metaPromptTemplate
          .replace('${prompt}', user_prompt)
          .replace('${numQuestions}', num_questions.toString());

      const googleResponse = await callGoogleApi(finalPrompt, modelName);

      const { totalTokens } = googleResponse.usageMetadata || {};
      if (totalTokens) {
          const { error: logError } = await supabaseClient.from('ai_usage_analytics').insert({
              model_name: modelName,
              token_count: totalTokens,
          });
          if (logError) console.error("Failed to log token usage:", logError.message);
      }

      const content = googleResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
          throw new Error("AI returned an empty or invalid response structure.");
      }

      return new Response(
          JSON.stringify({ status: 'success', data: content }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Action '${action}' is not implemented.`);

  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(
      JSON.stringify({ status: 'error', message: error.message || 'Unknown server error' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

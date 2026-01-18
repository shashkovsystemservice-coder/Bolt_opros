
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_utils/supabase.ts";
import { corsHeaders } from "../_utils/cors.ts";
import { GOOGLE_GEMINI_API_KEY } from "../_utils/constants.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Function execution started.");
    const requestText = await req.text();
    if (!requestText) {
        throw new Error("Critical: Request body was empty.");
    }
    const { action, prompt, numQuestions } = JSON.parse(requestText);
    console.log(`Received action: '${action}'`);

    if (action === 'generate-survey') {
      console.log("Action is 'generate-survey'. Proceeding...");
      if (!prompt || !numQuestions) {
        throw new Error("'prompt' and 'numQuestions' are required.");
      }

      console.log("Fetching active AI model from 'system_settings'...");
      const { data: settingsData, error: settingsError } = await supabaseAdmin.from('system_settings').select('active_ai_model').limit(1).single();
      if (settingsError) throw new Error(`DB error fetching model: ${settingsError.message}`);
      const active_ai_model = settingsData?.active_ai_model;
      if (!active_ai_model) throw new Error('No active AI model found in system_settings.');
      console.log(`Found active AI model: ${active_ai_model}`);

      console.log("Fetching active meta prompt for 'survey' mode...");
      const { data: promptsData, error: promptError } = await supabaseAdmin
        .from('meta_prompts')
        .select('prompt_text')
        .eq('generation_mode', 'survey')
        .eq('is_active', true);

      if (promptError) throw new Error(`DB error fetching active 'survey' prompt: ${promptError.message}`);
      if (!promptsData || promptsData.length === 0) {
        throw new Error(`DB query failed: Could not find an active meta prompt for generation_mode 'survey'.`);
      }      
      
      const active_meta_prompt = promptsData[0]?.prompt_text;
      console.log("Successfully fetched active meta prompt.");

      const finalPrompt = active_meta_prompt + `\n\nКОНКРЕТНАЯ ЗАДАЧА:\nТема опроса: "${prompt}"\nКоличество вопросов: ${numQuestions}`;
      console.log("Constructed the final prompt to be sent to the AI.");
      
      const modelToUse = active_ai_model.startsWith('models/') ? active_ai_model.substring('models/'.length) : active_ai_model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
      const requestBody = { contents: [{ parts: [{ text: finalPrompt }] }] };

      console.log("--- START OF GOOGLE API REQUEST ---");
      console.log(JSON.stringify(requestBody, null, 2));
      console.log("--- END OF GOOGLE API REQUEST ---");

      console.log(`Sending request to Google API at ${url}...`);
      const geminiApiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await geminiApiResponse.text();
      console.log(`Received response from Google API. Status: ${geminiApiResponse.status}`);
      
      if (!geminiApiResponse.ok) {
        console.error(`Google API Error Response Body: ${responseText}`);
        throw new Error(`Google API request failed with status ${geminiApiResponse.status}`);
      }
      
      console.log("Parsing content from Google API response...");
      const geminiData = JSON.parse(responseText);
      const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawContent) {
        console.error("Full Google API response for debugging:", JSON.stringify(geminiData, null, 2));
        throw new Error('Could not extract content from Google API response. Structure may have changed.');
      }

      console.log("Successfully extracted raw content. Parsing JSON from content...");
      const jsonStart = rawContent.indexOf('{');
      const jsonEnd = rawContent.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        console.error("Malformed AI response:", rawContent);
        throw new Error('AI response was not in the expected JSON format.');
      }

      const jsonString = rawContent.substring(jsonStart, jsonEnd + 1);
      const parsedJson = JSON.parse(jsonString);
      console.log("Successfully parsed final JSON. Returning to client.");

      return new Response(JSON.stringify({ generated_survey: parsedJson }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      throw new Error(`Unknown or missing action: '${action}'`);
    }
  } catch (error) {
    // Log the specific error that caused the function to crash
    console.error(`Edge function critical error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

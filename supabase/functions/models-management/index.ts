
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_utils/cors.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

// Lists all available models from Google AI
async function discoverModels() {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured.");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API (List Models) failed: ${response.status} ${errorBody}`);
  }
  const data = await response.json();
  // We only care about models that can generate content
  return data.models.filter(model => 
    model.supportedGenerationMethods?.includes("generateContent")
  );
}

// Checks if a specific model is accessible
async function checkModel(modelName) {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured.");
  }
  // The `get` method for a single model is a good way to check for access
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}?key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
     const errorBody = await response.text();
     // Provide a more specific error message from the API if possible
     try {
        const errorJson = JSON.parse(errorBody);
        throw new Error(errorJson.error?.message || `Edge Function returned a non-2xx status code: ${response.status}`);
     } catch(e) {
        throw new Error(`Edge Function returned a non-2xx status code: ${response.status}`);
     }
  }
  const data = await response.json();
  return { model: data }; // Return success
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case "discover-models": {
        const models = await discoverModels();
        return new Response(JSON.stringify({ models }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check-model-availability": {
        const { modelName } = data;
        if (!modelName) {
          return new Response(JSON.stringify({ error: "'modelName' is required." }), { status: 400, headers: corsHeaders });
        }
        await checkModel(modelName);
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default: {
        return new Response(JSON.stringify({ error: `Unknown action: '${action}'` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function listGoogleModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Google Gemini API Error (ListModels):", errorBody);
    throw new Error(`Google API request failed: ${response.status} ${errorBody.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.models;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured in Supabase secrets.");
    }
    
    const models = await listGoogleModels(apiKey);
    
    const supportedModelNames = models
      .filter(model => model.supportedGenerationMethods.includes("generateContent"))
      .map(model => model.name.replace('models/', ''));

    return new Response(JSON.stringify({ availableModels: supportedModelNames }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(
      JSON.stringify({ error: `Server-side error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

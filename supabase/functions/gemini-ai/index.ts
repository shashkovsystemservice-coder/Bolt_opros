import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// --- CORS HEADERS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// --- "ULTIMATE" MAIN FUNCTION ---
Deno.serve(async (req: Request) => {
  // 1. Immediately handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Robustly parse the incoming request body
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (e: any) {
      throw new Error(`Invalid JSON in request body: ${e.message}`);
    }

    const { action, data } = reqBody;
    if (!action) {
      throw new Error("Request body is missing the 'action' parameter.");
    }

    // 3. Securely get the Google API key from Supabase secrets
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("CRITICAL: GEMINI_API_KEY is not configured in Supabase secrets.");
    }

    // 4. Define the ULTIMATE hardened Google API call function
    const callGoogleApi = async (prompt: string, modelName: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      // THE FIX IS HERE: Avoid 'Body already consumed'
      if (!response.ok) {
        const responseText = await response.text(); // Read body ONCE as text
        console.error("Google API Error (Raw Text):", responseText);

        try {
          // Try to parse the text as JSON to get a specific error message
          const errorBody = JSON.parse(responseText);
          throw new Error(errorBody.error?.message || `Google API returned status ${response.status}`);
        } catch (e) {
          // If parsing fails, use the raw text as the error detail
          throw new Error(`Google API request failed: ${response.status} ${response.statusText}. Details: ${responseText}`);
        }
      }

      return response.json(); // If response was ok, we can safely get JSON
    };

    // 5. Handle the 'test-model' action
    if (action === 'test-model') {
      const { modelName } = data || {};
      if (!modelName) {
        throw new Error("`modelName` is required for the 'test-model' action.");
      }
      
      await callGoogleApi("test", modelName);
      
      return new Response(
        JSON.stringify({ status: 'success', message: `Model '${modelName}' is accessible.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For now, throw an error for any other action
    throw new Error(`Action '${action}' is not implemented.`);

  } catch (error: any) {
    // --- UNIVERSAL ERROR HANDLER ---
    // Catches ANY error and ensures a clean JSON response, preventing "Edge Function returned..."
    console.error('Edge Function Final Catch:', error.message);
    
    const errorResponse = {
      status: 'error',
      message: error.message || 'An unknown server error occurred.'
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 200, // IMPORTANT: Always 200 OK
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
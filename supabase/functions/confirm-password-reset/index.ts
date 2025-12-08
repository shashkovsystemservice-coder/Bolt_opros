import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConfirmResetRequest {
  token: string;
  newPassword: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { token, newPassword } = await req.json() as ConfirmResetRequest;

    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Неверные параметры" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Пароль должен содержать минимум 6 символов" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (resetError || !resetData) {
      return new Response(
        JSON.stringify({ error: "Неверная или истекшая ссылка" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (resetData.used_at) {
      return new Response(
        JSON.stringify({ error: "Эта ссылка уже была использована" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (new Date(resetData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Ссылка истекла. Запросите новую" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Ошибка обновления пароля" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: markUsedError } = await supabase
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('reset_token', token);

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Пароль успешно изменен"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in confirm-password-reset:", error);
    return new Response(
      JSON.stringify({
        error: "Внутренняя ошибка сервера",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
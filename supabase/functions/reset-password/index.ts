import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetPasswordRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email } = await req.json() as ResetPasswordRequest;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Некорректный email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Ошибка проверки пользователя" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({
          success: true,
          message: "Если пользователь с таким email существует, письмо с инструкциями отправлено"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate password reset token (valid for 1 hour)
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store reset token in database
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        user_id: user.id,
        email: email,
        reset_token: resetToken,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error("Error storing reset token:", insertError);
      return new Response(
        JSON.stringify({ error: "Ошибка создания токена восстановления" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email сервис не настроен" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create reset link
    const resetLink = `${req.headers.get('origin')}/reset-password?token=${resetToken}`;

    // Send email using Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F1F1F; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { color: #1A73E8; font-size: 24px; font-weight: 600; }
          .content { background: #F8F9FA; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
          .button { display: inline-block; background: #1A73E8; color: white; text-decoration: none; padding: 14px 32px; border-radius: 24px; font-weight: 500; margin: 20px 0; }
          .footer { text-align: center; color: #5F6368; font-size: 14px; }
          .warning { background: #FFF3CD; border-left: 4px solid #FFA000; padding: 12px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">📋 Survey Pro</div>
          </div>
          <div class="content">
            <h2 style="margin-top: 0;">Восстановление пароля</h2>
            <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
            <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Восстановить пароль</a>
            </div>
            <div class="warning">
              <strong>⚠️ Важно:</strong> Ссылка действительна в течение 1 часа.
            </div>
            <p style="color: #5F6368; font-size: 14px; margin-top: 20px;">
              Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
            </p>
          </div>
          <div class="footer">
            <p>Это автоматическое письмо от Survey Pro</p>
            <p>Если у вас возникли вопросы, свяжитесь с нами: shashkov75@inbox.ru</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Survey Pro <onboarding@resend.dev>",
        to: [email],
        subject: "Восстановление пароля - Survey Pro",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Ошибка отправки письма" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Письмо с инструкциями отправлено на ваш email"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in reset-password:", error);
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
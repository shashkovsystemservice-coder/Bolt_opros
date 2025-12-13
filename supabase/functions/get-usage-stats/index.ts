import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Создание админского клиента Supabase для безопасного доступа к данным
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Вычисляем дату 30 дней назад от текущего момента
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    // Запрос к базе данных для получения и агрегации данных
    const { data, error } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('created_at, model_name, total_tokens')
      .gte('created_at', fromDate.toISOString()); // Фильтруем по дате

    if (error) {
      throw new Error(`Ошибка при получении статистики: ${error.message}`);
    }

    // Обработка и форматирование данных для фронтенда
    const stats = data.reduce((acc, log) => {
      // Приводим дату к формату YYYY-MM-DD
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {};
      }
      if (!acc[date][log.model_name]) {
        acc[date][log.model_name] = 0;
      }
      // Суммируем токены по модели за день
      acc[date][log.model_name] += log.total_tokens;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return new Response(JSON.stringify({ stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: `Внутренняя ошибка сервера: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

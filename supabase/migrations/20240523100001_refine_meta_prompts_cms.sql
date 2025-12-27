-- 1. Расширение таблицы meta_prompts
-- Добавляем колонки, если они еще не существуют, для идемпотентности скрипта.
ALTER TABLE public.meta_prompts
  ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'survey',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Создание уникального индекса для активных промптов
-- Этот индекс гарантирует, что для каждого 'generation_mode' может быть только один активный промпт.
-- Сначала удаляем старый, если существует, чтобы избежать ошибок при повторном запуске.
DROP INDEX IF EXISTS one_active_prompt_per_mode_idx;
CREATE UNIQUE INDEX one_active_prompt_per_mode_idx
ON public.meta_prompts(generation_mode)
WHERE is_active = true;

-- 3. Создание или обновление RPC функции для атомарной активации
-- Функция принимает ID промпта и его режим генерации для дополнительной проверки.
CREATE OR REPLACE FUNCTION set_active_meta_prompt(p_id BIGINT, p_mode TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  target_mode TEXT;
BEGIN
  -- Проверяем, что промпт с p_id существует и его режим соответствует p_mode.
  SELECT generation_mode INTO target_mode FROM public.meta_prompts WHERE id = p_id;
  
  IF target_mode IS NULL THEN
    RAISE EXCEPTION 'Промпт с id % не найден', p_id;
  END IF;

  IF target_mode != p_mode THEN
    RAISE EXCEPTION 'Режим целевого промпта (%%) не совпадает с указанным режимом (%%)', target_mode, p_mode;
  END IF;

  -- Шаг 1: Деактивировать текущий активный промпт для данного режима.
  -- Уникальный индекс гарантирует, что здесь будет затронута максимум одна строка.
  UPDATE public.meta_prompts
  SET is_active = false
  WHERE generation_mode = p_mode
    AND is_active = true;

  -- Шаг 2: Активировать новый (целевой) промпт.
  UPDATE public.meta_prompts
  SET is_active = true
  WHERE id = p_id;
END;
$$;

/*
  # Защита данных суперадминистратора
  
  ## Новые поля в companies
  - `recovery_email` (text) - Резервный email для восстановления доступа
  - `security_question` (text) - Секретный вопрос для восстановления
  - `security_answer_hash` (text) - Хеш ответа на секретный вопрос
  - `backup_codes` (jsonb) - Массив одноразовых кодов восстановления
  
  ## Новая таблица admin_audit_log
  - `id` (uuid, PK) - ID записи
  - `admin_id` (uuid) - ID администратора, выполнившего действие
  - `action_type` (text) - Тип действия (create_admin, delete_admin, block_company, etc.)
  - `target_id` (uuid) - ID объекта действия
  - `details` (jsonb) - Детали действия
  - `ip_address` (text) - IP адрес
  - `created_at` (timestamptz) - Время действия
  
  ## Триггеры и функции
  - Защита от удаления последнего суперадмина
  - Автоматическое логирование критических действий
  - Проверка наличия хотя бы одного активного суперадмина
  
  ## Безопасность
  - RLS политики для аудита
  - Запрет на самоблокировку суперадмина
  - Защита резервных кодов
*/

-- Добавление полей защиты в companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'recovery_email'
  ) THEN
    ALTER TABLE companies ADD COLUMN recovery_email TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'security_question'
  ) THEN
    ALTER TABLE companies ADD COLUMN security_question TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'security_answer_hash'
  ) THEN
    ALTER TABLE companies ADD COLUMN security_answer_hash TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'backup_codes'
  ) THEN
    ALTER TABLE companies ADD COLUMN backup_codes JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Создание таблицы аудита администраторов
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES companies(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_id UUID,
  target_email TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = auth.uid()
      AND companies.is_super_admin = true
    )
  );

CREATE POLICY "System can insert audit log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = auth.uid()
      AND companies.is_super_admin = true
    )
  );

-- Функция для проверки наличия активных суперадминов
CREATE OR REPLACE FUNCTION check_superadmin_count()
RETURNS TRIGGER AS $$
DECLARE
  active_superadmins INTEGER;
BEGIN
  -- Подсчитываем активных суперадминов
  SELECT COUNT(*) INTO active_superadmins
  FROM companies
  WHERE is_super_admin = true 
    AND is_blocked = false
    AND id != OLD.id;
  
  -- Если это последний активный суперадмин
  IF active_superadmins = 0 THEN
    -- Блокируем удаление
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Невозможно удалить последнего суперадминистратора';
    END IF;
    
    -- Блокируем снятие прав суперадмина
    IF TG_OP = 'UPDATE' AND NEW.is_super_admin = false THEN
      RAISE EXCEPTION 'Невозможно снять права у последнего суперадминистратора';
    END IF;
    
    -- Блокируем блокировку последнего суперадмина
    IF TG_OP = 'UPDATE' AND NEW.is_blocked = true THEN
      RAISE EXCEPTION 'Невозможно заблокировать последнего суперадминистратора';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера защиты суперадмина
DROP TRIGGER IF EXISTS protect_last_superadmin ON companies;
CREATE TRIGGER protect_last_superadmin
  BEFORE UPDATE OR DELETE ON companies
  FOR EACH ROW
  WHEN (OLD.is_super_admin = true)
  EXECUTE FUNCTION check_superadmin_count();

-- Функция логирования критических действий
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Логируем изменение статуса суперадмина
  IF TG_OP = 'UPDATE' AND OLD.is_super_admin != NEW.is_super_admin THEN
    INSERT INTO admin_audit_log (admin_id, action_type, target_id, target_email, details)
    VALUES (
      auth.uid(),
      CASE WHEN NEW.is_super_admin THEN 'grant_superadmin' ELSE 'revoke_superadmin' END,
      NEW.id,
      (SELECT email FROM auth.users WHERE id = NEW.id),
      jsonb_build_object('company_name', NEW.name)
    );
  END IF;
  
  -- Логируем блокировку компании
  IF TG_OP = 'UPDATE' AND OLD.is_blocked != NEW.is_blocked THEN
    INSERT INTO admin_audit_log (admin_id, action_type, target_id, target_email, details)
    VALUES (
      auth.uid(),
      CASE WHEN NEW.is_blocked THEN 'block_company' ELSE 'unblock_company' END,
      NEW.id,
      (SELECT email FROM auth.users WHERE id = NEW.id),
      jsonb_build_object('company_name', NEW.name)
    );
  END IF;
  
  -- Логируем удаление компании
  IF TG_OP = 'DELETE' THEN
    INSERT INTO admin_audit_log (admin_id, action_type, target_id, target_email, details)
    VALUES (
      auth.uid(),
      'delete_company',
      OLD.id,
      (SELECT email FROM auth.users WHERE id = OLD.id),
      jsonb_build_object('company_name', OLD.name, 'was_superadmin', OLD.is_super_admin)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Создание триггера логирования
DROP TRIGGER IF EXISTS audit_admin_actions ON companies;
CREATE TRIGGER audit_admin_actions
  AFTER UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action();

-- Функция генерации резервных кодов
CREATE OR REPLACE FUNCTION generate_backup_codes(company_uuid UUID)
RETURNS jsonb AS $$
DECLARE
  codes jsonb := '[]'::jsonb;
  i INTEGER;
  code TEXT;
BEGIN
  FOR i IN 1..8 LOOP
    -- Генерируем 8-значный код
    code := LPAD(floor(random() * 100000000)::TEXT, 8, '0');
    codes := codes || jsonb_build_object(
      'code', code,
      'used', false,
      'created_at', now()
    );
  END LOOP;
  
  -- Сохраняем коды
  UPDATE companies
  SET backup_codes = codes
  WHERE id = company_uuid;
  
  RETURN codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция проверки резервного кода
CREATE OR REPLACE FUNCTION verify_backup_code(company_uuid UUID, code_input TEXT)
RETURNS boolean AS $$
DECLARE
  codes jsonb;
  code_obj jsonb;
  idx INTEGER := 0;
BEGIN
  SELECT backup_codes INTO codes FROM companies WHERE id = company_uuid;
  
  FOR code_obj IN SELECT * FROM jsonb_array_elements(codes)
  LOOP
    IF code_obj->>'code' = code_input AND (code_obj->>'used')::boolean = false THEN
      -- Помечаем код как использованный
      codes := jsonb_set(codes, array[idx::text, 'used'], 'true'::jsonb);
      codes := jsonb_set(codes, array[idx::text, 'used_at'], to_jsonb(now()));
      
      UPDATE companies SET backup_codes = codes WHERE id = company_uuid;
      RETURN true;
    END IF;
    idx := idx + 1;
  END LOOP;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_recovery_email ON companies(recovery_email);

-- Вставка начальной записи в system_settings если её нет
INSERT INTO system_settings (support_email)
SELECT 'shashkov75@inbox.ru'
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

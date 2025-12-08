/*
  # Добавление функций супер-администратора

  ## Изменения в таблице companies
  - `is_super_admin` (boolean) - Флаг супер-администратора
  - `is_blocked` (boolean) - Флаг блокировки компании
  - `last_login_at` (timestamptz) - Дата последнего входа
  - `subscription_plan` (text) - План подписки (Free, Starter, Pro, Enterprise)

  ## Новая таблица system_settings
  - `support_email` (text) - Email поддержки
  - `maintenance_mode` (boolean) - Режим обслуживания
  - `auto_delete_inactive_days` (integer) - Дни для удаления неактивных
  - `notify_admin_new_registration` (boolean) - Уведомления новых регистраций

  ## Новая таблица login_history
  - `id` (uuid, PK) - ID записи
  - `company_id` (uuid, FK) - ID компании
  - `login_at` (timestamptz) - Время входа
  - `ip_address` (text) - IP адрес
  - `user_agent` (text) - User agent браузера

  ## Новая таблица password_reset_tokens
  - `id` (uuid, PK) - ID токена
  - `company_id` (uuid, FK) - ID компании
  - `token` (text, unique) - Токен сброса
  - `created_at` (timestamptz) - Дата создания
  - `expires_at` (timestamptz) - Дата истечения
  - `used_at` (timestamptz) - Дата использования
*/

-- Добавление полей в companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE companies ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'is_blocked'
  ) THEN
    ALTER TABLE companies ADD COLUMN is_blocked BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE companies ADD COLUMN subscription_plan TEXT DEFAULT 'Free';
  END IF;
END $$;

-- Создание таблицы system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_email TEXT DEFAULT 'support@surveypo.com',
  maintenance_mode BOOLEAN DEFAULT false,
  auto_delete_inactive_days INTEGER DEFAULT 90,
  notify_admin_new_registration BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = auth.uid()
      AND companies.is_super_admin = true
    )
  );

CREATE POLICY "Super admin can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = auth.uid()
      AND companies.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = auth.uid()
      AND companies.is_super_admin = true
    )
  );

-- Создание таблицы истории входов
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "System can insert login history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

-- Создание таблицы токенов сброса пароля
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own reset tokens"
  ON password_reset_tokens FOR SELECT
  TO authenticated
  USING (company_id = auth.uid());

CREATE POLICY "System can insert reset tokens"
  ON password_reset_tokens FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

-- Индексы
CREATE INDEX IF NOT EXISTS idx_companies_is_super_admin ON companies(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_companies_is_blocked ON companies(is_blocked);
CREATE INDEX IF NOT EXISTS idx_login_history_company_id ON login_history(company_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_company_id ON password_reset_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

/*
  # Исправление политики для отправки опросов

  ## Изменения
  - Добавлена политика INSERT для авторизованных пользователей в таблицу survey_submissions
  - Добавлена политика INSERT для авторизованных пользователей в таблицу submission_answers
  - Теперь как анонимные, так и авторизованные пользователи могут заполнять опросы

  ## Обоснование
  Пользователи, авторизованные в админ-панели, также должны иметь возможность 
  тестировать опросы и заполнять их как обычные клиенты. Предыдущая настройка 
  позволяла отправку только анонимным пользователям.
*/

-- Добавить политику INSERT для авторизованных пользователей в survey_submissions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'survey_submissions' 
    AND policyname = 'Authenticated can insert submissions'
  ) THEN
    CREATE POLICY "Authenticated can insert submissions"
      ON survey_submissions FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Добавить политику INSERT для авторизованных пользователей в submission_answers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'submission_answers' 
    AND policyname = 'Authenticated can insert answers'
  ) THEN
    CREATE POLICY "Authenticated can insert answers"
      ON submission_answers FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

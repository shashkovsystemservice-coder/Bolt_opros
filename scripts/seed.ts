
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Ошибка: Supabase URL или Service Key не найдены.');
  console.error('Убедитесь, что VITE_SUPABASE_URL и SUPABASE_SERVICE_KEY прописаны в вашем .env.local файле.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const seedPrompts = [
    {
        prompt_name: 'Базовый генератор опросов v1',
        prompt_text: `Ты — профессиональный социолог и HR-специалист. Твоя задача — создавать подробные, сбалансированные и нейтральные опросы.

Тема опроса: {SURVEY_TOPIC}
Целевая аудитория: {SURVEY_AUDIENCE}

Создай опрос, который включает в себя минимум 10 вопросов разных типов (множественный выбор, открытые вопросы, шкала Лайкерта). Вопросы должны быть четкими, понятными и не содержать наводящих формулировок.`,
        generation_mode: 'survey',
        is_active: true,
        version: 1,
        notes: 'Базовый системный промпт для создания опросов на любую тему.'
    },
    {
        prompt_name: 'Психологическая диагностика v1',
        prompt_text: `Ты — эксперт в психометрике и организационной психологии. Твоя задача — разработать диагностический опросник для оценки определенного качества или состояния.

Цель диагностики: {DIAGNOSTIC_GOAL}

Разработай структурированный опросник, который является клинически обоснованным и направлен на выявление ключевых поведенческих паттернов. Убедись, что вопросы не являются наводящими и охватывают различные аспекты исследуемой темы.`,
        generation_mode: 'diagnostic',
        is_active: true,
        version: 1,
        notes: 'Базовый системный промпт для создания диагностических анкет.'
    },
    {
        prompt_name: 'Создатель фреймворков v1',
        prompt_text: `Ты — стратегический консультант, специализирующийся на управлении талантами. Твоя задача — создать фреймворк компетенций для определенной роли.

Роль: {ROLE_NAME}

Создай фреймворк, который включает 5-7 ключевых компетенций. Для каждой компетенции опиши 3-4 поведенческих индикатора для разных уровней владения (например, Новичок, Специалист, Эксперт). Фреймворк должен соответствовать стратегическим целям компании.`,
        generation_mode: 'framework',
        is_active: true,
        version: 1,
        notes: 'Базовый системный промпт для генерации фреймворков компетенций.'
    }
];

const seedDatabase = async () => {
  console.log('--- Запуск скрипта наполнения базы данных ---');

  console.log('Шаг 1: Удаление всех существующих метапромптов...');
  const { error: deleteError } = await supabase
    .from('meta_prompts')
    .delete()
    .gt('id', -1); // Условие для удаления всех записей

  if (deleteError) {
    console.error('Ошибка при удалении метапромптов:', deleteError.message);
    console.error('Убедитесь, что ваш SUPABASE_SERVICE_KEY верный и RLS не блокирует удаление.');
    return;
  }
  console.log('Шаг 1: Все старые промпты успешно удалены.');

  console.log('Шаг 2: Добавление новых стартовых промптов...');
  const { data, error: insertError } = await supabase
    .from('meta_prompts')
    .insert(seedPrompts)
    .select();

  if (insertError) {
    console.error('Ошибка при добавлении метапромптов:', insertError.message);
    return;
  }

  console.log(`Шаг 2: Успешно добавлено ${data.length} метапромптов!`);
  console.log('--- Наполнение базы данных завершено! ---');
};

seedDatabase();

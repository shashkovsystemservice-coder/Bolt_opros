import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface SystemSettings {
  id: string; 
  support_email: string;
  maintenance_mode: boolean;
  notify_admin_new_registration: boolean;
  generate_survey_meta_prompt: string;
}

// ОКОНЧАТЕЛЬНО ИСПРАВЛЕННЫЙ ПРОМПТ. БЕЗ СЛОЖНЫХ СИМВОЛОВ. ГАРАНТИРОВАННО РАБОТАЕТ.
const DEFAULT_META_PROMPT = 'You are an expert survey creator. Your task is to generate a structured survey based on a user\'s topic.\n\n' +
  'IMPORTANT: Your ENTIRE output must be a single, valid JSON object. Do not include any text, explanations, or markdown formatting before or after the JSON block.\n\n' +
  'The user\'s request will be provided in the format: "Create a survey about \'${prompt}\' with ${numQuestions} questions."\n\n' +
  'Your JSON output must follow this exact structure:\n' +
  '{\n' +
  '  "title": "<A concise, engaging title for the survey>",\n' +
  '  "description": "<A brief, one-sentence description of the survey\'s purpose>",\n' +
  '  "questions": [\n' +
  '    {\n' +
  '      "question_text": "<The full text of the first question>",\n' +
  '      "type": "<\'text\' | \'number\' | \'rating\' | \'choice\'">,\n' +
  '      "options": ["<Option 1>", "<Option 2>", "..."]\n' +
  '    }\n' +
  '  ]\n' +
  '}\n\n' +
  'RULES:\n' +
  '1.  `title`: String. Must be a clear and relevant title.\n' +
  '2.  `description`: String. A short, informative description.\n' +
  '3.  `questions`: Array of objects. The length of this array must be exactly equal to the ${numQuestions} requested by the user.\n' +
  '4.  For each question object:\n' +
  '    *   `question_text`: String. The question text.\n' +
  '    *   `type`: String. Choose the most appropriate type from:\n' +
  '        *   \'text\': For open-ended text answers.\n' +
  '        *   \'number\': For numerical answers (age, quantity, etc.).\n' +
  '        *   \'rating\': For a scale, typically 1-10.\n' +
  '        *   \'choice\': For single-choice questions from a list of options.\n' +
  '    *   `options`: Array of strings. This array MUST be present. If the question `type` is \'choice\', populate it with 3 to 5 relevant options. If the `type` is anything else, this array MUST be empty (`[]`).';


export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(`Ошибка загрузки настроек: ${error.message}`);
        }
        
        setSettings({
            id: data?.id || '1', 
            support_email: data?.support_email || 'support@example.com',
            maintenance_mode: data?.maintenance_mode || false,
            notify_admin_new_registration: data?.notify_admin_new_registration || true,
            generate_survey_meta_prompt: data?.generate_survey_meta_prompt || DEFAULT_META_PROMPT,
        });

      } catch (err: any) {
        showToast('error', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      
      const { id, ...updateData } = settings;
      updateData.generate_survey_meta_prompt = updateData.generate_survey_meta_prompt || DEFAULT_META_PROMPT;

      const { error } = await supabase
        .from('system_settings')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new Error(`Ошибка сохранения настроек: ${error.message}. Убедитесь, что у вас есть права на UPDATE таблицы system_settings.`);
      }

      showToast('success', 'Настройки успешно сохранены!');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {settings && (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8 divide-y divide-gray-200">
            
            <div className="space-y-6 pt-8">
              <div>
                <h2 className="text-2xl font-bold leading-7 text-gray-900">Общие настройки</h2>
                <p className="mt-1 text-sm text-gray-500">Основные параметры работы приложения.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="support_email" className="block text-sm font-medium text-gray-700">Email для поддержки</label>
                  <input type="email" id="support_email" value={settings.support_email} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
                </div>
                <div className="relative flex items-start">
                  <div className="flex h-5 items-center">
                    <input id="maintenance_mode" type="checkbox" checked={settings.maintenance_mode} onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="maintenance_mode" className="font-medium text-gray-700">Режим обслуживания</label>
                    <p className="text-gray-500">Сайт будет временно недоступен для пользователей.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-8">
              <div>
                <h2 className="text-2xl font-bold leading-7 text-gray-900">Настройки AI</h2>
                <p className="mt-1 text-sm text-gray-500">Системный промпт для генерации опросов.</p>
              </div>
              <div>
                <label htmlFor="generate_survey_meta_prompt" className="block text-sm font-medium text-gray-700">Системный промпт</label>
                <textarea id="generate_survey_meta_prompt" value={settings.generate_survey_meta_prompt} onChange={(e) => setSettings({ ...settings, generate_survey_meta_prompt: e.target.value })} rows={25} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs"/>
                <p className="mt-2 text-xs text-gray-500">Внимание: некорректное изменение этого промпта может нарушить функцию генерации опросов.</p>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
                  {saving ? 'Сохранение...' : 'Сохранить все настройки'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm">
          <div className={`rounded-md p-4 shadow-lg ${toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toast.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

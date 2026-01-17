import { supabase } from './supabase';

export async function generateSurveyWithAI(prompt: string, count: number) {
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { action: 'generate-survey', prompt, numQuestions: count }
    });

    if (error || !data || !data.generated_survey) {
        throw new Error(error?.message || 'Ошибка AI-сервиса');
    }

    const result = data.generated_survey;
    return {
        title: (result.title || prompt).trim(),
        description: result.description || '',
        questions: (result.questions || []).map((q: any) => {
            const isRating = q.type === 'rating';
            return {
                id: crypto.randomUUID(),
                text: q.question || q.text,
                type: q.type,
                required: true,
                rating_max: isRating ? (q.options?.scale_max || 5) : 5,
                rating_labels: isRating ? [q.options?.label_min || '', q.options?.label_max || ''] : ['', ''],
                options: q.options || []
            };
        })
    };
}
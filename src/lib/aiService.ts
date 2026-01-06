
import { LocalQuestion } from '../pages/CreateSurvey';
import { supabase } from './supabase';

interface AIQuestionResponse {
  question: string;
  type: 'text' | 'number' | 'rating' | 'choice' | 'radio' | 'checkbox' | 'scale' | 'email';
  options?: string[];
}

interface AISurveyResponse {
  title: string;
  description: string;
  questions: AIQuestionResponse[];
}

export interface GeneratedSurvey {
    questions: Omit<LocalQuestion, 'id'>[];
    title: string;
    description: string;
}

export async function generateSurveyWithAI(prompt: string, questionCount: number): Promise<GeneratedSurvey> {
    
    const { data: functionData, error: functionError } = await supabase.functions.invoke('gemini-ai', {
        body: {
            action: 'generate-survey',
            data: {
                prompt: prompt,
                questionsCount: questionCount,
            },
        },
    });

    if (functionError) {
        const message = functionError.message || 'Не удалось связаться с AI-сервисом.';
        console.error("[AI Service] Function invocation error:", functionError);
        if ((functionError as any).context?.body) {
             try {
                const ctxBody = JSON.parse((functionError as any).context.body);
                if(ctxBody.error) throw new Error(ctxBody.error);
             } catch {}
        }
        throw new Error(message);
    }
    
    const rawText = functionData.generated_survey;

    if (!rawText || typeof rawText !== 'string') {
        console.error("[AI Service] Backend function did not return 'generated_survey' string.", functionData);
        throw new Error('Сервер не вернул сгенерированный текст опроса.');
    }

    console.log("%c[AI Service] Raw response from server:", "color: blue; font-weight: bold;", rawText);

    let result: AISurveyResponse;
    try {
        const cleanedText = rawText.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
        result = JSON.parse(cleanedText);
    } catch (e: any) {
        console.error("[AI Service] Failed to parse JSON!", e);
        throw new Error("Не удалось обработать ответ от AI. Ответ не является валидным JSON. Проверьте системный промпт в настройках.");
    }

    if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error('AI не смог сгенерировать вопросы по вашему запросу. Попробуйте переформулировать тему.');
    }

    const questions: Omit<LocalQuestion, 'id'>[] = result.questions.map((q) => {
        let type: LocalQuestion['type'] = 'text';

        if (['radio', 'checkbox', 'choice'].includes(q.type)) type = 'choice';
        else if (['rating', 'scale'].includes(q.type)) type = 'rating';
        else if (q.type === 'number') type = 'number';
        else if (q.type === 'email') type = 'email';

        return {
            text: q.question,
            type,
            required: true,
            options: type === 'choice' ? (q.options || []) : [],
        };
    });

    const surveyTitle = result.title || prompt;
    const surveyDescription = result.description || `Опрос, сгенерированный AI на тему: "${prompt}"`;

    return {
        title: surveyTitle,
        description: surveyDescription,
        questions: questions
    };
}

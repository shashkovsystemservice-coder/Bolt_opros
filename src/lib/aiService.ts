
import { LocalQuestion } from '../pages/CreateSurvey';
import { supabase } from './supabase'; // Use the central supabase client

// Interface for the raw response from the AI Function
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

// Interface for the structured data our service will return
export interface GeneratedSurvey {
    questions: Omit<LocalQuestion, 'id'>[];
    title: string;
    description: string;
}

/**
 * Generates a survey using the AI backend function.
 * This is the central point for all AI-based survey generation.
 * 
 * @param prompt The main subject of the survey (this was 'topic' before).
 * @param questionCount The number of questions to generate.
 * @returns A promise that resolves to a structured survey object.
 */
export async function generateSurveyWithAI(prompt: string, questionCount: number): Promise<GeneratedSurvey> {
    
    // Use the invoke method from supabase-js for better error handling and auth
    const { data: functionData, error: functionError } = await supabase.functions.invoke('gemini-ai', {
        body: {
            action: 'generate-survey',
            data: {
                prompt: prompt, // CORRECTED: Was 'topic', now it is 'prompt' to match the server.
                questionsCount: questionCount,
            },
        },
    });

    if (functionError) {
        // The functionError can be a FetchError, FunctionError, etc.
        // We try to get a meaningful message from it.
        const message = functionError.message || 'Не удалось связаться с AI-сервисом.';
        console.error("[AI Service] Function invocation error:", functionError);
        // Check for specific backend error message embedded in the response
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
        // Sometimes the AI might return the JSON wrapped in markdown, let's clean it up.
        const cleanedText = rawText.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
        result = JSON.parse(cleanedText);
    } catch (e: any) {
        console.error("[AI Service] Failed to parse JSON!", e);
        throw new Error("Не удалось обработать ответ от AI. Ответ не является валидным JSON. Проверьте системный промпт в настройках.");
    }

    if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error('AI не смог сгенерировать вопросы по вашему запросу. Попробуйте переформулировать тему.');
    }

    // Map the flexible API response to our strict LocalQuestion structure
    const questions: Omit<LocalQuestion, 'id'>[] = result.questions.map((q) => {
        let type: LocalQuestion['type'] = 'text'; // Default to text

        if (['radio', 'checkbox', 'choice'].includes(q.type)) type = 'choice';
        else if (['rating', 'scale'].includes(q.type)) type = 'rating';
        else if (q.type === 'number') type = 'number';
        else if (q.type === 'email') type = 'email';

        return {
            text: q.question,
            type,
            required: true,
            options: type === 'choice' ? (q.options || []) : [], // Ensure options are empty for non-choice questions
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

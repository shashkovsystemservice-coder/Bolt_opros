
import { LocalQuestion } from '../pages/CreateSurvey';
import { supabase } from './supabase';

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


export async function generateSurveyWithAI(topic: string, questionCount: number): Promise<GeneratedSurvey> {
    
    const { data: result, error } = await supabase.functions.invoke('gemini-ai', {
        body: {
            action: 'generate-survey',
            data: {
                user_prompt: topic,
                num_questions: questionCount,
            },
        },
    });

    if (error) {
        throw new Error(`Ошибка вызова функции: ${error.message}`);
    }

    if (result.status === 'error') {
        throw new Error(`Ошибка генерации AI: ${result.message}`);
    }

    try {
        // --- START OF FINAL FIX ---
        // The AI can sometimes wrap the JSON in markdown. We need to robustly clean it.
        let rawResponse = result.data as string;
        
        const jsonStartIndex = rawResponse.indexOf('{');
        const jsonEndIndex = rawResponse.lastIndexOf('}');
        
        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex < jsonStartIndex) {
            console.error("Invalid JSON structure in AI response:", rawResponse);
            throw new Error('Не удалось найти валидный JSON-объект в ответе AI.');
        }

        const jsonString = rawResponse.substring(jsonStartIndex, jsonEndIndex + 1);
        // --- END OF FINAL FIX ---

        const aiResult: AISurveyResponse = JSON.parse(jsonString);

        if (!aiResult.questions || !Array.isArray(aiResult.questions) || aiResult.questions.length === 0) {
            throw new Error('AI вернул пустой или некорректный список вопросов.');
        }

        const questions: Omit<LocalQuestion, 'id'>[] = aiResult.questions.map((q) => {
            let type: LocalQuestion['type'] = 'text';
            if (['radio', 'checkbox', 'choice'].includes(q.type)) type = 'choice';
            else if (['rating', 'scale'].includes(q.type)) type = 'rating';
            else if (q.type === 'number') type = 'number';
            else if (q.type === 'email') type = 'email';

            return {
                text: q.question,
                type,
                required: true,
                options: q.options || [],
            };
        });

        const surveyTitle = aiResult.title || topic;
        const surveyDescription = aiResult.description || `Опрос, сгенерированный AI на тему: "${topic}"`;

        return {
            title: surveyTitle,
            description: surveyDescription,
            questions: questions
        };

    } catch (e: any) {
        console.error("Ошибка парсинга ответа от AI:", result.data);
        throw new Error(`Не удалось разобрать ответ от AI. Пожалуйста, проверьте системный промпт и модель. Детали: ${e.message}`);
    }
}

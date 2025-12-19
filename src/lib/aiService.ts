
import { LocalQuestion } from '../pages/CreateSurvey';

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
 * Tests a specific AI model's availability and returns its status.
 * @param modelName The name of the model to test (e.g., 'gemini-1.5-pro-latest').
 * @returns A promise that resolves to a status object.
 */
export async function testAiModel(modelName: string): Promise<{ status: 'ok' | 'error', message: string }> {
    // NOTE: This is a placeholder. The backend function needs to be updated to support this.
    // Since Docker is not working, we are returning a mock response for now.
    console.log(`[Dev Mock] Testing model: ${modelName}`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    if (modelName.includes('pro')) {
         return { status: 'ok', message: 'Модель доступна и работает.' };
    } else if (modelName.includes('flash')) {
         return { status: 'ok', message: 'Модель доступна и работает.' };
    } else {
         return { status: 'error', message: 'Модель не найдена. Проверьте название на опечатки.' };
    }
}


/**
 * Generates a survey using the AI backend function.
 * This is the central point for all AI-based survey generation.
 * If the backend AI model or its API changes, we only need to update this function.
 * 
 * @param topic The main subject of the survey.
 * @param questionCount The number of questions to generate.
 * @returns A promise that resolves to a structured survey object.
 */
export async function generateSurveyWithAI(topic: string, questionCount: number): Promise<GeneratedSurvey> {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'generate-survey',
            data: {
                topic: topic,
                questionCount,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Сервер AI вернул ошибку ${response.status}. Попробуйте снова.`);
    }

    // --- FRONTEND DIAGNOSTICS ---
    const rawText = await response.text();
    console.log("%c[AI Service] Raw response from server:", "color: blue; font-weight: bold;", rawText);

    let result: AISurveyResponse;
    try {
        result = JSON.parse(rawText);
    } catch (e: any) {
        console.error("[AI Service] Failed to parse JSON!", e);
        throw new Error("Не удалось обработать ответ от AI. Ответ не является валидным JSON.");
    }
    // --- END OF DIAGNOSTICS ---


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
            options: q.options || [],
        };
    });

    const surveyTitle = result.title || topic;
    const surveyDescription = result.description || `Опрос, сгенерированный AI на тему: "${topic}"`;

    return {
        title: surveyTitle,
        description: surveyDescription,
        questions: questions
    };
}

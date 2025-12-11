
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
        // Provide a more user-friendly error
        throw new Error(errorData?.error || `Сервер AI вернул ошибку ${response.status}. Попробуйте снова.`);
    }

    const result: AISurveyResponse = await response.json();

    if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        // Handle cases where the AI returns an empty or invalid question list
        throw new Error('AI не смог сгенерировать вопросы по вашему запросу. Попробуйте переформулировать тему.');
    }

    // Map the flexible API response to our strict LocalQuestion structure
    const questions: Omit<LocalQuestion, 'id'>[] = result.questions.map((q) => {
        let type: LocalQuestion['type'] = 'text'; // Default to text

        // Map various possible AI types to our strict, defined types
        if (['radio', 'checkbox', 'choice'].includes(q.type)) type = 'choice';
        else if (['rating', 'scale'].includes(q.type)) type = 'rating';
        else if (q.type === 'number') type = 'number';
        else if (q.type === 'email') type = 'email';

        return {
            text: q.question,
            type,
            required: true, // Always default to required, user can change this easily
            options: q.options || [],
        };
    });

    // Ensure we always have a title and description
    const surveyTitle = result.title || topic;
    const surveyDescription = result.description || `Опрос, сгенерированный AI на тему: "${topic}"`;

    return {
        title: surveyTitle,
        description: surveyDescription,
        questions: questions
    };
}

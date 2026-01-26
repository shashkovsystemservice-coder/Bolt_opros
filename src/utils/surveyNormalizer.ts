
import { v4 as uuidv4 } from 'uuid';

// The unified structure for both sections and questions in the editor
export interface SurveyItem {
  id: string; // Always a fresh, valid UUID
  itemType: 'section' | 'question';
  text: string; // Title for section, text for question
  
  // --- Question-specific fields ---
  db_id?: number; 
  type?: 'text' | 'number' | 'rating' | 'choice' | 'multi_choice';
  required?: boolean;
  options?: any; // Standardized object for options like weight, scale, labels etc.
  is_standard?: boolean;
}

// Raw structures from canonical_blueprint
interface RawQuestion {
    question_text: string;
    question_type: any;
    is_required?: boolean;
    options?: any;
    weight?: number;
    scale_max?: number;
}

interface RawSection {
    title: string;
    questions: RawQuestion[];
}

type RawData = RawSection[] | RawQuestion[];

// Helper to normalize a single question object
const normalizeSingleQuestion = (question: RawQuestion): SurveyItem => {
    const questionOptions = question.options || {};
    let finalOptions: any = {};
    
    if (question.question_type === 'rating') {
        finalOptions = {
            weight: question.weight ?? questionOptions.weight ?? 1.0,
            scale_max: question.scale_max ?? questionOptions.scale_max ?? 5,
            label_min: questionOptions.label_min || '',
            label_max: questionOptions.label_max || '',
        };
    } else {
        finalOptions = questionOptions;
        if (question.weight !== undefined) {
            finalOptions.weight = question.weight;
        }
    }
    
    return {
        id: uuidv4(),
        itemType: 'question',
        text: question.question_text,
        type: question.question_type,
        required: question.is_required ?? true,
        options: finalOptions,
        is_standard: true, // Everything from a blueprint is a standard
    };
};

export const normalizeSurveyItems = (rawData: RawData): SurveyItem[] => {
    const normalizedItems: SurveyItem[] = [];

    if (!Array.isArray(rawData)) {
        console.error("normalizeSurveyItems expects an array, but received:", rawData);
        return [];
    }
    
    // Determine if it's a list of sections or a flat list of questions
    const isSectionBased = rawData.length > 0 && 'title' in rawData[0] && 'questions' in rawData[0];

    if (isSectionBased) {
        (rawData as RawSection[]).forEach(section => {
            normalizedItems.push({
                id: uuidv4(),
                itemType: 'section',
                text: section.title,
            });

            if (Array.isArray(section.questions)) {
                section.questions.forEach(question => {
                    normalizedItems.push(normalizeSingleQuestion(question));
                });
            }
        });
    } else {
        // It's a flat list of questions (e.g., from AI or simple import)
        (rawData as RawQuestion[]).forEach(question => {
            normalizedItems.push(normalizeSingleQuestion(question));
        });
    }

    return normalizedItems;
};

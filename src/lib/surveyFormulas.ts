/**
 * Этот файл содержит реализацию формул для проектирования опросов,
 * основанных на предоставленной спецификации.
 */

// --- 1. Формула емкости ---

interface QuestionTimeParams {
    baseTime: number; // t_i
    modalityFactor: number; // k_mode
    depthFactor: number; // k_depth
}

const calculateTotalWeightedTime = (questions: QuestionTimeParams[]): number => {
    return questions.reduce((sum, q) => sum + (q.baseTime * q.modalityFactor * q.depthFactor), 0);
};

interface CapacityParams {
    totalTime: number; // T_total в секундах
    efficiencyFactor?: number; // η
    questions: QuestionTimeParams[];
}

export const calculateQuestionCapacity = ({ totalTime, efficiencyFactor = 0.8, questions }: CapacityParams): number => {
    if (questions.length === 0 || totalTime <= 0) {
        return 0;
    }
    const totalWeightedTime = calculateTotalWeightedTime(questions);
    const averageWeightedTime = totalWeightedTime / questions.length;
    if (averageWeightedTime === 0) return Infinity;
    return Math.floor((totalTime * efficiencyFactor) / averageWeightedTime);
};

// --- 2. Формула композиции ---

export type SurveyPurpose = "Exploratory" | "Descriptive" | "Other";

export interface QuestionMix {
    closed: number;
    scaled: number;
    open: number;
}

export const getQuestionComposition = (purpose: SurveyPurpose): QuestionMix => {
    switch (purpose) {
        case "Exploratory":
            return { closed: 0.2, scaled: 0.2, open: 0.6 };
        case "Descriptive":
            return { closed: 0.2, scaled: 0.7, open: 0.1 };
        default:
            // Равномерное распределение по умолчанию
            return { closed: 1/3, scaled: 1/3, open: 1/3 };
    }
};

// --- 3. Формула логической плотности ---

export type SurveyLogic = "Linear" | "Adaptive";

export const calculateLogicalDensity = (branchingNodes: number, totalQuestions: number, logicType: SurveyLogic): number => {
    if (logicType === "Linear" || totalQuestions === 0) {
        return 0;
    }
    const density = branchingNodes / totalQuestions;
    return Math.min(density, 1.0);
};

// --- 4. Индекс когнитивной нагрузки ---

interface BurdenIndexParams {
    totalQuestions: number; // N
    complexityFactor: number; // k_complexity
    totalTime: number; // T_total в секундах
}

export const calculateCognitiveBurdenIndex = ({ totalQuestions, complexityFactor, totalTime }: BurdenIndexParams): number => {
    if (totalTime === 0) {
        return Infinity;
    }
    return (totalQuestions * complexityFactor) / totalTime;
};

export const isBurdenTooHigh = (index: number, threshold: number): boolean => {
    return index > threshold;
};

import { useTranslation } from 'react-i18next';

export interface Question {
    id: number;
    dimension: string;
    text: string;
    options: {
        optionA: string;
        optionB: string;
    };
}

export const useTranslatedQuestions = (): Question[] => {
    const { t } = useTranslation('questions');

    const questionsData = t('questions', { returnObjects: true }) as any[];

    return questionsData.map((q: any) => ({
        id: q.id,
        dimension: q.dimension,
        text: q.text,
        options: {
            optionA: q.options.optionA,
            optionB: q.options.optionB
        }
    }));
};

export const baseQuestionIds = [
    1, 2, 3, 4, 5, 6, 7, 8, // E-I dimension
    9, 10, 11, 12, 13, 14, 15, 16, // S-N dimension
    17, 18, 19, 20, 21, 22, 23, // T-F dimension
    24, 25, 26, 27, 28, 29, 30 // J-P dimension
];
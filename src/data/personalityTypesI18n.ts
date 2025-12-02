import { useTranslation } from 'react-i18next';

export interface PersonalityType {
  code: string;
  name: string;
  nameEn: string;
  description: string;
  characteristics: string[];
  careers: string[];
  strengths: string[];
  challenges: string[];
}

export const useTranslatedPersonalityTypes = (): Record<string, PersonalityType> => {
    const { t } = useTranslation('personalityTypes');

    const personalityCodes = [
        'INTJ', 'INTP', 'ENTJ', 'ENTP',
        'INFJ', 'INFP', 'ENFJ', 'ENFP',
        'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
        'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    const types: Record<string, PersonalityType> = {};

    personalityCodes.forEach(code => {
        const typeData = t(code, { returnObjects: true }) as any;
        types[code] = {
            code: code,
            name: typeData.name,
            nameEn: typeData.nameEn,
            description: typeData.description,
            characteristics: typeData.characteristics,
            careers: typeData.careers,
            strengths: typeData.strengths,
            challenges: typeData.challenges
        };
    });

    return types;
};
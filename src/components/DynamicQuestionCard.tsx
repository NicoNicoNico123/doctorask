import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MedicalQuestion } from '../types/symptomProfile';

interface DynamicQuestionCardProps {
    question: MedicalQuestion;
    onAnswer: (answer: any) => void;
    onNext?: () => void;
    isLast?: boolean;
    diagnosticProgress?: {
        currentConfidence: number;
        targetConfidence: number;
        totalQuestionsAsked: number;
        maxQuestions: number;
        nextQuestionStrategy: string;
        possibleDiagnoses: any[];
        ruledOutConditions: any[];
    };
    questionCount?: number;
}

const DynamicQuestionCard: React.FC<DynamicQuestionCardProps> = ({
    question,
    onAnswer,
    onNext,
    isLast = false,
    diagnosticProgress,
    questionCount = 0
}) => {
    const { t } = useTranslation();
    const [answer, setAnswer] = useState<any>('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (answer || answer === 0) { // Allow 0 for severity scales
            onAnswer(answer);
            if (onNext) {
                onNext();
            }
        }
    };

    const getSeverityColor = (level: number) => {
        if (level <= 3) return 'text-green-600 bg-green-50 border-green-200';
        if (level <= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        if (level <= 8) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getQuestionTypeIcon = () => {
        switch (question.type) {
            case 'scale':
                return '📊';
            case 'duration':
                return '⏰';
            case 'location':
                return '📍';
            case 'multiple_choice':
                return '🔄';
            case 'text':
                return '⚡';
            case 'yes_no':
                return '🔗';
            default:
                return '❓';
        }
    };

    const getQuestionTypeLabel = () => {
        switch (question.type) {
            case 'scale':
                return t('dynamicQuestion.type.severity');
            case 'duration':
                return t('dynamicQuestion.type.duration');
            case 'location':
                return t('dynamicQuestion.type.location');
            case 'multiple_choice':
                return t('dynamicQuestion.type.frequency');
            case 'text':
                return t('dynamicQuestion.type.triggers');
            case 'yes_no':
                return t('dynamicQuestion.type.associated');
            default:
                return t('dynamicQuestion.type.general');
        }
    };

    
    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'emergency': return 'text-red-600 bg-red-50 border-red-200';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 lg:p-12 rounded-xl shadow-lg">
                {/* Question Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{getQuestionTypeIcon()}</span>
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {getQuestionTypeLabel()}
                        </span>
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full ml-auto">
                            {t('dynamicQuestion.singleQuestion')}
                        </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h3 className="text-xl lg:text-2xl font-bold text-gray-800 leading-relaxed">
                            {question.question}
                        </h3>
                    </div>
                    <p className="text-sm text-gray-500 italic">
                        {t('dynamicQuestion.oneThingAtATime')}
                    </p>
                </div>

                {/* Leading Possibilities */}
                {diagnosticProgress && diagnosticProgress.possibleDiagnoses.length > 0 && (
                    <div className="mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 mb-3">{t('dynamicQuestion.leadingPossibilities')}</h4>
                            <div className="space-y-2">
                                {diagnosticProgress.possibleDiagnoses.slice(0, 3).map((diagnosis, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="text-sm font-medium text-gray-700">{diagnosis.name}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full border ${getUrgencyColor(diagnosis.urgency)}`}>
                                                {diagnosis.urgency}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{Math.round(diagnosis.confidence)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Response Input */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {question.type === 'scale' && (
                        <div className="py-6">
                            <div className="text-center">
                                <div className={`text-6xl font-bold mb-4 ${getSeverityColor(Number(answer)).split(' ')[0]}`}>
                                    {answer || 0}
                                </div>
                                <div className={`text-lg font-semibold mb-6 ${getSeverityColor(Number(answer))}`}>
                                    {answer === 0 && t('dynamicQuestion.scale.pleaseSelect')}
                                    {answer > 0 && answer <= 3 && t('dynamicQuestion.scale.mild')}
                                    {answer > 3 && answer <= 6 && t('dynamicQuestion.scale.moderate')}
                                    {answer > 6 && answer <= 8 && t('dynamicQuestion.scale.severe')}
                                    {answer > 8 && t('dynamicQuestion.scale.verySevere')}
                                </div>
                            </div>
                            <input
                                type="range"
                                min={question.type === 'scale' ? 0 : 1}
                                max={10}
                                value={answer}
                                onChange={(e) => setAnswer(Number(e.target.value))}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-sm text-gray-500 mt-2 font-medium">
                                <span>{question.type === 'scale' ? t('dynamicQuestion.scale.noPain') : t('dynamicQuestion.scale.minimal')}</span>
                                <span>{t('dynamicQuestion.scale.maximum')}</span>
                            </div>
                        </div>
                    )}

                    {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-3">
                            {question.options.map((option, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setAnswer(option)}
                                    className={`w-full text-left p-4 border-2 rounded-xl transition duration-200 font-medium ${answer === option
                                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                                        : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {question.type === 'text' && (
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder={t('dynamicQuestion.typeYourAnswer')}
                            rows={4}
                            className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg"
                            autoFocus
                        />
                    )}

                    <button
                        type="submit"
                        disabled={!answer && answer !== 0}
                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLast ? t('dynamicQuestion.complete') : t('dynamicQuestion.next')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DynamicQuestionCard;
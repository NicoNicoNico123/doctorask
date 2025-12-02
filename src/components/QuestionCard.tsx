import React from 'react';
import { useTranslation } from 'react-i18next';

interface Option {
    text: string;
    value: string;
}

interface Question {
    id: number;
    text: string;
    dimension: string;
    optionA: Option;
    optionB: Option;
}

interface QuestionCardProps {
    question: Question;
    onAnswer: (value: string) => void;
    currentQuestionIndex: number;
    totalQuestions: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
    question,
    onAnswer,
    currentQuestionIndex,
    totalQuestions
}) => {
    const { t } = useTranslation();

    return (
        <div className="max-w-2xl lg:max-w-4xl mx-auto bg-white p-8 lg:p-12 rounded-xl shadow-lg transition-all duration-300">
            <div className="mb-8 lg:mb-12">
                <div className="flex justify-between text-sm lg:text-base text-gray-500 mb-3 font-medium">
                    <span>{t('question.progress', { current: currentQuestionIndex + 1, total: totalQuestions })}</span>
                    <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 lg:h-4">
                    <div
                        className="bg-indigo-600 h-3 lg:h-4 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                    ></div>
                </div>
            </div>

            <h3 className="text-xl lg:text-3xl font-semibold text-gray-800 mb-8 lg:mb-12 min-h-[80px] lg:min-h-[120px] flex items-center leading-relaxed">
                {question.text}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                <button
                    onClick={() => onAnswer(question.optionA.value)}
                    className="w-full text-left p-6 lg:p-8 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition duration-200 group h-full flex flex-col justify-center"
                >
                    <div className="flex items-center">
                        <span className="w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full mr-4 lg:mr-6 group-hover:bg-indigo-600 group-hover:text-white transition font-bold text-lg lg:text-xl">
                            {t('question.optionA')}
                        </span>
                        <span className="text-gray-700 group-hover:text-indigo-900 text-lg lg:text-xl font-medium">{question.optionA.text}</span>
                    </div>
                </button>

                <button
                    onClick={() => onAnswer(question.optionB.value)}
                    className="w-full text-left p-6 lg:p-8 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition duration-200 group h-full flex flex-col justify-center"
                >
                    <div className="flex items-center">
                        <span className="w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full mr-4 lg:mr-6 group-hover:bg-indigo-600 group-hover:text-white transition font-bold text-lg lg:text-xl">
                            {t('question.optionB')}
                        </span>
                        <span className="text-gray-700 group-hover:text-indigo-900 text-lg lg:text-xl font-medium">{question.optionB.text}</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default QuestionCard;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NameScreenProps {
    userName?: string;
    onChange?: (name: string) => void;
    onNext?: (name: string) => void;
    onBack?: () => void;
    isFinalStep?: boolean;
}

const NameScreen: React.FC<NameScreenProps> = ({
    userName = '',
    onChange,
    onNext,
    onBack,
    isFinalStep = false
}) => {
    const { t } = useTranslation();
    const [name, setName] = useState(userName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && onNext) {
            onNext(name.trim());
        }
    };

    return (
        <div className="max-w-md lg:max-w-2xl mx-auto bg-white p-8 lg:p-12 rounded-xl shadow-lg transition-all duration-300">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-800">
                {t('nameScreen.title', 'What\'s your name?')}
            </h2>
            <p className="text-gray-600 mb-8 lg:text-lg">
                {t('nameScreen.description', 'Let us know your name so we can personalize your results.')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                <div>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('nameScreen.placeholder', 'Enter your name')}
                        className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg lg:text-xl"
                        autoFocus
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl hover:bg-indigo-700 transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    disabled={!name.trim()}
                >
                    {isFinalStep
                        ? t('nameScreen.completeButton', 'Complete & Get Results')
                        : t('nameScreen.nextButton', 'Next')
                    }
                </button>
            </form>

            {isFinalStep && (
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-700 text-center font-medium">
                        {t('nameScreen.finalStepHint', 'Almost done! Your personalized MBTI results are just one step away.')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default NameScreen;
import React from 'react';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
    onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md lg:max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
                {/* Content Section */}
                <div className="p-8 lg:p-12 lg:w-1/2 flex flex-col justify-center text-center lg:text-left">
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
                        {t('welcome.title')}
                    </h1>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        {t('welcome.description')}
                    </p>

                    <button
                        onClick={onStart}
                        className="w-full lg:w-auto bg-indigo-600 text-white py-4 px-8 rounded-xl hover:bg-indigo-700 transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                        {t('welcome.startButton')}
                    </button>
                </div>

                {/* Decorative Section for iPad/Desktop */}
                <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                        </svg>
                    </div>
                    <div className="relative z-10 h-full flex items-center justify-center text-white opacity-90">
                        <div className="text-9xl">✨</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;

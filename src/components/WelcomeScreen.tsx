import React from 'react';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
    onStart: () => void;
    onRestart?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onRestart }) => {
    const { t } = useTranslation();

    // Check if we have medical translations, if not use MBTI ones
    const isMedicalMode = t('medicalWelcome.title') !== 'medicalWelcome.title';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md lg:max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className={`p-8 lg:p-12 ${isMedicalMode ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white'}`}>
                    <div className="text-center">
                        <div className="text-6xl mb-6">
                            {isMedicalMode ? '🏥' : '✨'}
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-extrabold mb-6">
                            {isMedicalMode ? t('medicalWelcome.title') : t('welcome.title')}
                        </h1>
                        <p className="text-lg leading-relaxed opacity-95">
                            {isMedicalMode ? t('medicalWelcome.description') : t('welcome.description')}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 lg:p-12">
                    {/* Medical Disclaimer */}
                    {isMedicalMode && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <h3 className="font-semibold text-yellow-800 mb-2">
                                        {t('medicalWelcome.disclaimer').split('.')[0] + '.'}
                                    </h3>
                                    <p className="text-yellow-700 text-sm">
                                        {t('medicalWelcome.disclaimer')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Emergency Warning */}
                    {isMedicalMode && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🚨</span>
                                <div>
                                    <h3 className="font-semibold text-red-800 mb-2">
                                        {t('medicalWelcome.emergencyWarning')}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="text-center space-y-4">
                        <button
                            onClick={onStart}
                            className={`w-full py-4 px-8 rounded-xl transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                                isMedicalMode
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {isMedicalMode ? t('medicalWelcome.startButton') : t('welcome.startButton')}
                        </button>

                        {onRestart && (
                            <button
                                onClick={onRestart}
                                className="w-full py-3 px-6 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition duration-200 font-medium"
                            >
                                {t('diagnosisContainer.error.restart')}
                            </button>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>
                            {isMedicalMode
                                ? t('medicalChat.disclaimer')
                                : 'This assessment helps you understand yourself better.'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;

import React from 'react';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
    onStart: () => void;
    onRestart?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onRestart }) => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md lg:max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-8 lg:p-12 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                    <div className="text-center">
                        <div className="text-6xl mb-6">
                            {'🏥'}
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-extrabold mb-6">
                            {t('medicalWelcome.title')}
                        </h1>
                        <p className="text-lg leading-relaxed opacity-95">
                            {t('medicalWelcome.description')}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 lg:p-12">
                    {/* Medical Disclaimer */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-semibold text-yellow-800 mb-2">
                                    {t('medicalWelcome.disclaimer')}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Warning */}
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

                    {/* Action Buttons */}
                    <div className="text-center space-y-4">
                        <button
                            onClick={onStart}
                            className="w-full py-4 px-8 rounded-xl transition duration-200 font-bold text-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {t('medicalWelcome.startButton')}
                        </button>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>
                            {t('medicalChat.disclaimer')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;

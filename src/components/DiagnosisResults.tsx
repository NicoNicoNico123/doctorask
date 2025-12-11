import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Diagnosis, MedicalGuidance } from '../services/medicalAIService';
import MedicalChat from './MedicalChat';

interface DiagnosisResultsProps {
    diagnoses: Diagnosis[];
    guidance: MedicalGuidance;
    patientName: string;
    primarySymptom: string;
}

const DiagnosisResults: React.FC<DiagnosisResultsProps> = ({
    diagnoses,
    guidance,
    patientName,
    primarySymptom
}) => {
    const { t } = useTranslation();
    const [showChat, setShowChat] = useState(false);
    const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'emergency':
                return 'text-red-600 bg-red-100 border-red-200';
            case 'urgent':
                return 'text-orange-600 bg-orange-100 border-orange-200';
            case 'routine':
                return 'text-blue-600 bg-blue-100 border-blue-200';
            case 'self_care':
                return 'text-green-600 bg-green-100 border-green-200';
            default:
                return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
            case 'emergency':
                return '🚨';
            case 'urgent':
                return '⚡';
            case 'routine':
                return '🏥';
            case 'self_care':
                return '🏠';
            default:
                return '📍';
        }
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high':
                return 'text-green-600';
            case 'medium':
                return 'text-yellow-600';
            case 'low':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getConfidenceLabel = (confidence: string) => {
        switch (confidence) {
            case 'high':
                return t('diagnosisResults.confidence.high');
            case 'medium':
                return t('diagnosisResults.confidence.medium');
            case 'low':
                return t('diagnosisResults.confidence.low');
            default:
                return t('diagnosisResults.confidence.unknown');
        }
    };

    const handleDiagnosisClick = (diagnosis: Diagnosis) => {
        setSelectedDiagnosis(diagnosis);
        setShowChat(true);
    };

    const hasEmergencyIndicators = guidance.emergencyIndicators && guidance.emergencyIndicators.length > 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-4">
                    {t('diagnosisResults.title', { name: patientName })}
                </h1>
                <p className="text-lg text-gray-600">
                    {t('diagnosisResults.subtitle', { symptom: primarySymptom })}
                </p>
            </div>

            {/* Medical Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-semibold text-yellow-800 mb-2">
                            {t('diagnosisResults.disclaimer.title')}
                        </h3>
                        <p className="text-yellow-700">
                            {t('diagnosisResults.disclaimer.content')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Emergency Warning */}
            {hasEmergencyIndicators && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🚨</span>
                        <div>
                            <h3 className="font-semibold text-red-800 mb-3">
                                {t('diagnosisResults.emergency.title')}
                            </h3>
                            <ul className="list-disc list-inside space-y-2 text-red-700">
                                {guidance.emergencyIndicators.map((indicator, index) => (
                                    <li key={index}>{indicator}</li>
                                ))}
                            </ul>
                            <p className="mt-3 font-semibold text-red-800">
                                {t('diagnosisResults.emergency.callToAction')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Diagnosis Results */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {t('diagnosisResults.possibleConditions')}
                </h2>

                {Array.isArray(diagnoses) && diagnoses.length > 0 ? diagnoses.map((diagnosis, index) => (
                    <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-lg font-semibold text-gray-800">
                                        {index + 1}. {diagnosis.condition}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(diagnosis.urgencyLevel)}`}>
                                        {getUrgencyIcon(diagnosis.urgencyLevel)} {t(`diagnosisResults.urgency.${diagnosis.urgencyLevel}`)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">
                                        {t('diagnosisResults.probability')}: <span className="font-bold">{diagnosis.probability}%</span>
                                    </span>
                                    <span className={`${getConfidenceColor(diagnosis.confidence)}`}>
                                        {t('diagnosisResults.confidence.label')}: <span className="font-medium">{getConfidenceLabel(diagnosis.confidence)}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="relative w-24 h-24">
                                    <svg className="transform -rotate-90 w-24 h-24">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="36"
                                            stroke="#e5e7eb"
                                            strokeWidth="8"
                                            fill="none"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="36"
                                            stroke="#3b82f6"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeDasharray={`${(diagnosis.probability / 100) * 226} 226`}
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">{diagnosis.probability}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">
                                    {t('diagnosisResults.reasoning')}
                                </h4>
                                <p className="text-gray-600">{diagnosis.reasoning}</p>
                            </div>

                            <button
                                onClick={() => handleDiagnosisClick(diagnosis)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
                            >
                                {t('diagnosisResults.askAboutThis')}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-600">
                        {t('diagnosisResults.noDiagnoses')}
                    </div>
                )}
            </div>

            {/* Medical Guidance */}
            <div className="grid md:grid-cols-2 gap-6">
                {guidance.nextSteps && guidance.nextSteps.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span>👣</span> {t('diagnosisResults.nextSteps')}
                        </h3>
                        <ul className="space-y-2">
                            {guidance.nextSteps.map((step, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span className="text-gray-600">{step}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {guidance.selfCareRecommendations && guidance.selfCareRecommendations.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🏠</span> {t('diagnosisResults.selfCare')}
                        </h3>
                        <ul className="space-y-2">
                            {guidance.selfCareRecommendations.map((recommendation, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">•</span>
                                    <span className="text-gray-600">{recommendation}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* When to Seek Care */}
            {guidance.whenToSeekCare && guidance.whenToSeekCare.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <span>🏥</span> {t('diagnosisResults.whenToSeekCare')}
                    </h3>
                    <ul className="space-y-2">
                        {guidance.whenToSeekCare.map((condition, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span className="text-blue-700">{condition}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Chat Button */}
            <div className="text-center">
                <button
                    onClick={() => setShowChat(!showChat)}
                    className="bg-blue-600 text-white py-3 px-8 rounded-xl hover:bg-blue-700 transition duration-200 font-semibold text-lg shadow-md hover:shadow-lg"
                >
                    {showChat ? t('diagnosisResults.hideChat') : t('diagnosisResults.askQuestions')}
                </button>
            </div>

            {/* Medical Chat */}
            {showChat && (
                <MedicalChat
                    diagnoses={diagnoses}
                    patientName={patientName}
                    primarySymptom={primarySymptom}
                    selectedDiagnosis={selectedDiagnosis}
                />
            )}
        </div>
    );
};

export default DiagnosisResults;
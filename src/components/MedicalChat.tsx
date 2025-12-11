import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Diagnosis, PatientContext, askLegacyMedicalQuestion } from '../services/medicalAIService';

interface MedicalChatProps {
    diagnoses: Diagnosis[];
    patientName: string;
    primarySymptom: string;
    selectedDiagnosis?: Diagnosis | null;
}

interface ChatMessage {
    type: 'user' | 'assistant';
    message: string;
    timestamp: Date;
    reasoning_details?: unknown;
}

const MedicalChat: React.FC<MedicalChatProps> = ({
    diagnoses,
    patientName,
    primarySymptom,
    selectedDiagnosis
}) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Create a simple patient context for the chat
    const patientContext: PatientContext = {
        age: 30, // Default - in real app this would come from patient data
        gender: 'unknown',
        name: patientName,
        primarySymptom,
        additionalSymptoms: []
    };

    const suggestedQuestions = [
        t('medicalChat.suggestedQuestions.whatDoesThisMean'),
        t('medicalChat.suggestedQuestions.howSerious'),
        t('medicalChat.suggestedQuestions.treatmentOptions'),
        t('medicalChat.suggestedQuestions.prevention'),
        t('medicalChat.suggestedQuestions.whenToWorry'),
        t('medicalChat.suggestedQuestions.lifestyleChanges')
    ];

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            type: 'user',
            message: messageText.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await askLegacyMedicalQuestion(
                messageText.trim(),
                diagnoses,
                patientContext,
                messages
            );

            const assistantMessage: ChatMessage = {
                type: 'assistant',
                message: response.content,
                timestamp: new Date(),
                reasoning_details: response.reasoning_details
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error getting medical chat response:', error);
            const errorMessage: ChatMessage = {
                type: 'assistant',
                message: t('medicalChat.error.message'),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestedQuestion = (question: string) => {
        setInputValue(question);
        inputRef.current?.focus();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputValue);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
            {/* Chat Header */}
            <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">
                            {t('medicalChat.title')}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {t('medicalChat.subtitle')}
                        </p>
                    </div>
                </div>
                {selectedDiagnosis && (
                    <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>{t('medicalChat.focusedOn')}:</strong> {selectedDiagnosis.condition}
                        </p>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">💬</div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                            {t('medicalChat.welcome.title')}
                        </h4>
                        <p className="text-gray-600 mb-6">
                            {t('medicalChat.welcome.subtitle')}
                        </p>

                        {/* Suggested Questions */}
                        <div className="text-left max-w-2xl mx-auto">
                            <p className="text-sm font-medium text-gray-700 mb-3">
                                {t('medicalChat.suggestedQuestions.title')}:
                            </p>
                            <div className="grid gap-2">
                                {suggestedQuestions.slice(0, 3).map((question, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestedQuestion(question)}
                                        className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                                message.type === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                            <p className="text-sm leading-relaxed">{message.message}</p>
                            <p className={`text-xs mt-1 ${
                                message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                                {formatTime(message.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-4 py-3 rounded-xl">
                            <div className="flex items-center gap-2">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-sm text-gray-600">
                                    {t('medicalChat.typing')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* More Suggestions when there are messages */}
            {messages.length > 0 && messages.length < 5 && !isLoading && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        {t('medicalChat.suggestedQuestions.title')}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedQuestions.slice(3).map((question, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestedQuestion(question)}
                                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(inputValue);
                    }}
                    className="flex gap-3"
                >
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('medicalChat.input.placeholder')}
                        rows={2}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed self-end"
                    >
                        {t('medicalChat.send')}
                    </button>
                </form>

                <div className="mt-2 text-xs text-gray-500 text-center">
                    {t('medicalChat.disclaimer')}
                </div>
            </div>
        </div>
    );
};

export default MedicalChat;
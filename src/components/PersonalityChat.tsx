import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { askPersonalityQuestion } from '../services/openaiService';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  message: string;
  timestamp: Date;
  reasoning_details?: unknown; // Preserve reasoning_details for OpenRouter reasoning continuation
}

interface PersonalityChatProps {
  personalityType: string;
  scores: any;
  userContext: any;
}

const PersonalityChat: React.FC<PersonalityChatProps> = ({
  personalityType,
  scores,
  userContext
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      message: t('chat.welcomeMessage', {
        name: userContext.name || 'there',
        personalityType
      }),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Define suggested questions with proper typing
  const suggestedQuestions: string[] = [
    "What are my biggest strengths?",
    "How do I handle stress best?",
    "What careers suit me well?",
    "How can I improve my relationships?",
    "What should I work on for personal growth?",
    "How do I learn most effectively?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare chat history with reasoning_details preserved
      const chatHistory = messages.slice(-10).map(msg => ({
        type: msg.type,
        message: msg.message,
        reasoning_details: msg.reasoning_details
      }));

      const response = await askPersonalityQuestion(
        message.trim(),
        personalityType,
        scores,
        userContext,
        chatHistory // Send last 10 messages with reasoning_details for context
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        message: response.content,
        timestamp: new Date(),
        reasoning_details: response.reasoning_details // Preserve reasoning_details for next request
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        message: t('chat.errorMessage'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('results.chatTitle')}</h3>
        <p className="text-gray-600">{t('results.chatSubtitle', { personalityType })}</p>
      </div>

      {/* Chat Messages */}
      <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4 border border-gray-200">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.type === 'user' ? 'text-indigo-200' : 'text-gray-400'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-2 max-w-xs lg:max-w-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-4 border-b-4 border-indigo-600"></div>
                  <span className="text-sm">{t('loading.chatResponse')}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">{t('chat.suggestedQuestionsTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition"
                disabled={isLoading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          Send
        </button>
      </form>

      {/* Character Limit Info */}
      <div className="mt-2 text-xs text-gray-500 text-right">
        {inputValue.length}/500 characters
      </div>
    </div>
  );
};

export default PersonalityChat;
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language: string) => {
    // Only allow language switching before quiz starts
    const quizState = localStorage.getItem('quizState');
    if (quizState) {
      // Quiz is in progress, don't allow language change
      alert('Language cannot be changed during the quiz. Please finish the current quiz first.');
      return;
    }

    i18n.changeLanguage(language, (err) => {
      if (err) {
        console.error('Language change error:', err);
      }
    });
  };

  const currentLanguage = i18n.language;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative inline-block text-left">
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-sm"
        >
          <option value="en">🇺🇸 English</option>
          <option value="zh-TW">🇹🇼 中文 (繁體)</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
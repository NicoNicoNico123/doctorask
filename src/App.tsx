import React from 'react';
import './App.css';
import './i18n';
import QuizContainer from './components/QuizContainer';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  return (
    <>
      <LanguageSwitcher />
      <QuizContainer />
    </>
  );
}

export default App;

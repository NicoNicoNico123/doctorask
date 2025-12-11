import React from 'react';
import './App.css';
import './i18n';
import DiagnosisContainer from './components/DiagnosisContainer';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  return (
    <>
      <LanguageSwitcher />
      <DiagnosisContainer />
    </>
  );
}

export default App;

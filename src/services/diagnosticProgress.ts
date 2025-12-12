import { DiagnosticProgress } from '../types/symptomProfile';

/**
 * Single source of truth for initial diagnostic progress defaults.
 * Keep this small and dependency-free so both UI and services can reuse it.
 */
export function createInitialDiagnosticProgress(overrides: Partial<DiagnosticProgress> = {}): DiagnosticProgress {
  return {
    totalQuestionsAsked: 0,
    maxQuestions: 20,
    currentConfidence: 0,
    targetConfidence: 70,
    possibleDiagnoses: [],
    ruledOutConditions: [],
    nextQuestionStrategy: 'discriminative',
    informationGain: 0,
    ...overrides,
  };
}



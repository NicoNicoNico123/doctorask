import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WelcomeScreen from './WelcomeScreen';
import SymptomCollectionCard from './SymptomCollectionCard';
import DynamicQuestionCard from './DynamicQuestionCard';
import DiagnosisResults from './DiagnosisResults';
import {
    PatientContext,
    Diagnosis,
    MedicalGuidance,
    generateNextQuestionWithAdaptiveSystem,
    AdaptiveDiagnosticSystem,
    analyzeSymptoms,
    getMedicalGuidance
} from '../services/medicalAIService';
import { PatientProfile, SymptomDetail, BodySystem, MedicalQuestion } from '../types/symptomProfile';

const STORAGE_KEY = 'medical_diagnosis_state';

interface DiagnosisState {
    step: 'welcome' | 'symptom-collection' | 'dynamic-questions' | 'results';
    dataStep: number;
    patientContext: PatientContext;
    currentQuestion: MedicalQuestion | null;
    questionCount: number;
    questionHistory: string[];
    questionAnswers: Record<number, any>;
    diagnoses: Diagnosis[];
    guidance: MedicalGuidance | null;
    adaptiveSystem?: AdaptiveDiagnosticSystem;
    diagnosticProgress?: {
        currentConfidence: number;
        targetConfidence: number;
        totalQuestionsAsked: number;
        maxQuestions: number;
        nextQuestionStrategy: string;
        possibleDiagnoses: any[];
        ruledOutConditions: any[];
    };
}

const DiagnosisContainer: React.FC = () => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'welcome' | 'symptom-collection' | 'dynamic-questions' | 'results'>('welcome');
    const [dataStep, setDataStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [patientContext, setPatientContext] = useState<PatientContext>({
        age: 30,
        gender: '',
        name: '',
        primarySymptom: '',
        additionalSymptoms: []
    });

    const [currentQuestion, setCurrentQuestion] = useState<MedicalQuestion | null>(null);
    const [questionCount, setQuestionCount] = useState(0);
    const [questionHistory, setQuestionHistory] = useState<string[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<Record<number, any>>({});
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [guidance, setGuidance] = useState<MedicalGuidance | null>(null);

    // Enhanced adaptive diagnostic system state
    const [adaptiveSystem, setAdaptiveSystem] = useState<AdaptiveDiagnosticSystem | null>(null);
    const [diagnosticProgress, setDiagnosticProgress] = useState<DiagnosisState['diagnosticProgress'] | undefined>(undefined);
    const [ruledOutConditions, setRuledOutConditions] = useState<any[]>([]);

    // Load state from localStorage on mount
    useEffect(() => {
        // Clear old cached state to prevent TypeScript conflicts
        localStorage.removeItem(STORAGE_KEY);

        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed: DiagnosisState = JSON.parse(savedState);

                if (parsed.step && ['welcome', 'symptom-collection', 'dynamic-questions', 'results'].includes(parsed.step)) {
                    setStep(parsed.step);
                    setDataStep(parsed.dataStep || 0);
                    setPatientContext(parsed.patientContext || {
                        age: 30, gender: '', name: '', primarySymptom: '',
                        additionalSymptoms: []
                    });
                    setCurrentQuestion(parsed.currentQuestion || null);
                    setQuestionCount(parsed.questionCount || 0);
                    setQuestionHistory(parsed.questionHistory || []);
                    setQuestionAnswers(parsed.questionAnswers || {});
                    setDiagnoses(parsed.diagnoses || []);
                    setGuidance(parsed.guidance || null);

                    // Restore adaptive system state
                    if (parsed.diagnosticProgress) {
                        setDiagnosticProgress(parsed.diagnosticProgress);
                        setRuledOutConditions(parsed.diagnosticProgress.ruledOutConditions || []);
                    }

                    // Note: We don't restore the actual adaptiveSystem instance
                    // as they contain complex class instances that don't serialize well.
                    // They will be recreated as needed.
                }
            } catch (error) {
                console.error('Error loading saved state:', error);
                // Clear corrupted state
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const stateToSave: DiagnosisState = {
            step,
            dataStep,
            patientContext,
            currentQuestion,
            questionCount,
            questionHistory,
            questionAnswers,
            diagnoses,
            guidance: guidance || null,
            // Don't save the actual adaptive system instances, just the progress
            adaptiveSystem: undefined,
            diagnosticProgress
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }, [step, dataStep, patientContext, currentQuestion, questionCount, questionHistory, questionAnswers, diagnoses, guidance, diagnosticProgress]);

    // Symptom collection steps - simplified to 3 essential steps
    const symptomCollectionSteps = [
        {
            key: 'primarySymptom',
            title: t('symptomCollection.primarySymptom.title'),
            description: t('symptomCollection.primarySymptom.description'),
            inputType: 'text' as const,
            placeholder: t('symptomCollection.primarySymptom.placeholder')
        },
        {
            key: 'age',
            title: t('symptomCollection.age.title'),
            description: t('symptomCollection.age.description'),
            inputType: 'age' as const,
            min: 1,
            max: 100
        },
        {
            key: 'gender',
            title: t('symptomCollection.gender.title'),
            description: t('symptomCollection.gender.description'),
            inputType: 'select' as const,
            options: [
                { label: t('symptomCollection.gender.options.male'), value: 'male' },
                { label: t('symptomCollection.gender.options.female'), value: 'female' },
                { label: t('symptomCollection.gender.options.other'), value: 'other' },
                { label: t('symptomCollection.gender.options.preferNotToSay'), value: 'prefer_not_to_say' }
            ]
        }
    ];

    const handleDataCollectionNext = (value: any) => {
        const currentStepData = symptomCollectionSteps[dataStep];
        console.log('=== Symptom Update ===', {
            timestamp: new Date().toISOString(),
            step: currentStepData.key,
            value,
            currentPatientContext: { ...patientContext, [currentStepData.key]: value }
        });
        setPatientContext(prev => ({
            ...prev,
            [currentStepData.key]: value
        }));

        if (dataStep < symptomCollectionSteps.length - 1) {
            setDataStep(prev => prev + 1);
        } else {
            // Move to dynamic questions phase
            setStep('dynamic-questions');
            generateFirstQuestion();
        }
    };

    const generateFirstQuestion = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Create adaptive diagnostic system
            const patientProfile: PatientProfile = {
                age: patientContext.age,
                gender: patientContext.gender === 'male' ? 'male' as const :
                       patientContext.gender === 'female' ? 'female' as const :
                       patientContext.gender === 'other' ? 'other' as const :
                       'prefer_not_to_say' as const,
                name: patientContext.name,
                primarySymptom: patientContext.primarySymptom,
                symptoms: [],
                symptomTimeline: []
            };

            const adaptive = new AdaptiveDiagnosticSystem(patientProfile);

            setAdaptiveSystem(adaptive);

            // Perform initial AI analysis to get translated diagnosis names
            console.log('🔍 Performing initial AI analysis for diagnosis translation...');
            try {
                const initialDiagnoses = await analyzeSymptoms(patientContext, {});
                if (initialDiagnoses.length > 0) {
                    adaptive.updateWithAIDiagnoses(initialDiagnoses);
                    console.log('🔍 Initial AI diagnoses updated with translations:', initialDiagnoses.map(d => d.condition));
                }
            } catch (error) {
                console.warn('🔍 Initial AI analysis failed, using English fallback:', error);
                // Continue with English names from AI
            }

            // Use enhanced question generation
            const response = await generateNextQuestionWithAdaptiveSystem(
                patientContext,
                {},
                undefined,
                [],
                adaptive
            );

            if (response.question && !response.shouldStop && response.adaptiveSystem) {
                setCurrentQuestion(response.question);
                setQuestionCount(1);
                setQuestionHistory([response.question.question]);
                setQuestionAnswers({});

                // Update diagnostic progress
                const progress = response.adaptiveSystem.getDiagnosticProgress();
                setDiagnosticProgress({
                    currentConfidence: progress.currentConfidence,
                    targetConfidence: progress.targetConfidence,
                    totalQuestionsAsked: progress.totalQuestionsAsked,
                    maxQuestions: progress.maxQuestions,
                    nextQuestionStrategy: progress.nextQuestionStrategy,
                    possibleDiagnoses: progress.possibleDiagnoses,
                    ruledOutConditions: progress.ruledOutConditions
                });
                setRuledOutConditions(progress.ruledOutConditions);

                console.log('🎯 Enhanced first question generated:', response.question);
                console.log('🎯 Initial diagnostic confidence:', progress.currentConfidence);
            } else {
                // No questions needed, go directly to analysis
                console.log('🎯 Enhanced system: No questions needed, proceeding to diagnosis');
                await proceedToDiagnosis('init:no_question_or_shouldStop', {
                    shouldStop: response.shouldStop,
                    hasQuestion: !!response.question,
                    stopReason: response.stopReason
                });
            }
        } catch (error) {
            console.error('Error generating enhanced first question:', error);
            setError(t('diagnosisContainer.error.generatingQuestions'));
            // Fallback to diagnosis without additional questions
            await proceedToDiagnosis('init:error_generating_first_question', {
                error: String(error)
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuestionAnswer = async (answer: any) => {
        if (!currentQuestion) return;

        console.log('🎯 Received answer for question:', currentQuestion.question, 'Answer:', answer);

        // Save the answer with both question text and answer
        const updatedAnswers = {
            ...questionAnswers,
            [currentQuestion.id]: {
                question: currentQuestion.question,
                answer: answer
            }
        };
        setQuestionAnswers(updatedAnswers);

        console.log('📋 Updated symptom answers after question answer:', {
            totalAnswers: Object.keys(updatedAnswers).length,
            answerKeys: Object.keys(updatedAnswers),
            currentQuestionId: currentQuestion.id,
            currentQuestionText: currentQuestion.question.substring(0, 50) + '...',
            allAnswers: updatedAnswers
        });

        // Add question to history before generating next (also keep a local copy to avoid stale state)
        const updatedHistory = [...questionHistory, currentQuestion.question];
        setQuestionHistory(updatedHistory);

        // Clear current question while generating next
        setCurrentQuestion(null);

        // Generate the next question using enhanced system
        await generateNextQuestionBasedOnAnswer(answer, updatedAnswers, updatedHistory);
    };

    const generateNextQuestionBasedOnAnswer = async (
        lastAnswer: any,
        answersSnapshot: any,
        historySnapshot: string[]
    ) => {
        setIsLoading(true);

        try {
            if (!adaptiveSystem) {
                throw new Error('Adaptive system not initialized');
            }

            const symptomDetail = convertAnswerToSymptomDetail(lastAnswer, historySnapshot, patientContext.primarySymptom);

            // Initialize aiConfidence at higher scope
            let aiConfidence = diagnosticProgress?.currentConfidence || 0;
            let aiTopDiagnosis = '';

            if (symptomDetail) {
                // AI-only confidence analysis (no heuristic confidence)
                try {
                    // Update adaptive system with real-time AI analysis
                    const aiProgress = await adaptiveSystem.updateWithRealTimeAnalysis(answersSnapshot);
                    aiConfidence = aiProgress.currentConfidence;
                    aiTopDiagnosis = aiProgress.possibleDiagnoses[0]?.name || '';

                    console.log('🤖 DEBUG - AI confidence analysis:', {
                        aiConfidence,
                        aiTopDiagnosis,
                        aiDiagnoses: aiProgress.possibleDiagnoses.slice(0, 3).map(d => `${d.name}: ${d.confidence.toFixed(1)}%`)
                    });
                } catch (error) {
                    console.warn('⚠️ AI confidence analysis failed:', error);
                }

                console.log('🎯 DEBUG - AI confidence update:', {
                    aiConfidence,
                    aiTopDiagnosis,
                    confidenceChange: aiConfidence - (diagnosticProgress?.currentConfidence || 0)
                });
            }

            // Now generate the next question using the updated answers/history (avoid stale state)
            const response = await generateNextQuestionWithAdaptiveSystem(
                patientContext,
                answersSnapshot,
                lastAnswer,
                historySnapshot,
                adaptiveSystem
            );

            if (response.question && !response.shouldStop && response.adaptiveSystem) {
                // Show the next question
                setCurrentQuestion(response.question);
                setQuestionCount(prev => prev + 1);

                const questionText = response.question.question;
                if (questionText) {
                    setQuestionHistory(prev => [...prev, questionText]);
                    console.log('🎯 Enhanced next question (#', questionCount + 1, '):', response.question);
                }

                // Update diagnostic progress - preserve our AI confidence updates
                const progress = response.adaptiveSystem.getDiagnosticProgress();

                // IMPORTANT: don't read `diagnosticProgress` here (stale closure). Preserve from latest state.
                setDiagnosticProgress(prev => {
                    const preservedDiagnoses = prev?.possibleDiagnoses || [];
                    const baseDiagnoses = preservedDiagnoses.length > 0 ? preservedDiagnoses : (progress.possibleDiagnoses || []);
                    const confidenceToUse = progress.currentConfidence || (symptomDetail ? aiConfidence : 0);

                    const updatedDiagnoses = baseDiagnoses
                        .map((d: any, idx: number) => {
                            if (idx !== 0) return d;
                            return {
                                ...d,
                                name: aiTopDiagnosis || d.name,
                                confidence: confidenceToUse
                            };
                        })
                        .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0));

                    return {
                        currentConfidence: confidenceToUse,
                        targetConfidence: progress.targetConfidence,
                        totalQuestionsAsked: progress.totalQuestionsAsked,
                        maxQuestions: progress.maxQuestions,
                        nextQuestionStrategy: progress.nextQuestionStrategy,
                        // Keep our updated diagnoses with AI confidence if we have them; otherwise fall back to system
                        possibleDiagnoses: updatedDiagnoses,
                        ruledOutConditions: progress.ruledOutConditions
                    };
                });

                console.log('🔧 DEBUG - After diagnosticProgress update - AI confidence:', {
                    // NOTE: the preserved diagnoses now come from state, not the stale closure variable
                    aiConfidenceUsed: progress.currentConfidence || (symptomDetail ? aiConfidence : 0)
                });
                setRuledOutConditions(progress.ruledOutConditions);

                const aiConfidenceToUse = progress.currentConfidence || (symptomDetail ? aiConfidence : 0);
                console.log('🎯 AI confidence:', aiConfidenceToUse);
                console.log('🎯 Strategy:', progress.nextQuestionStrategy);
                console.log('🎯 Progress check:', {
                    aiConfidence: aiConfidenceToUse,
                    targetConfidence: progress.targetConfidence,
                    totalQuestionsAsked: progress.totalQuestionsAsked,
                    maxQuestions: progress.maxQuestions,
                    shouldContinue: aiConfidenceToUse < progress.targetConfidence && 
                                   progress.totalQuestionsAsked < progress.maxQuestions
                });
            } else {
                // AI is confident enough, proceed to diagnosis
                const stopReason =
                    response.stopReason ||
                    (response.shouldStop
                        ? 'System determined enough information collected'
                        : 'No question generated');
                console.log('🛑 Stopping question generation and proceeding to diagnosis');
                console.log('🛑 Stop reason:', stopReason);
                console.log('🛑 AI confidence:', aiConfidence);
                console.log('🛑 Total questions asked:', questionCount);
                console.log('🛑 Final ruled out conditions:', ruledOutConditions);
                await proceedToDiagnosis('qa:stopped_or_no_question', {
                    stopReason,
                    shouldStop: response.shouldStop,
                    hasQuestion: !!response.question,
                    aiConfidence
                }, answersSnapshot);
            }
        } catch (error) {
            console.error('Error generating enhanced next question:', error);
            setError(t('diagnosisContainer.error.checkingQuestions'));
            // Proceed with diagnosis even if error
            await proceedToDiagnosis('qa:error_generating_next_question', {
                error: String(error)
            }, answersSnapshot);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to convert answer to symptom detail
    const convertAnswerToSymptomDetail = (
        answer: any,
        questionHistory: string[],
        primarySymptom: string
    ): SymptomDetail | null => {
        if (!answer || !questionHistory.length) return null;

        const lastQuestion = questionHistory[questionHistory.length - 1].toLowerCase();

        // Try to determine what symptom characteristic was asked about
        if (lastQuestion.includes('severity') || lastQuestion.includes('scale') || lastQuestion.includes('1-10')) {
            return {
                name: primarySymptom,
                severity: typeof answer === 'number' ? answer : parseInt(answer) || 5,
                duration: '',
                onset: 'gradual',
                bodySystems: [getBodySystemForSymptom(primarySymptom)]
            };
        }

        if (lastQuestion.includes('how long') || lastQuestion.includes('duration')) {
            return {
                name: primarySymptom,
                severity: 0,
                duration: typeof answer === 'string' ? answer : '',
                onset: 'gradual',
                bodySystems: [getBodySystemForSymptom(primarySymptom)]
            };
        }

        if (lastQuestion.includes('where') || lastQuestion.includes('location')) {
            return {
                name: primarySymptom,
                severity: 0,
                duration: '',
                location: typeof answer === 'string' ? answer : '',
                onset: 'gradual',
                bodySystems: [getBodySystemForSymptom(primarySymptom)]
            };
        }

        // Default case - treat as associated symptom
        return {
            name: primarySymptom,
            severity: 0,
            duration: '',
            onset: 'gradual',
            associatedSymptoms: typeof answer === 'string' ? [answer] : [],
            bodySystems: [getBodySystemForSymptom(primarySymptom)]
        };
    };

    const getBodySystemForSymptom = (symptom: string): BodySystem => {
        const bodySystemMap: { [key: string]: BodySystem } = {
            'chest_pain': BodySystem.CARDIOVASCULAR,
            'headache': BodySystem.NEUROLOGICAL,
            'cough': BodySystem.RESPIRATORY,
            'abdominal_pain': BodySystem.GASTROINTESTINAL,
            'fever': BodySystem.GENERAL,
            'rash': BodySystem.DERMATOLOGICAL,
            'joint_pain': BodySystem.MUSCULOSKELETAL,
            'urinary': BodySystem.GENITOURINARY
        };

        for (const [symptomPart, system] of Object.entries(bodySystemMap)) {
            if (symptom.includes(symptomPart)) {
                return system;
            }
        }

        return BodySystem.GENERAL;
    };

    const performDiagnosis = async (answersOverride?: Record<number, any>) => {
        setIsLoading(true);
        setError(null);

        try {
            const answersToUse = answersOverride ?? questionAnswers;
            console.log('🧾 performDiagnosis() starting:', {
                answersCount: answersToUse ? Object.keys(answersToUse).length : 0,
                hasAdaptiveSystem: !!adaptiveSystem,
                step,
            });

            const diagnosisResults = await analyzeSymptoms(patientContext, answersToUse);
            // Ensure diagnoses is always an array
            const diagnosesArray = Array.isArray(diagnosisResults) ? diagnosisResults : [];
            setDiagnoses(diagnosesArray);

            // Update adaptive system with AI-generated diagnoses (already translated)
            if (adaptiveSystem && diagnosesArray.length > 0) {
                adaptiveSystem.updateWithAIDiagnoses(diagnosesArray);
                const updatedProgress = adaptiveSystem.getDiagnosticProgress();
                setDiagnosticProgress({
                    currentConfidence: updatedProgress.currentConfidence,
                    targetConfidence: updatedProgress.targetConfidence,
                    totalQuestionsAsked: updatedProgress.totalQuestionsAsked,
                    maxQuestions: updatedProgress.maxQuestions,
                    nextQuestionStrategy: updatedProgress.nextQuestionStrategy,
                    possibleDiagnoses: updatedProgress.possibleDiagnoses,
                    ruledOutConditions: updatedProgress.ruledOutConditions
                });
            }

            // Get guidance with diagnoses
            const updatedGuidance = await getMedicalGuidance(diagnosisResults, patientContext);
            setGuidance(updatedGuidance);

            // Always proceed to results (name is optional; UI will fall back to "Patient")
            setStep('results');
        } catch (error) {
            console.error('Error performing diagnosis:', error);
            setError(t('diagnosisContainer.error.performingDiagnosis'));

            // Create fallback results
            const fallbackDiagnoses: Diagnosis[] = [{
                condition: t('diagnosisContainer.fallback.condition'),
                probability: 50,
                confidence: 'low',
                reasoning: t('diagnosisContainer.fallback.reasoning'),
                urgencyLevel: 'routine'
            }];

            setDiagnoses(fallbackDiagnoses);
            setGuidance({
                nextSteps: [t('diagnosisContainer.fallback.nextStep')],
                selfCareRecommendations: [t('diagnosisContainer.fallback.selfCare')],
                whenToSeekCare: [t('diagnosisContainer.fallback.whenToSeekCare')],
                emergencyIndicators: []
            });

            setStep('results');
        } finally {
            setIsLoading(false);
        }
    };

    const proceedToDiagnosis = async (
        reason: string,
        meta?: Record<string, any>,
        answersOverride?: Record<number, any>
    ) => {
        console.log('🛑 Proceeding to diagnosis:', {
            reason,
            step,
            hasCurrentQuestion: !!currentQuestion,
            questionHistoryLen: questionHistory.length,
            meta
        });
        await performDiagnosis(answersOverride);
    };

    const handleRestart = () => {
        localStorage.removeItem(STORAGE_KEY);
        setStep('welcome');
        setDataStep(0);
        setPatientContext({
            age: 30,
            gender: '',
            name: '',
            primarySymptom: '',
            additionalSymptoms: []
        });
        setCurrentQuestion(null);
        setQuestionCount(0);
        setQuestionHistory([]);
        setQuestionAnswers({});
        setDiagnoses([]);
        setGuidance(null);
        setError(null);
    };

    const renderWithStartOver = (
        content: React.ReactNode,
        opts?: { showReturnToHome?: boolean }
    ) => {
        const showReturnToHome = opts?.showReturnToHome ?? true;
        return (
            <div className="min-h-screen px-4 pt-8 pb-10">
                {content}

                {showReturnToHome && (
                    <div className="max-w-4xl mx-auto mt-8 flex justify-center">
                        <button
                            onClick={handleRestart}
                            className="text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm hover:shadow transition"
                        >
                            {t('diagnosisContainer.quit.returnToHome')}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (error) {
        return renderWithStartOver(
            <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-xl">
                <div className="text-center">
                    <span className="text-4xl mb-4 block">⚠️</span>
                    <h3 className="text-lg font-semibold text-red-800 mb-2">
                        {t('diagnosisContainer.error.title')}
                    </h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <button
                        onClick={handleRestart}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        {t('diagnosisContainer.error.restart')}
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return renderWithStartOver(
            <div className="max-w-md mx-auto mt-8 p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">
                    {t('diagnosisContainer.loading')}
                </p>
            </div>
        );
    }

    switch (step) {
        case 'welcome':
            return renderWithStartOver(
                <WelcomeScreen
                    onStart={() => setStep('symptom-collection')}
                    onRestart={handleRestart}
                />,
                { showReturnToHome: false }
            );

        case 'symptom-collection':
            const currentStep = symptomCollectionSteps[dataStep];
            return renderWithStartOver(
                <SymptomCollectionCard
                    title={currentStep.title}
                    description={currentStep.description}
                    inputType={currentStep.inputType}
                    value={patientContext[currentStep.key as keyof PatientContext]}
                    onChange={(value) => {
                        setPatientContext(prev => ({
                            ...prev,
                            [currentStep.key]: value
                        }));
                    }}
                    onNext={() => handleDataCollectionNext(patientContext[currentStep.key as keyof PatientContext])}
                    options={currentStep.options}
                    placeholder={currentStep.placeholder}
                    min={currentStep.min}
                    max={currentStep.max}
                />
            );

        case 'dynamic-questions':
            if (!currentQuestion) {
                return renderWithStartOver(
                    <div className="max-w-md mx-auto mt-8 p-8 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-lg text-gray-600">
                            {t('diagnosisContainer.analyzing')}
                        </p>
                        {questionCount > 0 && (
                            <p className="text-sm text-gray-500 mt-2">
                                Questions asked: {questionCount}
                            </p>
                        )}
                    </div>
                );
            }

            return renderWithStartOver(
                <DynamicQuestionCard
                    question={currentQuestion}
                    onAnswer={handleQuestionAnswer}
                    isLast={false} // We never know if it's the last in RAG approach
                    diagnosticProgress={diagnosticProgress}
                    questionCount={questionCount}
                />
            );

        case 'results':
            if (!guidance) {
                return renderWithStartOver(
                    <div className="max-w-md mx-auto mt-8 p-8 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-lg text-gray-600">
                            {t('diagnosisContainer.finalizing')}
                        </p>
                    </div>
                );
            }

            return renderWithStartOver(
                <DiagnosisResults
                    diagnoses={Array.isArray(diagnoses) ? diagnoses : []}
                    guidance={guidance}
                    patientName={patientContext.name || t('diagnosisContainer.patient')}
                    primarySymptom={patientContext.primarySymptom}
                />
            );

        default:
            return renderWithStartOver(
                <WelcomeScreen
                    onStart={() => setStep('symptom-collection')}
                    onRestart={handleRestart}
                />,
                { showReturnToHome: false }
            );
    }
};

export default DiagnosisContainer;
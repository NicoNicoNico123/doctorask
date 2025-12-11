import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WelcomeScreen from './WelcomeScreen';
import SymptomCollectionCard from './SymptomCollectionCard';
import DynamicQuestionCard from './DynamicQuestionCard';
import NameScreen from './NameScreen';
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
import { DiagnosisTracker } from '../services/diagnosisTrackerService';
import { PatientProfile, SymptomDetail, BodySystem, MedicalQuestion } from '../types/symptomProfile';

const STORAGE_KEY = 'medical_diagnosis_state';

interface DiagnosisState {
    step: 'welcome' | 'symptom-collection' | 'dynamic-questions' | 'name' | 'results';
    dataStep: number;
    patientContext: PatientContext;
    currentQuestion: MedicalQuestion | null;
    questionCount: number;
    questionHistory: string[];
    questionAnswers: Record<number, any>;
    diagnoses: Diagnosis[];
    guidance: MedicalGuidance | null;
    adaptiveSystem?: AdaptiveDiagnosticSystem;
    diagnosisTracker?: DiagnosisTracker;
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
    const [step, setStep] = useState<'welcome' | 'symptom-collection' | 'dynamic-questions' | 'name' | 'results'>('welcome');
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
    const [diagnosisTracker, setDiagnosisTracker] = useState<DiagnosisTracker | null>(null);
    const [diagnosticProgress, setDiagnosticProgress] = useState<DiagnosisState['diagnosticProgress'] | undefined>(undefined);
    const [realTimeConfidence, setRealTimeConfidence] = useState(0);
    const [ruledOutConditions, setRuledOutConditions] = useState<any[]>([]);
    const [bodySystemCoverage, setBodySystemCoverage] = useState<BodySystem[]>([]);
    const [symptomCompleteness, setSymptomCompleteness] = useState(0);

    // Load state from localStorage on mount
    useEffect(() => {
        // Clear old cached state to prevent TypeScript conflicts
        localStorage.removeItem(STORAGE_KEY);

        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed: DiagnosisState = JSON.parse(savedState);

                if (parsed.step && ['welcome', 'symptom-collection', 'dynamic-questions', 'name', 'results'].includes(parsed.step)) {
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
                        setRealTimeConfidence(parsed.diagnosticProgress.currentConfidence);
                        setRuledOutConditions(parsed.diagnosticProgress.ruledOutConditions || []);
                    }

                    // Note: We don't restore the actual adaptiveSystem and diagnosisTracker instances
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
            diagnosisTracker: undefined,
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
                medications: [],
                allergies: [],
                pastMedicalHistory: [],
                familyHistory: [],
                socialHistory: {
                    smoking: false,
                    alcohol: 'none' as const,
                    exercise: 'light' as const,
                    occupation: '',
                    stress: 'moderate' as const
                },
                primarySymptom: patientContext.primarySymptom,
                symptoms: [],
                symptomTimeline: []
            };

            const adaptive = new AdaptiveDiagnosticSystem(patientProfile);
            const tracker = new DiagnosisTracker(patientProfile);

            setAdaptiveSystem(adaptive);
            setDiagnosisTracker(tracker);

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
                setRealTimeConfidence(progress.currentConfidence);
                setRuledOutConditions(progress.ruledOutConditions);

                console.log('🎯 Enhanced first question generated:', response.question);
                console.log('🎯 Initial diagnostic confidence:', progress.currentConfidence);
            } else {
                // No questions needed, go directly to analysis
                console.log('🎯 Enhanced system: No questions needed, proceeding to diagnosis');
                await performDiagnosis();
            }
        } catch (error) {
            console.error('Error generating enhanced first question:', error);
            setError(t('diagnosisContainer.error.generatingQuestions'));
            // Fallback to diagnosis without additional questions
            await performDiagnosis();
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuestionAnswer = async (answer: any) => {
        if (!currentQuestion) return;

        console.log('🎯 Received answer for question:', currentQuestion.question, 'Answer:', answer);

        // Save the answer
        const updatedAnswers = {
            ...questionAnswers,
            [currentQuestion.id]: answer
        };
        setQuestionAnswers(updatedAnswers);

        console.log('📋 Updated symptom answers after question answer:', `${JSON.stringify(updatedAnswers)}`);

        // Add question to history before generating next
        setQuestionHistory(prev => [...prev, currentQuestion.question]);

        // Clear current question while generating next
        setCurrentQuestion(null);

        // Generate the next question using enhanced system
        await generateNextQuestionBasedOnAnswer(answer);
    };

    const generateNextQuestionBasedOnAnswer = async (lastAnswer: any) => {
        setIsLoading(true);

        try {
            if (!adaptiveSystem || !diagnosisTracker) {
                throw new Error('Adaptive system not initialized');
            }

            // Update adaptive system with new answer
            const response = await generateNextQuestionWithAdaptiveSystem(
                patientContext,
                questionAnswers,
                lastAnswer,
                questionHistory,
                adaptiveSystem
            );

            // Update diagnosis tracker
            const symptomDetail = convertAnswerToSymptomDetail(lastAnswer, questionHistory, patientContext.primarySymptom);
            if (symptomDetail) {
                diagnosisTracker.updateWithNewSymptom(symptomDetail);

                // DEBUG: Get real-time confidence analysis after symptom update
                const confidenceAnalysis = await diagnosisTracker.getRealTimeConfidenceAnalysis();
                console.log('🔄 DEBUG - Heuristic confidence analysis:', {
                    previousConfidence: diagnosticProgress?.currentConfidence || 0,
                    newConfidence: confidenceAnalysis.currentConfidence,
                    confidenceChange: confidenceAnalysis.confidenceChange,
                    topDiagnosis: confidenceAnalysis.topDiagnosis,
                    reasoning: confidenceAnalysis.reasoning
                });

                // Also get AI-based confidence analysis for more accurate results
                let aiConfidence = confidenceAnalysis.currentConfidence;
                let aiTopDiagnosis = confidenceAnalysis.topDiagnosis;

                try {
                    // Update adaptive system with real-time AI analysis
                    const aiProgress = await adaptiveSystem.updateWithRealTimeAnalysis(questionAnswers);
                    aiConfidence = aiProgress.currentConfidence;
                    aiTopDiagnosis = aiProgress.possibleDiagnoses[0]?.name || confidenceAnalysis.topDiagnosis;

                    console.log('🤖 DEBUG - AI confidence analysis:', {
                        aiConfidence,
                        aiTopDiagnosis,
                        aiDiagnoses: aiProgress.possibleDiagnoses.slice(0, 3).map(d => `${d.name}: ${d.confidence.toFixed(1)}%`)
                    });
                } catch (error) {
                    console.warn('⚠️ AI confidence analysis failed, using heuristic:', error);
                }

                // Use AI confidence if available, otherwise use heuristic
                const finalConfidence = Math.max(aiConfidence, confidenceAnalysis.currentConfidence);

                console.log('🎯 DEBUG - Final confidence update:', {
                    heuristicConfidence: confidenceAnalysis.currentConfidence,
                    aiConfidence,
                    finalConfidence,
                    finalTopDiagnosis: aiTopDiagnosis,
                    confidenceChange: finalConfidence - (diagnosticProgress?.currentConfidence || 0)
                });

                // Update both real-time confidence AND diagnostic progress to keep UI in sync
                setRealTimeConfidence(finalConfidence);

                // Also update diagnosticProgress.possibleDiagnoses with new confidence
                console.log('🔍 DEBUG - diagnosticProgress check:', {
                    diagnosticProgress: !!diagnosticProgress,
                    possibleDiagnoses: diagnosticProgress?.possibleDiagnoses?.length || 0,
                    finalConfidence,
                    aiTopDiagnosis
                });

                if (diagnosticProgress) {
                    const existingDiagnoses = diagnosticProgress.possibleDiagnoses || [];

                    console.log('🔍 DEBUG - existingDiagnoses:', {
                        length: existingDiagnoses.length,
                        diagnoses: existingDiagnoses.map(d => `${d.name}: ${d.confidence}%`)
                    });

                    if (existingDiagnoses.length === 0 && aiTopDiagnosis) {
                        // Create initial diagnosis if none exist
                        const newDiagnosis = {
                            name: aiTopDiagnosis,
                            confidence: finalConfidence,
                            likelihood: finalConfidence > 70 ? 'high' as const : finalConfidence > 40 ? 'moderate' as const : 'low' as const,
                            urgency: 'moderate' as const,
                            supportingSymptoms: [patientContext.primarySymptom],
                            contradictingSymptoms: [],
                            missingKeySymptoms: [],
                            reasoning: `AI-generated diagnosis with ${finalConfidence.toFixed(1)}% confidence`
                        };

                        setDiagnosticProgress({
                            ...diagnosticProgress,
                            currentConfidence: finalConfidence,
                            possibleDiagnoses: [newDiagnosis]
                        });

                        console.log('🆕 DEBUG - Created initial diagnosis:', newDiagnosis);
                    } else if (existingDiagnoses.length > 0) {
                    const updatedDiagnoses = existingDiagnoses.map((diagnosis, index) => {
                        if (index === 0) {
                            // Update top diagnosis with new confidence and name
                            return {
                                ...diagnosis,
                                confidence: finalConfidence,
                                name: aiTopDiagnosis || diagnosis.name
                            };
                        }
                        // Reduce confidence of other diagnoses proportionally
                        const reductionFactor = Math.max(0.5, 1 - (finalConfidence / 100));
                        return {
                            ...diagnosis,
                            confidence: diagnosis.confidence * reductionFactor
                        };
                    });

                    setDiagnosticProgress({
                        ...diagnosticProgress,
                        currentConfidence: finalConfidence,
                        possibleDiagnoses: updatedDiagnoses.sort((a, b) => b.confidence - a.confidence)
                    });

                    console.log('🔄 DEBUG - Updated diagnosticProgress:', {
                        oldTopDiagnosis: existingDiagnoses[0]?.name,
                        newTopDiagnosis: updatedDiagnoses[0]?.name,
                        oldConfidence: existingDiagnoses[0]?.confidence,
                        newConfidence: finalConfidence
                    });
                    } else {
                        console.log('⚠️ DEBUG - diagnosticProgress exists but no diagnoses found');
                    }
                } else {
                    console.log('⚠️ DEBUG - No diagnosticProgress available');
                }
            }

            if (response.question && !response.shouldStop && response.adaptiveSystem) {
                // Show the next question
                setCurrentQuestion(response.question);
                setQuestionCount(prev => prev + 1);

                const questionText = response.question.question;
                if (questionText) {
                    setQuestionHistory(prev => [...prev, questionText]);
                    console.log('🎯 Enhanced next question (#', questionCount + 1, '):', response.question);
                }

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
                setRealTimeConfidence(progress.currentConfidence);
                setRuledOutConditions(progress.ruledOutConditions);
                setBodySystemCoverage(diagnosisTracker.getBodySystemCoverage());
                setSymptomCompleteness(diagnosisTracker.getSymptomCompleteness());

                console.log('🎯 Enhanced current confidence:', progress.currentConfidence);
                console.log('🎯 Strategy:', progress.nextQuestionStrategy);
                console.log('🎯 Progress check:', {
                    currentConfidence: progress.currentConfidence,
                    targetConfidence: progress.targetConfidence,
                    totalQuestionsAsked: progress.totalQuestionsAsked,
                    maxQuestions: progress.maxQuestions,
                    shouldContinue: progress.currentConfidence < progress.targetConfidence && 
                                   progress.totalQuestionsAsked < progress.maxQuestions
                });
            } else {
                // AI is confident enough, proceed to diagnosis
                const stopReason = response.shouldStop 
                    ? 'System determined enough information collected' 
                    : 'No question generated';
                console.log('🛑 Stopping question generation and proceeding to diagnosis');
                console.log('🛑 Stop reason:', stopReason);
                console.log('🛑 Final confidence:', response?.confidence || 'unknown');
                console.log('🛑 Total questions asked:', questionCount);
                console.log('🛑 Final ruled out conditions:', ruledOutConditions);
                await performDiagnosis();
            }
        } catch (error) {
            console.error('Error generating enhanced next question:', error);
            setError(t('diagnosisContainer.error.checkingQuestions'));
            // Proceed with diagnosis even if error
            await performDiagnosis();
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

    const performDiagnosis = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const diagnosisResults = await analyzeSymptoms(patientContext, questionAnswers);
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

            // Check if we have name, if not go to name screen
            if (!patientContext.name) {
                setStep('name');
            } else {
                setStep('results');
            }
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

            setStep('name');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNameNext = (name: string) => {
        setPatientContext(prev => ({ ...prev, name }));
        setStep('results');
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

    if (error) {
        return (
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
        return (
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
            return (
                <WelcomeScreen
                    onStart={() => setStep('symptom-collection')}
                    onRestart={handleRestart}
                />
            );

        case 'symptom-collection':
            const currentStep = symptomCollectionSteps[dataStep];
            return (
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
                return (
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

            return (
                <DynamicQuestionCard
                    question={currentQuestion}
                    onAnswer={handleQuestionAnswer}
                    isLast={false} // We never know if it's the last in RAG approach
                    diagnosticProgress={diagnosticProgress}
                    questionCount={questionCount}
                />
            );

        case 'name':
            return (
                <NameScreen
                    onNext={handleNameNext}
                    onBack={() => setStep('results')}
                />
            );

        case 'results':
            if (!guidance) {
                return (
                    <div className="max-w-md mx-auto mt-8 p-8 text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-lg text-gray-600">
                            {t('diagnosisContainer.finalizing')}
                        </p>
                    </div>
                );
            }

            return (
                <DiagnosisResults
                    diagnoses={Array.isArray(diagnoses) ? diagnoses : []}
                    guidance={guidance}
                    patientName={patientContext.name || t('diagnosisContainer.patient')}
                    primarySymptom={patientContext.primarySymptom}
                />
            );

        default:
            return (
                <WelcomeScreen
                    onStart={() => setStep('symptom-collection')}
                    onRestart={handleRestart}
                />
            );
    }
};

export default DiagnosisContainer;
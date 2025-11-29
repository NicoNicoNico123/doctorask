import React, { useState, useEffect, useRef } from 'react';
import WelcomeScreen from './WelcomeScreen';
import DataCollectionCard from './DataCollectionCard';
import QuestionCard from './QuestionCard';
import OctagonChart from './OctagonChart';
import PersonalityAnalysis from './PersonalityAnalysis';
import PersonalityChat from './PersonalityChat';
import { baseQuestions } from '../data/questions';
import { generateSingleQuestion, UserContext, Question } from '../services/openaiService';

const STORAGE_KEY = 'mbti_quiz_state';

interface QuizState {
    step: 'welcome' | 'data-collection' | 'quiz' | 'results';
    dataStep: number;
    userContext: UserContext;
    questions: (Question | null)[];
    currentQuestionIndex: number;
    answers: Record<number, string>;
    result: string;
    scores: any;
}

const QuizContainer: React.FC = () => {
    const [step, setStep] = useState<'welcome' | 'data-collection' | 'quiz' | 'results'>('welcome');
    const [dataStep, setDataStep] = useState(0);

    const [userContext, setUserContext] = useState<UserContext>({
        age: 25,
        occupation: '',
        gender: '',
        interests: ''
    });

    const [questions, setQuestions] = useState<(Question | null)[]>(new Array(baseQuestions.length).fill(null));
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<string>('');
    const [scores, setScores] = useState<any>(null);

    const isLoadedRef = useRef(false);
    const questionsRef = useRef<(Question | null)[]>(questions);
    const generatingRef = useRef<Set<number>>(new Set());
    const activeGenerationsRef = useRef(0);
    const CONCURRENT_LIMIT = 3;

    // Keep questionsRef in sync with questions state
    useEffect(() => {
        questionsRef.current = questions;
    }, [questions]);

    // Load state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed: QuizState = JSON.parse(savedState);
                setStep(parsed.step);
                setDataStep(parsed.dataStep);
                setUserContext(parsed.userContext);
                setQuestions(parsed.questions);
                setCurrentQuestionIndex(parsed.currentQuestionIndex);
                setAnswers(parsed.answers);
                setResult(parsed.result);
                setScores(parsed.scores);
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
        isLoadedRef.current = true;
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!isLoadedRef.current) return;

        const stateToSave: QuizState = {
            step,
            dataStep,
            userContext,
            questions,
            currentQuestionIndex,
            answers,
            result,
            scores
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [step, dataStep, userContext, questions, currentQuestionIndex, answers, result, scores]);

    // Idle Timeout Logic
    useEffect(() => {
        // 5 minutes = 300,000 ms
        // For testing, we might want to use a shorter duration, but per requirements:
        const IDLE_TIMEOUT = 1 * 60 * 1000;

        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('💤 User idle for 5 minutes. Resetting...');
                // Clear storage and reload to go back to welcome screen
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
            }, IDLE_TIMEOUT);
        };

        // Events to listen for
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Attach listeners
        events.forEach(event => {
            document.addEventListener(event, resetTimer);
        });

        // Initial start
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, []);

    // Generate questions sequentially to prevent duplication issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (step !== 'quiz' || !userContext.occupation) return;

        // Prevent double initialization (React Strict Mode)
        let isActive = true;

        // Only start generation if questions array is initialized but empty
        if (questions.length === 0) {
            console.log('🔄 Initializing questions array');
            setQuestions(new Array(baseQuestions.length).fill(null));
            return;
        }

        const generateNextConcurrent = () => {
            console.log(`🚀 Starting concurrent generation (Limit: ${CONCURRENT_LIMIT}, Active: ${activeGenerationsRef.current})`);

            // Find the next questions that need to be generated
            const currentQuestions = questionsRef.current;

            for (let i = 0; i < baseQuestions.length; i++) {
                if (activeGenerationsRef.current >= CONCURRENT_LIMIT) {
                    console.log(`⏸️ Concurrent limit reached (${CONCURRENT_LIMIT}). Waiting...`);
                    break;
                }

                if (!currentQuestions[i] && !generatingRef.current.has(i)) {
                    generatingRef.current.add(i);
                    activeGenerationsRef.current++;

                    console.log(`🎯 Starting generation for question ${i + 1}/${baseQuestions.length} (Active: ${activeGenerationsRef.current})`);

                    const baseQuestion = {
                        id: baseQuestions[i].id,
                        text: baseQuestions[i].text,
                        dimension: baseQuestions[i].dimension,
                        options: baseQuestions[i].options
                    };

                    const startTime = Date.now();

                    // Create a stable reference to the effect active state for this specific request
                    const wasActiveOnStart = isActive;

                    generateSingleQuestion(userContext, baseQuestion)
                        .then((generatedQuestion) => {
                            const duration = Date.now() - startTime;
                            console.log(`✅ Question ${i + 1} generated in ${duration}ms:`, generatedQuestion.text.substring(0, 50) + '...');

                            // Always set the question to avoid lost results
                            setQuestions(prev => {
                                const newQuestions = [...prev];
                                newQuestions[i] = generatedQuestion;
                                console.log(`📝 Set question ${i + 1} at index ${i}:`, newQuestions[i]?.text.substring(0, 30) + '...');
                                return newQuestions;
                            });

                            if (!wasActiveOnStart) {
                                console.log('🛑 Question completed but effect cleaned up (still saved)');
                                return;
                            }
                        })
                        .catch((error) => {
                            console.error(`❌ Failed to generate question ${i + 1}:`, error);

                            // Always set fallback question
                            const fallbackQuestion = {
                                id: baseQuestion.id,
                                text: baseQuestion.text,
                                dimension: baseQuestion.dimension as 'E-I' | 'S-N' | 'T-F' | 'J-P',
                                optionA: { text: baseQuestion.options[0].text, value: baseQuestion.options[0].value },
                                optionB: { text: baseQuestion.options[1].text, value: baseQuestion.options[1].value }
                            };

                            setQuestions(prev => {
                                const newQuestions = [...prev];
                                newQuestions[i] = fallbackQuestion;
                                console.log(`🔄 Set fallback question ${i + 1} at index ${i}`);
                                return newQuestions;
                            });

                            if (!wasActiveOnStart) {
                                console.log('🛑 Question failed but effect cleaned up (fallback still saved)');
                                return;
                            }
                        })
                        .finally(() => {
                            // Ensure the counter doesn't go negative (race condition protection)
                            if (activeGenerationsRef.current > 0) {
                                activeGenerationsRef.current--;
                            }
                            generatingRef.current.delete(i);
                            console.log(`📊 Question ${i + 1} complete. Active generations: ${activeGenerationsRef.current}`);

                            // Trigger next generation if there are more questions to generate
                            // Use wasActiveOnStart to avoid race conditions
                            if (wasActiveOnStart && activeGenerationsRef.current < CONCURRENT_LIMIT) {
                                setTimeout(() => generateNextConcurrent(), 50); // Small delay to prevent overwhelming
                            }
                        });
                }
            }

            // Check if all questions are generated
            const allGenerated = questionsRef.current.every(q => q !== null);
            if (allGenerated && isActive) {
                console.log('🎉 All questions generation completed!');
            }
        };

        // Start concurrent generation after a short delay to ensure state is ready
        setTimeout(() => {
            if (isActive) {
                console.log('🎯 Starting concurrent question generation...');
                generateNextConcurrent();
            }
        }, 100);

        const currentGeneratingRef = generatingRef.current;

        // Cleanup function
        return () => {
            isActive = false;
            activeGenerationsRef.current = 0;
            currentGeneratingRef.clear();
            console.log('🧹 Cleaning up generation effect');
        };
    }, [step, userContext, questions]);

    const handleStart = () => {
        setStep('data-collection');
        setDataStep(0);
    };

    const handleDataUpdate = (field: keyof UserContext, value: any) => {
        setUserContext(prev => ({ ...prev, [field]: value }));
    };

    const handleDataNext = () => {
        if (dataStep < 3) {
            setDataStep(prev => prev + 1);
        } else {
            setStep('quiz');
        }
    };

    const handleAnswer = (value: string) => {
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return;

        setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));

        if (currentQuestionIndex < baseQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            calculateResult();
        }
    };

    const calculateResult = () => {
        const newScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

        Object.values(answers).forEach(val => {
            if (val in newScores) {
                newScores[val as keyof typeof newScores]++;
            }
        });

        const type = [
            newScores.E >= newScores.I ? 'E' : 'I',
            newScores.S >= newScores.N ? 'S' : 'N',
            newScores.T >= newScores.F ? 'T' : 'F',
            newScores.J >= newScores.P ? 'J' : 'P'
        ].join('');

        setResult(type);
        setScores(newScores);
        setStep('results');
    };

    const handleReset = () => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    };

    const renderQuitButton = () => (
        <button
            onClick={handleReset}
            className="mt-6 flex items-center justify-center mx-auto text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-6 py-2.5 rounded-full transition-all duration-200 text-sm font-medium group border border-transparent hover:border-indigo-100"
        >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">🏠</span>
            Quit & Return to Home
        </button>
    );

    if (step === 'welcome') {
        return <WelcomeScreen onStart={handleStart} />;
    }

    if (step === 'data-collection') {
        switch (dataStep) {
            case 0:
                return (
                    <div className="min-h-screen bg-gray-100 py-12 px-4 flex flex-col justify-center">
                        <DataCollectionCard
                            title="How old are you?"
                            description="This helps us tailor the questions to your life stage."
                            inputType="slider"
                            value={userContext.age}
                            onChange={(val) => handleDataUpdate('age', val)}
                            onNext={handleDataNext}
                            min={10}
                            max={80}
                        />
                        {renderQuitButton()}
                    </div>
                );
            case 1:
                return (
                    <div className="min-h-screen bg-gray-100 py-12 px-4 flex flex-col justify-center">
                        <DataCollectionCard
                            title="What do you do?"
                            description="Your occupation or role helps us create relevant scenarios."
                            inputType="text"
                            placeholder="e.g. Software Engineer, Student, Artist"
                            value={userContext.occupation}
                            onChange={(val) => handleDataUpdate('occupation', val)}
                            onNext={handleDataNext}
                        />
                        {renderQuitButton()}
                    </div>
                );
            case 2:
                return (
                    <div className="min-h-screen bg-gray-100 py-12 px-4 flex flex-col justify-center">
                        <DataCollectionCard
                            title="How do you identify?"
                            inputType="select"
                            value={userContext.gender || 'Prefer not to say'}
                            onChange={(val) => handleDataUpdate('gender', val)}
                            onNext={handleDataNext}
                            options={[
                                { label: 'Male', value: 'Male' },
                                { label: 'Female', value: 'Female' },
                                { label: 'Non-binary', value: 'Non-binary' },
                                { label: 'Prefer not to say', value: 'Prefer not to say' }
                            ]}
                        />
                        {renderQuitButton()}
                    </div>
                );
            case 3:
                return (
                    <div className="min-h-screen bg-gray-100 py-12 px-4 flex flex-col justify-center">
                        <DataCollectionCard
                            title="Any hobbies or interests?"
                            description="Optional. We might use this to flavor the questions."
                            inputType="textarea"
                            placeholder="e.g. Hiking, Gaming, Reading Sci-Fi"
                            value={userContext.interests}
                            onChange={(val) => handleDataUpdate('interests', val)}
                            onNext={handleDataNext}
                        />
                        {renderQuitButton()}
                    </div>
                );
            default:
                return null;
        }
    }

    if (step === 'quiz') {
        const currentQuestion = questions[currentQuestionIndex];

        if (!currentQuestion) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-lg text-gray-600">Generating question {currentQuestionIndex + 1}...</p>
                        <p className="text-sm text-gray-400 mt-2">Crafting a personalized question just for you.</p>
                        {renderQuitButton()}
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gray-100 py-12 px-4">
                <QuestionCard
                    question={currentQuestion}
                    onAnswer={handleAnswer}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={baseQuestions.length}
                />
                
                <div className="max-w-2xl lg:max-w-4xl mx-auto text-center">
                    {renderQuitButton()}
                </div>
            </div>
        );
    }

    if (step === 'results') {
        return (
            <div className="min-h-screen bg-gray-100 px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">Your Personality Result</h1>
                        <div className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
                            {result}
                        </div>
                        <p className="text-lg text-gray-600">
                            Discover insights about your unique personality type and how it shapes your world
                        </p>
                    </div>

                    {/* Main Results Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Octagon Chart */}
                        {scores && <OctagonChart scores={scores} />}

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={handleReset}
                                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition font-medium"
                                >
                                    🔄 Retake Test
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.share?.({
                                            title: `My MBTI Personality Type: ${result}`,
                                            text: `I just discovered I'm an ${result}! Find out your personality type too.`,
                                            url: window.location.href
                                        }) || alert('Share feature not available on this device');
                                    }}
                                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition font-medium"
                                >
                                    📤 Share Results
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition font-medium"
                                >
                                    🖨️ Save Results
                                </button>
                            </div>

                            {/* User Context Summary */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Profile</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div>🎂 Age: {userContext.age}</div>
                                    {userContext.occupation && <div>💼 Occupation: {userContext.occupation}</div>}
                                    {userContext.interests && <div>🎯 Interests: {userContext.interests}</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personality Analysis */}
                    <PersonalityAnalysis
                        personalityType={result}
                        scores={scores}
                        userContext={userContext}
                    />

                    {/* Q&A Chat Box */}
                    <PersonalityChat
                        personalityType={result}
                        scores={scores}
                        userContext={userContext}
                    />

                    {/* Footer */}
                    <div className="text-center mt-12 pb-8">
                        <p className="text-sm text-gray-500">
                            Remember: MBTI is a tool for self-discovery, not a definitive label.
                            Your personality is unique and can evolve over time.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default QuizContainer;

import OpenAI from 'openai';
import i18n from '../i18n';
import {
    PatientProfile,
    SymptomDetail,
    PossibleDiagnosis,
    RuledOutCondition,
    DiagnosticProgress,
    MedicalQuestion,
    BodySystem,
    SymptomAnalysisResult
} from '../types/symptomProfile';
// NOTE: We intentionally do NOT use the knowledge-graph QUESTION_STRATEGIES for next-question selection.
// Next questions are AI-determined from answer history via `generateNextQuestionFallback(...)`.

// Type for medical chat message with reasoning_details
type MedicalChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string | null;
    reasoning_details?: unknown;
};

// OpenRouter-only configuration
const getOpenRouterConfig = () => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY_1;
    const baseURL = process.env.REACT_APP_OPENAI_BASE_URL_1;
    const model = process.env.REACT_APP_OPENAI_MODEL_1;

    if (!apiKey) {
        throw new Error('OpenRouter API key is required. Set REACT_APP_OPENAI_API_KEY_1 environment variable.');
    }

    return { apiKey, baseURL, model };
};

// Initialize OpenRouter client
let openRouterClient: OpenAI | null = null;

// Get OpenRouter client (lazy initialization)
const getOpenRouterClient = (): OpenAI => {
    if (!openRouterClient) {
        const { apiKey, baseURL } = getOpenRouterConfig();

        openRouterClient = new OpenAI({
            apiKey,
            baseURL,
            dangerouslyAllowBrowser: true
        });

        console.log('🔧 Initialized Medical AI OpenRouter client');
    }
    return openRouterClient;
};

// Simple retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 50000; // 50 seconds timeout

// Utility function to add timeout to a promise
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`)), timeoutMs)
        )
    ]);
};

// Simple retry wrapper for OpenRouter
const withRetry = async <T>(
    apiCall: () => Promise<T>,
    errorMessage: string
): Promise<T> => {
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🔄 Medical AI OpenRouter attempt ${attempt}/${MAX_RETRIES}`);
            const result = await withTimeout(
                apiCall(),
                REQUEST_TIMEOUT,
                `Medical AI request timed out on attempt ${attempt}`
            );
            console.log(`✅ Medical AI OpenRouter success on attempt ${attempt}`);
            return result;
        } catch (error) {
            lastError = error;
            const errorDetails = {
                message: (error as any)?.message,
                name: (error as any)?.name,
                status: (error as any)?.status,
                code: (error as any)?.code
            };
            console.error(`❌ Medical AI OpenRouter attempt ${attempt} failed:`, errorDetails);
            console.error(`❌ Full error:`, error);

            // Don't retry on authentication errors
            if ((error as any)?.status === 401 || (error as any)?.code === 'invalid_api_key') {
                console.error(`❌ Authentication error detected, stopping retries`);
                break;
            }

            // If this is not the last attempt, wait before retrying
            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Retrying in ${RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }

    const errorReason = lastError?.message || 'Unknown error after all retries';
    console.error(`🚨 Medical AI OpenRouter failed after ${MAX_RETRIES} attempts. ${errorMessage}`);
    console.error(`🚨 Last error details:`, {
        message: lastError?.message,
        name: lastError?.name,
        stack: lastError?.stack,
        status: lastError?.status,
        code: lastError?.code,
        response: lastError?.response
    });

    // Throw the error instead of using fallback
    throw new Error(`${errorMessage}: ${errorReason}`);
};

export interface PatientContext {
    age: number;
    gender: string;
    name: string;
    primarySymptom: string;
    additionalSymptoms?: string[];
}

// Enhanced diagnostic system with adaptive questioning
export class AdaptiveDiagnosticSystem {
    private patientProfile: PatientProfile;
    private possibleDiagnoses: PossibleDiagnosis[] = [];
    private ruledOutConditions: RuledOutCondition[] = [];
    private diagnosticProgress: DiagnosticProgress;
    private questionHistory: string[] = [];

    constructor(patientProfile: PatientProfile) {
        this.patientProfile = patientProfile;
        this.diagnosticProgress = {
            totalQuestionsAsked: 0,
            maxQuestions: 20,
            currentConfidence: 0,
            targetConfidence: 85,
            possibleDiagnoses: [],
            ruledOutConditions: [],
            nextQuestionStrategy: 'discriminative',
            informationGain: 0
        };
        this.initializeDiagnoses();
    }

    private initializeDiagnoses() {
        // Initialize with AI-driven diagnosis - no hardcoded patterns
        this.possibleDiagnoses = [];
        this.diagnosticProgress.possibleDiagnoses = this.possibleDiagnoses;
        this.diagnosticProgress.currentConfidence = 0;
    }

    private getConfidenceCategory(confidence: number): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
        if (confidence < 20) return 'very_low';
        if (confidence < 40) return 'low';
        if (confidence < 60) return 'moderate';
        if (confidence < 80) return 'high';
        return 'very_high';
    }

    
    public analyzeSymptomProfile(symptomDetails: SymptomDetail[]): SymptomAnalysisResult {
        const bodySystemsSet = new Set(symptomDetails.flatMap(s => s.bodySystems));
        const bodySystemCoverage = Array.from(bodySystemsSet);

        // Check for critical symptoms
        const criticalSymptoms = this.checkCriticalSymptoms(symptomDetails);

        // Identify missing information
        const missingInformation = this.identifyMissingInformation(symptomDetails);

        // Check for red flags
        const redFlags = this.checkRedFlags(symptomDetails);

        // Generate next recommended questions
        const nextRecommendedQuestions = this.generateRecommendedQuestions(symptomDetails);

        // Calculate completeness
        const completeness = this.calculateCompleteness(symptomDetails);

        return {
            completeness,
            bodySystemCoverage,
            criticalSymptomsChecked: criticalSymptoms,
            missingInformation,
            redFlags,
            nextRecommendedQuestions
        };
    }

    private checkCriticalSymptoms(symptomDetails: SymptomDetail[]): string[] {
        const critical = [];

        // Check for emergency symptoms
        for (const symptom of symptomDetails) {
            if (symptom.severity >= 8) {
                critical.push(`High severity ${symptom.name} (${symptom.severity}/10)`);
            }

            if (symptom.name === 'chest_pain' && symptom.severity >= 6) {
                critical.push('Moderate to severe chest pain');
            }

            if (symptom.name === 'shortness_of_breath' && symptom.severity >= 6) {
                critical.push('Moderate to severe shortness of breath');
            }

            if (symptom.name === 'headache' && symptom.onset === 'sudden' && symptom.severity >= 8) {
                critical.push('Sudden severe headache');
            }
        }

        return critical;
    }

    private identifyMissingInformation(symptomDetails: SymptomDetail[]): string[] {
        const missing = [];
        const primarySymptom = this.patientProfile.primarySymptom;

        // Check for basic symptom characteristics
        const primaryDetail = symptomDetails.find(s => s.name === primarySymptom);
        if (!primaryDetail) {
            missing.push('Primary symptom details');
        } else {
            if (primaryDetail.severity === 0) missing.push('Severity of primary symptom');
            if (!primaryDetail.duration) missing.push('Duration of primary symptom');
            if (!primaryDetail.location && this.requiresLocation(primarySymptom)) missing.push('Location of primary symptom');
            if (!primaryDetail.frequency) missing.push('Frequency of primary symptom');
        }

        // Check for associated symptoms
        const hasAssociatedSymptoms = symptomDetails.some(s => s.associatedSymptoms && s.associatedSymptoms.length > 0);
        if (!hasAssociatedSymptoms && symptomDetails.length < 3) {
            missing.push('Associated symptoms');
        }

        return missing;
    }

    private requiresLocation(symptom: string): boolean {
        const locationRequiredSymptoms = ['pain', 'headache', 'chest_pain', 'abdominal_pain', 'rash', 'swelling'];
        return locationRequiredSymptoms.some(s => symptom.includes(s));
    }

    private checkRedFlags(symptomDetails: SymptomDetail[]): string[] {
        const redFlags = [];

        for (const symptom of symptomDetails) {
            // Emergency red flags
            if (symptom.name === 'chest_pain' && symptom.severity >= 7) {
                redFlags.push('Severe chest pain - possible cardiac emergency');
            }

            if (symptom.name === 'shortness_of_breath' && symptom.severity >= 8) {
                redFlags.push('Severe shortness of breath - possible respiratory emergency');
            }

            if (symptom.name === 'headache' && symptom.onset === 'sudden' && symptom.severity >= 9) {
                redFlags.push('Thunderclap headache - possible subarachnoid hemorrhage');
            }

            if (symptom.name === 'abdominal_pain' && symptom.location === 'right_lower_quadrant') {
                redFlags.push('Right lower quadrant pain - possible appendicitis');
            }

            if (symptom.severity >= 9) {
                redFlags.push(`Severe ${symptom.name} (9-10/10)`);
            }
        }

        return redFlags;
    }

    private generateRecommendedQuestions(symptomDetails: SymptomDetail[]): MedicalQuestion[] {
        // Intentionally disabled: next questions should be determined by AI from answer history.
        // We keep `analyzeSymptomProfile` for completeness/red-flag calculations, but it no longer
        // recommends questions.
        void symptomDetails;
        return [];
    }

    private getPrimaryBodySystem(): BodySystem {
        const primarySymptom = this.patientProfile.primarySymptom;

        // Simple mapping to body systems
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

        for (const [symptom, system] of Object.entries(bodySystemMap)) {
            if (primarySymptom.includes(symptom)) {
                return system;
            }
        }

        return BodySystem.GENERAL;
    }

    private calculateCompleteness(symptomDetails: SymptomDetail[]): number {
        const primarySymptom = this.patientProfile.primarySymptom;
        const primaryDetail = symptomDetails.find(s => s.name === primarySymptom);

        if (!primaryDetail) return 0;

        let completeness = 0;

        // Basic characteristics (40%)
        if (primaryDetail.severity > 0) completeness += 10;
        if (primaryDetail.duration) completeness += 10;
        if (primaryDetail.location || !this.requiresLocation(primarySymptom)) completeness += 10;
        if (primaryDetail.frequency) completeness += 10;

        // Advanced characteristics (30%)
        if (primaryDetail.triggers && primaryDetail.triggers.length > 0) completeness += 10;
        if (primaryDetail.associatedSymptoms && primaryDetail.associatedSymptoms.length > 0) completeness += 10;
        if (primaryDetail.onset) completeness += 10;

        // Additional symptoms (20%)
        if (symptomDetails.length > 1) completeness += 20;

        // Pattern recognition (10%)
        if (primaryDetail.pattern || primaryDetail.timing) completeness += 10;

        return Math.min(100, completeness);
    }

    public updateDiagnosis(newSymptomDetail: SymptomDetail): DiagnosticProgress {
        // Update patient profile
        this.patientProfile.symptoms.push(newSymptomDetail);

        // AI will handle diagnosis updates through updateWithAIDiagnoses method
        // This method now just tracks symptom collection progress

        this.diagnosticProgress.totalQuestionsAsked++;
        this.diagnosticProgress.ruledOutConditions = this.ruledOutConditions;

        return this.diagnosticProgress;
    }

    // NEW METHOD: Get real-time AI analysis for current symptoms
    public async getRealTimeAIAnalysis(symptomAnswers?: Record<number, any>): Promise<{
        diagnoses: Diagnosis[];
        confidence: number;
        reasoning: string;
    }> {
        const symptoms = this.patientProfile.symptoms.map(s => ({
            name: s.name,
            severity: s.severity,
            duration: s.duration,
            location: s.location,
            description: `${s.name} (${s.severity}/10) - ${s.duration || 'duration unknown'}`
        }));

        // Build additional symptoms from both patient profile symptoms and questionnaire answers
        const profileSymptomNames = symptoms.map(s => s.name);

        // Extract symptom names from questionnaire answers
        const questionnaireSymptoms: string[] = [];
        if (symptomAnswers && Object.keys(symptomAnswers).length > 0) {
            Object.values(symptomAnswers).forEach((answer: any) => {
                // Extract symptoms from different answer types
                if (typeof answer === 'string') {
                    // Check for common symptoms in text answers
                    const commonSymptoms = [
                        'headache', 'fever', 'cough', 'nausea', 'vomiting', 'diarrhea',
                        'chest pain', 'abdominal pain', 'back pain', 'fatigue', 'dizziness',
                        'shortness of breath', 'sore throat', 'runny nose', 'sneezing',
                        'muscle aches', 'joint pain', 'rash', 'itching', 'swelling',
                        'urinary frequency', 'burning urination', 'constipation', 'bloating'
                    ];

                    const lowerAnswer = answer.toLowerCase();
                    commonSymptoms.forEach(symptom => {
                        if (lowerAnswer.includes(symptom) && !questionnaireSymptoms.includes(symptom)) {
                            questionnaireSymptoms.push(symptom);
                        }
                    });
                } else if (typeof answer === 'object' && answer !== null) {
                    // Handle structured answers that might include symptom information
                    if (answer.symptom && typeof answer.symptom === 'string') {
                        questionnaireSymptoms.push(answer.symptom);
                    }
                    if (answer.associatedSymptoms && Array.isArray(answer.associatedSymptoms)) {
                        answer.associatedSymptoms.forEach((symptom: string) => {
                            if (symptom && !questionnaireSymptoms.includes(symptom)) {
                                questionnaireSymptoms.push(symptom);
                            }
                        });
                    }
                }
            });
        }

        // Combine both sources and deduplicate
        const combinedSymptoms = [...profileSymptomNames, ...questionnaireSymptoms];
        const allAdditionalSymptoms = combinedSymptoms.filter((symptom, index) => combinedSymptoms.indexOf(symptom) === index);

        console.log('🩺 Symptom extraction analysis:', {
            profileSymptoms: profileSymptomNames,
            questionnaireSymptoms,
            totalAdditionalSymptoms: allAdditionalSymptoms,
            primarySymptom: this.patientProfile.primarySymptom
        });

        const patientContext: PatientContext = {
            age: this.patientProfile.age,
            gender: this.patientProfile.gender,
            name: this.patientProfile.name,
            primarySymptom: this.patientProfile.primarySymptom,
            additionalSymptoms: allAdditionalSymptoms
        };

        try {
            // Use provided symptomAnswers or convert from patient symptoms
            let finalSymptomAnswers: Record<number, any>;

            if (symptomAnswers && Object.keys(symptomAnswers).length > 0) {
                // Use the actual answers from the questionnaire
                finalSymptomAnswers = symptomAnswers;
                console.log('🔍 Using real questionnaire answers for AI analysis');
            } else {
                // Fallback: Convert symptoms to answer format for AI analysis
                finalSymptomAnswers = {};
                symptoms.forEach((symptom, index) => {
                    finalSymptomAnswers[index + 1] = {
                        symptom: symptom.name,
                        severity: symptom.severity,
                        description: symptom.description
                    };
                });
                console.log('🔍 Using converted symptoms for AI analysis (no questionnaire answers available)');
            }

            // Call AI for real-time analysis
            console.log('🔍 Symptom Answers being sent to AI:', `${JSON.stringify(finalSymptomAnswers)}`);
            const aiDiagnoses = await analyzeSymptoms(patientContext, finalSymptomAnswers);

            // Calculate overall confidence (highest probability diagnosis)
            const confidence = aiDiagnoses.length > 0 ? Math.max(...aiDiagnoses.map(d => d.probability)) : 0;

            console.log('🧠 Real-time AI Analysis:', {
                symptomsCount: symptoms.length,
                diagnoses: aiDiagnoses.map(d => `${d.condition}: ${d.probability}%`),
                confidence,
                reasoning: aiDiagnoses[0]?.reasoning || 'No reasoning provided'
            });

            return {
                diagnoses: aiDiagnoses,
                confidence,
                reasoning: aiDiagnoses[0]?.reasoning || 'No reasoning provided'
            };
        } catch (error) {
            console.error('❌ Real-time AI analysis failed:', error);
            return {
                diagnoses: [],
                confidence: 0,
                reasoning: 'AI analysis unavailable'
            };
        }
    }

    // NEW METHOD: Update system with real-time AI analysis
    public async updateWithRealTimeAnalysis(symptomAnswers?: Record<number, any>): Promise<DiagnosticProgress> {
        try {
            const aiAnalysis = await this.getRealTimeAIAnalysis(symptomAnswers);

            // Update possible diagnoses with real-time AI results
            this.updateWithAIDiagnoses(aiAnalysis.diagnoses);

            console.log('🔄 Updated with real-time AI analysis:', {
                confidence: aiAnalysis.confidence,
                diagnosesCount: aiAnalysis.diagnoses.length,
                topDiagnosis: aiAnalysis.diagnoses[0]?.condition,
                reasoning: aiAnalysis.reasoning
            });

            return this.diagnosticProgress;
        } catch (error) {
            console.error('❌ Failed to update with real-time analysis:', error);
            return this.diagnosticProgress;
        }
    }

    private updateQuestionStrategy() {
        const topDiagnosis = this.possibleDiagnoses[0];
        const secondDiagnosis = this.possibleDiagnoses[1];

        if (!topDiagnosis) {
            this.diagnosticProgress.nextQuestionStrategy = 'completeness';
            return;
        }

        // If we have a clear leader (>70% confidence and >20% gap)
        if (topDiagnosis.confidence > 70 && (!secondDiagnosis || (topDiagnosis.confidence - secondDiagnosis.confidence) > 20)) {
            this.diagnosticProgress.nextQuestionStrategy = 'confirmation';
        }
        // If multiple diagnoses are close (<15% gap)
        else if (secondDiagnosis && (topDiagnosis.confidence - secondDiagnosis.confidence) < 15) {
            this.diagnosticProgress.nextQuestionStrategy = 'discriminative';
        }
        // If we need to check for red flags
        else if (this.hasRedFlagSymptoms()) {
            this.diagnosticProgress.nextQuestionStrategy = 'red_flag_check';
        }
        // Default to completeness
        else {
            this.diagnosticProgress.nextQuestionStrategy = 'completeness';
        }
    }

    private hasRedFlagSymptoms(): boolean {
        return this.possibleDiagnoses.some(d => d.urgency === 'emergency') ||
               this.patientProfile.symptoms.some(s => s.severity >= 8);
    }

    public shouldStop(): { shouldStop: boolean; reason?: string } {
        const progress = this.diagnosticProgress;

        // Stop if we've reached target confidence
        if (progress.currentConfidence >= progress.targetConfidence) {
            const reason = `Target confidence reached: ${progress.currentConfidence}% >= ${progress.targetConfidence}%`;
            console.log(`🛑 Stopping questions - ${reason}`);
            return { shouldStop: true, reason };
        }

        // Stop if we've asked maximum questions
        if (progress.totalQuestionsAsked >= progress.maxQuestions) {
            const reason = `Maximum questions reached: ${progress.totalQuestionsAsked} >= ${progress.maxQuestions}`;
            console.log(`🛑 Stopping questions - ${reason}`);
            return { shouldStop: true, reason };
        }

        // Stop if only one plausible diagnosis remains with good confidence
        if (progress.possibleDiagnoses.length === 1 && progress.currentConfidence >= 75) {
            const reason = `Single high-confidence diagnosis: ${progress.possibleDiagnoses[0]?.name} (${progress.currentConfidence}% confidence)`;
            console.log(`🛑 Stopping questions - ${reason}`);
            return { shouldStop: true, reason };
        }

        
        return { shouldStop: false };
    }

    public getDiagnosticProgress(): DiagnosticProgress {
        return this.diagnosticProgress;
    }

    public getPossibleDiagnoses(): PossibleDiagnosis[] {
        return this.possibleDiagnoses;
    }

    public getRuledOutConditions(): RuledOutCondition[] {
        return this.ruledOutConditions;
    }

    public addQuestionToHistory(question: string) {
        this.questionHistory.push(question);
    }

    public updateWithAIDiagnoses(aiDiagnoses: Diagnosis[]): DiagnosticProgress {
        const symptoms = [this.patientProfile.primarySymptom, ...(this.patientProfile.symptoms?.map(s => s.name) || [])];

        // Convert AI diagnoses to PossibleDiagnosis format - fully AI-driven
        const newDiagnoses = aiDiagnoses.map(aiDiagnosis => {
            const name = aiDiagnosis.condition; // AI provides name in correct language
            const confidence = aiDiagnosis.probability;

            return {
                name, // Use AI-generated name (already translated)
                confidence: confidence,
                likelihood: this.getConfidenceCategory(confidence),
                urgency: this.mapUrgencyLevel(aiDiagnosis.urgencyLevel),
                supportingSymptoms: symptoms, // All current symptoms support the diagnosis
                contradictingSymptoms: [], // AI will determine contradictions
                missingKeySymptoms: [], // AI will determine missing symptoms
                reasoning: aiDiagnosis.reasoning || ''
            };
        })
        .sort((a, b) => b.confidence - a.confidence);

        this.possibleDiagnoses = newDiagnoses;

        // Update diagnostic progress
        this.diagnosticProgress.totalQuestionsAsked++;
        this.diagnosticProgress.possibleDiagnoses = this.possibleDiagnoses;
        this.diagnosticProgress.ruledOutConditions = this.ruledOutConditions;
        this.diagnosticProgress.currentConfidence = this.possibleDiagnoses[0]?.confidence || 0;

        // Determine next strategy
        this.updateQuestionStrategy();

        return this.diagnosticProgress;
    }

    private mapUrgencyLevel(urgency: string): 'low' | 'moderate' | 'high' | 'emergency' {
        switch (urgency) {
            case 'emergency': return 'emergency';
            case 'urgent': return 'high';
            case 'routine': return 'moderate';
            case 'self_care': return 'low';
            default: return 'moderate';
        }
    }
}

export interface Symptom {
    id: number;
    description: string;
    severity: number; // 1-10 scale
    duration: string;
    location?: string;
    triggers?: string[];
    associatedSymptoms?: string[];
}

export interface LegacyMedicalQuestion {
    id: number;
    question: string;
    questionType: 'severity' | 'duration' | 'location' | 'frequency' | 'triggers' | 'associated' | 'medical_history' | 'lifestyle';
    responseType: 'scale' | 'multiple_choice' | 'text';
    options?: string[];
}

export interface Diagnosis {
    condition: string;
    probability: number; // 0-100 percentage
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    urgencyLevel: 'emergency' | 'urgent' | 'routine' | 'self_care';
}

export interface MedicalGuidance {
    nextSteps: string[];
    selfCareRecommendations: string[];
    whenToSeekCare: string[];
    emergencyIndicators: string[];
}

// Get current language for system prompt
export const getLanguageForPrompt = (): string => {
    const language = localStorage.getItem('mbti_language') || 'en';
    return language;
};

// Validate and clean questions to ensure they ask only one thing
const validateAndCleanQuestion = (question: string, language: string): string => {
    if (!question || typeof question !== 'string') {
        return question;
    }

    // Patterns that indicate compound questions
    const compoundPatterns = {
        'en': [
            /\band\s+.*\?$/i,           // "...and ...?"
            /\bor\s+.*\?$/i,            // "...or ...?"
            /\?\s+and\s+/i,            // "? and ..."
            /\?\s+or\s+/i,             // "? or ..."
            /\bwhat\s+.*\bwhen\s+/i,   // "what... when..."
            /\bwhat\s+.*\bwhere\s+/i,  // "what... where..."
            /\bhow\s+.*\bwhat\s+/i,    // "how... what..."
            /\bwhen\s+.*\bhow\s+/i,    // "when... how..."
        ],
        'zh-TW': [
            /和.*?嗎？$/i,             // "...和...嗎？"
            /還是.*？$/i,              // "...還是...？"
            /？.*和/i,                 // "？...和..."
            /？.*還是/i,               // "？...還是..."
            /.*時間.*？.*度數？/i,     // "...時間？...度數？"
            /.*頻率.*？.*嚴重程度？/i,  // "...頻率？...嚴重程度？"
        ]
    };

    const patterns = compoundPatterns[language as keyof typeof compoundPatterns] || compoundPatterns['en'];

    // Check if this is a compound question
    for (const pattern of patterns) {
        if (pattern.test(question)) {
            console.log('🚨 Compound question detected:', question);
            // For now, log the issue and return the first part
            // In a more sophisticated implementation, we could split it
            const parts = question.split(/[?？]/);
            if (parts.length > 1) {
                // Return the first complete question
                const firstPart = parts[0] + (question.includes('?') ? '?' : '？');
                console.log('✅ Simplified to single question:', firstPart);
                return firstPart.trim();
            }
        }
    }

    // Check for multiple question marks
    const questionMarks = (question.match(/[?？]/g) || []).length;
    if (questionMarks > 1) {
        console.log('🚨 Multiple question marks detected:', question);
        // Return only the first question
        const parts = question.split(/[?？]/);
        if (parts.length > 1) {
            const firstPart = parts[0] + (question.includes('?') ? '?' : '？');
            console.log('✅ Simplified to first question:', firstPart);
            return firstPart.trim();
        }
    }

    return question;
};

// Get default options for different question types when AI doesn't provide them
const getDefaultOptionsForType = (questionType: string, language: string): string[] => {
    const defaultOptions = {
        'en': {
            'location': ['Head', 'Chest', 'Abdomen', 'Back', 'Arms', 'Legs', 'Other'],
            'frequency': ['Constant', 'Several times a day', 'Once a day', 'A few times a week', 'Rarely'],
            'triggers': ['Movement', 'Rest', 'Eating', 'Stress', 'Weather changes', 'Nothing specific'],
            'associated': ['No other symptoms', 'Fever', 'Fatigue', 'Nausea', 'Dizziness', 'Other'],
            'medical_history': ['No relevant conditions', 'Diabetes', 'High blood pressure', 'Heart disease', 'Previous injuries', 'Other'],
            'lifestyle': ['Sedentary', 'Lightly active', 'Moderately active', 'Very active', 'Stressful', 'Balanced']
        },
        'zh-TW': {
            'location': ['頭部', '胸部', '腹部', '背部', '手臂', '腿部', '其他'],
            'frequency': ['持續性', '每天數次', '每天一次', '每週數次', '很少'],
            'triggers': ['運動', '休息', '進食', '壓力', '天氣變化', '沒有特定誘因'],
            'associated': ['無其他症狀', '發燒', '疲勞', '噁心', '頭暈', '其他'],
            'medical_history': ['無相關疾病', '糖尿病', '高血壓', '心臟病', '過往傷害', '其他'],
            'lifestyle': ['久坐', '輕度活動', '中度活動', '高度活動', '壓力大', '平衡']
        }
    };

    return defaultOptions[language as keyof typeof defaultOptions]?.[questionType as keyof typeof defaultOptions.en] ||
           defaultOptions['en'][questionType as keyof typeof defaultOptions.en] ||
           ['Option 1', 'Option 2', 'Option 3'];
};

// Enhanced generate next question with adaptive diagnostic system
export const generateNextQuestionWithAdaptiveSystem = async (
    patientContext: PatientContext,
    previousAnswers: Record<number, any> = {},
    lastAnswer?: any,
    questionHistory: string[] = [],
    adaptiveSystem?: AdaptiveDiagnosticSystem
): Promise<{ question: MedicalQuestion | null, confidence: number, shouldStop: boolean, stopReason?: string, adaptiveSystem?: AdaptiveDiagnosticSystem }> => {
    console.log('🧩 generateNextQuestionWithAdaptiveSystem() called:', {
        answersCount: Object.keys(previousAnswers || {}).length,
        hasLastAnswer: !!lastAnswer,
        questionHistoryLen: questionHistory.length,
        hasAdaptiveSystem: !!adaptiveSystem
    });

    // Convert PatientContext to PatientProfile
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

    // Create or use existing adaptive system
    let system = adaptiveSystem;
    if (!system) {
        system = new AdaptiveDiagnosticSystem(patientProfile);
    }

    // Add previous question to history
    if (questionHistory.length > 0) {
        const lastQuestion = questionHistory[questionHistory.length - 1];
        system.addQuestionToHistory(lastQuestion);
    }

    // Convert last answer to symptom detail if this isn't the first question
    if (lastAnswer && Object.keys(previousAnswers).length > 0) {
        const symptomDetail = convertAnswerToSymptomDetail(lastAnswer, questionHistory, patientProfile.primarySymptom);
        if (symptomDetail) {
            system.updateDiagnosis(symptomDetail);
        }
    }

    // Check if we should stop
    const stopCheck = system.shouldStop();
    if (stopCheck.shouldStop) {
        const progress = system.getDiagnosticProgress();
        console.log(`🛑 Question generation stopped. Reason: ${stopCheck.reason}`);
        console.log(`🛑 Final diagnostic progress:`, {
            totalQuestionsAsked: progress.totalQuestionsAsked,
            maxQuestions: progress.maxQuestions,
            currentConfidence: progress.currentConfidence,
            targetConfidence: progress.targetConfidence,
            possibleDiagnosesCount: progress.possibleDiagnoses.length,
            hasEmergency: progress.possibleDiagnoses.some(d => d.urgency === 'emergency')
        });
        return {
            question: null,
            confidence: progress.currentConfidence,
            shouldStop: true,
            stopReason: stopCheck.reason,
            adaptiveSystem: system
        };
    }

    // AI-driven next question selection (no knowledge-graph heuristics).
    // The fallback generator prompt uses `previousAnswers` + `questionHistory` to decide what to ask next.
    return generateNextQuestionFallback(patientContext, previousAnswers, lastAnswer, questionHistory, system);
};

// Helper function to convert answer to symptom detail
const convertAnswerToSymptomDetail = (
    answer: any,
    questionHistory: string[],
    primarySymptom: string
): SymptomDetail | null => {
    if (!answer || !questionHistory.length) return null;

    const lastQuestion = questionHistory[questionHistory.length - 1].toLowerCase();

    // Extract symptoms from answer text
    const extractSymptomsFromAnswer = (text: string): string[] => {
        if (typeof text !== 'string') return [];

        const commonSymptoms = [
            'headache', 'fever', 'cough', 'nausea', 'vomiting', 'diarrhea',
            'chest pain', 'abdominal pain', 'back pain', 'fatigue', 'dizziness',
            'shortness of breath', 'sore throat', 'runny nose', 'sneezing',
            'muscle aches', 'joint pain', 'rash', 'itching', 'swelling',
            'urinary frequency', 'burning urination', 'constipation', 'bloating'
        ];

        const foundSymptoms: string[] = [];
        const lowerText = text.toLowerCase();

        commonSymptoms.forEach(symptom => {
            if (lowerText.includes(symptom)) {
                foundSymptoms.push(symptom);
            }
        });

        return foundSymptoms;
    };

    // Try to determine what symptom characteristic was asked about
    if (lastQuestion.includes('severity') || lastQuestion.includes('scale') || lastQuestion.includes('1-10')) {
        return {
            name: primarySymptom,
            severity: typeof answer === 'number' ? answer : parseInt(answer) || 5,
            duration: '',
            onset: 'gradual',
            bodySystems: []
        };
    }

    if (lastQuestion.includes('how long') || lastQuestion.includes('duration')) {
        return {
            name: primarySymptom,
            severity: 0,
            duration: typeof answer === 'string' ? answer : '',
            onset: 'gradual',
            bodySystems: []
        };
    }

    if (lastQuestion.includes('where') || lastQuestion.includes('location')) {
        return {
            name: primarySymptom,
            severity: 0,
            duration: '',
            location: typeof answer === 'string' ? answer : '',
            onset: 'gradual',
            bodySystems: []
        };
    }

    // Check if answer contains new symptoms
    const extractedSymptoms = extractSymptomsFromAnswer(String(answer));
    if (extractedSymptoms.length > 0) {
        console.log('🩺 DEBUG - Extracted new symptoms from answer:', {
            userAnswer: String(answer),
            extractedSymptoms,
            primarySymptom
        });

        // Return the first extracted symptom as the main one
        return {
            name: extractedSymptoms[0],
            severity: 5, // Default severity for newly reported symptoms
            duration: '',
            onset: 'gradual',
            bodySystems: []
        };
    }

    // Default case - treat as associated symptom
    return {
        name: primarySymptom,
        severity: 0,
        duration: '',
        onset: 'gradual',
        associatedSymptoms: typeof answer === 'string' ? [answer] : [],
        bodySystems: []
    };
};

// Fallback function using original AI approach
const generateNextQuestionFallback = async (
    patientContext: PatientContext,
    previousAnswers: Record<number, any> = {},
    lastAnswer?: any,
    questionHistory: string[] = [],
    adaptiveSystem?: AdaptiveDiagnosticSystem
): Promise<{ question: MedicalQuestion | null, confidence: number, shouldStop: boolean, stopReason?: string, adaptiveSystem?: AdaptiveDiagnosticSystem }> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    // Get system prompt from i18n
    const SYSTEM_PROMPT = i18n.t('medicalAI.systemPrompt', { lng: language, ns: 'prompts' });

    const diagnosticProgress = adaptiveSystem?.getDiagnosticProgress();
    const possibleDiagnoses = adaptiveSystem?.getPossibleDiagnoses() || [];

    const noneFirstQuestion = i18n.t('medicalAI.noneFirstQuestion', { lng: language, ns: 'prompts' });
    const noQuestionsAskedYet = i18n.t('medicalAI.noQuestionsAskedYet', { lng: language, ns: 'prompts' });
    const noPossibleDiagnoses = i18n.t('medicalAI.noPossibleDiagnoses', { lng: language, ns: 'prompts' });

    const questionsAlreadyAsked =
        questionHistory.length > 0
            ? questionHistory.map((q, i) => `${i + 1}. "${q}"`).join('\n')
            : noQuestionsAskedYet;

    const possibleDiagnosesList =
        possibleDiagnoses.length > 0
            ? possibleDiagnoses
                .slice(0, 3)
                .map(d => `- ${d.name}: ${d.confidence.toFixed(1)}% (${d.likelihood})`)
                .join('\n')
            : noPossibleDiagnoses;

    const prompt = i18n.t('medicalAI.nextQuestionPrompt', {
        lng: language,
        ns: 'prompts',
        age: patientContext.age,
        gender: patientContext.gender,
        primarySymptom: patientContext.primarySymptom,
        previousAnswersJson: JSON.stringify(previousAnswers),
        lastAnswerJson: lastAnswer ? JSON.stringify(lastAnswer) : noneFirstQuestion,
        questionsAlreadyAsked,
        currentConfidence: diagnosticProgress?.currentConfidence || 0,
        targetConfidence: diagnosticProgress?.targetConfidence || 70,
        questionsAsked: diagnosticProgress?.totalQuestionsAsked || 0,
        maxQuestions: diagnosticProgress?.maxQuestions || 20,
        nextStrategy: diagnosticProgress?.nextQuestionStrategy || 'discriminative',
        possibleDiagnosesList,
        languageMode: language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'
    });

    // Check if model supports reasoning
    const supportsReasoning = model?.includes(':free') || false;

    const response = await withRetry(
        async () => {
            const params: any = {
                model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
            };

            // Add reasoning for supported models
            if (supportsReasoning) {
                params.reasoning = { enabled: true };
            }

            const completion = await client.chat.completions.create(params);
            console.log('🔍 Enhanced Medical AI API response for next question:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            const result = JSON.parse(completion.choices[0].message.content);

            // Validate and clean the single question if it exists
            if (result.question) {
                const question = validateAndCleanQuestion(result.question.question, language);
                let { responseType, options } = result.question;

                // Force multiple choice for duration questions
                if (result.question.questionType === 'duration' && responseType !== 'multiple_choice') {
                    console.log('🔧 Converting duration question to multiple choice');
                    responseType = 'multiple_choice';
                    options = language === 'zh-TW'
                        ? ["少於一小時", "幾小時", "約一天", "幾天", "約一週", "幾週", "約一個月", "幾個月", "超過六個月"]
                        : ["Less than an hour", "A few hours", "About one day", "A few days", "About one week", "A few weeks", "About one month", "A few months", "More than six months"];
                }

                // Force multiple choice for other types that shouldn't use text
                if (responseType === 'text' && ['location', 'frequency', 'triggers', 'associated', 'medical_history', 'lifestyle'].includes(result.question.questionType)) {
                    console.log('🔧 Converting text response to multiple choice for type:', result.question.questionType);
                    responseType = 'multiple_choice';
                    // Add default options if none provided
                    if (!options || !Array.isArray(options)) {
                        options = getDefaultOptionsForType(result.question.questionType, language);
                    }
                }

                // Map the question type to the enhanced MedicalQuestion format
                const questionType = result.question.questionType || 'general';
                const purpose = diagnosticProgress?.nextQuestionStrategy === 'discriminative' ? 'discriminative' :
                               diagnosticProgress?.nextQuestionStrategy === 'confirmation' ? 'confirmation' :
                               diagnosticProgress?.nextQuestionStrategy === 'red_flag_check' ? 'red_flag' : 'completeness';

                // Determine body system based on question type and current diagnoses
                const bodySystem = possibleDiagnoses.length > 0 ? possibleDiagnoses[0].supportingSymptoms[0] as BodySystem : undefined;

                // Generate unique ID using timestamp to prevent conflicts
                const uniqueId = Date.now() + Math.random();
                console.log('🆔 Generated unique question ID:', {
                    uniqueId,
                    timestamp: Date.now(),
                    questionText: question.substring(0, 50) + '...'
                });

                result.question = {
                    ...result.question,
                    id: uniqueId,
                    question,
                    type: responseType as 'scale' | 'multiple_choice' | 'yes_no' | 'text' | 'location' | 'duration',
                    questionType,
                    responseType,
                    options,
                    targetedSymptom: result.question.targetedSymptom,
                    purpose,
                    expectedInformationGain: diagnosticProgress?.informationGain || 0.5,
                    bodySystem
                } as MedicalQuestion;
            }

            return result;
        },
        "Failed to generate enhanced next question after retries"
    );

    // Ensure we always log (and propagate) why the fallback decided to stop.
    // The fallback model typically returns a "reasoning" field explaining the choice.
    const stopReason =
        response?.shouldStop
            ? (typeof response?.reasoning === 'string' && response.reasoning.trim().length > 0
                ? response.reasoning.trim()
                : 'Fallback model returned shouldStop=true (no reasoning provided)')
            : undefined;

    if (response?.shouldStop) {
        console.log('🛑 Fallback question generation stopped:', {
            confidence: response?.confidence,
            stopReason,
            answersCount: Object.keys(previousAnswers || {}).length,
            questionHistoryLen: questionHistory.length
        });
    }

    return {
        ...response,
        stopReason,
        adaptiveSystem
    };
};

// Legacy function - now uses enhanced system
export const generateNextQuestion = async (
    patientContext: PatientContext,
    previousAnswers: Record<number, any> = {},
    lastAnswer?: any,
    questionHistory: string[] = []
): Promise<{ question: MedicalQuestion | null, confidence: number, shouldStop: boolean }> => {
    const response = await generateNextQuestionWithAdaptiveSystem(patientContext, previousAnswers, lastAnswer, questionHistory);
    return {
        question: response.question,
        confidence: response.confidence,
        shouldStop: response.shouldStop
    };
};

// Legacy function for backward compatibility - uses new RAG approach
export const generateSymptomQuestions = async (
    patientContext: PatientContext,
    previousAnswers: Record<number, any> = {},
    questionHistory: string[] = []
): Promise<{ questions: MedicalQuestion[], confidence: number, shouldStop: boolean }> => {
    const response = await generateNextQuestion(patientContext, previousAnswers, undefined, questionHistory);

    if (response.question && !response.shouldStop) {
        return {
            questions: [response.question],
            confidence: response.confidence,
            shouldStop: response.shouldStop
        };
    } else {
        return {
            questions: [],
            confidence: response.confidence,
            shouldStop: response.shouldStop
        };
    }
};

// Analyze symptoms and provide differential diagnosis
export const analyzeSymptoms = async (
    patientContext: PatientContext,
    symptomAnswers: Record<number, any>
): Promise<Diagnosis[]> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 analyzeSymptoms called:', {
        patientContext,
        answerCount: Object.keys(symptomAnswers).length,
        model,
        language: language
    });

    // Detailed symptom answers tracking with history
    console.log('=== Symptom Answers Analysis ===', {
        timestamp: new Date().toISOString(),
        totalAnswers: Object.keys(symptomAnswers).length,
        answerKeys: Object.keys(symptomAnswers),
        symptomAnswersDetails: symptomAnswers,
        // Show progression of answers
        answerProgression: Object.entries(symptomAnswers).map(([questionId, answer]) => ({
            questionId,
            answer,
            answerType: typeof answer,
            isComplexAnswer: typeof answer === 'object' ? answer : 'simple'
        }))
    });

    const SYSTEM_PROMPT = i18n.t('medicalAI.systemPrompt', { lng: language, ns: 'prompts' });

    const prompt = `
    LANGUAGE_MODE: ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}

    PATIENT PROFILE:
    - Age: ${patientContext.age}
    - Gender: ${patientContext.gender}
    - Primary Complaint: "${patientContext.primarySymptom}"

    CLINICAL QUESTIONNAIRE DATA:
    ${JSON.stringify(symptomAnswers)}

    /* INSTRUCTION */
    Based on the patient profile and clinical data above, output the JSON array of the top 3 differential diagnoses.
    `;

    // Log the detailed prompt content
    console.log('🔍 === ANALYZE SYMPTOMS PROMPT CONTENT ===');
    console.log('🔍 LANGUAGE_MODE:', language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English');
    console.log('🔍 PATIENT PROFILE:');
    console.log(`  - Age: ${patientContext.age}`);
    console.log(`  - Gender: ${patientContext.gender}`);
    console.log(`  - Primary Complaint: "${patientContext.primarySymptom}"`);
    console.log('🔍 CLINICAL QUESTIONNAIRE DATA:', JSON.stringify(symptomAnswers, null, 2));
    console.log('🔍 INSTRUCTION: Based on the patient profile and clinical data above, output the JSON array of the top 3 differential diagnoses.');
    console.log('🔍 === END PROMPT CONTENT ===\n');

    console.log('🔍 Starting analyzeSymptoms API call with:', {
        model,
        language,
        systemPromptLength: SYSTEM_PROMPT.length,
        promptLength: prompt.length,
        responseFormat: 'json_object'
    });

    return withRetry(
        async () => {
            const params: any = {
                model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
            };

            console.log('🔍 Making API call to OpenRouter for diagnosis with params:', {
                model: params.model,
                messagesCount: params.messages.length,
                responseFormat: params.response_format,
                systemPromptPreview: SYSTEM_PROMPT.substring(0, 100) + '...',
                userPromptPreview: prompt.substring(0, 20000) + '...'
            });

            const completion = await client.chat.completions.create(params);
            console.log('🔍 Medical AI diagnosis response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                const errorMsg = "Invalid response from OpenRouter: no message content";
                console.error(`❌ ${errorMsg}. Response structure:`, {
                    choices: completion.choices,
                    choicesLength: completion.choices?.length,
                    firstChoice: completion.choices?.[0],
                    message: completion.choices?.[0]?.message
                });
                throw new Error(errorMsg);
            }

            const rawContent = completion.choices[0].message.content;
            console.log('🔍 Raw response content:', rawContent);
            console.log('🔍 Raw response content type:', typeof rawContent);
            console.log('🔍 Raw response content length:', rawContent?.length);

            let result;
            try {
                result = JSON.parse(rawContent);
                console.log('🔍 Parsed JSON result:', result);
                console.log('🔍 Parsed result type:', typeof result);
                console.log('🔍 Is array?', Array.isArray(result));
                if (result && typeof result === 'object') {
                    console.log('🔍 Result keys:', Object.keys(result));
                    console.log('🔍 Result values types:', Object.values(result).map(v => typeof v));
                }
            } catch (parseError: any) {
                const errorMsg = `Failed to parse JSON response: ${parseError.message}`;
                console.error(`❌ ${errorMsg}`);
                console.error('❌ Raw content that failed to parse:', rawContent);
                throw new Error(errorMsg);
            }
            
            // Handle case where API returns an object instead of array
            // (happens with json_object response format)
            if (Array.isArray(result)) {
                console.log('✅ Result is already an array, returning directly');
                console.log('✅ Array length:', result.length);
                return result;
            } else if (result && typeof result === 'object') {
                console.log('🔍 Result is an object, searching for array property...');
                // Try to find the array in common property names
                if (Array.isArray(result.diagnoses)) {
                    console.log('✅ Found array in result.diagnoses');
                    return result.diagnoses;
                } else if (Array.isArray(result.differential_diagnoses)) {
                    console.log('✅ Found array in result.differential_diagnoses, transforming format...');
                    // Transform the format to match expected structure
                    return result.differential_diagnoses.map((item: any) => ({
                        condition: item.diagnosis || 'Unknown condition',
                        probability: 33, // Default probability when not provided
                        confidence: 'medium' as const,
                        reasoning: item.rationale || 'No reasoning provided',
                        urgencyLevel: item.emergencyWarning && item.emergencyWarning.length > 0 ? 'urgent' as const : 'routine' as const
                    }));
                } else if (Array.isArray(result.data)) {
                    console.log('✅ Found array in result.data');
                    return result.data;
                } else if (Array.isArray(result.results)) {
                    console.log('✅ Found array in result.results');
                    return result.results;
                } else if (Array.isArray(result.diagnosis)) {
                    console.log('✅ Found array in result.diagnosis');
                    return result.diagnosis;
                }
                // If it's an object with array-like structure, try to convert
                const values = Object.values(result);
                console.log('🔍 Checking object values for arrays...', values);
                if (values.length > 0 && Array.isArray(values[0])) {
                    console.log('✅ Found array as first value in object');
                    return values[0];
                }
                console.error('❌ No array found in result object. Result structure:', result);
            } else {
                console.error('❌ Result is not an array or object. Type:', typeof result, 'Value:', result);
            }
            
            // If we can't parse it as an array, throw to trigger fallback
            const errorMsg = "Invalid response format: expected array of diagnoses";
            console.error(`❌ ${errorMsg}. Actual result:`, result);
            throw new Error(errorMsg);
        },
        "Failed to analyze symptoms after retries"
    );
};

// Get medical guidance and recommendations
export const getMedicalGuidance = async (
    diagnoses: Diagnosis[],
    patientContext: PatientContext
): Promise<MedicalGuidance> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 getMedicalGuidance called:', {
        diagnoses,
        model,
        language: language
    });

    const SYSTEM_PROMPT = i18n.t('medicalAI.systemPrompt', { lng: language, ns: 'prompts' });

    const prompt = `
    /* INPUT CONTEXT */
    LANGUAGE_MODE: ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}

    PATIENT PROFILE:
    - Age: ${patientContext.age}
    - Gender: ${patientContext.gender}
    - Primary Complaint: "${patientContext.primarySymptom}"

    CLINICAL QUESTIONNAIRE DATA:
    ${JSON.stringify(diagnoses)}

    /* INSTRUCTION */
    Based on the patient profile and clinical data above, output the JSON array of the top 3 differential diagnoses.
    `;

    return withRetry(
        async () => {
            const params: any = {
                model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
            };

            const completion = await client.chat.completions.create(params);
            console.log('🔍 Medical AI guidance response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            const result = JSON.parse(completion.choices[0].message.content);
            return result;
        },
        "Failed to get medical guidance after retries"
    );
};

// Chat with medical AI for follow-up questions
export const askLegacyMedicalQuestion = async (
    question: string,
    diagnoses: Diagnosis[],
    patientContext: PatientContext,
    chatHistory: any[] = []
): Promise<{ content: string; reasoning_details?: unknown }> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 askLegacyMedicalQuestion called:', {
        question: question.substring(0, 50) + '...',
        diagnoses,
        model,
        language: language
    });

    const SYSTEM_PROMPT = i18n.t('medicalAI.systemPrompt', { lng: language, ns: 'prompts' });

    // Build messages array preserving reasoning_details from chat history
    const messages: MedicalChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT }
    ];

    // Reconstruct conversation history
    for (const msg of chatHistory) {
        if (msg.type === 'user') {
            messages.push({
                role: 'user',
                content: msg.message
            });
        } else if (msg.type === 'assistant') {
            messages.push({
                role: 'assistant',
                content: msg.message,
                reasoning_details: msg.reasoning_details
            });
        }
    }

    // Add current user question with context
    const prompt = `
    PATIENT CONTEXT (Internal Reference Only):
    - Age: ${patientContext.age} years old, ${patientContext.gender}
    - Primary Symptom: "${patientContext.primarySymptom}"
    - Current Diagnoses: ${JSON.stringify(diagnoses)}

    USER'S QUESTION: "${question}"

    INSTRUCTIONS:
    1. Provide helpful, medically-informed responses
    2. Reference their specific symptoms and diagnoses when relevant
    3. Always emphasize when to seek professional care
    4. Be empathetic and supportive while maintaining professional boundaries
    5. Use ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}

    IMPORTANT: You are an AI assistant and not a substitute for professional medical care.
    `;

    messages.push({ role: 'user', content: prompt });

    
    return withRetry(
        async () => {
            const params: any = {
                model,
                messages,
            };

            const completion = await client.chat.completions.create(params);
            console.log('🔍 Medical AI chat response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            const response = completion.choices[0].message as MedicalChatMessage;

            return {
                content: response.content || '',
                reasoning_details: response.reasoning_details
            };
        },
        "Failed to get medical chat response after retries"
    );
};
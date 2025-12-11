import {
    PatientProfile,
    PossibleDiagnosis,
    RuledOutCondition,
    DiagnosticProgress,
    SymptomDetail,
    BodySystem
} from '../types/symptomProfile';
// AI-driven diagnosis - no hardcoded patterns needed

export interface DiagnosisUpdateEvent {
    timestamp: Date;
    type: 'new_symptom' | 'question_answered' | 'diagnosis_confirmed' | 'condition_ruled_out';
    details: string;
    confidenceChange?: number;
}

export interface DiagnosticPathway {
    questionNumber: number;
    questionAsked: string;
    answerReceived: any;
    symptomUpdated: SymptomDetail;
    diagnosticImpact: {
        conditionName: string;
        confidenceBefore: number;
        confidenceAfter: number;
        impact: 'increased' | 'decreased' | 'ruled_out' | 'no_change';
    }[];
}

export class DiagnosisTracker {
    private patientProfile: PatientProfile;
    private possibleDiagnoses: PossibleDiagnosis[] = [];
    private ruledOutConditions: RuledOutCondition[] = [];
    private diagnosticProgress: DiagnosticProgress;
    private updateHistory: DiagnosisUpdateEvent[] = [];
    private diagnosticPathway: DiagnosticPathway[] = [];
    private questionCounter = 0;

    constructor(patientProfile: PatientProfile) {
        this.patientProfile = { ...patientProfile };
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
        // AI-driven diagnosis - initialized empty, will be populated by AI
        this.possibleDiagnoses = [];
        this.updateDiagnosticProgress();
        this.addUpdateEvent('diagnosis_confirmed', 'AI-driven diagnosis initialized - waiting for AI analysis');
    }

    private getConfidenceCategory(confidence: number): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
        if (confidence < 20) return 'very_low';
        if (confidence < 40) return 'low';
        if (confidence < 60) return 'moderate';
        if (confidence < 80) return 'high';
        return 'very_high';
    }

    private getUrgencyLevel(conditionName: string): 'low' | 'moderate' | 'high' | 'emergency' {
        // AI will determine urgency based on symptom analysis
        return 'moderate';
    }

    private getSupportingSymptoms(conditionName: string, patientSymptoms: string[]): string[] {
        // AI will analyze supporting symptoms dynamically
        return patientSymptoms;
    }

    private getMissingSymptoms(conditionName: string, patientSymptoms: string[]): string[] {
        // AI will determine missing symptoms dynamically
        return [];
    }

    public updateWithNewSymptom(symptomDetail: SymptomDetail): DiagnosticPathway {
        // Update patient profile
        this.patientProfile.symptoms.push(symptomDetail);
        this.questionCounter++;

        // AI-driven diagnosis - no probability calculations
        // Symptom collection is tracked, but diagnosis is handled by AI

        // Create pathway entry for symptom collection
        const pathway: DiagnosticPathway = {
            questionNumber: this.questionCounter,
            questionAsked: `Symptom update: ${symptomDetail.name}`,
            answerReceived: symptomDetail,
            symptomUpdated: symptomDetail,
            diagnosticImpact: [] // AI will determine diagnostic impact
        };

        this.diagnosticPathway.push(pathway);
        this.updateDiagnosticProgress();

        this.addUpdateEvent(
            'new_symptom',
            `New symptom "${symptomDetail.name}" collected for AI analysis`,
            0
        );

        return pathway;
    }

    // New method to update diagnoses from AI
    public updateWithAIDiagnoses(aiDiagnoses: any[]): void {

        // Convert AI diagnoses to PossibleDiagnosis format
        this.possibleDiagnoses = aiDiagnoses.map(aiDiagnosis => ({
            name: aiDiagnosis.condition,
            confidence: aiDiagnosis.probability,
            likelihood: this.getConfidenceCategory(aiDiagnosis.probability),
            urgency: this.mapUrgencyLevel(aiDiagnosis.urgencyLevel),
            supportingSymptoms: this.patientProfile.symptoms.map(s => s.name),
            contradictingSymptoms: [],
            missingKeySymptoms: [],
            reasoning: aiDiagnosis.reasoning || ''
        })).sort((a, b) => b.confidence - a.confidence);

        this.updateDiagnosticProgress();
        this.addUpdateEvent('diagnosis_confirmed', 'AI provided updated differential diagnoses');
    }

    // NEW METHOD: Get real-time AI analysis and update confidence
    public async getRealTimeConfidenceAnalysis(): Promise<{
        currentConfidence: number;
        confidenceChange: number;
        topDiagnosis: string | null;
        reasoning: string;
    }> {
        const previousConfidence = this.diagnosticProgress.currentConfidence;
        const previousTopDiagnosis = this.possibleDiagnoses[0]?.name || null;

        try {
            // Create a simple AI analysis based on symptom patterns
            // In a real implementation, this would call the AI service
            const symptoms = this.patientProfile.symptoms;
            const symptomCount = symptoms.length;

            // Simple heuristic-based confidence calculation
            // Higher confidence with more symptoms and severity
            let confidence = 0;
            let avgSeverity = 0;
            if (symptomCount > 0) {
                avgSeverity = symptoms.reduce((sum, s) => sum + s.severity, 0) / symptomCount;
                confidence = Math.min(85, (symptomCount * 10) + (avgSeverity * 5));
            }

            // Determine likely condition based on symptoms (simple heuristic)
            const topDiagnosis = this.inferTopDiagnosis(symptoms);

            const confidenceChange = confidence - previousConfidence;

            // Update the internal confidence
            this.diagnosticProgress.currentConfidence = confidence;
            if (topDiagnosis && !this.possibleDiagnoses.find(d => d.name === topDiagnosis)) {
                this.possibleDiagnoses.push({
                    name: topDiagnosis,
                    confidence: confidence,
                    likelihood: this.getConfidenceCategory(confidence),
                    urgency: 'moderate',
                    supportingSymptoms: symptoms.map(s => s.name),
                    contradictingSymptoms: [],
                    missingKeySymptoms: [],
                    reasoning: `Inferred based on ${symptomCount} symptoms with average severity ${avgSeverity?.toFixed(1) || 0}/10`
                });
                this.possibleDiagnoses.sort((a, b) => b.confidence - a.confidence);
            }

            console.log('📊 Real-time Confidence Analysis:', {
                previousConfidence,
                newConfidence: confidence,
                confidenceChange,
                topDiagnosis,
                previousTopDiagnosis,
                symptomCount,
                reasoning: `Updated based on symptom analysis`
            });

            return {
                currentConfidence: confidence,
                confidenceChange,
                topDiagnosis,
                reasoning: `Confidence updated based on ${symptomCount} symptoms collected`
            };
        } catch (error) {
            console.error('❌ Real-time confidence analysis failed:', error);
            return {
                currentConfidence: previousConfidence,
                confidenceChange: 0,
                topDiagnosis: previousTopDiagnosis,
                reasoning: 'Analysis failed - using previous confidence'
            };
        }
    }

    // Simple heuristic to infer top diagnosis based on symptoms
    private inferTopDiagnosis(symptoms: SymptomDetail[]): string {
        const symptomNames = symptoms.map(s => s.name.toLowerCase());

        // Simple pattern matching for common conditions
        if (symptomNames.includes('chest_pain') || symptomNames.includes('shortness_of_breath')) {
            return 'Cardiac condition';
        }
        if (symptomNames.includes('headache') && symptomNames.includes('nausea')) {
            return 'Migraine';
        }
        if (symptomNames.includes('cough') && symptomNames.includes('fever')) {
            return 'Respiratory infection';
        }
        if (symptomNames.includes('abdominal_pain') && symptomNames.includes('nausea')) {
            return 'Gastrointestinal condition';
        }
        if (symptomNames.includes('urinary_frequency') || symptomNames.includes('dysuria')) {
            return 'Urinary tract condition';
        }

        return 'General medical condition';
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

    private calculateDiagnosticImpact(before: { name: string; confidence: number }[], after: PossibleDiagnosis[]) {
        return before.map(beforeDiagnosis => {
            const afterDiagnosis = after.find(d => d.name === beforeDiagnosis.name);
            const confidenceAfter = afterDiagnosis?.confidence || 0;
            const difference = confidenceAfter - beforeDiagnosis.confidence;

            let impact: 'increased' | 'decreased' | 'ruled_out' | 'no_change';
            if (confidenceAfter === 0) impact = 'ruled_out';
            else if (difference > 5) impact = 'increased';
            else if (difference < -5) impact = 'decreased';
            else impact = 'no_change';

            return {
                conditionName: beforeDiagnosis.name,
                confidenceBefore: beforeDiagnosis.confidence,
                confidenceAfter,
                impact
            };
        }).filter(impact => impact.impact !== 'no_change');
    }

    private updateDiagnosticProgress() {
        this.diagnosticProgress.totalQuestionsAsked = this.questionCounter;
        this.diagnosticProgress.possibleDiagnoses = this.possibleDiagnoses;
        this.diagnosticProgress.ruledOutConditions = this.ruledOutConditions;
        this.diagnosticProgress.currentConfidence = this.possibleDiagnoses[0]?.confidence || 0;

        // Determine next strategy
        this.updateQuestionStrategy();
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

    private addUpdateEvent(type: DiagnosisUpdateEvent['type'], details: string, confidenceChange?: number) {
        this.updateHistory.push({
            timestamp: new Date(),
            type,
            details,
            confidenceChange
        });
    }

    public shouldStopQuestioning(): boolean {
        const progress = this.diagnosticProgress;

        // Stop if we've reached target confidence
        if (progress.currentConfidence >= progress.targetConfidence) {
            return true;
        }

        // Stop if we've asked maximum questions
        if (progress.totalQuestionsAsked >= progress.maxQuestions) {
            return true;
        }

        // Stop if only one plausible diagnosis remains with good confidence
        if (progress.possibleDiagnoses.length === 1 && progress.currentConfidence >= 75) {
            return true;
        }

        // Stop if we have an emergency diagnosis
        if (progress.possibleDiagnoses.some(d => d.urgency === 'emergency')) {
            return true;
        }

        return false;
    }

    public getTopDifferentialDiagnoses(count: number = 3): PossibleDiagnosis[] {
        return this.possibleDiagnoses.slice(0, count);
    }

    public getDiagnosticConfidence(): number {
        return this.diagnosticProgress.currentConfidence;
    }

    public getRuledOutConditions(): RuledOutCondition[] {
        return this.ruledOutConditions;
    }

    public getDiagnosticProgress(): DiagnosticProgress {
        return { ...this.diagnosticProgress };
    }

    public getDiagnosticPathway(): DiagnosticPathway[] {
        return [...this.diagnosticPathway];
    }

    public getUpdateHistory(): DiagnosisUpdateEvent[] {
        return [...this.updateHistory];
    }

    public getBodySystemCoverage(): BodySystem[] {
        const systems = new Set<BodySystem>();
        this.patientProfile.symptoms.forEach(symptom => {
            symptom.bodySystems.forEach(system => systems.add(system));
        });
        return Array.from(systems);
    }

    public getSymptomCompleteness(): number {
        if (this.patientProfile.symptoms.length === 0) return 0;

        const primarySymptom = this.patientProfile.primarySymptom;
        const primaryDetail = this.patientProfile.symptoms.find(s => s.name === primarySymptom);

        if (!primaryDetail) return 0;

        let completeness = 0;

        // Basic characteristics (40%)
        if (primaryDetail.severity > 0) completeness += 10;
        if (primaryDetail.duration) completeness += 10;
        if (primaryDetail.location || this.requiresLocation(primarySymptom)) completeness += 10;
        if (primaryDetail.frequency) completeness += 10;

        // Advanced characteristics (30%)
        if (primaryDetail.triggers && primaryDetail.triggers.length > 0) completeness += 10;
        if (primaryDetail.associatedSymptoms && primaryDetail.associatedSymptoms.length > 0) completeness += 10;
        if (primaryDetail.onset) completeness += 10;

        // Additional symptoms (20%)
        if (this.patientProfile.symptoms.length > 1) completeness += 20;

        // Pattern recognition (10%)
        if (primaryDetail.pattern || primaryDetail.timing) completeness += 10;

        return Math.min(100, completeness);
    }

    private requiresLocation(symptom: string): boolean {
        const locationRequiredSymptoms = ['pain', 'headache', 'chest_pain', 'abdominal_pain', 'rash', 'swelling'];
        return locationRequiredSymptoms.some(s => symptom.includes(s));
    }

    public getInformationGain(): number {
        if (this.diagnosticPathway.length === 0) return 0;

        // Calculate average confidence change across all questions
        const totalChange = this.diagnosticPathway.reduce((sum, pathway) => {
            const changes = pathway.diagnosticImpact.map(impact =>
                Math.abs(impact.confidenceAfter - impact.confidenceBefore)
            );
            return sum + changes.reduce((a, b) => a + b, 0);
        }, 0);

        return totalChange / this.diagnosticPathway.length;
    }

    public exportDiagnosticReport(): {
        patientProfile: PatientProfile;
        finalDiagnoses: PossibleDiagnosis[];
        ruledOutConditions: RuledOutCondition[];
        diagnosticPathway: DiagnosticPathway[];
        summary: {
            totalQuestions: number;
            finalConfidence: number;
            bodySystemsCovered: BodySystem[];
            completenessPercentage: number;
            averageInformationGain: number;
        };
    } {
        return {
            patientProfile: this.patientProfile,
            finalDiagnoses: this.possibleDiagnoses,
            ruledOutConditions: this.ruledOutConditions,
            diagnosticPathway: this.diagnosticPathway,
            summary: {
                totalQuestions: this.questionCounter,
                finalConfidence: this.diagnosticProgress.currentConfidence,
                bodySystemsCovered: this.getBodySystemCoverage(),
                completenessPercentage: this.getSymptomCompleteness(),
                averageInformationGain: this.getInformationGain()
            }
        };
    }
}
export interface SymptomDetail {
  // Basic symptom information
  name: string;
  severity: number; // 1-10 scale
  duration: string; // e.g., "2 days", "1 week", "6 months"
  onset: 'sudden' | 'gradual' | 'intermittent';

  // Location and radiation
  location?: string;
  radiation?: string[];

  // Temporal patterns
  frequency?: 'constant' | 'intermittent' | 'episodic' | 'progressive';
  timing?: string[]; // e.g., ["morning", "after meals", "at night"]
  pattern?: string; // e.g., "worse with movement", "better with rest"

  // Associated characteristics
  triggers?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];

  // Body systems affected
  bodySystems: BodySystem[];

  // Additional notes
  notes?: string;
}

export enum BodySystem {
  GENERAL = 'general',
  NEUROLOGICAL = 'neurological',
  CARDIOVASCULAR = 'cardiovascular',
  RESPIRATORY = 'respiratory',
  GASTROINTESTINAL = 'gastrointestinal',
  MUSCULOSKELETAL = 'musculoskeletal',
  DERMATOLOGICAL = 'dermatological',
  ENDOCRINE = 'endocrine',
  PSYCHIATRIC = 'psychiatric',
  GENITOURINARY = 'genitourinary',
  HEMATOLOGIC = 'hematologic',
  IMMUNOLOGIC = 'immunologic'
}

export interface PatientProfile {
  // Basic demographics
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  name: string;

  // Medical history
  medications?: string[];
  allergies?: string[];
  pastMedicalHistory?: string[];
  familyHistory?: string[];
  socialHistory?: {
    smoking?: boolean;
    alcohol?: 'none' | 'social' | 'moderate' | 'heavy';
    exercise?: 'none' | 'light' | 'moderate' | 'heavy';
    occupation?: string;
    stress?: 'low' | 'moderate' | 'high';
  };

  // Current symptom profile
  primarySymptom: string;
  symptoms: SymptomDetail[];
  symptomTimeline: SymptomTimelineEvent[];
}

export interface SymptomTimelineEvent {
  timestamp: Date;
  symptomName: string;
  details: Partial<SymptomDetail>;
  questionAsked: string;
  answer: any;
}

export interface PossibleDiagnosis {
  name: string;
  icd10Code?: string;
  confidence: number; // 0-100%
  likelihood: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  urgency: 'low' | 'moderate' | 'high' | 'emergency';
  supportingSymptoms: string[];
  contradictingSymptoms?: string[];
  missingKeySymptoms: string[];
  reasoning: string;
}

export interface RuledOutCondition {
  name: string;
  reason: string;
  evidence: string;
  confidenceOfExclusion: number; // 0-100%
}

export interface DiagnosticProgress {
  totalQuestionsAsked: number;
  maxQuestions: number;
  currentConfidence: number;
  targetConfidence: number;
  possibleDiagnoses: PossibleDiagnosis[];
  ruledOutConditions: RuledOutCondition[];
  nextQuestionStrategy: 'discriminative' | 'confirmation' | 'red_flag_check' | 'completeness';
  informationGain: number; // How much the last answer helped
}

export interface MedicalQuestion {
  id: number;
  question: string;
  type: 'scale' | 'multiple_choice' | 'yes_no' | 'text' | 'location' | 'duration';
  options?: string[];
  scaleRange?: { min: number; max: number; labels?: { [key: number]: string } };
  targetedSymptom?: string;
  purpose: 'discriminative' | 'confirmation' | 'red_flag' | 'completeness';
  expectedInformationGain: number; // 0-100%
  bodySystem?: BodySystem;
}

export interface SymptomAnalysisResult {
  completeness: number; // 0-100% how complete the symptom profile is
  bodySystemCoverage: BodySystem[];
  criticalSymptomsChecked: string[];
  missingInformation: string[];
  redFlags: string[];
  nextRecommendedQuestions: MedicalQuestion[];
}
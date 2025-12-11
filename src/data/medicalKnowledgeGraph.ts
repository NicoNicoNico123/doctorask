import { BodySystem, MedicalQuestion } from '../types/symptomProfile';

export interface DiseasePattern {
  name: string;
  icd10Code?: string;
  bodySystems: BodySystem[];
  essentialSymptoms: string[]; // Must-have symptoms
  commonSymptoms: string[]; // Often present
  possibleSymptoms: string[]; // Sometimes present
  symptomCombinations: {
    [key: string]: {
      symptoms: string[];
      confidence: number;
    };
  };
  discriminatingSymptoms: string[]; // Symptoms that help differentiate from similar conditions
  redFlagSymptoms: string[]; // Emergency indicators
  ageGroups: string[]; // Typical age ranges
  genderPredilection?: string;
  urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency';
  prevalence: 'very_common' | 'common' | 'uncommon' | 'rare';
}

export interface QuestionStrategy {
  // Decision trees for common symptom presentations
  symptomTrees: {
    [key: string]: {
      primarySymptom: string;
      discriminativeQuestions: MedicalQuestion[];
      conditionsToRuleOut: string[];
      nextStepsBasedOnAnswers: {
        [answerPattern: string]: {
          likelyConditions: string[];
          nextQuestions: number[];
          confidenceIncrease: number;
        };
      };
    };
  };

  // Body system specific question patterns
  bodySystemQuestions: {
    [key in BodySystem]: {
      screeningQuestions: MedicalQuestion[];
      discriminativeQuestions: MedicalQuestion[];
      redFlagQuestions: MedicalQuestion[];
      completenessChecklist: string[];
    };
  };

  // Information gain calculation for different question types
  questionValueMatrix: {
    [symptomCombination: string]: {
      [questionType: string]: number; // Expected information gain (0-100)
    };
  };
}

// Disease patterns are now handled entirely by AI - no hardcoded patterns needed

export const QUESTION_STRATEGIES: QuestionStrategy = {
  symptomTrees: {
    'chest_pain': {
      primarySymptom: 'chest_pain',
      discriminativeQuestions: [
        {
          id: 1,
          question: 'Can you describe the chest pain? Is it sharp, dull, pressure-like, or burning?',
          type: 'multiple_choice',
          options: ['Sharp/stabbing', 'Dull/aching', 'Pressure/tightness', 'Burning'],
          targetedSymptom: 'chest_pain',
          purpose: 'discriminative',
          expectedInformationGain: 85,
          bodySystem: BodySystem.CARDIOVASCULAR
        },
        {
          id: 2,
          question: 'On a scale of 1-10, how severe is your chest pain?',
          type: 'scale',
          scaleRange: { min: 1, max: 10, labels: { 1: 'Very mild', 10: 'Severe' } },
          targetedSymptom: 'chest_pain',
          purpose: 'confirmation',
          expectedInformationGain: 70,
          bodySystem: BodySystem.CARDIOVASCULAR
        },
        {
          id: 3,
          question: 'Does the pain radiate to any other areas?',
          type: 'multiple_choice',
          options: ['No radiation', 'Left arm', 'Right arm', 'Jaw/neck', 'Back', 'Shoulder'],
          targetedSymptom: 'chest_pain',
          purpose: 'discriminative',
          expectedInformationGain: 90,
          bodySystem: BodySystem.CARDIOVASCULAR
        }
      ],
      conditionsToRuleOut: ['Cardiac emergency', 'Pulmonary embolism', 'Vascular emergency', 'Pneumonia', 'GERD'],
      nextStepsBasedOnAnswers: {
        'pressure_tightness+radiation+severe': {
          likelyConditions: ['Cardiac emergency', 'Angina'],
          nextQuestions: [4, 5],
          confidenceIncrease: 30
        },
        'sharp+pleuritic+shortness_of_breath': {
          likelyConditions: ['Pulmonary condition', 'Respiratory infection'],
          nextQuestions: [6, 7],
          confidenceIncrease: 25
        }
      }
    },
    'headache': {
      primarySymptom: 'headache',
      discriminativeQuestions: [
        {
          id: 10,
          question: 'How would you describe the quality of your headache?',
          type: 'multiple_choice',
          options: ['Throbbing/pulsating', 'Constant/aching', 'Sharp/stabbing', 'Pressure/tightness'],
          targetedSymptom: 'headache',
          purpose: 'discriminative',
          expectedInformationGain: 80,
          bodySystem: BodySystem.NEUROLOGICAL
        },
        {
          id: 11,
          question: 'Is the headache on one side or both sides?',
          type: 'multiple_choice',
          options: ['Left side only', 'Right side only', 'Both sides', 'Moves between sides'],
          targetedSymptom: 'headache',
          purpose: 'discriminative',
          expectedInformationGain: 75,
          bodySystem: BodySystem.NEUROLOGICAL
        }
      ],
      conditionsToRuleOut: ['Migraine', 'Tension headache', 'Cluster headache', 'Brain hemorrhage', 'Meningitis'],
      nextStepsBasedOnAnswers: {
        'throbbing+unilateral+photophobia': {
          likelyConditions: ['Migraine', 'Cluster headache'],
          nextQuestions: [12, 13],
          confidenceIncrease: 35
        }
      }
    }
  },

  bodySystemQuestions: {
    [BodySystem.CARDIOVASCULAR]: {
      screeningQuestions: [
        {
          id: 20,
          question: 'Do you have any chest pain, pressure, or discomfort?',
          type: 'yes_no',
          targetedSymptom: 'chest_pain',
          purpose: 'confirmation',
          expectedInformationGain: 90,
          bodySystem: BodySystem.CARDIOVASCULAR
        }
      ],
      discriminativeQuestions: [
        {
          id: 21,
          question: 'Do you have any shortness of breath with exertion or at rest?',
          type: 'yes_no',
          targetedSymptom: 'shortness_of_breath',
          purpose: 'discriminative',
          expectedInformationGain: 85,
          bodySystem: BodySystem.CARDIOVASCULAR
        }
      ],
      redFlagQuestions: [
        {
          id: 22,
          question: 'Are you experiencing any chest pain with sweating, nausea, or dizziness?',
          type: 'yes_no',
          targetedSymptom: 'chest_pain',
          purpose: 'red_flag',
          expectedInformationGain: 95,
          bodySystem: BodySystem.CARDIOVASCULAR
        }
      ],
      completenessChecklist: [
        'chest_pain_character',
        'radiation_pattern',
        'exertional_component',
        'associated_symptoms',
        'risk_factors'
      ]
    },
    [BodySystem.RESPIRATORY]: {
      screeningQuestions: [
        {
          id: 30,
          question: 'Are you experiencing any cough or breathing difficulties?',
          type: 'yes_no',
          targetedSymptom: 'cough',
          purpose: 'confirmation',
          expectedInformationGain: 85,
          bodySystem: BodySystem.RESPIRATORY
        }
      ],
      discriminativeQuestions: [
        {
          id: 31,
          question: 'Are you coughing up any phlegm or mucus?',
          type: 'yes_no',
          targetedSymptom: 'sputum_production',
          purpose: 'discriminative',
          expectedInformationGain: 75,
          bodySystem: BodySystem.RESPIRATORY
        }
      ],
      redFlagQuestions: [
        {
          id: 32,
          question: 'Are you having severe difficulty breathing or do you feel short of breath at rest?',
          type: 'yes_no',
          targetedSymptom: 'shortness_of_breath',
          purpose: 'red_flag',
          expectedInformationGain: 95,
          bodySystem: BodySystem.RESPIRATORY
        }
      ],
      completenessChecklist: [
        'cough_character',
        'sputum_production',
        'breath_sounds',
        'fever_association',
        'exertional_component'
      ]
    },
    [BodySystem.GASTROINTESTINAL]: {
      screeningQuestions: [
        {
          id: 40,
          question: 'Are you experiencing any abdominal pain, nausea, or changes in bowel habits?',
          type: 'yes_no',
          targetedSymptom: 'abdominal_pain',
          purpose: 'confirmation',
          expectedInformationGain: 85,
          bodySystem: BodySystem.GASTROINTESTINAL
        }
      ],
      discriminativeQuestions: [
        {
          id: 41,
          question: 'Where exactly is the abdominal pain located?',
          type: 'multiple_choice',
          options: ['Upper abdomen', 'Lower abdomen', 'Right upper', 'Left upper', 'Right lower', 'Left lower', 'Diffuse'],
          targetedSymptom: 'abdominal_pain',
          purpose: 'discriminative',
          expectedInformationGain: 80,
          bodySystem: BodySystem.GASTROINTESTINAL
        }
      ],
      redFlagQuestions: [
        {
          id: 42,
          question: 'Are you experiencing severe abdominal pain with fever, vomiting, or inability to pass gas?',
          type: 'yes_no',
          targetedSymptom: 'abdominal_pain',
          purpose: 'red_flag',
          expectedInformationGain: 90,
          bodySystem: BodySystem.GASTROINTESTINAL
        }
      ],
      completenessChecklist: [
        'pain_location',
        'pain_character',
        'associated_symptoms',
        'bowel_habit_changes',
        'dietary_associations'
      ]
    },
    [BodySystem.NEUROLOGICAL]: {
      screeningQuestions: [
        {
          id: 50,
          question: 'Are you experiencing any headaches, dizziness, or changes in sensation or movement?',
          type: 'yes_no',
          targetedSymptom: 'headache',
          purpose: 'confirmation',
          expectedInformationGain: 85,
          bodySystem: BodySystem.NEUROLOGICAL
        }
      ],
      discriminativeQuestions: [
        {
          id: 51,
          question: 'Are you experiencing any sensitivity to light or sound?',
          type: 'yes_no',
          targetedSymptom: 'photophobia',
          purpose: 'discriminative',
          expectedInformationGain: 75,
          bodySystem: BodySystem.NEUROLOGICAL
        }
      ],
      redFlagQuestions: [
        {
          id: 52,
          question: 'Did you experience a sudden, severe "thunderclap" headache or have you hit your head recently?',
          type: 'yes_no',
          targetedSymptom: 'headache',
          purpose: 'red_flag',
          expectedInformationGain: 95,
          bodySystem: BodySystem.NEUROLOGICAL
        }
      ],
      completenessChecklist: [
        'headache_character',
        'neurological_symptoms',
        'trauma_history',
        'associated_symptoms',
        'temporal_pattern'
      ]
    },
    [BodySystem.GENERAL]: {
      screeningQuestions: [
        {
          id: 60,
          question: 'Are you experiencing fever, fatigue, or general malaise?',
          type: 'yes_no',
          targetedSymptom: 'fever',
          purpose: 'confirmation',
          expectedInformationGain: 70,
          bodySystem: BodySystem.GENERAL
        }
      ],
      discriminativeQuestions: [
        {
          id: 61,
          question: 'When did these symptoms start and how have they progressed?',
          type: 'text',
          targetedSymptom: 'general',
          purpose: 'completeness',
          expectedInformationGain: 60,
          bodySystem: BodySystem.GENERAL
        }
      ],
      redFlagQuestions: [
        {
          id: 62,
          question: 'Are you experiencing high fever (>103°F/39.4°C) with confusion or severe weakness?',
          type: 'yes_no',
          targetedSymptom: 'fever',
          purpose: 'red_flag',
          expectedInformationGain: 90,
          bodySystem: BodySystem.GENERAL
        }
      ],
      completenessChecklist: [
        'fever_pattern',
        'fatigue_level',
        'weight_changes',
        'appetite_changes',
        'functional_impairment'
      ]
    },
    [BodySystem.MUSCULOSKELETAL]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    },
    [BodySystem.DERMATOLOGICAL]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    },
    [BodySystem.ENDOCRINE]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    },
    [BodySystem.PSYCHIATRIC]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    },
    [BodySystem.GENITOURINARY]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    },
    [BodySystem.HEMATOLOGIC]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    },
    [BodySystem.IMMUNOLOGIC]: {
      screeningQuestions: [],
      discriminativeQuestions: [],
      redFlagQuestions: [],
      completenessChecklist: []
    }
  },

  questionValueMatrix: {
    'chest_pain+dyspnea': {
      'quality_description': 90,
      'radiation_pattern': 95,
      'exertional_component': 85,
      'duration': 70
    },
    'headache+photophobia': {
      'pain_character': 85,
      'location_unilateral': 80,
      'aura_presence': 95,
      'trigger_factors': 75
    },
    'abdominal_pain+fever': {
      'pain_location': 95,
      'migration_pattern': 90,
      'rebound_tenderness': 85,
      'anorexia': 70
    }
  }
};

// Helper functions for AI-driven diagnosis (no hardcoded patterns)

/**
 * Gets body system specific questions - now AI-driven
 */
export function getBodySystemQuestions(bodySystem: BodySystem) {
  return QUESTION_STRATEGIES.bodySystemQuestions[bodySystem] || {
    screeningQuestions: [],
    discriminativeQuestions: [],
    redFlagQuestions: [],
    completenessChecklist: []
  };
}

/**
 * Gets symptom tree questions for adaptive questioning - now AI-driven
 */
export function getSymptomTreeQuestions(symptom: string) {
  return QUESTION_STRATEGIES.symptomTrees[symptom] || null;
}

/**
 * Calculates question value for information gain - simplified for AI-driven approach
 */
export function getQuestionValue(symptomCombination: string, questionType: string): number {
  const matrix = QUESTION_STRATEGIES.questionValueMatrix[symptomCombination];
  return matrix?.[questionType] || 50; // Default moderate value
}
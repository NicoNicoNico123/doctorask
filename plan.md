# AI Doctor App Transformation Plan

## Overview
Transform the existing MBTI personality quiz app into an AI-powered symptom assessment and diagnosis tool while preserving the excellent technical infrastructure and user experience patterns.

## Core User Experience Flow
1. **Initial Symptom Description**: User describes their main health concern in natural language
2. **Progressive AI-Guided Assessment**: AI asks targeted questions to clarify symptoms, duration, severity, and context
3. **Dynamic Question Generation**: AI determines quantity and focus of questions based on confidence level
4. **Top 3 Diagnosis Results**: AI provides probabilistic diagnosis with confidence scores
5. **Medical Guidance**: Next steps, self-care recommendations, and when to seek professional care

## Key Technical Changes

### 1. Service Layer Transformation
- **Rename/Refactor `openaiService.ts` → `medicalAIService.ts`**
- **New Functions**:
  - `generateSymptomQuestions()` - AI clarifying questions based on initial symptoms
  - `analyzeSymptoms()` - Probabilistic diagnosis with top 3 conditions
  - `getMedicalGuidance()` - Next steps and self-care recommendations
  - `assessUrgency()` - Emergency care triage
- **Preserve existing retry logic, timeout handling, and OpenRouter integration**

### 2. Component Architecture Updates
- **Replace `DataCollectionCard` → `SymptomCollectionCard`**
  - Progressive disclosure: start with basic symptom description
  - Add follow-up questions dynamically based on AI analysis
  - Support for multiple symptom entries
- **Create new `DynamicQuestionCard` component**
  - **Fully AI-generated questions** (not static like current MBTI)
  - Questions adapt based on AI's confidence level in potential diagnoses
  - Medical-specific question types (severity scales, duration, location, triggers)
  - Visual pain indicators, body diagrams
  - Medication and allergy tracking
  - AI decides when to stop asking questions based on diagnostic confidence
- **Update `PersonalityAnalysis` → `DiagnosisResults`**
  - Top 3 conditions with probability percentages
  - Confidence indicators
  - Recommended next steps for each condition

### 3. New Medical Components
- **`SymptomTracker`** - Visual symptom logging with body diagrams
- **`UrgencyIndicator`** - Emergency care recommendations
- **`DiagnosisCard`** - Medical condition information with probabilities
- **`MedicalDisclaimer`** - Basic emergency warnings and safety information
- **`FollowUpQuestions`** - AI-generated clarifying questions

### 4. Data Model Changes
- **Replace `UserContext` → `PatientContext`**
  - Age, gender, basic medical history
  - Current medications, allergies
  - Symptom descriptions with timestamps
- **New Interfaces**:
  - `Symptom` - description, severity, duration, location
  - `Diagnosis` - condition name, probability, confidence
  - `MedicalQuestion` - question type, response format, clinical relevance

### 5. Content & Localization Updates
- **Medical terminology translation** (English/Traditional Chinese)
- **Symptom description localization**
- **Emergency care instructions by region**
- **Medical disclaimer translations**

### 6. UI/UX Enhancements
- **Medical color scheme** (calming blues, greens)
- **Health-focused icons and illustrations**
- **Severity visual indicators** (color-coded urgency)
- **Progressive disclosure patterns** for sensitive medical info
- **Clear emergency call-to-action buttons**

### 7. Safety & Compliance Features
- **Basic emergency warning system**
- **Symptom red flag detection**
- **"Not a substitute for professional care" disclaimers**
- **Age-appropriate content filtering**

## Implementation Phases

### Phase 1: Core Medical AI Service
1. Refactor OpenRouter integration for medical use
2. Develop symptom analysis prompts
3. Create diagnosis generation logic
4. Test with medical scenarios

### Phase 2: Component Transformation
1. Update data collection for symptoms
2. Transform question cards for medical use
3. Create diagnosis results display
4. Add medical disclaimers

### Phase 3: User Experience Flow
1. Implement progressive symptom disclosure
2. Add dynamic question generation
3. Create diagnosis probability display
4. Integrate medical guidance

### Phase 4: Code Cleanup & Removal
1. **Remove MBTI-specific files and components**:
   - Delete `src/data/questions.ts` (static MBTI questions)
   - Remove `QuestionCard.tsx` (replaced by DynamicQuestionCard)
   - Remove `PersonalityAnalysis.tsx` (replaced by DiagnosisResults)
   - Remove `PersonalityChat.tsx` (replaced by MedicalChat)
   - Remove `OctagonChart.tsx` (MBTI visualization, replace with medical charts)
   - Remove `ResultChart.tsx` (MBTI result display)
   - Clean up MBTI-specific translations in locales
2. **Remove unused interfaces and types**:
   - MBTI-specific interfaces in openaiService.ts
   - Personality result types
   - Question dimension types (E-I, S-N, T-F, J-P)
3. **Clean up unused dependencies** (if any)
4. **Remove MBTI-specific assets and images**

### Phase 5: Safety & Polish
1. Add emergency warnings
2. Implement medical disclaimers
3. Test user experience
4. Optimize AI prompts for accuracy

## Code Reuse vs Removal Strategy

### Keep & Repurpose
- **`src/services/openaiService.ts`** → **Refactor to `medicalAIService.ts`**
  - Keep: OpenRouter client, retry logic, timeout handling, error management
  - Remove: MBTI-specific functions, personality analysis prompts
  - Add: Medical diagnosis functions, symptom analysis prompts
- **`src/components/DataCollectionCard.tsx`** → **Refactor to `SymptomCollectionCard.tsx`**
  - Keep: Multi-step form logic, input types (text, textarea, tags), validation
  - Remove: Age/occupation/gender collection, hobby interests
  - Add: Medical-specific input types, symptom collection
- **`src/components/TagInput.tsx`** → **Keep for medication/allergy tags**
- **`src/components/NameScreen.tsx`** → **Keep for patient identification**
- **`src/components/QuizContainer.tsx`** → **Refactor to `DiagnosisContainer.tsx`**
  - Keep: State management, localStorage persistence, step navigation
  - Remove: Static question logic, MBTI scoring
  - Add: Dynamic question handling, medical assessment flow
- **Localization system** → **Keep, update with medical terminology**
- **CSS/Tailwind styling** → **Keep, update with medical color scheme**
- **TypeScript configuration** → **Keep**

### Remove Completely
- **MBTI business logic**: scoring algorithms, personality type calculations
- **Static question system**: 30 fixed questions, dimension tracking
- **Personality visualization components**: MBTI charts, personality graphs
- **Character images**: MBTI type illustrations
- **Personality-specific translations**: MBTI type descriptions, personality terms

### Technical Advantages Leveraged
- **Existing OpenRouter integration** with retry logic and timeouts
- **Robust state management** for complex medical assessments
- **Progressive loading patterns** for AI-generated content
- **Multilingual support** for medical terminology
- **Responsive design** for mobile health consultations
- **Local storage** for symptom history persistence

## Detailed Component Mapping

### Existing → New Components
- `WelcomeScreen` → `MedicalWelcomeScreen` (medical disclaimers)
- `DataCollectionCard` → `SymptomCollectionCard` (progressive symptom input)
- **Remove `QuestionCard` (static questions) → Create `DynamicQuestionCard` (fully AI-generated adaptive questions)**
- `PersonalityAnalysis` → `DiagnosisResults` (top 3 conditions with probabilities)
- `PersonalityChat` → `MedicalChat` (follow-up medical questions)
- `OctagonChart` → `SeverityChart` (symptom severity visualization)

### New Data Flow (Key Difference: Dynamic vs Static)
**Current MBTI App:** Static 30 questions → Fixed analysis → Personality type
**AI Doctor App:**
```
Initial Symptoms → AI Analysis → Dynamic Question Generation (AI decides quantity & focus) →
Real-time Confidence Assessment → More Questions if Needed → Top 3 Diagnosis with Probabilities →
Medical Guidance → Follow-up Recommendations
```

**Key Innovation:** AI controls the entire questioning process - asks as many or as few questions as needed to reach confident diagnosis

### Dynamic AI Questioning Logic
**Unlike the current MBTI app with fixed 30 static questions, the AI doctor will:**

1. **Start with initial symptom description** from user
2. **AI analyzes symptoms** and generates differential diagnosis possibilities
3. **AI assesses confidence level** for each potential diagnosis
4. **AI generates targeted questions** to eliminate/confirm possibilities:
   - If high confidence (80%+): Ask 1-2 clarifying questions, then diagnose
   - If medium confidence (50-80%): Ask 3-5 focused questions to narrow down
   - If low confidence (<50%): Ask 5-10 comprehensive questions covering:
     - Symptom characteristics (location, severity, duration, triggers)
     - Associated symptoms
     - Medical history
     - Lifestyle factors
5. **AI continuously re-evaluates** after each answer
6. **Stops when confident** in top 3 diagnoses or reaches maximum questions

**This creates a truly adaptive medical interview process that feels like talking to an intelligent doctor.**

## AI Prompt Engineering Strategy

### Symptom Analysis Prompts
- Focus on differential diagnosis thinking
- Include epidemiological context
- Consider age, gender, demographic factors
- Ask clarifying questions like a medical professional

### Diagnosis Generation
- Provide top 3 most likely conditions
- Include probability percentages
- Explain reasoning for each diagnosis
- Flag emergency conditions

### Medical Guidance
- Evidence-based recommendations
- Clear next steps
- When to seek professional care
- Self-care safety guidelines

## Risk Mitigation
- Clear disclaimers about AI limitations
- Emergency symptom detection
- Recommend professional medical consultation
- Age-appropriate content filtering
- Data privacy considerations for health information

This plan transforms the app while preserving its excellent technical foundation and creating a safe, effective AI-powered medical assessment tool.
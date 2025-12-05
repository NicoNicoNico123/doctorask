import OpenAI from 'openai';
import i18n from '../i18n';

// Type for OpenRouter chat message with reasoning_details
type ORChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string | null;
    reasoning_details?: unknown;
};

// OpenRouter-only configuration
const getOpenRouterConfig = () => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    const baseURL = process.env.REACT_APP_OPENAI_BASE_URL;
    const model = process.env.REACT_APP_OPENAI_MODEL;

    if (!apiKey) {
        throw new Error('OpenRouter API key is required. Set REACT_APP_OPENROUTER_API_KEY environment variable.');
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

        console.log('🔧 Initialized OpenRouter client');
    }
    return openRouterClient;
};

// Simple retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

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
    fallbackValue: T,
    errorMessage: string
): Promise<T> => {
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🔄 OpenRouter attempt ${attempt}/${MAX_RETRIES}`);
            const result = await withTimeout(
                apiCall(),
                REQUEST_TIMEOUT,
                `OpenRouter request timed out on attempt ${attempt}`
            );
            console.log(`✅ OpenRouter success on attempt ${attempt}`);
            return result;
        } catch (error) {
            lastError = error;
            console.error(`❌ OpenRouter attempt ${attempt} failed:`, error);

            // Don't retry on authentication errors
            if ((error as any)?.status === 401 || (error as any)?.code === 'invalid_api_key') {
                break;
            }

            // If this is not the last attempt, wait before retrying
            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Retrying in ${RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }

    console.error(`🚨 OpenRouter failed after ${MAX_RETRIES} attempts. ${errorMessage}:`, lastError);
    return fallbackValue;
};


export interface UserContext {
    age: number;
    occupation: string;
    gender: string;
    interests: string;
}

export interface Question {
    id: number;
    text: string;
    dimension: 'E-I' | 'S-N' | 'T-F' | 'J-P';
    optionA: { text: string; value: string };
    optionB: { text: string; value: string };
}

export interface BaseQuestion {
    id: number;
    dimension: 'E-I' | 'S-N' | 'T-F' | 'J-P';
    text: string;
    options: { text: string; value: string }[];
}

// Get current language for system prompt
export const getLanguageForPrompt = (): string => {
    const language = localStorage.getItem('mbti_language') || 'en';
    return language;
};

// Cache language at generation time to prevent mid-quiz changes
export const getLanguageWithCache = (cachedLanguage?: string): string => {
    // Use cached language if provided (from generation time), otherwise get current
    return cachedLanguage || getLanguageForPrompt();
};

export const generateQuestions = async (userContext: UserContext, baseQuestions: any[]): Promise<Question[]> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 generateQuestions called with OpenRouter:', {
        userContext,
        model,
        baseQuestionCount: baseQuestions.length,
        language: language
    });

    // Get system prompt from i18n
    const SYSTEM_PROMPT = i18n.t('generateQuestion.systemPrompt', { lng: language, ns: 'prompts' });

    const prompt = `
    User Scenario:
    - Age: ${userContext.age}
    - Occupation: ${userContext.occupation}
    - Gender: ${userContext.gender}
    - Interests: ${userContext.interests}

    Task:
    Rewrite the following MBTI questions to be highly relevant to the user's specific scenario (occupation, interests, age).
    Keep the core psychological dimension of the question exactly the same, but change the scenario to fit the user's life.
    Output questions in ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}.
    Make scenarios relatable to their specific situation while maintaining core psychological dimensions.

    Questions to rewrite:
    ${JSON.stringify(baseQuestions)}

    Return a JSON object with a key "questions" containing an array of objects.
    Each object must have: id (same as input), text (rewritten question), dimension, optionA (text, value), optionB (text, value).
    `;

    // Fallback function that preserves original questions
    const getFallbackQuestions = (): Question[] => {
        console.log('🔄 Using fallback: returning original questions');
        return baseQuestions.map(q => ({
            id: q.id,
            text: q.text,
            dimension: q.dimension,
            optionA: { text: q.options[0].text, value: q.options[0].value },
            optionB: { text: q.options[1].text, value: q.options[1].value }
        }));
    };

    // Check if model supports reasoning
    const supportsReasoning = model?.includes(':free') || false;

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

            // Add reasoning for supported models
            if (supportsReasoning) {
                params.reasoning = { enabled: true };
            }

            const completion = await client.chat.completions.create(params);
            console.log('🔍 OpenRouter API response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            const result = JSON.parse(completion.choices[0].message.content);
            return result.questions || [];
        },
        getFallbackQuestions(),
        "Failed to generate questions after retries - showing original questions"
    );
};

// Generate a single personalized question
export const generateSingleQuestion = async (userContext: UserContext, baseQuestion: BaseQuestion): Promise<Question> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 generateSingleQuestion called with OpenRouter:', {
        userContext,
        baseQuestionId: baseQuestion.id,
        model,
        language: language
    });

    // Get system prompt from i18n
    const SYSTEM_PROMPT = i18n.t('generateQuestion.systemPrompt', { lng: language, ns: 'prompts' });

    const prompt = `
        You are an expert Scenario Writer who specializes in "Slice of Life" storytelling.
        Your goal is to take a generic personality question and transform it into a **specific, relatable daily moment**.

        ### USER PROFILE
        - **Age:** ${userContext.age}
        - **Occupation:** ${userContext.occupation}
        - **Gender:** ${userContext.gender}
        - **Interests:** ${userContext.interests}

        ### TARGET LANGUAGE
        ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文) - Hong Kong/Taiwan style. Use natural colloquialisms.' : 'English - Natural, conversational.'}

        ### INPUT QUESTION
        ${JSON.stringify(baseQuestion)}

        ### INSTRUCTIONS

        1. **Analyze the Core Trait:** Understand exactly what psychological metric the question is measuring.

        2. **Select the "Best Fit" Attribute (CRITICAL):**
        - **Do NOT force all user details into one question.** This creates weird, unnatural scenarios.
        - **Pick ONE path:**
            - *Path A (Work Mode):* Use their **Occupation** if the question is about deadlines, stress, logic, or leadership.
            - *Path B (Leisure Mode):* Use their **Interests** if the question is about social energy, creativity, or relaxation.
            - *Path C (Life Stage):* Use their **Age** if the question is about stability, future planning, or family.
        - **Rule:** If a profile detail makes the scene confusing, **discard it**. The scenario must make logical sense above all else.

        3. **Create the Scenario:** - Write a short, specific moment from their daily life.
        - *Example:* Instead of "Do you like art?", say "You are standing in the gallery looking at a complex abstract painting..."

        4. **Rewrite the Options (Logical Consistency):**
        - The options must be the **natural, immediate reactions** to the specific scenario you created.
        - They must logically follow the story.
        - *Check:* Does Option A make sense for a person in this specific situation?

        ### OUTPUT FORMAT
        Return ONLY a valid JSON object:
        {
            "id": ${baseQuestion.id},
            "text": "The specific daily life scenario...",
            "dimension": "${baseQuestion.dimension}",
            "optionA": { 
                "text": "Specific reaction A", 
                "value": "${baseQuestion.options[0].value}" 
            },
            "optionB": { 
                "text": "Specific reaction B", 
                "value": "${baseQuestion.options[1].value}" 
            }
        }
        `;

    // Fallback function that preserves the original question
    const getFallbackQuestion = (): Question => {
        console.log('🔄 Using fallback: returning original question for ID', baseQuestion.id);
        return {
            id: baseQuestion.id,
            text: baseQuestion.text,
            dimension: baseQuestion.dimension,
            optionA: { text: baseQuestion.options[0].text, value: baseQuestion.options[0].value },
            optionB: { text: baseQuestion.options[1].text, value: baseQuestion.options[1].value }
        };
    };

    // Check if model supports reasoning
    const supportsReasoning = model?.includes(':free') || false;

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

            // Add reasoning for supported models
            if (supportsReasoning) {
                params.reasoning = { enabled: true };
            }

            const completion = await client.chat.completions.create(params);
            console.log('🔍 OpenRouter API response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            return JSON.parse(completion.choices[0].message.content);
        },
        getFallbackQuestion(),
        `Failed to generate question ${baseQuestion.id} after retries - showing original question`
    );
};

// Get personality analysis based on MBTI type
export const getPersonalityAnalysis = async (
    personalityType: string,
    scores: { [key: string]: number },
    userContext: UserContext
): Promise<any> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 getPersonalityAnalysis called with OpenRouter:', {
        personalityType,
        scores,
        model,
        language: language
    });

    // Get system prompt from i18n
    const SYSTEM_PROMPT = i18n.t('getPersonalityAnalysis.systemPrompt', { lng: language, ns: 'prompts' });

    const prompt = `
        ### ROLE
        You are an expert Senior Personality Analyst and Career Coach with deep specialization in the Myers-Briggs Type Indicator (MBTI).

        ### INPUT DATA
        - **MBTI Type**: ${personalityType}
        - **Trait Breakdown (Scores)**: ${JSON.stringify(scores)}
        - **Demographics**: ${userContext.age} years old, ${userContext.gender}
        - **Current Occupation**: ${userContext.occupation}
        - **Interests/Hobbies**: ${userContext.interests}
        - **TARGET LANGUAGE**: ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}

        ### INSTRUCTIONS
        Analyze the provided data to generate a deeply personalized profile. Do not generate generic descriptions found in textbooks. Instead, synthesize the specific context:

        1. **Analyze the Scores**: Look at the specific percentage scores. If a score is near 50%, highlight their flexibility in that trait. If a score is high, highlight it as a dominant feature.
        2. **Contextualize with Career**: Compare their MBTI natural tendencies with their current occupation (${userContext.occupation}). Are they in alignment? If not, offer advice on how to bridge the gap.
        3. **Integrate Interests**: Use their interests (${userContext.interests}) to explain how they express their personality type in their free time.
        4. **Tone**: Be encouraging, psychological, insightful, and positive. Avoid medical jargon; use accessible language.

        ### OUTPUT FORMAT
        You must return **ONLY** valid JSON.
        - Do not use markdown formatting (like \`\`\`json).
        - Do not add intro text (like "Here is the JSON") or outro text.
        Structure the JSON exactly as follows:
        {
            "overview": "A personalized summary integrating their type, specific trait strength, and current life stage.",
            "strengths": ["An actionable strength", "An actionable strength", "An actionable strength"],
            "growthAreas": ["A specific area for improvement", "A specific area for improvement", "A specific area for improvement"],
            "careerSuggestions": ["Career path 1 (explain why)", "Career path 2 (explain why)", "Career path 3 (explain why)"],
            "communicationStyle": "How they communicate best with others and how others should communicate with them.",
            "developmentTips": ["Specific, actionable advice 1", "Specific, actionable advice 2", "Specific, actionable advice 3"]
        }
        `;

    // Fallback analysis function
    const getFallbackAnalysis = () => {
        console.log('🔄 Using fallback: returning basic personality analysis');
        const languageKey = language;
        const fallbackData: { [key: string]: any } = {
            'en': {
                overview: `You are an ${personalityType} personality type.`,
                strengths: ["Unique perspective", "Adaptability", "Personal growth potential"],
                growthAreas: ["Self-awareness", "Communication skills", "Work-life balance"],
                careerSuggestions: ["Roles that match your interests", "Positions utilizing your strengths"],
                communicationStyle: "Your communication style is unique to your personality type.",
                developmentTips: ["Continue self-discovery", "Develop your strengths", "Maintain balance"]
            },
            'zh-TW': {
                overview: `你是 ${personalityType} 人格類型。`,
                strengths: ["獨特的觀點", "適應性", "個人成長潛力"],
                growthAreas: ["自我意識", "溝通技巧", "工作生活平衡"],
                careerSuggestions: ["符合你興趣的角色", "利用你優勢的職位"],
                communicationStyle: "你的溝通風格是你人格類型獨有的。",
                developmentTips: ["繼續自我探索", "發展你的優勢", "保持平衡"]
            }
        };
        return fallbackData[languageKey] || fallbackData['en'];
    };

    // Check if model supports reasoning
    const supportsReasoning = model?.includes(':free') || false;

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

            // Add reasoning for supported models
            if (supportsReasoning) {
                params.reasoning = { enabled: true };
            }

            const completion = await client.chat.completions.create(params);
            console.log('🔍 OpenRouter API response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            return JSON.parse(completion.choices[0].message.content);
        },
        getFallbackAnalysis(),
        `Failed to generate personality analysis for ${personalityType} after retries`
    );
};

// Chat with personality expert
export const askPersonalityQuestion = async (
    question: string,
    personalityType: string,
    scores: { [key: string]: number },
    userContext: UserContext,
    chatHistory: any[] = []
): Promise<{ content: string; reasoning_details?: unknown }> => {
    const language = getLanguageForPrompt();
    const { model } = getOpenRouterConfig();
    const client = getOpenRouterClient();

    console.log('🔍 askPersonalityQuestion called with OpenRouter:', {
        question: question.substring(0, 50) + '...',
        personalityType,
        model,
        language: language
    });

    // Get system prompt from i18n with interpolation
    const SYSTEM_PROMPT = i18n.t('askPersonalityQuestion.systemPrompt', { 
        lng: language, 
        ns: 'prompts',
        occupation: userContext.occupation,
        interests: userContext.interests,
        userContext: JSON.stringify(userContext)
    });

    // Build messages array preserving reasoning_details from chat history
    const messages: ORChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT }
    ];

    // Reconstruct conversation history with preserved reasoning_details
    // chatHistory format: [{ type: 'user'|'assistant', message: string, reasoning_details?: unknown }]
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
                reasoning_details: msg.reasoning_details // Preserve reasoning_details from previous responses
            });
        }
    }

    // Add current user question
    const prompt = `
        ### User Context (Internal Reference Only)
        *CRITICAL: This data is for your understanding only. Do NOT explicitly mention these details unless they are directly relevant to solving the user's specific problem.*

        - **MBTI Type**: ${personalityType}
        - **Cognitive Function Scores**: ${JSON.stringify(scores)}
        - **Demographics**: ${userContext.age} years old, ${userContext.gender}
        - **Occupation**: ${userContext.occupation}
        - **Interests**: ${userContext.interests}

        ### Current Request
        User's Question: "${question}"

        ### Response Instructions
        1. **Natural Validation**: Validate their feeling immediately and casually.
        2. **Subtle Insight**: Explain *why* they feel this way based on their personality functions, but keep the theory light.
        3. **Action**: Give 1-2 quick, actionable steps.

        Respond in ${language === 'zh-TW' ? 'Hong Kong Style Cantonese (Spoken style, code-mixing, casual)' : 'English (Casual, friendly)'}.
        `;

    messages.push({ role: 'user', content: prompt });

    // Fallback response function
    const getFallbackResponse = (): { content: string; reasoning_details?: unknown } => {
        console.log('🔄 Using fallback: returning generic personality advice');
        const fallbackResponses: { [key: string]: string } = {
            'en': `I apologize, but I'm having trouble connecting right now. Based on your ${personalityType} personality type, I encourage you to embrace your natural strengths and consider how they apply to your situation. Would you like to try asking your question again?`,
            'zh-TW': `很抱歉，我現在連線有問題。根據您的 ${personalityType} 人格類型，我鼓勵您擁抱自己的天生優勢，並思考如何將它們應用到您的情況中。您想再試一次問您的問題嗎？`
        };
        return {
            content: fallbackResponses[language] || fallbackResponses['en']
        };
    };

    // Check if model supports reasoning
    const supportsReasoning = model?.includes(':free') || false;

    return withRetry(
        async () => {
            const params: any = {
                model,
                messages,
            };

            // Add reasoning for supported models
            if (supportsReasoning) {
                params.reasoning = { enabled: true };
            }

            const completion = await client.chat.completions.create(params);
            console.log('🔍 OpenRouter API response:', completion);

            if (!completion.choices?.[0]?.message?.content) {
                throw new Error("Invalid response from OpenRouter: no message content");
            }

            // Extract the assistant message with reasoning_details (following sample code pattern)
            const response = completion.choices[0].message as ORChatMessage;

            // Return both content and reasoning_details so caller can preserve reasoning state
            return {
                content: response.content || '',
                reasoning_details: response.reasoning_details
            };
        },
        getFallbackResponse(),
        `Failed to get personality chat response after retries`
    );
};
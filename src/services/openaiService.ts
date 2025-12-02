import OpenAI from 'openai';

// Initialize OpenAI client
// Note: In a production environment, you should use a backend proxy to hide API key.
// For this prototype, we'll expect the key to be in REACT_APP_OPENAI_API_KEY
const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    baseURL: process.env.REACT_APP_OPENAI_BASE_URL, // Optional: for custom endpoints
    dangerouslyAllowBrowser: true // Required for client-side usage
});

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

// Utility function for exponential backoff with jitter
const getRetryDelay = (attemptNumber: number): number => {
    const baseDelay = INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
    return Math.min(baseDelay + jitter, MAX_RETRY_DELAY);
};

// Utility function to check if error is retryable
const isRetryableError = (error: any): boolean => {
    if (error?.code === 'insufficient_quota' || error?.code === 'invalid_api_key') {
        return false; // Don't retry authentication/quota errors
    }

    if (error?.status === 429) {
        return true; // Rate limiting - retry with backoff
    }

    if (error?.status >= 500 || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
        return true; // Server errors, network timeouts - retry
    }

    // Generic fetch errors or network issues
    if (error?.name === 'FetchError' || error?.message?.includes('fetch')) {
        return true;
    }

    return false;
};

// Generic retry wrapper for OpenAI API calls
const withRetry = async <T>(
    apiCall: () => Promise<T>,
    fallbackValue: T,
    errorMessage: string
): Promise<T> => {
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🔄 API attempt ${attempt}/${MAX_RETRIES}`);
            return await apiCall();
        } catch (error) {
            lastError = error;
            console.error(`❌ Attempt ${attempt} failed:`, error);

            if (attempt === MAX_RETRIES || !isRetryableError(error)) {
                console.error(`💥 Giving up after ${attempt} attempts or non-retryable error`);
                break;
            }

            const delay = getRetryDelay(attempt);
            console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    console.error(`🚨 ${errorMessage}:`, lastError);
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

    console.log('🔍 generateQuestions called with:', {
        userContext,
        hasApiKey: !!process.env.REACT_APP_OPENAI_API_KEY,
        baseQuestionCount: baseQuestions.length,
        language: language
    });

    // Only process the questions passed in baseQuestions (which should be a batch)

    // Language-specific system prompts
    const languageSystemPrompts: { [key: string]: string } = {
        'en': `
            You are an expert MBTI personality psychologist. Your task is to rewrite standard MBTI questions to be highly personalized based on the user's background.
            The user will provide their Age, Occupation, Gender, and Interests.
            Output questions in English.
            Make scenarios relatable to their specific situation while maintaining core psychological dimensions.
            Keep language conversational and encouraging.
        `,
        'zh-TW': `
            你是專業的MBTI人格心理學家。根據用戶的背景，高度個人化標準MBTI問題。
            用戶會提供年齡、職業、性別和興趣。
            輸出繁體中文問題。
            與情境與他們的具體情況相關，同時維持核心心理維度不變。
            語氣要友善、鼓勵。
        `
    };

    const SYSTEM_PROMPT = languageSystemPrompts[language] || languageSystemPrompts['en'];

    const prompt = `
    User Scenario:
    - Age: ${userContext.age}
    - Occupation: ${userContext.occupation}
    - Gender: ${userContext.gender}
    - Interests: ${userContext.interests}

    Task:
    Rewrite the following MBTI questions to be highly relevant to the user's specific scenario (occupation, interests, age).
    Keep the core psychological dimension of the question exactly the same, but change the scenario to fit the user's life.
    The user will provide their Age, Occupation, Gender, and Interests.
    Output questions in ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}.
    Make scenarios relatable to their specific situation while maintaining core psychological dimensions.
    Keep language ${language === 'zh-TW' ? 'conversational and culturally appropriate' : 'conversational and encouraging'}.

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
            text: q.text, // Keep original question text
            dimension: q.dimension,
            optionA: { text: q.options[0].text, value: q.options[0].value },
            optionB: { text: q.options[1].text, value: q.options[1].value }
        }));
    };

    const apiCall = async (): Promise<Question[]> => {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: process.env.REACT_APP_OPENAI_MODEL || "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("No content received from OpenAI");
        }

        const result = JSON.parse(content);
        return result.questions || [];
    };

    return withRetry(
        apiCall,
        getFallbackQuestions(),
        "Failed to generate questions after retries - showing original questions"
    );
};

// Generate a single personalized question
export const generateSingleQuestion = async (userContext: UserContext, baseQuestion: BaseQuestion): Promise<Question> => {
    const language = getLanguageForPrompt();

    console.log('🔍 generateSingleQuestion called with:', {
        userContext,
        baseQuestionId: baseQuestion.id,
        language: language
    });

    // Language-specific system prompts
    const languageSystemPrompts: { [key: string]: string } = {
        'en': `
            You are an expert MBTI personality psychologist. Your task is to rewrite a single standard MBTI question to be highly personalized based on the user's background.
            The user will provide their Age, Occupation, Gender, and Interests.
            Output questions in English.
            Make scenarios relatable to their specific situation while maintaining core psychological dimensions.
            Keep language conversational and encouraging.
        `,
        'zh-TW': `
            你是專業的MBTI人格心理學家。根據用戶的背景，高度個人化單一標準MBTI問題。
            用戶會提供年齡、職業、性別和興趣。
            輸出繁體中文問題。
            與情境與他們的具體情況相關，同時維持核心心理維度不變。
            語氣要友善、鼓勵。
        `
    };

    const SYSTEM_PROMPT = languageSystemPrompts[language] || languageSystemPrompts['en'];

    const prompt = `
    User Scenario:
    - Age: ${userContext.age}
    - Occupation: ${userContext.occupation}
    - Gender: ${userContext.gender}
    - Interests: ${userContext.interests}

    Task:
    Rewrite the following MBTI question to be highly relevant to the user's specific scenario (occupation, interests, age).
    Keep the core psychological dimension of the question exactly the same, but change the scenario to fit the user's life.
    Output questions in ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}.
    Make scenarios relatable to their specific situation while maintaining core psychological dimensions.
    Keep language ${language === 'zh-TW' ? 'conversational and culturally appropriate' : 'conversational and encouraging'}.

    Question to rewrite:
    ${JSON.stringify(baseQuestion)}

    Return a JSON object with the following structure:
    {
        "id": ${baseQuestion.id},
        "text": "rewritten question here",
        "dimension": "${baseQuestion.dimension}",
        "optionA": { "text": "option A text", "value": "${baseQuestion.options[0].value}" },
        "optionB": { "text": "option B text", "value": "${baseQuestion.options[1].value}" }
    }
    `;

    // Fallback function that preserves the original question
    const getFallbackQuestion = (): Question => {
        console.log('🔄 Using fallback: returning original question for ID', baseQuestion.id);
        return {
            id: baseQuestion.id,
            text: baseQuestion.text, // Keep original question text
            dimension: baseQuestion.dimension,
            optionA: { text: baseQuestion.options[0].text, value: baseQuestion.options[0].value },
            optionB: { text: baseQuestion.options[1].text, value: baseQuestion.options[1].value }
        };
    };

    const apiCall = async (): Promise<Question> => {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: process.env.REACT_APP_OPENAI_MODEL || "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("No content received from OpenAI");
        }

        const result = JSON.parse(content);
        return result;
    };

    return withRetry(
        apiCall,
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

    console.log('🔍 getPersonalityAnalysis called with:', {
        personalityType,
        scores,
        language: language
    });

    // Language-specific system prompts
    const languageSystemPrompts: { [key: string]: string } = {
        'en': `
            You are an expert MBTI personality psychologist providing detailed personality analysis.
            Provide insights in English based on the user's MBTI type, scores, and background.
            Be encouraging, positive, and provide practical advice.
        `,
        'zh-TW': `
            你是專業的MBTI人格心理學家，提供詳細的人格分析。
            根據用戶的MBTI類型、分數和背景，用繁體中文提供見解。
            要鼓勵、正面，並提供實用建議。
        `
    };

    const SYSTEM_PROMPT = languageSystemPrompts[language] || languageSystemPrompts['en'];

    const prompt = `
    User Information:
    - MBTI Type: ${personalityType}
    - Scores: ${JSON.stringify(scores)}
    - Age: ${userContext.age}
    - Occupation: ${userContext.occupation}
    - Gender: ${userContext.gender}
    - Interests: ${userContext.interests}

    Task:
    Provide a comprehensive personality analysis for this user.
    Include:
    1. Overview of their personality type
    2. Strengths and potential areas for growth
    3. Career suggestions based on their type and interests
    4. Relationship and communication style
    5. Personal development recommendations

    Output in ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}.
    Be encouraging and positive.

    Return as JSON with the following structure:
    {
        "overview": "analysis overview",
        "strengths": ["strength1", "strength2", "strength3"],
        "growthAreas": ["area1", "area2", "area3"],
        "careerSuggestions": ["career1", "career2", "career3"],
        "communicationStyle": "communication style description",
        "developmentTips": ["tip1", "tip2", "tip3"]
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

    const apiCall = async () => {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: process.env.REACT_APP_OPENAI_MODEL || "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("No content received from OpenAI");
        }

        return JSON.parse(content);
    };

    return withRetry(
        apiCall,
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
): Promise<string> => {
    const language = getLanguageForPrompt();

    console.log('🔍 askPersonalityQuestion called with:', {
        question: question.substring(0, 50) + '...',
        personalityType,
        language: language
    });

    // Language-specific system prompts
    const languageSystemPrompts: { [key: string]: string } = {
        'en': `
            You are an expert MBTI personality psychologist and counselor.
            You are having a conversation with someone who has the ${personalityType} personality type.
            Provide helpful, encouraging advice in English.
            Be conversational, empathetic, and insightful.
            Base your responses on MBTI theory and the user's specific personality type.
        `,
        'zh-TW': `
            你是專業的MBTI人格心理學家和諮詢師。
            你正在與一位${personalityType}人格類型的人交談。
            用繁體中文提供有益、鼓勵的建議。
            要友善、有同理心和洞察力。
            根據MBTI理論和用戶的具體人格類型來回答。
        `
    };

    const SYSTEM_PROMPT = languageSystemPrompts[language] || languageSystemPrompts['en'];

    // Format chat history for context
    const chatContext = chatHistory.map(msg =>
        `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.message}`
    ).join('\n');

    const prompt = `
    User Context:
    - MBTI Type: ${personalityType}
    - Scores: ${JSON.stringify(scores)}
    - Age: ${userContext.age}
    - Occupation: ${userContext.occupation}
    - Gender: ${userContext.gender}
    - Interests: ${userContext.interests}

    Recent Conversation:
    ${chatContext}

    User's Question: ${question}

    Please provide a helpful, insightful response based on their personality type and background.
    Be conversational and empathetic.
    Respond in ${language === 'zh-TW' ? 'Traditional Chinese (繁體中文)' : 'English'}.
    `;

    // Fallback response function
    const getFallbackResponse = (): string => {
        console.log('🔄 Using fallback: returning generic personality advice');
        const fallbackResponses: { [key: string]: string } = {
            'en': `I apologize, but I'm having trouble connecting right now. Based on your ${personalityType} personality type, I encourage you to embrace your natural strengths and consider how they apply to your situation. Would you like to try asking your question again?`,
            'zh-TW': `很抱歉，我現在連線有問題。根據您的 ${personalityType} 人格類型，我鼓勵您擁抱自己的天生優勢，並思考如何將它們應用到您的情況中。您想再試一次問您的問題嗎？`
        };
        return fallbackResponses[language] || fallbackResponses['en'];
    };

    const apiCall = async (): Promise<string> => {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: process.env.REACT_APP_OPENAI_MODEL || "gpt-3.5-turbo",
        });

        const response = completion.choices[0].message.content;
        if (!response) {
            throw new Error("No content received from OpenAI");
        }

        return response;
    };

    return withRetry(
        apiCall,
        getFallbackResponse(),
        `Failed to get personality chat response after retries`
    );
};
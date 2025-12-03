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

        console.log('🔍 OpenAI API response (generateMultipleQuestions):', completion);

        // Check if completion has choices array and it's not empty
        if (!completion.choices || !Array.isArray(completion.choices) || completion.choices.length === 0) {
            throw new Error(`Invalid response from OpenAI: no choices available. Response: ${JSON.stringify(completion)}`);
        }

        const firstChoice = completion.choices[0];
        if (!firstChoice.message || !firstChoice.message.content) {
            throw new Error(`Invalid response from OpenAI: no message content. Response: ${JSON.stringify(completion)}`);
        }

        const content = firstChoice.message.content;
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

        console.log('🔍 OpenAI API response:', completion);

        // Check if completion has choices array and it's not empty
        if (!completion.choices || !Array.isArray(completion.choices) || completion.choices.length === 0) {
            throw new Error(`Invalid response from OpenAI: no choices available. Response: ${JSON.stringify(completion)}`);
        }

        const firstChoice = completion.choices[0];
        if (!firstChoice.message || !firstChoice.message.content) {
            throw new Error(`Invalid response from OpenAI: no message content. Response: ${JSON.stringify(completion)}`);
        }

        const content = firstChoice.message.content;
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

    const apiCall = async () => {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: process.env.REACT_APP_OPENAI_MODEL || "gpt-3.5-turbo",
            response_format: { type: "json_object" },
        });

        console.log('🔍 OpenAI API response (getPersonalityAnalysis):', completion);

        // Check if completion has choices array and it's not empty
        if (!completion.choices || !Array.isArray(completion.choices) || completion.choices.length === 0) {
            throw new Error(`Invalid response from OpenAI: no choices available. Response: ${JSON.stringify(completion)}`);
        }

        const firstChoice = completion.choices[0];
        if (!firstChoice.message || !firstChoice.message.content) {
            throw new Error(`Invalid response from OpenAI: no message content. Response: ${JSON.stringify(completion)}`);
        }

        const content = firstChoice.message.content;
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
    // 1. Enhanced System Prompts (The "Soul" of the AI)
    const languageSystemPrompts: { [key: string]: string } = {
    'en': `
        ### ROLE
            You are a close, trusted friend giving advice over text. You happen to know MBTI theory deeply, but you don't treat it like a textbook. You treat it like a tool to help your friend understand themselves better.

            ### THE "HUMAN" RULES (Strict Adherence)
            1.  **Kill the Structure:** ABSOLUTELY NO bullet points, no numbered lists, no bold headers (like **Conclusion**). Real people don't format texts like essays.
            2.  **No "AI" Fluff:** Never say "Here is some advice," "I hope this helps," "Let's dive in," or "It's important to remember." Just say what you mean.
            3.  **Reaction First:** Start with a reaction to what the user said (e.g., "Oof, that sounds rough," or "Haha, totally get that").
            4.  **Imperfect Grammar is Okay:** You can start sentences with "And" or "But." You can use sentence fragments. It makes you sound real.
            5.  **Subtle Context:** Do not explicitly state the user's data.
                * BAD: "Since you are an Accountant..."
                * GOOD: "It’s kinda like when you're balancing the books at work—you need that same precision here."

            ### CONTEXT DATA
            User Occupation: ${userContext.occupation}
            User Interests: ${userContext.interests}

            ### TONE EXAMPLES
            * **Too AI:** "To be more outgoing, you should try joining a club. This aligns with your interest in tennis."
            * **Your Style:** "Honestly? You just need to throw yourself out there. Maybe use that tennis group you mentioned? It’s way easier to talk to people when you're holding a racket anyway."

            ### GOAL
            Answer the user's question directly, warmly, and wisely. Keep it under 3-4 sentences unless they ask for a deep dive.
                    `,
        'zh-TW': `
            ### 角色設定 (ROLE)
            你係一個識咗好耐嘅 Friend，對 MBTI 好有研究，但係講嘢好 Chill、好直白。你唔會當自己係專家說教，而係用朋友角度去「點醒」對方。

            ### 「港式」風格指引 (HK STYLE RULES)
            1.  **廣東話中文**：

            2.  **語氣助詞不能少**：
                * 句尾要用助詞黎帶出語氣：啦、囉、喎（驚訝/反諷）、㗎（理所當然）、咩（反問）、啫（輕描淡寫）。
                * *例：* 「咁樣諗就錯晒啦。」 vs 「你估佢想㗎咩？」

            3.  **拒絕機械人格式 (No Robot Format)**：
                * **嚴禁**條列式 (Bullet points)。絕對唔好分 1, 2, 3 點。
                * 當作你喺 WhatsApp / Signal 打字，句子要短，斷句多用空格或逗號。
                * **唔好講客套說話**：唔好講「希望幫到你」、「根據分析」。直接講重點 (Straight to the point)。

            4.  **共鳴感 (Vibe Check)**：
                * 引用背景資料 (${userContext}) 時要夠 Local，夠貼地。

                    ### 用戶背景資料 (CONTEXT DATA)
                    - 職業：${userContext.occupation}
                    - 興趣：${userContext.interests}

                    ### 語氣範例 (TONE EXAMPLES)
                    * **❌ 太書面/太假 (Too Formal/Fake)**：
                        「作為一個內向的人，我建議你嘗試參加網球班。這可以發揮你的運動興趣。」
                    * **✅ 港式風格 (Your Style)**：
                        「你咁諗就多餘啦。既然你平時都鐘意打 Tennis，不如直接 join 個 court 順便識人仲好啦。你只要揸住塊拍，個 focus 喺個波度，自然無咁尷尬㗎嘛，係咪先？」
                    * **✅ 另一個範例 (Another Example)**：
                        「其實你個 Case 唔係 Logic 問題，係個 Feel 唔對路。就好似你返工趕 Deadline 咁，有時唔係要完美，係要交到貨先算。你依家太 Overthink 啦，放鬆少少當幫忙自己囉。」

                    ### 目標 (GOAL)
                    用最地道、最「巴打/絲打」嘅語氣直接答佢。唔好長篇大論，一句起兩句止 (Short and snappy)。
                    `
    };

    const SYSTEM_PROMPT = languageSystemPrompts[language] || languageSystemPrompts['en'];

    // Format chat history
    const chatContext = chatHistory.map(msg =>
        `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.message}`
    ).join('\n');

    // 2. Enhanced User Prompt (The "Data" injection)
    const prompt = `
        ### User Context (Internal Reference Only)
        *CRITICAL: This data is for your understanding only. Do NOT explicitly mention these details unless they are directly relevant to solving the user's specific problem.*

        - **MBTI Type**: ${personalityType}
        - **Cognitive Function Scores**: ${JSON.stringify(scores)}
        *(Use these silently to gauge if they are looping or stressed)*
        - **Demographics**: ${userContext.age} years old, ${userContext.gender}
        - **Occupation**: ${userContext.occupation}
        *(Reference logic: Does their job explain their stress? If yes, use it. If no, ignore it.)*
        - **Interests**: ${userContext.interests}
        *(Reference logic: Only use as a metaphor if it makes the explanation clearer or funnier. Do not force it.)*

        ### Context
        Recent Conversation:
        ${chatContext}

        ### Current Request
        User's Question: "${question}"

        ### Response Instructions
        1. **Natural Validation**: Validate their feeling immediately and casually. (Stop saying "As an INFJ...". Just say "That sounds exhausting" or "I totally get that vibe.")
        2. **Subtle Insight**: Explain *why* they feel this way based on their personality functions, but keep the theory light.
        3. **Action**: Give 1-2 quick, actionable steps.
        * *Note:* Only reference their job/age/interests if it helps the advice land better. Otherwise, just give general human advice.

        Respond in ${language === 'zh-TW' ? 'Hong Kong Style Cantonese (Spoken style, code-mixing, casual)' : 'English (Casual, friendly)'}.
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

        console.log('🔍 OpenAI API response (generateChatResponse):', completion);

        // Check if completion has choices array and it's not empty
        if (!completion.choices || !Array.isArray(completion.choices) || completion.choices.length === 0) {
            throw new Error(`Invalid response from OpenAI: no choices available. Response: ${JSON.stringify(completion)}`);
        }

        const firstChoice = completion.choices[0];
        if (!firstChoice.message || !firstChoice.message.content) {
            throw new Error(`Invalid response from OpenAI: no message content. Response: ${JSON.stringify(completion)}`);
        }

        const response = firstChoice.message.content;
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
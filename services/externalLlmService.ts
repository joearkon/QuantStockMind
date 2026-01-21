
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot } from "../types";

// Configuration for external providers
const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    baseUrl: "/api/hunyuan", 
    model: "hunyuan-pro", 
    visionModel: "hunyuan-vision",
    name: "Tencent Hunyuan"
  }
};

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAICompletionResponse {
  choices: {
    message: {
      content: string;
    };
    finish_reason?: string;
  }[];
  error?: {
    message: string;
    type: string;
    code: string;
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust JSON Parser 3.0
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");

  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);

  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    // Basic repair
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); 
    clean = clean.replace(/[\u201C\u201D\u2018\u2019]/g, '"'); 
    clean = clean.replace(/}\s*{/g, '}, {').replace(/]\s*\[/g, '], [');
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    clean = clean.replace(/：/g, ':').replace(/，/g, ',');

    try {
      return JSON.parse(clean);
    } catch (finalError) {
      console.error("Robust parse failed completely.", finalError);
      throw new Error(`数据解析失败: 混元模型返回格式异常。`);
    }
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, baseDelay = 1000): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) await wait(baseDelay * Math.pow(2, i));
    }
  }
  throw lastError;
}

/**
 * Generic fetcher for OpenAI-compatible APIs (Hunyuan)
 */
export const fetchExternalAI = async (
  provider: ModelProvider,
  apiKey: string,
  prompt: string,
  isDashboard: boolean,
  period?: 'day' | 'month',
  market: MarketType = MarketType.CN,
  forceJson: boolean = false
): Promise<AnalysisResult> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Configuration for ${provider} not found.`);

  const dateStr = new Date().toLocaleDateString('zh-CN');

  const jsonInstruction = `
    [CRITICAL: OUTPUT FORMAT]
    Return ONLY valid JSON. No markdown, no extra text.
    Ensure ALL keys are in double quotes.
  `;

  let systemContent = `You are a Senior Quantitative Financial Analyst. Output strictly valid JSON. Today is ${dateStr}. Market: ${market}.`;
  let userContent = prompt;

  if (isDashboard || forceJson) {
    userContent = `${prompt}\n\n${jsonInstruction}`;
  }

  const messages: OpenAIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 4000,
      })
    });

    if (!response.ok) throw new Error(`模型调用失败 (${response.status})`);

    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";

    let structuredData: any;
    if (isDashboard || forceJson) {
      structuredData = robustJsonParse(content);
    }

    return {
      content,
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: !!structuredData,
      structuredData: isDashboard ? (structuredData as MarketDashboardData) : undefined,
      stockSynergyData: (!isDashboard && forceJson) ? structuredData : undefined,
      market: market
    };
  } catch (error: any) {
    console.error("External LLM Error:", error);
    throw error;
  }
};

export const analyzeImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Configuration for ${provider} not found.`);

  const prompt = `Analyze this brokerage screenshot. Output VALID JSON ONLY. Template: { "totalAssets": 0, "positionRatio": 0, "date": "YYYY-MM-DD", "holdings": [{ "name": "...", "code": "...", "volume": 0, "costPrice": 0, "currentPrice": 0, "profit": 0, "profitRate": "0%", "marketValue": 0 }] }`;

  const messages: OpenAIChatMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    }
  ];

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.visionModel || config.model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) throw new Error(`Vision Model Error: ${response.status}`);
    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";
    return robustJsonParse(content);
  } catch (error: any) {
    throw error;
  }
};

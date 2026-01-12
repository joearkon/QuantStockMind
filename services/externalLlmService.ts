
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
    // Attempt basic fixes
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
    clean = clean.replace(/(^|[^:])\/\/.*$/gm, '$1'); 
    clean = clean.replace(/[\u201C\u201D\u2018\u2019]/g, '"'); 
    clean = clean.replace(/}\s*{/g, '}, {');
    clean = clean.replace(/,\s*}/g, '}');
    clean = clean.replace(/,\s*]/g, ']');
    clean = clean.replace(/：/g, ':').replace(/，/g, ',');

    try {
      return JSON.parse(clean);
    } catch (finalError) {
      console.error("Robust parse failed completely.", finalError);
      throw new Error(`数据解析失败: 混元模型返回的数据结构不完整。`);
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

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  // 根据不同市场提供精准的指数示例，防止模型乱写
  let indicesExample = "";
  if (market === MarketType.CN) {
    indicesExample = `[
      {"name": "上证指数", "value": "3200.00", "percent": "+0.50%", "direction": "up"},
      {"name": "创业板指", "value": "2100.00", "percent": "-0.20%", "direction": "down"},
      {"name": "科创50", "value": "900.00", "percent": "+0.10%", "direction": "up"}
    ]`;
  } else if (market === MarketType.HK) {
    indicesExample = `[
      {"name": "恒生指数", "value": "18000.00", "percent": "+1.20%", "direction": "up"},
      {"name": "恒生科技", "value": "3800.00", "percent": "+2.00%", "direction": "up"}
    ]`;
  } else {
    indicesExample = `[
      {"name": "纳斯达克", "value": "16000.00", "percent": "+0.80%", "direction": "up"},
      {"name": "标普500", "value": "5100.00", "percent": "+0.30%", "direction": "up"}
    ]`;
  }

  const jsonInstruction = `
    [CRITICAL] 输出必须为严格 JSON。
    JSON 模板：
    {
      "data_date": "YYYY-MM-DD HH:mm",
      "market_indices": ${indicesExample},
      "market_volume": {
        "total_volume": "XXX亿",
        "volume_delta": "+/-XXX亿",
        "volume_trend": "expansion/contraction/flat",
        "capital_mood": "评价文案"
      },
      "market_sentiment": { "score": 80, "summary": "文案", "trend": "bullish" },
      "capital_rotation": {
        "inflow_sectors": ["板块A"],
        "outflow_sectors": ["板块B"],
        "rotation_logic": "逻辑"
      },
      "macro_logic": {
        "policy_focus": "重点",
        "core_verdict": "结论"
      }
    }
  `;

  let systemContent = `You are a Senior Quantitative Analyst. Today is ${dateStr}. Market: ${market}.`;
  let userContent = prompt;

  if (isDashboard || forceJson) {
    systemContent += " Output strictly valid JSON. Do not hallucinate values; use recent search-like knowledge.";
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
        max_tokens: 4000
      })
    });

    if (!response.ok) throw new Error(`Model request failed: ${response.status}`);

    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";

    let structuredData: MarketDashboardData | undefined;
    if (isDashboard || forceJson) {
      structuredData = robustJsonParse(content);
    }

    return {
      content,
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: !!structuredData,
      structuredData,
      market: market
    };
  } catch (error: any) {
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
  const prompt = `Analyze this brokerage screenshot. Output VALID JSON ONLY.`;
  const messages: OpenAIChatMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    }
  ];
  const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: config.visionModel || config.model, messages: messages, temperature: 0.1 })
  });
  const data = await response.json() as OpenAICompletionResponse;
  return robustJsonParse(data.choices[0]?.message?.content || "");
};

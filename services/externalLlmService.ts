import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot } from "../types";

// Configuration for external providers
const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    // 使用 Worker 代理路径以绕过 CORS 限制
    baseUrl: "/api/hunyuan", 
    // Chat model
    model: "hunyuan-pro", 
    // Vision model
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
 * 更加激进地修复 LLM 生成的 JSON 中的语法错误
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");

  let clean = text.trim();

  // 1. 移除 Markdown 代码块标记
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

  // 2. 定位 JSON 边界
  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);

  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }

  // 3. 初次尝试解析
  try {
    return JSON.parse(clean);
  } catch (e) {
    // 继续进行修复逻辑
  }

  // 4. 激进修复逻辑
  
  // 修复：移除注释（由于 LLM 喜欢在 JSON 里写 // 或 /* */）
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  clean = clean.replace(/(^|[^:])\/\/.*$/gm, '$1'); 

  // 修复：标准化引号
  clean = clean.replace(/[\u201C\u201D\u2018\u2019]/g, '"'); 
  
  // 修复：数值精度问题
  clean = clean.replace(/(\d+)\.0{5,}\d*/g, '$1');

  // 修复：对象/数组间缺失逗号 } { -> }, {
  clean = clean.replace(/}\s*{/g, '}, {');
  clean = clean.replace(/]\s*\[/g, '], [');
  
  // 修复：字符串间缺失逗号 "a" "b" -> "a", "b"
  clean = clean.replace(/"\s+(?=")/g, '", ');

  // 修复：关键修复 - 属性间缺失逗号
  // 匹配类似 "key": "val" "key2": 的模式并插入逗号
  clean = clean.replace(/("[:：]\s*(?:"[^"]*"|[^,{}\[\]\s]+))\s+(?=")/g, '$1, ');

  // 修复：末尾多余逗号
  clean = clean.replace(/,\s*}/g, '}');
  clean = clean.replace(/,\s*]/g, ']');

  // 修复：中文全角标点
  clean = clean.replace(/：/g, ':').replace(/，/g, ',');

  // 修复：未加引号的键
  clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

  // 修复：常见的 NaN/Infinity
  clean = clean.replace(/\bNaN\b/g, 'null');
  clean = clean.replace(/\bInfinity\b/g, 'null');

  try {
    return JSON.parse(clean);
  } catch (finalError) {
    console.error("Robust parse failed completely.", finalError);
    throw new Error(`数据解析失败: 混元模型返回的数据结构不完整或存在严重语法错误。详细原因: ${finalError.message}`);
  }
}

/**
 * Generic fetch with exponential backoff retry
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, baseDelay = 1000): Promise<Response> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 404 && url.includes('/api/hunyuan')) {
         // 如果 Worker 代理 404，尝试回退到直连（仅用于调试环境，生产环境应依赖代理）
         console.warn("Worker proxy failed with 404, falling back to direct connection...");
         return await fetch(url.replace('/api/hunyuan', 'https://api.hunyuan.cloud.tencent.com/v1'), options);
      }
      return res;
    } catch (err: any) {
      lastError = err;
      console.warn(`Fetch attempt ${i + 1} failed: ${err.message}. Retrying...`);
      if (i < retries - 1) {
        await wait(baseDelay * Math.pow(2, i));
      }
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
  if (!config) {
    throw new Error(`Configuration for ${provider} not found.`);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  let indicesExample = "";
  if (market === MarketType.CN) {
    indicesExample = `{ "name": "上证指数", "value": "3000.00", "change": "+0.00%", "percent": "+0.5%", "direction": "up" }`;
  } else if (market === MarketType.HK) {
    indicesExample = `{ "name": "恒生指数", "value": "17000.00", "change": "-100.00", "percent": "-0.5%", "direction": "down" }`;
  } else if (market === MarketType.US) {
    indicesExample = `{ "name": "纳斯达克", "value": "15000.00", "change": "+150.00", "percent": "+1.0%", "direction": "up" }`;
  }

  // 优化 JSON 提示，强制要求严格格式
  const jsonInstruction = `
    [CRITICAL: OUTPUT FORMAT]
    Return ONLY valid JSON. No markdown, no extra text.
    Ensure ALL list items are separated by COMMAS. 
    Ensure ALL keys are in double quotes.
    
    JSON Template:
    {
      "data_date": "YYYY-MM-DD",
      "market_indices": [ ${indicesExample} ],
      "market_volume": {
        "total_volume": "...",
        "volume_delta": "...",
        "volume_trend": "expansion/contraction/flat",
        "capital_mood": "..."
      },
      "market_sentiment": { "score": 80, "summary": "...", "trend": "bullish" },
      "capital_rotation": {
        "inflow_sectors": ["..."],
        "outflow_sectors": ["..."],
        "rotation_logic": "..."
      },
      "macro_logic": {
        "policy_focus": "...",
        "external_impact": "...",
        "core_verdict": "..."
      }
    }
  `;

  // 修正：systemContent 的“必须输出 JSON”指令应当是有条件的
  let systemContent = `You are a Senior Quantitative Financial Analyst. Today is ${dateStr}. Market: ${market}.`;
  let userContent = prompt;

  if (isDashboard || forceJson) {
    systemContent += " Output strictly valid JSON.";
  }

  if (isDashboard) {
    userContent = `${prompt}\n\n${jsonInstruction}`;
  } else if (forceJson) {
    userContent = `${prompt}\n\nPlease respond in strictly valid JSON format according to standard structure.`;
  }

  const messages: OpenAIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];

  const requestBody: any = {
    model: config.model,
    messages: messages,
    temperature: (isDashboard || forceJson) ? 0.2 : 0.7, // JSON 模式降低随机性，非 JSON 模式保留灵活性
    max_tokens: 4000, 
  };
  
  if (provider === ModelProvider.HUNYUAN_CN) {
    requestBody.enable_enhancement = true; 
  }
  
  try {
    const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`模型调用失败 (${response.status}): ${errorText.substring(0, 150)}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";

    if (!content) throw new Error("模型返回内容为空。");

    let structuredData: MarketDashboardData | undefined;
    
    if (isDashboard || forceJson) {
      try {
        structuredData = robustJsonParse(content);
      } catch (e) {
        console.warn("Parse attempt failed:", e);
        throw e;
      }
    }

    return {
      content,
      groundingSource: [], 
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: !!structuredData,
      structuredData,
      market: market
    };

  } catch (error: any) {
    console.error("External LLM Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image using an external provider's Vision model
 */
export const analyzeImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Configuration for ${provider} not found.`);

  const prompt = `Analyze this brokerage screenshot. Output VALID JSON ONLY.
    Template: { "totalAssets": 0, "positionRatio": 0, "date": "YYYY-MM-DD", "holdings": [{ "name": "...", "code": "...", "volume": 0, "costPrice": 0, "currentPrice": 0, "profit": 0, "profitRate": "0%", "marketValue": 0 }] }`;

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
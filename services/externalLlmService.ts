
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
 * Robust JSON Parser 4.0 - 更加强力地剔除 Markdown 标记
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");

  // 1. 移除 Markdown 代码块标记 (如 ```json ... ```)
  let clean = text.trim();
  clean = clean.replace(/```json/gi, '').replace(/```/g, '');

  // 2. 找到第一个 [ 或 { 到最后一个 ] 或 }
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
  else if (firstBrace !== -1) start = firstBrace;
  else if (firstBracket !== -1) start = firstBracket;

  const lastBrace = clean.lastIndexOf('}');
  const lastBracket = clean.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);

  if (start !== -1 && end !== -1 && end > start) {
    clean = clean.substring(start, end + 1);
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    // 基础修复逻辑
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); 
    clean = clean.replace(/[\u201C\u201D\u2018\u2019]/g, '"'); 
    clean = clean.replace(/}\s*{/g, '}, {').replace(/]\s*\[/g, '], [');
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    clean = clean.replace(/：/g, ':').replace(/，/g, ',');

    try {
      return JSON.parse(clean);
    } catch (finalError) {
      console.error("Robust parse failed completely.", finalError);
      return null;
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

  // 仪表盘 JSON 范例
  const dashboardJsonExample = `
    {
      "data_date": "${dateStr}",
      "market_indices": [
        {"name": "上证指数", "value": "3120.5", "change": "+15.2", "percent": "0.49%", "direction": "up"},
        {"name": "深证成指", "value": "10450.2", "change": "+50.1", "percent": "0.48%", "direction": "up"},
        {"name": "创业板指", "value": "1840.2", "change": "-5.1", "percent": "0.28%", "direction": "down"}
      ],
      "market_volume": {
        "total_volume": "9500亿",
        "volume_delta": "较昨日放量500亿",
        "volume_trend": "expansion",
        "capital_mood": "交投活跃"
      },
      "market_sentiment": {
        "score": 65,
        "summary": "回暖",
        "trend": "bullish"
      },
      "capital_rotation": {
        "inflow_sectors": ["科技", "半导体"],
        "outflow_sectors": ["白酒"],
        "rotation_logic": "避险转成长"
      },
      "macro_logic": {
        "policy_focus": "科技自强",
        "core_verdict": "看多"
      }
    }
  `;

  const needsJson = isDashboard || forceJson;
  const jsonInstruction = needsJson
    ? (isDashboard 
        ? `请务必严格按照以下 JSON 结构输出数据，不得包含任何多余文字或 Markdown 代码块标记：\n${dashboardJsonExample}`
        : `请返回纯 JSON 格式数据，不得包含任何 Markdown 代码块包裹。`)
    : "请根据任务要求，直接以 Markdown 报表格式返回内容，必须包含 ## 引导的层级标题。";

  let systemContent = `You are a Senior Quantitative Financial Analyst. ${needsJson ? "Output strictly valid JSON." : "Provide professional financial reports in Markdown."} Today is ${dateStr}. Market: ${market}.`;
  let userContent = `${prompt}\n\n[输出要求]: ${jsonInstruction}`;

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
        temperature: needsJson ? 0.1 : 0.6,
        max_tokens: 4000,
      })
    });

    if (!response.ok) throw new Error(`模型调用失败 (${response.status})`);

    const data = await response.json() as OpenAICompletionResponse;
    let content = data.choices[0]?.message?.content || "";

    let structuredData: any;
    if (needsJson) {
      structuredData = robustJsonParse(content);
      if (structuredData) content = JSON.stringify(structuredData);
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

export const analyzeDashboardImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string,
  period: 'day' | 'month',
  market: MarketType
): Promise<AnalysisResult> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Configuration for ${provider} not found.`);

  const dateStr = new Date().toLocaleDateString('zh-CN');
  const prompt = `你是一名顶级量化分析师。你面前有一张 ${market} 市场的行情快览截图。
  任务：从图中精确识别主要指数点位、涨跌幅、成交额。
  输出必须为严格的 JSON 格式。
  
  Template: {
    "data_date": "${dateStr}",
    "market_indices": [{"name": "上证指数", "value": "点位", "change": "+幅度", "percent": "0.00%", "direction": "up/down"}],
    "market_volume": {"total_volume": "金额", "volume_delta": "增减额", "volume_trend": "expansion/contraction", "capital_mood": "描述"},
    "market_sentiment": {"score": 0-100, "summary": "简评", "trend": "bullish/bearish"},
    "capital_rotation": {"inflow_sectors": [], "outflow_sectors": [], "rotation_logic": "描述"},
    "macro_logic": {"policy_focus": "描述", "core_verdict": "描述"}
  }`;

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
    const parsed = robustJsonParse(content);
    if (!parsed) throw new Error("无法从截图中识别有效的市场数据。");
    
    return {
      content,
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: true,
      structuredData: parsed as MarketDashboardData,
      market
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

  const prompt = `Analyze this brokerage screenshot. Output VALID JSON ONLY. 
  Template: { 
    "totalAssets": 0, 
    "positionRatio": 0, 
    "date": "YYYY-MM-DD", 
    "holdings": [{ 
      "name": "...", 
      "code": "...", 
      "volume": 0, 
      "costPrice": 0, 
      "currentPrice": 0, 
      "profit": 0, 
      "profitRate": "0%", 
      "marketValue": 0,
      "availableVolume": 0
    }] 
  }`;

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
    const parsed = robustJsonParse(content);
    if (!parsed) throw new Error("无法从截图中识别到有效的持仓数据。");
    return parsed;
  } catch (error: any) {
    throw error;
  }
};

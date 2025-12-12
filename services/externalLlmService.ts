import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot } from "../types";

// Configuration for external providers
const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    // Tencent Hunyuan OpenAI-compatible endpoint
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", 
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
 * Robust JSON Parser that handles common LLM formatting errors
 * including Markdown blocks, Chinese punctuation, and trailing commas.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");

  let clean = text.trim();

  // 1. Strip Markdown Code Blocks
  // Match ```json ... ``` or just ``` ... ```
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');

  // 2. Locate JSON boundaries (find first '{' or '[' and last '}' or ']')
  const firstBrace = clean.search(/[{[]/);
  const lastBrace = clean.search(/[}\]]$/); // Optimization: Look from end? 
  // Actually regex search from end is hard, let's just find lastIndexOf
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);

  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }

  // 3. Replace Chinese Punctuation common in JSON
  // Full-width quotes “ ” -> "
  clean = clean.replace(/[\u201C\u201D]/g, '"');
  // Full-width colon ： -> : (only if strictly needed, but risky inside strings. 
  // Safest is to rely on the model, but Hunyuan sometimes outputs keys like "name"： "value")
  // We will replace it only if followed by space or quote to be safer, or just globally if we assume English keys.
  // For safety, let's try standard parse first.
  
  try {
    return JSON.parse(clean);
  } catch (e) {
    // 4. Aggressive Fixes if first parse fails
    console.warn("Standard JSON parse failed, attempting aggressive fixes...", e);
    
    // Replace Chinese colon outside of quoted strings is hard with Regex.
    // Simple approach: Replace ALL Chinese colons. This might break content text containing "：", but rare in keys.
    // Better: Rely on the fact that keys usually don't have Chinese colons.
    let fixed = clean.replace(/：/g, ':');
    fixed = fixed.replace(/，/g, ','); 
    
    // Fix trailing commas (simple regex approach, not perfect but helps)
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    try {
      return JSON.parse(fixed);
    } catch (e2) {
      console.error("Robust JSON parse failed", e2, "Original:", text);
      throw new Error("JSON 解析失败: 模型返回了无效的格式。请重试。");
    }
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
    indicesExample = `{ "name": "上证指数", "value": "0.00", "change": "0.00%", "direction": "up" }`;
  } else if (market === MarketType.HK) {
    indicesExample = `{ "name": "恒生指数", "value": "0.00", "change": "0.00%", "direction": "down" }`;
  } else if (market === MarketType.US) {
    indicesExample = `{ "name": "纳斯达克", "value": "0.00", "change": "0.00%", "direction": "up" }`;
  }

  // JSON Schema Instruction
  const jsonInstruction = `
    Requirement: You must return a VALID JSON object.
    Do NOT use Markdown code blocks (no \`\`\`json).
    Do NOT use Chinese punctuation for keys or structural markers (use standard " and : and ,).
    
    JSON Structure required:
    {
      "market_indices": [ ${indicesExample} ],
      "market_sentiment": { "score": 0-100, "summary": "...", "trend": "bullish" },
      "capital_rotation": {
        "inflow_sectors": ["..."], "inflow_reason": "...",
        "outflow_sectors": ["..."], "outflow_reason": "..."
      },
      "deep_logic": { "policy_driver": "...", "external_environment": "...", "market_valuation": "..." },
      "hot_topics": ["..."],
      "opportunity_analysis": {
        "defensive_value": { "logic": "...", "sectors": ["..."] },
        "tech_growth": { "logic": "...", "sectors": ["..."] }
      },
      "strategist_verdict": "...",
      "allocation_model": {
        "aggressive": { "strategy_name": "...", "description": "...", "action_plan": ["..."], "portfolio_table": [], "core_advantage": "..." },
        "balanced": { "strategy_name": "...", "description": "...", "action_plan": ["..."], "portfolio_table": [], "core_advantage": "..." }
      }
    }
  `;

  let systemContent = `You are a Senior Quantitative Financial Analyst. Today is ${dateStr}. Focus on the ${market} market. 
  STRICT JSON MODE: Enabled. output strictly valid JSON.
  INTERNET SEARCH: Enabled.
  `;
  
  let userContent = prompt;

  if (isDashboard) {
    const searchQueries = `
    [Tasks]
    Search real-time data for ${dateStr}:
    1. ${market} Indices values and change.
    2. Main Force / Institutional Fund Flow (主力资金/北向资金).
    3. Market Sentiment.
    `;
    userContent = `${prompt}\n\n${searchQueries}\n\n${jsonInstruction}`;
  } else {
    if (forceJson) {
      systemContent += " Return strictly valid JSON. No markdown.";
    } else {
      systemContent += " Use Markdown formatting.";
    }
  }

  const messages: OpenAIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];

  const requestBody: any = {
    model: config.model,
    messages: messages,
    temperature: 0.5, // Lower temperature for more stable JSON
    max_tokens: 4000, 
  };
  
  // Hunyuan specific enhancement
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
      throw new Error(`Model Error (${response.status}): ${errorText.substring(0, 100)}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";

    if (!content) throw new Error("API returned empty content.");

    let structuredData: MarketDashboardData | undefined;
    
    // Robust Parse for Dashboard or when JSON is forced
    if (isDashboard || forceJson) {
      try {
        // If it's the Opportunity Mining (forceJson=true) but not dashboard type, we handle it generic
        // But for this function signature, we return 'AnalysisResult' which has generic structuredData field.
        // Actually OpportunityMining result is stored in 'opportunityData' usually, but here we return raw logic.
        // The caller handles assigning to the right field.
        
        // However, for fetchExternalAI, we usually put dashboard data in structuredData.
        // If forceJson is true (for opportunity mining), the caller parses result.content usually.
        // But let's try to parse it here to validate it.
        const parsed = robustJsonParse(content);
        if (isDashboard) {
           structuredData = parsed;
        }
      } catch (e) {
        console.warn("Parsing failed even with robust parser", e);
        // Fallback: return content, let caller handle or fail
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
 * Image Analysis using External Provider (Hunyuan Vision)
 */
export const analyzeImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config || !config.visionModel) {
    throw new Error(`${provider} does not support Vision API.`);
  }

  // Holdings Prompt strictly for JSON
  const prompt = `
    请分析这张证券账户持仓截图。提取以下信息并输出 JSON：
    1. 总资产 (totalAssets, number)
    2. 仓位百分比 (positionRatio, number 0-100)
    3. 持仓列表 (holdings), 包含:
       - 股票名称 (name)
       - 代码 (code)
       - 持仓数量 (volume)
       - 成本价 (costPrice)
       - 现价 (currentPrice)
       - 浮动盈亏 (profit)
       - 盈亏比例 (profitRate, string like "+10%")
       - 市值 (marketValue)
    
    IMPORTANT: Output ONLY valid JSON. No Markdown.
    Example:
    {
      "totalAssets": 100000.0,
      "positionRatio": 85.5,
      "date": "2023-12-01",
      "holdings": [
        { "name": "贵州茅台", "code": "600519", "volume": 100, "costPrice": 1500, "currentPrice": 1600, "profit": 10000, "profitRate": "+6.6%", "marketValue": 160000 }
      ]
    }
  `;

  const requestBody = {
    model: config.visionModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.1 // Low temperature for precision
  };

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
      const txt = await response.text();
      throw new Error(`Vision API Error: ${txt}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "{}";

    return robustJsonParse(content);

  } catch (error: any) {
    console.error("External Vision Error:", error);
    throw new Error(`图片识别失败: ${error.message}`);
  }
};

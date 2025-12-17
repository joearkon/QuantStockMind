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
 * Robust JSON Parser 2.0
 * Aggressively fixes common LLM JSON syntax errors.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");

  let clean = text.trim();

  // 1. Strip Markdown Code Blocks
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');

  // 2. Fix Chinese Punctuation (Quotes)
  clean = clean.replace(/[\u201C\u201D]/g, '"'); 
  
  // 3. Fix Infinite Zeros (Gemini bug: 1000.0000000000000001 -> 1000)
  clean = clean.replace(/(\d+)\.0{5,}\d*/g, '$1');

  // 4. Locate JSON boundaries
  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);

  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }

  // Attempt standard parse first
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn("Standard JSON parse failed, attempting aggressive regex fixes...", e);
    
    let fixed = clean;
    
    // --- Aggressive Fixes ---

    // 1. Fix missing comma between objects in array: } { -> }, {
    fixed = fixed.replace(/}\s*{/g, '}, {');
    fixed = fixed.replace(/]\s*\[/g, '], [');
    
    // 2. Fix missing comma between string elements: "A" "B" -> "A", "B"
    // (Be careful not to break sentences inside quotes, but in JSON lists this is common error)
    // Matches "quote" whitespace "quote"
    fixed = fixed.replace(/"\s+"/g, '", "');

    // 3. Fix Chinese Colon/Comma
    fixed = fixed.replace(/：/g, ':');
    fixed = fixed.replace(/，/g, ',');

    // 4. Remove Trailing Commas (End of object/array)
    // matches , } or , ]
    fixed = fixed.replace(/,\s*}/g, '}');
    fixed = fixed.replace(/,\s*]/g, ']');

    // 5. Fix missing comma after value before key: "value" "key":
    // This is tricky but common: ... "some value" "next_key": ... -> ... "some value", "next_key": ...
    fixed = fixed.replace(/"\s+"(\w+)":/g, '", "$1":');

    try {
      return JSON.parse(fixed);
    } catch (e2) {
      console.error("Robust JSON parse failed", e2);
      console.log("Original Text:", text);
      console.log("Fixed Text:", fixed);
      throw new Error("JSON 解析失败: 模型返回的数据结构不完整或有误 (Syntax Error)。");
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
    indicesExample = `{ "name": "上证指数", "value": "3000.00", "change": "+0.00%", "direction": "up" }`;
  } else if (market === MarketType.HK) {
    indicesExample = `{ "name": "恒生指数", "value": "17000.00", "change": "-0.00%", "direction": "down" }`;
  } else if (market === MarketType.US) {
    indicesExample = `{ "name": "纳斯达克", "value": "15000.00", "change": "+0.00%", "direction": "up" }`;
  }

  // JSON Schema Instruction
  const jsonInstruction = `
    [FORMAT INSTRUCTION]
    1. Return VALID JSON only. 
    2. Do NOT use Markdown code blocks (no \`\`\`json).
    3. Use standard quotes (") and commas (,). No Chinese punctuation.
    4. Ensure Arrays are comma-separated: [ {...}, {...} ] (Do not miss commas!)
    
    JSON Structure:
    {
      "data_date": "YYYY-MM-DD",  // <--- IMPORTANT: The actual date of the data found.
      "market_indices": [ ${indicesExample} ],
      "market_volume": {
        "total_volume": "1.5万亿",
        "volume_delta": "放量2000亿",
        "volume_trend": "expansion",
        "net_inflow": "主力净流入+50亿",
        "capital_mood": "增量资金进场"
      },
      "market_sentiment": { "score": 60, "summary": "...", "trend": "bullish" },
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
    2. Total Trading Volume & Volume Delta (成交额与增量).
    3. Main Force / Institutional Fund Flow (主力资金/北向资金).
    4. Market Sentiment.
    5. Top performing individual stocks for Aggressive/Balanced strategies.

    [CRITICAL DATA RULE]
    - **IF TODAY'S DATA IS NOT AVAILABLE (e.g. market closed, or morning pre-market), YOU MUST SEARCH FOR THE PREVIOUS TRADING DAY'S CLOSING DATA.**
    - **YOU MUST FILL 'data_date' WITH THE ACTUAL DATE OF THE DATA.**
    - Do NOT return empty or zero values if old data exists.
    
    [CRITICAL RULE For Portfolio Table]
    - **MANDATORY**: You MUST provide specific **INDIVIDUAL STOCKS (个股)**. Do not list only ETFs.
    - **Aggressive**: Focus on Leaders (龙头). **Balanced**: Focus on Blue Chips (蓝筹).
    - **NO MASKED CODES**: You MUST provide REAL, SPECIFIC stock codes (e.g. "600519", "AAPL", "00700").
    - DO NOT output "600xxx", "300xxx", etc.
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
    temperature: 0.5, 
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
        const parsed = robustJsonParse(content);
        if (isDashboard) {
           structuredData = parsed;
        }
      } catch (e) {
        console.warn("Parsing failed", e);
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
 * Analyzes an image using an external provider's Vision model (e.g., Hunyuan Vision)
 */
export const analyzeImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) {
    throw new Error(`Configuration for ${provider} not found.`);
  }

  // Only Hunyuan supported for now in this path
  if (provider !== ModelProvider.HUNYUAN_CN) {
     throw new Error("Image analysis only supported for Hunyuan in external service.");
  }

  const prompt = `
    Analyze this brokerage screenshot to extract holdings information.
    
    Tasks:
    1. Extract Total Assets (总资产).
    2. Extract Position Ratio (仓位) as percentage 0-100. If not explicitly shown, estimate it or put 0.
    3. Extract all Stocks in the list. For each stock: Name, Code, Volume (持仓数), Cost Price (成本), Current Price (现价), Profit (盈亏), Profit Rate (盈亏比).
    
    IMPORTANT RULES:
    1. 'volume' must be an Integer (e.g. 100).
    2. 'marketValue', 'costPrice', 'currentPrice' should have max 2 decimals.
    3. Do not hallucinate. If data is unclear, do not invent.
    4. Return strictly valid JSON matching the structure below.
    
    JSON Structure:
    {
      "totalAssets": 12345.67,
      "positionRatio": 85.5,
      "date": "${new Date().toISOString().split('T')[0]}",
      "holdings": [
        {
          "name": "StockName",
          "code": "StockCode",
          "volume": 100,
          "costPrice": 10.00,
          "currentPrice": 12.00,
          "profit": 200.00,
          "profitRate": "+20%",
          "marketValue": 1200.00
        }
      ]
    }
  `;

  const messages: OpenAIChatMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    }
  ];

  const requestBody: any = {
    model: config.visionModel || config.model, // Use vision model if available
    messages: messages,
    temperature: 0.1,
    max_tokens: 4000
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
      const errorText = await response.text();
      throw new Error(`Vision Model Error (${response.status}): ${errorText.substring(0, 100)}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";

    if (!content) throw new Error("API returned empty content.");

    return robustJsonParse(content);

  } catch (error: any) {
    console.error("External Vision Error:", error);
    throw error;
  }
};
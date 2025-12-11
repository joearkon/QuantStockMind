import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType } from "../types";

// Configuration for external providers
const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    // Tencent Hunyuan OpenAI-compatible endpoint
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", 
    // Upgrade to hunyuan-pro for better search handling and reasoning
    model: "hunyuan-pro", 
    name: "Tencent Hunyuan"
  }
};

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
 * Generic fetch with exponential backoff retry
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, baseDelay = 1000): Promise<Response> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      // Create a new AbortController for each attempt to handle timeouts if needed
      // (Browser fetch doesn't timeout by default, but we can rely on network layer)
      const res = await fetch(url, options);
      return res;
    } catch (err: any) {
      lastError = err;
      const isNetworkError = err.name === 'TypeError' && err.message === 'Failed to fetch';
      
      // If it's a network error or 5xx, we retry
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
  market: MarketType = MarketType.CN
): Promise<AnalysisResult> => {
  
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) {
    throw new Error(`Configuration for ${provider} not found.`);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  let indicesExample = "";
  // NOTE: We use "0.00" as placeholders to prevent the model from hallucinating specific numbers if search fails.
  if (market === MarketType.CN) {
    indicesExample = `{ "name": "上证指数", "value": "0.00", "change": "0.00%", "direction": "up" }, { "name": "创业板指", "value": "0.00", "change": "0.00%", "direction": "down" }`;
  } else if (market === MarketType.HK) {
    indicesExample = `{ "name": "恒生指数", "value": "0.00", "change": "0.00%", "direction": "down" }, { "name": "恒生科技", "value": "0.00", "change": "0.00%", "direction": "up" }`;
  } else if (market === MarketType.US) {
    indicesExample = `{ "name": "纳斯达克", "value": "0.00", "change": "0.00%", "direction": "up" }, { "name": "标普500", "value": "0.00", "change": "0.00%", "direction": "down" }`;
  }

  // JSON Schema Instruction for Dashboard
  const jsonInstruction = `
    You must return a valid JSON object strictly matching the structure below.
    IMPORTANT: Output ONLY the JSON string. Do not output markdown code blocks.
    
    JSON Structure required:
    {
      "market_indices": [
        ${indicesExample}
      ],
      "market_sentiment": {
        "score": 0-100,
        "summary": "Brief summary",
        "trend": "bullish/bearish/neutral"
      },
      "capital_rotation": {
        "inflow_sectors": ["Sector A", "Sector B"],
        "inflow_reason": "Specific reasons (e.g., 'Main Force Inflow', 'Northbound buying')",
        "outflow_sectors": ["Sector X", "Sector Y"],
        "outflow_reason": "Specific reasons"
      },
      "deep_logic": {
        "policy_driver": "Policy analysis",
        "external_environment": "Macro analysis",
        "market_valuation": "Valuation analysis"
      },
      "hot_topics": ["Topic 1", "Topic 2"],
      "opportunity_analysis": {
        "defensive_value": {
          "logic": "Logic for buying defensive/value stocks",
          "sectors": ["Sector 1", "Sector 2"]
        },
        "tech_growth": {
          "logic": "Logic for buying tech/growth stocks",
          "sectors": ["Sector 1", "Sector 2"]
        }
      },
      "strategist_verdict": "Final strategic advice summary string",
      "allocation_model": {
        "aggressive": {
          "strategy_name": "Aggressive Strategy Name",
          "description": "Short description",
          "action_plan": ["Step 1: Clear weak stocks", "Step 2: Buy Leaders"],
          "portfolio_table": [
             { "name": "StockName", "code": "Code", "volume": "800股", "weight": "30%", "logic_tag": "Main Force Buying" },
             { "name": "Cash", "code": "-", "volume": "2000元", "weight": "10%", "logic_tag": "Liquidity" }
          ],
          "core_advantage": "Summary of advantage"
        },
        "balanced": {
          "strategy_name": "Balanced Strategy Name",
          "description": "Short description",
          "action_plan": ["Step 1...", "Step 2..."],
          "portfolio_table": [
             { "name": "StockName", "code": "Code", "volume": "500股", "weight": "20%", "logic_tag": "Value Protection" }
          ],
          "core_advantage": "Summary of advantage"
        }
      }
    }
  `;

  // Enhanced System Prompt for Quality
  let systemContent = `You are a Senior Quantitative Financial Analyst (资深量化分析师). Today is ${dateStr}. Focus on the ${market} market. 
  
  Your personality:
  1. Professional, sharp, and data-driven. 
  2. Use "Chain of Thought" (Deep Reasoning) before answering.
  3. INTERNET SEARCH IS ENABLED: You have real-time access to the internet. You MUST search for the specific data points requested.
  4. STRICT_DATA_MODE: Enabled. If you cannot find real-time data after searching, return "0.00" or "Unavail". Do NOT invent numbers.
  `;
  
  let userContent = prompt;

  if (isDashboard) {
    // Inject Specific Search Queries to force the model to look up these values
    const searchQueries = `
    [MANDATORY SEARCH TASKS]
    Please perform an internet search for the following REAL-TIME data for today (${dateStr}):
    1. ${market === 'CN' ? '上证指数 今日收盘点位 涨跌幅' : market === 'HK' ? '恒生指数 今日收盘' : 'Nasdaq today price'}.
    2. ${market === 'CN' ? '北向资金 今日净流入' : 'Southbound Capital Net Inflow today'}.
    3. ${market === 'CN' ? '今日A股主力资金流向 行业板块' : 'Institutional Money Flow sectors'}.
    4. ${market === 'CN' ? '今日 涨停家数 跌停家数' : 'Market breadth'}.
    
    After searching, analyze the results and fill the JSON.
    `;

    userContent = `${prompt}\n\n${searchQueries}\n\n${jsonInstruction}`;
    systemContent += " You are a helpful assistant that outputs strictly structured JSON data.";
  } else {
    // For Stock/Holdings analysis
    systemContent += " Provide a comprehensive analysis report. Do not be brief. Use Markdown. Cite specific financial metrics (PE, PB, RSI, MACD).";
    userContent += `\n[Requirement] You MUST SEARCH for the latest news, Main Force Cost (主力成本), and price action for this stock/market as of ${dateStr}.`;
  }

  const messages: OpenAIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];

  const requestBody: any = {
    model: config.model,
    messages: messages,
    temperature: 0.8, 
    max_tokens: 4000, 
    stream: false,
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
      let errorMsg = `API Error (${response.status})`;
      try {
        const errJson = JSON.parse(errorText);
        errorMsg = errJson.error?.message || errJson.message || errorText;
      } catch (e) {
        errorMsg = errorText;
      }
      throw new Error(`Model Provider Error: ${errorMsg}`);
    }

    const data = await response.json() as OpenAICompletionResponse;
    
    // Safety check for empty content
    if (!data.choices || data.choices.length === 0) {
        throw new Error("API returned no choices.");
    }

    const choice = data.choices[0];
    const content = choice.message?.content;

    if (!content) {
        throw new Error("API returned empty content. The model might have refused the request.");
    }

    // Parse JSON if dashboard
    let structuredData: MarketDashboardData | undefined;
    if (isDashboard) {
      try {
        // Clean markdown blocks if present
        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        }
        structuredData = JSON.parse(cleanContent);
      } catch (e) {
        console.warn("Failed to parse external LLM JSON", e);
        // Do not throw, return content as text fallback so user sees *something*
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
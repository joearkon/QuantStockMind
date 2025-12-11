

import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType } from "../types";

// Configuration for external providers
const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    // Tencent Hunyuan OpenAI-compatible endpoint
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", 
    // Upgrade to hunyuan-pro for better search handling and reasoning
    model: "hunyuan-pro", 
    name: "Tencent Hunyuan"
  },
  [ModelProvider.ALIYUN_CN]: {
    // Aliyun DashScope OpenAI-compatible endpoint
    // We use a relative path here to trigger the proxy in worker.ts, avoiding CORS issues
    baseUrl: "/api/aliyun", 
    model: "qwen-max", 
    name: "Aliyun Qwen"
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
  }[];
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
      // We don't have status code here for network errors, so we assume transient
      console.warn(`Fetch attempt ${i + 1} failed: ${err.message}. Retrying...`);
      
      if (i < retries - 1) {
        await wait(baseDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError;
}

/**
 * Generic fetcher for OpenAI-compatible APIs (Hunyuan, Aliyun)
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
  if (market === MarketType.CN) {
    indicesExample = `{ "name": "上证指数", "value": "...", "change": "...", "direction": "up" }, { "name": "创业板指", ... }`;
  } else if (market === MarketType.HK) {
    indicesExample = `{ "name": "恒生指数", "value": "...", "change": "...", "direction": "down" }, { "name": "恒生科技", ... }`;
  } else if (market === MarketType.US) {
    indicesExample = `{ "name": "纳斯达克", "value": "...", "change": "...", "direction": "up" }, { "name": "标普500", ... }`;
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
        "inflow_reason": "Reason",
        "outflow_sectors": ["Sector X", "Sector Y"],
        "outflow_reason": "Reason"
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
             { "name": "StockName", "code": "Code", "volume": "800股", "weight": "30%", "logic_tag": "Logic tag" },
             { "name": "Cash", "code": "-", "volume": "2000元", "weight": "10%", "logic_tag": "Liquidity" }
          ],
          "core_advantage": "Summary of advantage"
        },
        "balanced": {
          "strategy_name": "Balanced Strategy Name",
          "description": "Short description",
          "action_plan": ["Step 1...", "Step 2..."],
          "portfolio_table": [
             { "name": "StockName", "code": "Code", "volume": "500股", "weight": "20%", "logic_tag": "Logic tag" }
          ],
          "core_advantage": "Summary of advantage"
        }
      }
    }
  `;

  let systemContent = `You are a professional global financial market analyst. Today is ${dateStr}. Focus on the ${market} market.`;
  let userContent = prompt;

  if (isDashboard) {
    userContent = `${prompt}\n\n${jsonInstruction}\n\nIMPORTANT: For 'allocation_model', you MUST provide specific stock names and codes (e.g., 600xxx for A-Share, AAPL for US), specific volumes (e.g., '800 shares') and weights (e.g., '30%') in a table format. Include a 'Cash' row.`;
    systemContent += " You are a helpful assistant that outputs strictly structured JSON data.";
  } else {
    systemContent += " If the user provides a 'Current Price' in the prompt, accept it as the absolute truth for your calculations. Please output the analysis in professional Markdown format.";
  }

  const messages: OpenAIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];

  const requestBody: any = {
    model: config.model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 3000, 
    stream: false,
  };

  if (provider === ModelProvider.HUNYUAN_CN) {
    requestBody.enable_enhancement = true; 
  }
  
  // Aliyun (DashScope) Search Enhancement
  // We strictly enable search to ensure "Real-Time" market data access.
  if (provider === ModelProvider.ALIYUN_CN) {
    requestBody.enable_search = true;
    // result_format: 'message' is default for OpenAI compatible, but enables search result injection in some contexts
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
    const content = data.choices?.[0]?.message?.content || "";

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
        // Do not throw, return content as text fallback
      }
    }

    return {
      content,
      groundingSource: [], // External APIs might return search citations in text, but structured 'groundingChunks' is specific to Gemini
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
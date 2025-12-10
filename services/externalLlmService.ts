
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
      const errText = await response.text();
      let friendlyMessage = `${config.name} API 请求失败 (${response.status})`;

      let errJson: any = {};
      try { errJson = JSON.parse(errText); } catch (e) {}

      if (response.status === 402) {
        friendlyMessage = `${config.name} 账户余额不足 (Insufficient Balance)。请充值。`;
      } else if (response.status === 401) {
        friendlyMessage = `${config.name} API Key 无效或未授权。`;
      } else if (response.status === 504 || response.status === 503) {
        friendlyMessage = `${config.name} 服务超时或繁忙，请稍后重试。`;
      } else if (errJson?.error?.message) {
        friendlyMessage = `${config.name} 错误: ${errJson.error.message}`;
      } else {
        friendlyMessage = `${config.name} 服务异常 (${response.status}): ${errText.substring(0, 200)}`;
      }
      throw new Error(friendlyMessage);
    }

    const data: OpenAICompletionResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    if (isDashboard) {
      try {
        let cleanJson = content;
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        } else {
          cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsedData = JSON.parse(cleanJson) as MarketDashboardData;
        return {
          content: "Dashboard Data",
          structuredData: parsedData,
          timestamp: Date.now(),
          modelUsed: provider,
          isStructured: true,
          market: market
        };
      } catch (e) {
        console.error("Failed to parse external JSON", e, "Content:", content);
        throw new Error(`${config.name} 返回的数据格式不正确，无法解析为仪表盘数据。`);
      }
    }

    return {
      content: content,
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: false,
      market: market
    };

  } catch (error: any) {
    console.error(`${config.name} API Call Failed:`, error);
    
    // Handle Browser Network Errors (e.g. CORS, Offline, DNS)
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error(`无法连接到 ${config.name} API。请检查网络连接。如果问题持续，可能是浏览器跨域限制 (CORS)，建议使用 Gemini 模型或检查 API 代理设置。`);
    }

    if (error.message.includes(config.name)) {
        throw error;
    }
    throw new Error(`${config.name} 调用失败: ${error.message}`);
  }
};

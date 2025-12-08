
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
          "description": "Description for aggressive investor",
          "allocation": { "equity_growth": 60, "equity_value": 20, "bonds_cash": 20 },
          "suggested_picks": ["Stock A", "Stock B"]
        },
        "balanced": {
          "description": "Description for balanced investor",
          "allocation": { "equity_growth": 40, "equity_value": 40, "bonds_cash": 20 },
          "suggested_picks": ["Stock C", "Stock D"]
        }
      }
    }
  `;

  let systemContent = `You are a professional global financial market analyst. Today is ${dateStr}. Focus on the ${market} market.`;
  let userContent = prompt;

  if (isDashboard) {
    userContent = `${prompt}\n\n${jsonInstruction}`;
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
    max_tokens: 2500, // Increased for larger JSON
    stream: false,
  };

  if (provider === ModelProvider.HUNYUAN_CN) {
    requestBody.enable_enhancement = true; 
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
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
    if (error.message.includes(config.name)) {
        throw error;
    }
    throw new Error(`${config.name} 调用失败: ${error.message}`);
  }
};

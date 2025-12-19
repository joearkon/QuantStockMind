
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot } from "../types";

const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", 
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
  choices: { message: { content: string; }; }[];
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastIndex = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }
  try { return JSON.parse(clean); } catch (e) {
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/：/g, ':').replace(/，/g, ',');
    return JSON.parse(clean);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, baseDelay = 1000): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try { return await fetch(url, options); } catch (err: any) {
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

  // JSON Schema Instruction - 汉化示例
  const jsonInstruction = `
    [输出规范]
    1. 必须返回合法的 JSON。禁止 Markdown 代码块。
    2. **所有文本内容（包括指数名、板块名、逻辑描述）必须严格使用简体中文。禁止出现英文。**
    
    JSON 结构示例:
    {
      "data_date": "${dateStr}",
      "market_indices": [ { "name": "上证指数", "value": "3000.00", "change": "+0.10%", "direction": "up" } ],
      "market_volume": {
        "total_volume": "1.2万亿",
        "volume_delta": "放量2000亿",
        "volume_trend": "expansion",
        "net_inflow": "主力资金流入",
        "capital_mood": "情绪亢奋"
      },
      "market_sentiment": { "score": 65, "summary": "情绪温和修复", "trend": "bullish" },
      "capital_rotation": {
        "inflow_sectors": ["半导体", "低空经济"], "inflow_reason": "政策催化",
        "outflow_sectors": ["房地产"], "outflow_reason": "资金流出"
      },
      "deep_logic": { "policy_driver": "降准预期", "external_environment": "外盘稳定", "market_valuation": "估值低位" },
      "hot_topics": ["商业航天", "合成生物"],
      "opportunity_analysis": {
        "defensive_value": { "logic": "高股息资产", "sectors": ["银行"] },
        "tech_growth": { "logic": "AI产业爆发", "sectors": ["服务器"] }
      },
      "strategist_verdict": "看好科技成长...",
      "allocation_model": {
        "aggressive": { "strategy_name": "龙头战法", "description": "核心聚焦热点", "action_plan": ["买入龙头"], "portfolio_table": [], "core_advantage": "高爆发" },
        "balanced": { "strategy_name": "中性配置", "description": "均衡风险", "action_plan": ["持有蓝筹"], "portfolio_table": [], "core_advantage": "稳健" }
      }
    }
  `;

  let systemContent = `你是一位资深金融分析师。今天是 ${dateStr}。当前分析市场为 ${market}。
  【核心准则】:
  1. 必须严格使用简体中文回答。
  2. 严禁在回答中夹杂英文。
  3. 联网搜索实时数据。
  `;
  
  let userContent = isDashboard ? `${prompt}\n\n${jsonInstruction}` : `${prompt}\n\n【请严格使用简体中文回答，禁止返回英文内容】`;

  const requestBody: any = {
    model: config.model,
    messages: [{ role: 'system', content: systemContent }, { role: 'user', content: userContent }],
    temperature: 0.3,
    max_tokens: 4000, 
    enable_enhancement: true 
  };
  
  try {
    const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw new Error(`Model Error: ${response.status}`);
    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";
    let structuredData: MarketDashboardData | undefined;
    if (isDashboard || forceJson) structuredData = robustJsonParse(content);
    return { content, timestamp: Date.now(), modelUsed: provider, isStructured: !!structuredData, structuredData, market };
  } catch (error: any) { throw error; }
};

// Fixed: Implemented analyzeImageWithExternal
export const analyzeImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Configuration for ${provider} not found.`);

  const prompt = `请从这张持仓截图中提取数据：总资产(number)、仓位占比(number)、日期(string)、持仓列表(数组，包含name, code, volume, costPrice, currentPrice, profit, profitRate, marketValue)。请严格使用简体中文，并以 JSON 格式返回。`;

  const requestBody = {
    model: config.visionModel || config.model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.2
  };

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw new Error(`Vision Error: ${response.status}`);
    const data = await response.json() as OpenAICompletionResponse;
    const content = data.choices[0]?.message?.content || "";
    return robustJsonParse(content);
  } catch (error: any) {
    throw new Error(`外部模型识别失败: ${error.message}`);
  }
};

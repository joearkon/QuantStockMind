
import { AnalysisResult, ModelProvider, UserSettings, MarketType, StockSynergyResponse, PeriodicReviewData, PlanItem } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard, fetchStockSynergy, fetchStockDetailWithImage, fetchPeriodicReview, extractTradingPlan, fetchMarketDashboardWithImage } from "./geminiService";
import { fetchExternalAI, analyzeDashboardImageWithExternal } from "./externalLlmService";

/**
 * 首席量化官 (CQO) 核心系统指令 - 确保模型一致性
 */
const getCQOSystemInstruction = (timeContext: string, historyContext?: string) => `
  你是一名拥有20年实战经验的【顶级量化投资官 (CQO)】。
  你的任务是提供专业、基于概率的深度分析与复盘。
  
  [当前背景]: ${timeContext}
  [昨日回顾]: ${historyContext || "无历史记录，开始新的分析周期。"}

  [分析原则]:
  1. 连续性：必须对比昨日计划的达成情况，分析偏差。
  2. 量化思维：使用风险敞口、成交量分布、多空合力评分等术语。
  3. 确定性：大盘预判必须给出明确的支撑(Support)和压力(Resistance)位数字。
  4. 实战性：交易计划必须包含具体的触发价，禁止含糊其辞。
  5. 语言一致性：请始终使用简体中文进行回复。
`;

/**
 * 深度复盘与看板分析适配器
 */
export const analyzeWithLLM = async (
  provider: ModelProvider,
  prompt: string,
  isComplex: boolean = false,
  settings?: UserSettings,
  isDashboard: boolean = false,
  period: 'day' | 'month' = 'day',
  currentPrice?: string,
  market: MarketType = MarketType.CN,
  historyData?: string,
  image?: string // 新增：支持看板视觉对齐
): Promise<AnalysisResult> => {
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');
  const systemInstruction = getCQOSystemInstruction(timeContext, historyData);

  // Gemini 路径
  if (provider === ModelProvider.GEMINI_INTL) {
    const geminiKey = settings?.geminiKey; 
    if (isDashboard) {
      if (image) return await fetchMarketDashboardWithImage(image, period, market, geminiKey || '');
      return await fetchMarketDashboard(period, market, geminiKey);
    }
    let finalPrompt = `${systemInstruction}\n\n[指令]: ${prompt}`;
    return await fetchGeminiAnalysis(finalPrompt, isComplex, geminiKey);
  }

  // 腾讯混元路径
  const apiKey = settings?.hunyuanKey || '';
  
  if (isDashboard) {
    if (image) {
      return await analyzeDashboardImageWithExternal(provider, image, apiKey, period, market);
    }
    
    const effectivePrompt = `请生成一份 ${market} 市场在 ${period === 'day' ? '今日' : '本月'} 的深度量化分析报告。
    要求包含：
    1. 主要指数（上证、深成、创业板等）的估算点位及涨跌幅。
    2. 市场成交量能（万亿级）及趋势判定。
    3. 市场情绪水位评分（0-100）。
    4. 主力资金在热门板块的轮动路径。
    5. 宏观政策研判结论。
    注意：由于你无法实时联网，请基于你掌握的最新知识图谱进行逻辑推演。`;
    
    let finalPrompt = `${systemInstruction}\n\n[任务指令]: ${effectivePrompt}`;
    return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, true);
  }

  let finalPrompt = `${systemInstruction}\n\n[任务指令]: ${prompt}`;
  if (currentPrice) finalPrompt += `\n[参考价: ${currentPrice}]`;
  
  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, false);
};

/**
 * 计划提取适配器
 */
export const extractPlanWithLLM = async (
  provider: ModelProvider,
  content: string,
  settings: UserSettings
): Promise<{ items: PlanItem[], summary: string }> => {
  const jsonSchemaPrompt = `
    从以下复盘报告中提取结构化计划。
    输出必须为严格的 JSON 格式，不得包含任何 Markdown 标记：
    {
      "items": [
        {"symbol": "名称", "action": "buy/sell/hold/monitor/t_trade", "price_target": "具体建议价", "reason": "核心逻辑"}
      ],
      "summary": "明日核心操作指导"
    }
    
    文本内容：
    ${content}
  `;

  if (provider === ModelProvider.GEMINI_INTL) {
    return await extractTradingPlan(content, settings.geminiKey);
  }

  const result = await fetchExternalAI(provider, settings.hunyuanKey || '', jsonSchemaPrompt, false, undefined, MarketType.CN, true);
  const parsed = result.structuredData as any;
  
  return { 
    items: (parsed?.items || []).map((it: any) => ({ 
      ...it, 
      id: Math.random().toString(36).substr(2, 9), 
      status: 'pending' 
    })), 
    summary: parsed?.summary || "" 
  };
};

export const stockSynergyWithLLM = async (provider: ModelProvider, query: string, mImg: string | null, hImg: string | null, settings: UserSettings) => {
  if (provider === ModelProvider.GEMINI_INTL) return await fetchStockSynergy(query, mImg, hImg, settings.geminiKey || '');
  const prompt = `审计标的 "${query}" 的多空合力及主力成本。请输出 JSON 格式。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, MarketType.CN, true);
};

export const stockDiagnosisWithLLM = async (provider: ModelProvider, query: string, market: MarketType, image: string | null, price: string, settings: UserSettings) => {
  if (image) {
    const config = { provider, apiKey: settings.hunyuanKey || '', image, prompt: `分析股票 "${query}" 的 K 线走势截图。现价: ${price}` };
    if (provider === ModelProvider.GEMINI_INTL) return await fetchStockDetailWithImage(image, query, market, settings.geminiKey || '', price);
    return await analyzeWithLLM(provider, config.prompt, false, settings, false, 'day', price, market);
  }
  return await analyzeWithLLM(provider, `对股票 "${query}" 进行深度量化诊断。`, false, settings, false, 'day', price, market);
};

export const periodicReviewWithLLM = async (provider: ModelProvider, journals: any[], label: string, market: MarketType, settings: UserSettings) => {
  if (provider === ModelProvider.GEMINI_INTL) return await fetchPeriodicReview(journals, label, market, settings.geminiKey);
  const prompt = `历史复盘: ${label}。记录: ${JSON.stringify(journals)}。请执行量化周期性回顾分析。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, market, true);
};

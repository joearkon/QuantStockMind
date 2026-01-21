
import { AnalysisResult, ModelProvider, UserSettings, MarketType, StockSynergyResponse, PeriodicReviewData, PlanItem } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard, fetchStockSynergy, fetchStockDetailWithImage, fetchPeriodicReview, extractTradingPlan } from "./geminiService";
import { fetchExternalAI } from "./externalLlmService";

/**
 * 统一的专业量化专家系统指令
 */
const QUANT_SYSTEM_INSTRUCTION = (timeContext: string) => `
  你是一名拥有15年资深经验的【首席量化投资官 (CQO)】。
  你的分析必须摒弃感性修辞，基于以下原则：
  1. 数据逻辑优先：重点关注量价关系、Beta回归、风险敞口。
  2. 概率推演：所有走势预判必须包含概率分布思维。
  3. 实战导向：给出的计划必须包含具体的触发价位和防守位。
  当前市场时间背景: ${timeContext}。
`;

/**
 * 核心逻辑路由：支持通用量化分析与复盘
 */
export const analyzeWithLLM = async (
  provider: ModelProvider,
  prompt: string,
  isComplex: boolean = false,
  settings?: UserSettings,
  isDashboard: boolean = false,
  period: 'day' | 'month' = 'day',
  currentPrice?: string,
  market: MarketType = MarketType.CN
): Promise<AnalysisResult> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const fullTimeContext = `${dateStr} ${timeStr}`;
  const systemInstruction = QUANT_SYSTEM_INSTRUCTION(fullTimeContext);

  if (provider === ModelProvider.GEMINI_INTL) {
    const geminiKey = settings?.geminiKey; 
    if (isDashboard) return await fetchMarketDashboard(period, market, geminiKey);
    let finalPrompt = `${systemInstruction}\n${prompt}`;
    if (currentPrice) finalPrompt += `\n[实时现价: ${currentPrice}]`;
    return await fetchGeminiAnalysis(finalPrompt, isComplex, geminiKey);
  }

  // 混元路径：通过提示词注入系统身份
  const apiKey = settings?.hunyuanKey || '';
  let finalPrompt = `${systemInstruction}\n\n[任务请求]: ${prompt}`;
  if (currentPrice) finalPrompt += `\n[实时现价: ${currentPrice}]`;
  
  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, isDashboard);
};

/**
 * 计划提取适配器：确保混元输出的 JSON 与 Gemini 完美兼容
 */
export const extractPlanWithLLM = async (
  provider: ModelProvider,
  content: string,
  settings: UserSettings
): Promise<{ items: PlanItem[], summary: string }> => {
  const prompt = `
    作为资深交易员，请从以下复盘文本中提取明日的【结构化交易计划】。
    要求严格输出 JSON，格式必须为：
    {
      "items": [
        {"symbol": "标的代码/名称", "action": "buy/sell/hold/monitor/t_trade", "price_target": "建议触发价", "reason": "核心逻辑"}
      ],
      "summary": "明日整体操作策略一句话总结"
    }
    
    复盘文本：
    ${content}
  `;

  if (provider === ModelProvider.GEMINI_INTL) {
    return await extractTradingPlan(content, settings.geminiKey);
  }

  // 混元路径：强制要求 JSON 输出
  const result = await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, MarketType.CN, true);
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

/**
 * 其余适配器逻辑保持...
 */
export const stockSynergyWithLLM = async (provider: ModelProvider, query: string, mImg: string | null, hImg: string | null, settings: UserSettings) => {
  if (provider === ModelProvider.GEMINI_INTL) return await fetchStockSynergy(query, mImg, hImg, settings.geminiKey || '');
  const prompt = `审计标的 "${query}" 的合力与主力成本。输出 JSON。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, MarketType.CN, true);
};

export const stockDiagnosisWithLLM = async (provider: ModelProvider, query: string, market: MarketType, image: string | null, price: string, settings: UserSettings) => {
  if (provider === ModelProvider.GEMINI_INTL) {
    if (image) return await fetchStockDetailWithImage(image, query, market, settings.geminiKey || '', price);
    return await analyzeWithLLM(provider, `对股票 "${query}" 进行深度量化分析。`, false, settings, false, 'day', price, market);
  }
  return await analyzeWithLLM(provider, `对股票 "${query}" 进行视觉诊断分析。`, false, settings, false, 'day', price, market);
};

export const periodicReviewWithLLM = async (provider: ModelProvider, journals: any[], label: string, market: MarketType, settings: UserSettings) => {
  if (provider === ModelProvider.GEMINI_INTL) return await fetchPeriodicReview(journals, label, market, settings.geminiKey);
  const prompt = `历史复盘: ${label}。记录: ${JSON.stringify(journals)}。输出 JSON。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, market, true);
};

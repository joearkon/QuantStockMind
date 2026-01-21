
import { AnalysisResult, ModelProvider, UserSettings, MarketType, StockSynergyResponse, PeriodicReviewData, PlanItem } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard, fetchStockSynergy, fetchStockDetailWithImage, fetchPeriodicReview, extractTradingPlan } from "./geminiService";
import { fetchExternalAI } from "./externalLlmService";

/**
 * 首席量化官 (CQO) 核心系统指令 - 确保模型一致性
 */
const getCQOSystemInstruction = (timeContext: string, historyContext?: string) => `
  你是一名拥有20年实战经验的【顶级量化投资官 (CQO)】。
  你的任务是提供专业、刻薄、基于概率的深度复盘。
  
  [当前背景]: ${timeContext}
  [昨日回顾]: ${historyContext || "无历史记录，开始新的分析周期。"}

  [分析原则]:
  1. 连续性：必须对比昨日计划的达成情况，分析偏差。
  2. 量化思维：使用风险敞口、成交量分布、多空合力评分等术语。
  3. 确定性：大盘预判必须给出明确的支撑(Support)和压力(Resistance)位数字。
  4. 实战性：交易计划必须包含具体的触发价，禁止含糊其辞。
`;

/**
 * 深度复盘适配器
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
  historyData?: string // 传入历史日志内容
): Promise<AnalysisResult> => {
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');
  const systemInstruction = getCQOSystemInstruction(timeContext, historyData);

  if (provider === ModelProvider.GEMINI_INTL) {
    const geminiKey = settings?.geminiKey; 
    if (isDashboard) return await fetchMarketDashboard(period, market, geminiKey);
    let finalPrompt = `${systemInstruction}\n\n[指令]: ${prompt}`;
    return await fetchGeminiAnalysis(finalPrompt, isComplex, geminiKey);
  }

  // 腾讯混元路径
  const apiKey = settings?.hunyuanKey || '';
  let finalPrompt = `${systemInstruction}\n\n[指令]: ${prompt}`;
  if (currentPrice) finalPrompt += `\n[参考价: ${currentPrice}]`;
  
  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, isDashboard);
};

/**
 * 计划提取适配器 - 强制 JSON 格式对齐
 */
export const extractPlanWithLLM = async (
  provider: ModelProvider,
  content: string,
  settings: UserSettings
): Promise<{ items: PlanItem[], summary: string }> => {
  const jsonSchemaPrompt = `
    从复盘报告中提取结构化计划。
    输出 JSON 格式：
    {
      "items": [
        {"symbol": "名称", "action": "buy/sell/hold/monitor/t_trade", "price_target": "价位", "reason": "逻辑"}
      ],
      "summary": "明日核心思想"
    }
    
    文本内容：
    ${content}
  `;

  if (provider === ModelProvider.GEMINI_INTL) {
    return await extractTradingPlan(content, settings.geminiKey);
  }

  // 混元路径提取计划
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
  const prompt = `审计标单 "${query}" 的合力。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, MarketType.CN, true);
};

export const stockDiagnosisWithLLM = async (provider: ModelProvider, query: string, market: MarketType, image: string | null, price: string, settings: UserSettings) => {
  return await analyzeWithLLM(provider, `对股票 "${query}" 进行深度量化诊断。`, false, settings, false, 'day', price, market);
};

export const periodicReviewWithLLM = async (provider: ModelProvider, journals: any[], label: string, market: MarketType, settings: UserSettings) => {
  if (provider === ModelProvider.GEMINI_INTL) return await fetchPeriodicReview(journals, label, market, settings.geminiKey);
  const prompt = `历史复盘: ${label}。记录: ${JSON.stringify(journals)}。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, market, true);
};

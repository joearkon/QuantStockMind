
import { AnalysisResult, ModelProvider, UserSettings, MarketType } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard, fetchMacroForecaster } from "./geminiService";
import { fetchExternalAI } from "./externalLlmService";

/**
 * 集中式 LLM 请求分发器
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
  isMacroForecaster: boolean = false
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const fullTimeContext = `${dateStr} ${timeStr}`;
  const marketName = market === MarketType.US ? '美股' : market === MarketType.HK ? '港股' : 'A股';

  // 1. 处理 Google Gemini
  if (provider === ModelProvider.GEMINI_INTL) {
    if (isDashboard) return await fetchMarketDashboard(period, market);
    if (isMacroForecaster) return await fetchMacroForecaster(prompt, market);
    
    let datedPrompt = `[Context: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) datedPrompt += `\n[当前市价: ${currentPrice}]`;
    return await fetchGeminiAnalysis(datedPrompt, isComplex);
  }

  // 2. 处理国内模型 (混元)
  const apiKey = settings?.hunyuanKey || '';
  let finalPrompt = prompt;
  
  if (isDashboard) {
    finalPrompt = `今天是 ${fullTimeContext}。请生成一份"${period === 'day' ? '当日' : '本月'}"的 ${marketName} 市场深度分析报告。重点：指数数值、情绪评分、资金流向、深度逻辑、热门题材、仓位模型。`;
  } else if (isMacroForecaster) {
    finalPrompt = `你是一位资深宏观策略专家。针对以下输入进行深度推演：【${prompt}】。
    请分析 ${marketName} 市场的：1. 短期催化剂与板块轮动；2. "十五五"期间的结构性机会。
    请以 JSON 格式输出，包含 summary, short_term_outlook, strategic_planning_15th, logic_chain, risk_warning 字段。`;
  } else {
    finalPrompt = `[Context: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) finalPrompt += `\n[用户提供实时价: ${currentPrice}]`;
    finalPrompt += `\n请搜索并分析该标的的"主力/机构资金流向"以及"成交量形态"(放量/缩量)。`;
  }

  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, isMacroForecaster);
};

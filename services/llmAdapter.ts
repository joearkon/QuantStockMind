import { AnalysisResult, ModelProvider, UserSettings, MarketType } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard } from "./geminiService";
import { fetchExternalAI } from "./externalLlmService";

/**
 * Centralized function to route requests to the correct model provider.
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

  // Market Name for Prompt Context
  const marketName = market === MarketType.US ? '美股 (US Stocks)' : market === MarketType.HK ? '港股 (HK Stocks)' : 'A股 (China A-Shares)';

  // 1. Google Gemini (Default)
  if (provider === ModelProvider.GEMINI_INTL) {
    const geminiKey = settings?.geminiKey; 

    if (isDashboard) {
      return await fetchMarketDashboard(period, market, geminiKey);
    }
    let datedPrompt = `[上下文: 正在分析 ${marketName} 市场，时间: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) {
      datedPrompt += `\n[重要: 用户指定的当前实时价格为 ${currentPrice}。请基于此价格进行所有计算和分析。]`;
    }
    if (!isDashboard) {
      datedPrompt += `\n[必须]: 你必须搜索并分析该标的的 '主力资金/机构资金' 流向和 '机构评级'。`;
      datedPrompt += `\n[必须]: 你必须分析 '成交量趋势' (放量/缩量) 并解释其技术含义。`;
      datedPrompt += `\n[警告]: 所有的分析内容和结论必须使用中文。`;
    }
    return await fetchGeminiAnalysis(datedPrompt, isComplex, geminiKey);
  }

  // 2. Domestic Models (Hunyuan)
  let apiKey = '';

  if (provider === ModelProvider.HUNYUAN_CN) {
    apiKey = settings?.hunyuanKey || '';
    if (!apiKey) {
      throw new Error(`未检测到 混元 API Key。请在设置中配置。`);
    }
  }

  // 3. Construct Prompts
  let finalPrompt = prompt;
  
  if (isDashboard) {
    finalPrompt = `
      今天是 ${fullTimeContext}。
      作为高级分析师，请生成一份 ${marketName} 的${period === 'day' ? '当日' : '本月'}市场深度分析报告。
      请联网搜索最新的指数点位、成交额、主力流向。
      
      重点包含：
      1. 五大指数数值与具体涨跌幅。
      2. 成交量变化（放量或缩量）。
      3. 领涨与领跌板块及其背后的资金轮动逻辑。
      4. 宏观政策导向与外部环境影响。
      
      请确保数据真实准确。
    `;
  } else {
    finalPrompt = `[上下文: 正在分析 ${marketName} 市场，时间: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) {
       finalPrompt += `\n[用户输入] 当前实时价为: ${currentPrice}。必须基于此价格。`;
    }
    finalPrompt += `\n[强制要求] 分析 '主力成本' 和 '机构资金流向'。分析 '成交量趋势'。`;
    finalPrompt += `\n[语言要求] 所有输出必须为中文。`;
  }

  // Pass forceJson = true for Dashboard mode for Hunyuan
  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, isDashboard);
};
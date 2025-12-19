
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
    const geminiKey = settings?.geminiKey; // Get Key from UI settings

    if (isDashboard) {
      return await fetchMarketDashboard(period, market, geminiKey);
    }
    let datedPrompt = `[上下文: 正在分析 ${marketName} 市场，时间: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) {
      datedPrompt += `\n[重要: 用户指定的当前实时价格为 ${currentPrice}。请基于此价格进行所有计算和分析。]`;
    }
    // Add specific instruction for Stock Analysis to check Main Force
    if (!isDashboard) {
      datedPrompt += `\n[必须]: 你必须搜索并分析该标的的 '主力资金/机构资金' (Main Force/Institutional Money) 流向和 '机构评级' (Institutional Ratings)。`;
      datedPrompt += `\n[必须]: 你必须分析 '成交量趋势' (Trading Volume Trend) - 是放量 (Expanding) 还是缩量 (Contracting)？并解释其技术含义。`;
      datedPrompt += `\n[警告]: 所有的分析内容和结论必须使用中文。`;
    }
    return await fetchGeminiAnalysis(datedPrompt, isComplex, geminiKey);
  }

  // 2. Domestic Models (Hunyuan)
  let apiKey = '';

  if (provider === ModelProvider.HUNYUAN_CN) {
    apiKey = settings?.hunyuanKey || '';
    if (!apiKey) {
      throw new Error(`未检测到 混元 API Key。请在设置中配置，或在环境变量中添加 "VITE_HUNYUAN_API_KEY"。`);
    }
  }

  // 3. Construct Dashboard Prompt
  let finalPrompt = prompt;
  
  if (isDashboard) {
    finalPrompt = `
      今天是 ${fullTimeContext}。
      请根据你所掌握的 ${marketName} 市场知识（如有联网能力请优先使用，如无请基于近期市场趋势进行合理且专业的逻辑推演），生成一份"${period === 'day' ? '当日' : '本月'}"的 ${marketName} 市场深度分析报告。
      
      请务必提供具体的数据和观点，严禁使用"模拟数据"。
      
      重点关注：
      1. 该市场主要指数数值与涨跌（例如${market === MarketType.US ? '道指/纳指/标普' : market === MarketType.HK ? '恒指/恒生科技' : '上证/深证/创业板'}）。
      2. 市场情绪评分。
      3. 资金流向/板块轮动（**必须明确指出“主力资金”或“机构”在买入什么，卖出什么**）。
      4. 深度逻辑。
      5. 热门题材/个股。
      6. 机会分析（防御vs成长）。
      7. 仓位配置模型。
      
      所有返回内容必须使用中文。
    `;
  } else {
    finalPrompt = `[上下文: 正在分析 ${marketName} 市场，时间: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) {
       finalPrompt += `\n[用户输入] 当前实时价为: ${currentPrice}。你必须使用此价格进行分析（PE, PB, 支撑/压力位）。`;
    }
    // Add instruction for general analysis (Stock/Holdings) to check Main Force for ALL providers
    finalPrompt += `\n[强制要求] 利用搜索能力分析 '主力成本' (Main Force Cost) 和 '机构资金流向' (Institutional Fund Flow)。如果未找到数据，请明确说明。`;
    finalPrompt += `\n[强制要求] 分析 '成交量趋势' (放量/缩量)。`;
    finalPrompt += `\n[语言要求] 所有输出必须为中文。`;
  }

  // Pass forceJson = false for standard analysis
  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, false);
};

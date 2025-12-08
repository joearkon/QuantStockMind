
import { AnalysisResult, ModelProvider, UserSettings } from "../types";
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
  currentPrice?: string 
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const fullTimeContext = `${dateStr} ${timeStr}`;

  // 1. Google Gemini (Default)
  if (provider === ModelProvider.GEMINI_INTL) {
    if (isDashboard) {
      return await fetchMarketDashboard(period);
    }
    let datedPrompt = `[当前时间: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) {
      datedPrompt += `\n[IMPORTANT: The user states the CURRENT PRICE is ${currentPrice}. Use this value for all calculations.]`;
    }
    return await fetchGeminiAnalysis(datedPrompt, isComplex);
  }

  // 2. Domestic Models (Hunyuan only now)
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
      请根据你所掌握的A股市场知识（如有联网能力请优先使用，如无请基于近期市场趋势进行合理且专业的逻辑推演），生成一份"${period === 'day' ? '当日' : '本月'}"的A股市场深度分析报告。
      
      请务必提供具体的数据和观点，严禁使用"模拟数据"。
      
      重点关注：
      1. 指数数值与涨跌。
      2. 情绪评分。
      3. 资金轮动。
      4. 深度逻辑。
      5. 热门题材。
      6. 机会分析（防御vs成长）。
      7. 仓位配置模型。
    `;
  } else {
    finalPrompt = `[当前时间: ${fullTimeContext}] ${prompt}`;
    if (currentPrice) {
       finalPrompt += `\n[User Input] The current real-time price is: ${currentPrice}. You MUST use this price for all your analysis (PE, PB, Support/Resistance).`;
    }
  }

  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period);
};

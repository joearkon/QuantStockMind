
import { AnalysisResult, ModelProvider, UserSettings, MarketDashboardData } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard } from "./geminiService";

/**
 * Centralized function to route requests to the correct model provider.
 */
export const analyzeWithLLM = async (
  provider: ModelProvider,
  prompt: string,
  isComplex: boolean = false,
  settings?: UserSettings,
  isDashboard: boolean = false,
  period: 'day' | 'month' = 'day'
): Promise<AnalysisResult> => {
  
  // 1. Check Custom Keys for Domestic Models
  if (provider === ModelProvider.DEEPSEEK_CN) {
    if (!settings?.deepSeekKey) {
      throw new Error("未检测到 DeepSeek API Key。请在设置中配置，或确保环境变量 DEEPSEEK_API_KEY 已生效。");
    }
  }
  if (provider === ModelProvider.HUNYUAN_CN) {
    if (!settings?.hunyuanKey) {
      throw new Error("未检测到 混元 API Key。请在设置中配置，或确保环境变量 HUNYUAN_API_KEY 已生效。");
    }
  }

  // 2. Route Request
  if (provider === ModelProvider.GEMINI_INTL) {
    if (isDashboard) {
      return await fetchMarketDashboard(period);
    }
    return await fetchGeminiAnalysis(prompt, isComplex);
  }

  // 3. Simulation for Domestic Models (Mocking the behavior with the provided key)
  // In a real app, this would use fetch() to their respective REST endpoints
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock Structured Data for Dashboard
      if (isDashboard) {
        const mockDashboard: MarketDashboardData = {
          market_indices: [
            { name: "上证指数", value: "3386.91", change: "+0.85%", direction: "up" },
            { name: "深证成指", value: "11006.50", change: "+1.12%", direction: "up" },
            { name: "创业板指", value: "2289.80", change: "+1.45%", direction: "up" }
          ],
          market_sentiment: {
            score: provider === ModelProvider.DEEPSEEK_CN ? 78 : 72,
            summary: `${provider} 监测到市场情绪回暖，多头力量增强。`,
            trend: 'bullish'
          },
          capital_rotation: {
            inflow_sectors: ["人工智能", "低空经济", "券商"],
            inflow_reason: "政策利好叠加高风险偏好资金回流科技成长板块。",
            outflow_sectors: ["银行", "高股息", "煤炭"],
            outflow_reason: "防御性资金流出，转向高弹性进攻方向。"
          },
          deep_logic: {
            policy_driver: "监管层强调提升上市公司质量，并购重组预期升温。",
            external_environment: "美联储降息预期明确，全球流动性边际改善。",
            market_valuation: "主要指数估值仍处于历史低位区间，具备较高性价比。"
          },
          hot_topics: ["AI应用", "人形机器人", "固态电池"]
        };

        resolve({
          content: "Dashboard Data",
          structuredData: mockDashboard,
          timestamp: Date.now(),
          modelUsed: provider,
          isStructured: true
        });
      } else {
        // Regular Text Analysis
        resolve({
          content: `### [${provider} 分析报告]\n\n**API Key**: 已验证 (${provider === ModelProvider.DEEPSEEK_CN ? settings?.deepSeekKey?.slice(0,6)+'...' : settings?.hunyuanKey?.slice(0,6)+'...'})\n\n#### 核心观点\n基于当前市场数据，模型认为震荡向上概率较大。\n\n#### 建议\n关注科技成长方向。`,
          timestamp: Date.now(),
          modelUsed: provider,
          isStructured: false
        });
      }
    }, 1500);
  });
};

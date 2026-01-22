
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

  const marketName = market === MarketType.US ? '美股' : market === MarketType.HK ? '港股' : 'A股';

  if (provider === ModelProvider.GEMINI_INTL) {
    const geminiKey = settings?.geminiKey; 

    if (isDashboard) {
      return await fetchMarketDashboard(period, market, geminiKey);
    }

    const timeRealityInstruction = `
      [!!! 绝对时间指令 !!!]
      1. 当前真实时间: ${fullTimeContext}。
      2. 严禁声称“无法获取实时数据”。
      3. 基于 ${fullTimeContext} 进行逻辑推演。
    `;

    let datedPrompt = `${timeRealityInstruction}\n[分析对象: ${marketName}] ${prompt}`;
    if (currentPrice) {
      datedPrompt += `\n[参考价: ${currentPrice}]`;
    }
    return await fetchGeminiAnalysis(datedPrompt, isComplex, geminiKey);
  }

  // --- Hunyuan Optimization ---
  if (provider === ModelProvider.HUNYUAN_CN) {
    const apiKey = settings?.hunyuanKey || '';
    if (!apiKey) throw new Error(`未检测到 混元 API Key。`);

    let finalPrompt = "";
    
    if (isDashboard) {
      // 显式注入 JSON 模板，确保 Key 与 MarketAnalysis.tsx 严格对齐
      finalPrompt = `
        [时间锚点: ${fullTimeContext}] [市场: ${marketName}]
        任务：生成 ${period === 'day' ? '当日' : '本月'} 市场量化看板。
        要求：
        1. 严禁使用 "XXX" 占位符。
        2. 必须且仅输出严格的 JSON 格式，包含以下字段：
        {
          "data_date": "当前日期时间",
          "market_indices": [{"name": "指数名称", "value": "数值", "percent": "涨跌幅%", "direction": "up/down"}],
          "market_volume": {"total_volume": "成交额", "volume_delta": "增减额", "volume_trend": "expansion/contraction", "capital_mood": "简述"},
          "market_sentiment": {"score": 0-100, "summary": "一句话总结", "trend": "bullish/bearish/neutral", "warning_level": "Normal/Overheated"},
          "capital_composition": [{"type": "Foreign/Institutional/HotMoney/Retail", "label": "标签", "percentage": 数字, "trend": "increasing/decreasing/stable", "description": "描述"}],
          "capital_rotation": {"inflow_sectors": ["板块"], "outflow_sectors": ["板块"], "rotation_logic": "逻辑"},
          "macro_logic": {"policy_focus": "重点", "external_impact": "外部", "core_verdict": "核心结论"}
        }
      `;
    } else {
      finalPrompt = `
        [时间锚点: ${fullTimeContext}] [市场: ${marketName}]
        任务：对 ${prompt} 进行核心量化研判。
        要求：
        1. 严禁使用 "XXX" 等占位符。
        2. 结构清晰，包含：指标分析、关键价位(支撑/压力)、操作指令。
        3. 回复务必精炼，直接给干货。
      `;
    }

    // 看板请求 max_tokens 设置为 2500，提升生成速度
    return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, isDashboard, isDashboard ? 2500 : 2000);
  }

  throw new Error("Unsupported provider");
};

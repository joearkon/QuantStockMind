
import { AnalysisResult, ModelProvider, UserSettings, MarketType, StockSynergyResponse, PeriodicReviewData, PlanItem } from "../types";
import { fetchGeminiAnalysis, fetchMarketDashboard, fetchStockSynergy, fetchStockDetailWithImage, fetchPeriodicReview, extractTradingPlan } from "./geminiService";
import { fetchExternalAI } from "./externalLlmService";

/**
 * 核心逻辑路由：市场全览与通用分析
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
    if (isDashboard) return await fetchMarketDashboard(period, market, geminiKey);
    const timeInstruction = `当前真实时间: ${fullTimeContext}。基于此时间点进行逻辑推演。`;
    let datedPrompt = `${timeInstruction}\n[上下文: ${marketName}] ${prompt}`;
    if (currentPrice) datedPrompt += `\n[实时价: ${currentPrice}]`;
    return await fetchGeminiAnalysis(datedPrompt, isComplex, geminiKey);
  }

  // 混元路径
  const apiKey = settings?.hunyuanKey || '';
  let finalPrompt = prompt;
  if (isDashboard) {
    finalPrompt = `现在是 ${fullTimeContext}。生成一份 ${marketName} 的${period === 'day' ? '当日' : '本月'}市场深度分析报告。需包含指数、成交量、资金流向、宏观逻辑。`;
  } else {
    finalPrompt = `[确认时间: ${fullTimeContext}] [市场: ${marketName}] ${prompt}`;
    if (currentPrice) finalPrompt += `\n[实时现价: ${currentPrice}]`;
  }
  return await fetchExternalAI(provider, apiKey, finalPrompt, isDashboard, period, market, isDashboard);
};

/**
 * 标的合力审计适配器：对齐 Gemini 与 混元
 */
export const stockSynergyWithLLM = async (
  provider: ModelProvider,
  query: string,
  marketImg: string | null,
  holdingsImg: string | null,
  settings: UserSettings
): Promise<AnalysisResult> => {
  if (provider === ModelProvider.GEMINI_INTL) {
    return await fetchStockSynergy(query, marketImg, holdingsImg, settings.geminiKey || '');
  }

  // 混元路径：注入高度结构化的 Prompt 以对齐 Gemini 的 Schema
  const prompt = `
    作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。
    必须分析 K 线形态和筹码分布。严格输出 JSON 格式。
    JSON 需包含：
    - name, code, used_current_price
    - synergy_score (0-100), trap_risk_score (0-100), dragon_potential_score (0-100)
    - market_position (如: 龙头加速、分歧博弈等)
    - capital_consistency (如: 极高、一般、背离)
    - main_force_cost_anchor: { estimated_cost, safety_margin_percent, risk_level }
    - turnover_eval: { current_rate, is_sufficient: boolean, verdict }
    - main_force_portrait: { lead_type (游资/机构), entry_cost_est, hold_status }
    - t_plus_1_prediction: { expected_direction, confidence, price_range, opening_strategy, logic }
    - synergy_factors: [{ label, score, description }]
    - battle_verdict, action_guide, chase_safety_index (0-10)
  `;
  
  const apiKey = settings.hunyuanKey || '';
  // 如果有图，混元路径也通过 fetchExternalAI 处理（在提示词中告知有图，或将来扩展多模态）
  return await fetchExternalAI(provider, apiKey, prompt, false, undefined, MarketType.CN, true);
};

/**
 * 个股量化诊断适配器：对齐视觉识别与逻辑深度
 */
export const stockDiagnosisWithLLM = async (
  provider: ModelProvider,
  query: string,
  market: MarketType,
  image: string | null,
  currentPrice: string,
  settings: UserSettings
): Promise<AnalysisResult> => {
  if (provider === ModelProvider.GEMINI_INTL) {
    if (image) return await fetchStockDetailWithImage(image, query, market, settings.geminiKey || '', currentPrice);
    const prompt = `对 ${market} 股票 "${query}" 进行深度量化分析，包括技术位、筹码分布及操作建议。`;
    return await analyzeWithLLM(provider, prompt, false, settings, false, 'day', currentPrice, market);
  }

  // 混元路径
  const apiKey = settings.hunyuanKey || '';
  const prompt = `
    对 ${market} 股票 "${query}" 进行深度量化诊断。
    [!!! 绝对优先级 !!!]: 优先识别截图中的【最新价】和【K线/量能形态】。
    输出应包含：1.基础指标与视觉校准 2.压力/支撑位 3.量化择时打分 4.操作指令 (加仓/减仓/持有/观望) 5.核心研判。
  `;
  
  // 混元目前暂通过文本+视觉描述处理，或直接调用 vision 接口
  return await fetchExternalAI(provider, apiKey, prompt, false, undefined, market, false);
};

/**
 * 阶段性复盘适配器
 */
export const periodicReviewWithLLM = async (
  provider: ModelProvider,
  journals: any[],
  label: string,
  market: MarketType,
  settings: UserSettings
): Promise<AnalysisResult> => {
  if (provider === ModelProvider.GEMINI_INTL) {
    return await fetchPeriodicReview(journals, label, market, settings.geminiKey);
  }

  const prompt = `对以下历史交易记录进行【${label}】阶段性复盘：${JSON.stringify(journals)}。请严格按 JSON 格式输出复盘报告，包含 score, market_trend, summary, highlight, lowlight, execution, stock_diagnostics, improvement_advice。`;
  return await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, market, true);
};

/**
 * 计划提取适配器
 */
export const extractPlanWithLLM = async (
  provider: ModelProvider,
  content: string,
  settings: UserSettings
): Promise<{ items: PlanItem[], summary: string }> => {
  if (provider === ModelProvider.GEMINI_INTL) {
    return await extractTradingPlan(content, settings.geminiKey);
  }

  const prompt = `从以下分析文本中提取具体的交易计划项（JSON 格式，包含 items[{symbol, action, price_target, reason}], summary）：\n\n${content}`;
  const result = await fetchExternalAI(provider, settings.hunyuanKey || '', prompt, false, undefined, MarketType.CN, true);
  
  const parsed = result.structuredData as any;
  return { 
    items: (parsed?.items || []).map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9), status: 'pending' })), 
    summary: parsed?.summary || "" 
  };
};

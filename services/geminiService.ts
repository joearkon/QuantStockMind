
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, DualBoardScanResponse, MainBoardScanResponse, LimitUpLadderResponse, DragonSignalResponse, StockSynergyResponse, SectorLadderData } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// --- JSON Schemas for Structured Outputs ---

const screenshotSchema = {
  type: Type.OBJECT,
  properties: {
    totalAssets: { type: Type.NUMBER },
    positionRatio: { type: Type.NUMBER },
    date: { type: Type.STRING },
    holdings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          volume: { type: Type.NUMBER },
          costPrice: { type: Type.NUMBER },
          currentPrice: { type: Type.NUMBER },
          profit: { type: Type.NUMBER },
          profitRate: { type: Type.STRING },
          marketValue: { type: Type.NUMBER }
        },
        required: ["name", "code", "volume", "costPrice", "currentPrice", "profit", "profitRate", "marketValue"]
      }
    }
  },
  required: ["totalAssets", "holdings", "date"]
};

const stockSynergySchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    code: { type: Type.STRING },
    synergy_score: { type: Type.NUMBER },
    trap_risk_score: { type: Type.NUMBER },
    capital_consistency: { type: Type.STRING, enum: ["高度一致", "分歧严重", "机构接力", "散户合力"] },
    turnover_eval: {
      type: Type.OBJECT,
      properties: {
        current_rate: { type: Type.STRING },
        is_sufficient: { type: Type.BOOLEAN },
        verdict: { type: Type.STRING }
      },
      required: ["current_rate", "is_sufficient", "verdict"]
    },
    main_force_portrait: {
      type: Type.OBJECT,
      properties: { lead_type: { type: Type.STRING }, entry_cost_est: { type: Type.STRING }, hold_status: { type: Type.STRING } },
      required: ["lead_type", "entry_cost_est", "hold_status"]
    },
    synergy_factors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER }, description: { type: Type.STRING } },
        required: ["label", "score", "description"]
      }
    },
    battle_verdict: { type: Type.STRING },
    action_guide: { type: Type.STRING }
  },
  required: ["name", "code", "synergy_score", "trap_risk_score", "capital_consistency", "turnover_eval", "main_force_portrait", "synergy_factors", "battle_verdict", "action_guide"]
};

const dragonSignalSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    market_pulse: { type: Type.STRING },
    dragon_energy: { type: Type.NUMBER },
    signals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          signal_type: { type: Type.STRING, enum: ["龙回头", "一进二", "底部反转", "趋势中继"] },
          energy_score: { type: Type.NUMBER },
          alpha_logic: { type: Type.STRING },
          volume_status: { type: Type.STRING },
          key_support: { type: Type.STRING },
          key_target: { type: Type.STRING },
          risk_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        },
        required: ["name", "code", "signal_type", "energy_score", "alpha_logic", "volume_status", "key_support"]
      }
    }
  },
  required: ["scan_time", "market_pulse", "dragon_energy", "signals"]
};

const dualBoardScanSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    market_mood: { type: Type.STRING },
    hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
    stocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          board: { type: Type.STRING },
          control_score: { type: Type.NUMBER },
          cost_price: { type: Type.STRING },
          trend_momentum: { type: Type.STRING },
          rating: { type: Type.STRING },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING }
        },
        required: ["name", "code", "board", "control_score", "cost_price", "trend_momentum", "rating", "logic"]
      }
    }
  },
  required: ["scan_time", "stocks"]
};

// Robust JSON Parser
const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastIndex = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastIndex !== -1) clean = clean.substring(firstBrace, lastIndex + 1);
  try { return JSON.parse(clean); } catch (e) { return null; }
};

/**
 * 1. 基础 Gemini 文本分析
 */
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "无内容返回",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ uri: c.web?.uri, title: c.web?.title })).filter((s: any) => s.uri)
  };
};

/**
 * 2. 个股深度量化诊断 (多模态: 图片 + 搜索)
 */
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date().toLocaleString('zh-CN');
  
  const prompt = `
    作为顶级 A 股量化交易员，请结合以下两个维度的输入对标的“${query}”进行深度诊断：
    1. **视觉维度**：我上传了该标的的 K 线走势截图。请识别其中的均线位置、量能变化、支撑位及形态（如 W 底、底背离等）。
    2. **实时维度**：利用 googleSearch 检索该标的截至 ${now} 的最新公告、龙虎榜、行业 Beta 表现。
    
    输出必须包含 Markdown 标题：
    # 1. 基础数据与视觉指标 (BIAS/量价)
    # 2. 关键价位 (支撑、压力、止盈、止损)
    # 3. 行业 Beta 与洗盘诊断
    # 4. 量化评级与操作指令
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
      ]
    },
    config: { tools: [{ googleSearch: {} }] }
  });

  return {
    content: response.text || "分析生成失败",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({ uri: c.web?.uri, title: c.web?.title })).filter((s: any) => s.uri)
  };
};

/**
 * 3. 标的合力审计 (多模态)
 */
export const fetchStockSynergy = async (query: string, base64Image: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `深度审计“${query}”的合力状态。${base64Image ? "参考图片识别 K 线形态。" : ""} 识别主力是锁筹还是诱多。`;
  
  const parts: any[] = [{ text: prompt }];
  if (base64Image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: stockSynergySchema }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    stockSynergyData: robustParse(response.text || "{}")
  };
};

/**
 * 4. 解析券商持仓截图
 */
export const parseBrokerageScreenshot = async (base64Image: string, apiKey: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `识别截图中的持仓信息，提取总资产、仓位比例及个股详细 JSON。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] },
    config: { responseMimeType: "application/json", responseSchema: screenshotSchema }
  });
  return robustParse(response.text || "{}");
};

/**
 * 5. 双创涨停猎手扫描
 */
export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `扫描今日创业板、科创板所有已涨停标的。审计封板强度。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: dualBoardScanSchema }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    dualBoardScanData: robustParse(response.text || "{}")
  };
};

/**
 * 6. 龙脉信号审计
 */
export const fetchDragonSignals = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: "扫描全市场龙回头、一进二及底部反转信号。",
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: dragonSignalSchema }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    dragonSignalData: robustParse(response.text || "{}")
  };
};

/**
 * 其他扫描功能的补全逻辑
 */
export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: "审计今日主板涨停资金画像及游资席位。",
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: robustParse(response.text || "{}") };
};

export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: "拆解今日题材梯队结构及龙头强度。",
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: robustParse(response.text || "{}") };
};

export const fetchSectorLadderAnalysis = async (sectorName: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `分析板块“${sectorName}”的周期位置及梯队健康度。`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: robustParse(response.text || "{}") };
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `生成 ${market} ${period === 'day' ? '当日' : '月度'} 市场大局观报告。`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: robustParse(response.text || "{}") };
};

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `对用户 ${label} 的历史交易记录进行阶段性复盘。`,
    config: { responseMimeType: "application/json" }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: robustParse(response.text || "{}") };
};

export const extractTradingPlan = async (content: string, apiKey: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `从以下报告提取交易计划 JSON:\n${content}`,
    config: { responseMimeType: "application/json" }
  });
  const p = robustParse(response.text || "{}");
  return { items: p.items || [], summary: p.strategy_summary || "" };
};

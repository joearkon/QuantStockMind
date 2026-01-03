
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, DualBoardScanResponse, MainBoardScanResponse, LimitUpLadderResponse, DragonSignalResponse, StockSynergyResponse, SectorLadderData, JournalEntry, PatternHunterResponse, PatternVerificationResponse } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// --- JSON Schemas ---

const stockSynergySchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    code: { type: Type.STRING },
    synergy_score: { type: Type.NUMBER },
    trap_risk_score: { type: Type.NUMBER },
    dragon_potential_score: { type: Type.NUMBER },
    market_position: { type: Type.STRING },
    capital_consistency: { type: Type.STRING },
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
      properties: {
        lead_type: { type: Type.STRING },
        entry_cost_est: { type: Type.STRING },
        hold_status: { type: Type.STRING }
      },
      required: ["lead_type", "entry_cost_est", "hold_status"]
    },
    t_plus_1_prediction: {
      type: Type.OBJECT,
      properties: {
        expected_direction: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        price_range: { type: Type.STRING },
        opening_strategy: { type: Type.STRING },
        logic: { type: Type.STRING }
      },
      required: ["expected_direction", "confidence", "price_range", "opening_strategy", "logic"]
    },
    synergy_factors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          score: { type: Type.NUMBER },
          description: { type: Type.STRING }
        },
        required: ["label", "score", "description"]
      }
    },
    battle_verdict: { type: Type.STRING },
    action_guide: { type: Type.STRING },
    chase_safety_index: { type: Type.NUMBER }
  },
  required: ["name", "code", "synergy_score", "dragon_potential_score", "market_position", "t_plus_1_prediction", "synergy_factors", "battle_verdict", "action_guide", "chase_safety_index"]
};

const patternVerificationSchema = {
  type: Type.OBJECT,
  properties: {
    stock_name: { type: Type.STRING },
    verdict: { type: Type.STRING, enum: ["立即伏击", "继续观察", "逻辑失效", "等待放量"] },
    confidence_score: { type: Type.NUMBER },
    visual_diagnostic: { type: Type.STRING },
    volume_ratio_verdict: { type: Type.STRING },
    trigger_condition: { type: Type.STRING },
    stop_loss_point: { type: Type.STRING },
    target_space: { type: Type.STRING },
    battle_logic: { type: Type.STRING }
  },
  required: ["stock_name", "verdict", "confidence_score", "visual_diagnostic", "volume_ratio_verdict", "trigger_condition", "stop_loss_point", "target_space", "battle_logic"]
};

const patternHunterSchema = {
  type: Type.OBJECT,
  properties: {
    sector_context: { type: Type.STRING },
    sector_leader: { type: Type.STRING },
    market_stage: { type: Type.STRING },
    stocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          current_tier: { type: Type.STRING, enum: ["二梯队", "三梯队", "潜伏期"] },
          vacuum_score: { type: Type.NUMBER },
          volume_ratio_desc: { type: Type.STRING },
          catalyst_alignment: { type: Type.STRING },
          technical_setup: { type: Type.STRING },
          entry_signal_trigger: { type: Type.STRING },
          upside_potential: { type: Type.STRING },
          risk_warning: { type: Type.STRING }
        },
        required: ["name", "code", "current_tier", "vacuum_score", "volume_ratio_desc", "catalyst_alignment", "technical_setup", "entry_signal_trigger", "upside_potential", "risk_warning"]
      }
    }
  },
  required: ["sector_context", "sector_leader", "market_stage", "stocks"]
};

const holdingsSnapshotSchema = {
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
 * 深度验证：地量伏击终极研判 (修正版)
 */
export const fetchPatternVerification = async (
  stockInfo: string, 
  volumeRatio: string, 
  base64Image: string | null, 
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为首席量化官，执行【南兴模式 - 视觉与量比双重对齐】终极验证。
    待验证标的: "${stockInfo}"。
    用户提供当前实时量比: "${volumeRatio}"。
    
    [!!! 核心修正指令 !!!]:
    1. **拒绝陈旧数据**：图片中的股价（如 54.82）具有最高优先级。禁止引用 31.85 等历史过时价格。
    2. **ST 股排除**：如果识别到该标的是 ST 股，直接判定逻辑失效。
    3. **确定性数值**：confidence_score 必须是 0-100 之间的整数（例如 65 代表 65%）。严禁输出 0.65 这样的小数。
    4. **量比对齐**：输入量比为 ${volumeRatio}。分析当前是在“缩量洗盘期”还是“放量点火瞬间”。

    输出必须严格遵守 JSON 格式。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: patternVerificationSchema
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    patternVerificationData: robustParse(response.text || "{}")
  };
};

/**
 * 南兴模式猎手 - 自动排除 ST 版
 */
export const fetchNanxingPattern = async (sectorQuery: string, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    作为顶级题材猎手，执行【南兴模式 - 二三梯队地量埋伏】审计。
    
    [!!! 核心禁令 !!!]：
    1. **坚决排除 ST 和 *ST 股票**。
    2. **排除成交额极低（流动性差）的僵尸股**。
    3. **强制对齐价格**：通过搜索确认目前的真实位阶，严禁引用过时的历史低位价格。
    
    [算法]：
    寻找二、三梯队中，股价处于缩量洗盘末端、地量特征极度明显的标的。
    
    输出必须严格遵守 JSON 格式。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: patternHunterSchema
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    patternHunterData: robustParse(response.text || "{}")
  };
};

export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "",
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || ""
    })).filter((s: any) => s.uri),
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `生成报告`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: robustParse(response.text || "{}"), market };
};

export const fetchPeriodicReview = async (journals: JournalEntry[], periodLabel: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "复盘" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const extractTradingPlan = async (analysisContent: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  return { items: [], summary: "" };
};

export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "梯队" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchDualBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "双创" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchMainBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "主板" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchLimitUpLadder = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "阶梯" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchDragonSignals = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "龙脉" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchStockSynergy = async (query: string, base64Image: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为资深题材审计专家，执行【标的合力与妖股基因】深度审计。
    待审计标的: "${query}"。
    
    [!!! 核心指令 !!!]:
    1. **搜索 Alpha 信号**：联网搜索该股最近的公告、研报、龙虎榜席位动向。
    2. **基因比对**：将其逻辑与历史大妖股（如中国卫星、海天瑞声等）的起步特征进行对齐。
    3. **T+1 预判**：基于当前的筹码分布和情绪位置，预测次日的开盘博弈策略。
    
    必须输出 JSON 格式。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      responseSchema: stockSynergySchema
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    stockSynergyData: robustParse(response.text || "{}")
  };
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts = [{ text: `诊断股票: ${query}` }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }];
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

/**
 * 核心功能修复：解析持仓截图
 */
export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  if (!apiKey) throw new Error("Missing API Key for screenshot parsing.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    你是一位专业的股票账户分析助理。请识别并提取这张持仓截图中的所有关键数据。
    
    [提取要求]:
    1. **总资产**: 提取账户的总资产数值。
    2. **仓位占比**: 提取或计算目前的仓位百分比（若图中无直接数据，请根据持仓市值/总资产估算）。
    3. **持仓列表**: 包含标的名称、代码、持仓量（股数）、成本价、当前价、盈亏金额、盈亏比例、市值。
    4. **日期**: 识别截图中的日期（若无则使用今天）。
    
    [输出格式]: 严格按照 JSON 格式输出。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });

  const parsed = robustParse(response.text || "{}");
  if (!parsed || !parsed.holdings) {
     throw new Error("未能识别到有效的持仓列表，请确保截图清晰且包含持仓表格。");
  }

  return parsed;
};

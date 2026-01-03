
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, DualBoardScanResponse, MainBoardScanResponse, LimitUpLadderResponse, DragonSignalResponse, StockSynergyResponse, SectorLadderData, JournalEntry, PatternHunterResponse, PatternVerificationResponse } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// --- JSON Schemas ---

const limitUpLadderSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    total_limit_ups: { type: Type.NUMBER },
    market_conclusion: { type: Type.STRING },
    sectors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING },
          sector_type: { type: Type.STRING, enum: ["Main", "Sub"] },
          total_count: { type: Type.NUMBER },
          max_height: { type: Type.NUMBER },
          integrity_score: { type: Type.NUMBER },
          market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] },
          dragon_leader: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              code: { type: Type.STRING },
              consecutive_days: { type: Type.NUMBER },
              strength_score: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ["name", "code", "consecutive_days", "strength_score", "reason"]
          },
          ladder_matrix: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                height: { type: Type.NUMBER },
                count: { type: Type.NUMBER },
                stocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      code: { type: Type.STRING },
                      logic: { type: Type.STRING }
                    },
                    required: ["name", "code", "logic"]
                  }
                }
              },
              required: ["height", "count", "stocks"]
            }
          }
        },
        required: ["sector_name", "sector_type", "total_count", "dragon_leader", "ladder_matrix", "integrity_score", "market_sentiment"]
      }
    }
  },
  required: ["scan_time", "total_limit_ups", "market_conclusion", "sectors"]
};

const boardScanSchema = {
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
          rating: { type: Type.STRING, enum: ["起爆", "锁筹", "分歧", "出货", "潜伏"] },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING },
          limit_up_type: { type: Type.STRING },
          consecutive_days: { type: Type.NUMBER },
          capital_portrait: {
            type: Type.OBJECT,
            properties: {
              main_type: { type: Type.STRING },
              key_players: { type: Type.ARRAY, items: { type: Type.STRING } },
              influence_verdict: { type: Type.STRING }
            }
          }
        },
        required: ["name", "code", "control_score", "cost_price", "rating", "logic"]
      }
    }
  },
  required: ["scan_time", "market_mood", "stocks"]
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
        required: ["name", "code", "signal_type", "energy_score", "alpha_logic", "key_support", "key_target"]
      }
    }
  },
  required: ["scan_time", "market_pulse", "dragon_energy", "signals"]
};

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
 * 核心修复：今日涨停题材梯队审计
 * 强化版：增加对 Robotics/AI/低空经济等热点板块的强制扫描
 */
export const fetchLimitUpLadder = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为资深行情审计师，利用 googleSearch 深度检索【最新交易日】A 股全市场的涨停池。
    
    [!!! 核心覆盖要求 !!!]
    1. **全面扫描**：严禁遗漏任何产生 3 只及以上涨停标的的板块。
    2. **重点关注**：近期热门题材如【机器人/人形机器人】、AI应用、低空经济、商业航天、半导体设备等。
    3. **梯队解构**：按题材归类并识别“5-4-3-2-1”梯队结构。
    4. **龙头锁定**：识别每个题材的灵魂龙头，并给出其精准连板数。
    5. **大局研判**：评估今日市场是“主线清晰”还是“混沌轮动”。
    
    输出必须严格遵守 JSON 格式。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: limitUpLadderSchema
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    limitUpLadderData: robustParse(response.text || "{}")
  };
};

/**
 * 修复：双创涨停扫描
 */
export const fetchDualBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    扫描今日创业板(300xxx)与科创板(688xxx)的【涨停及大涨】标的。
    审计封板质量、主力控盘分、扫货成本及次日预期。
    输出 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: boardScanSchema
    }
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
 * 修复：主板涨停扫描
 */
export const fetchMainBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    扫描今日沪深主板涨停标的。
    穿透龙虎榜识别主导资金性质（游资大佬或机构）。
    输出 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: boardScanSchema
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    mainBoardScanData: robustParse(response.text || "{}")
  };
};

/**
 * 修复：龙脉信号审计
 */
export const fetchDragonSignals = async (apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    审计全市场“龙回头”、“一进二”、“底部反转”信号。
    找出当前市场最具 Alpha 催化力的 5-10 只标的。
    输出 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: dragonSignalSchema
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    dragonSignalData: robustParse(response.text || "{}")
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
  const prompt = `生成${period === 'day' ? '当日' : '本月'}市场快报。请包含指数、成交量、资金轮动、宏观逻辑。输出 JSON。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
    }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: robustParse(response.text || "{}"), market };
};

export const fetchPeriodicReview = async (journals: JournalEntry[], periodLabel: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: "请对这些持仓记录进行阶段性总结" });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const extractTradingPlan = async (analysisContent: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  return { items: [], summary: "" };
};

export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: `分析板块: ${query}` });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchStockSynergy = async (query: string, base64Image: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为资深题材审计专家，执行【标的合力与妖股基因】深度审计。
    待审计标的: "${query}"。
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
    请识别这张持仓截图中的数据。输出 JSON 格式.
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
     throw new Error("未能识别到有效的持仓列表");
  }

  return parsed;
};

// --- Pattern Hunter Exports ---

/**
 * 核心功能：南兴模式（地量猎手）探测
 */
export const fetchNanxingPattern = async (query: string, apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为资深题材审计专家，深度探测当前市场中符合“南兴股份模式”（二三梯队、地量真空、非ST、非僵尸股）的标的。
    板块范围: "${query || '全市场'}"。
    必须通过 googleSearch 检索最新数据。
    输出 JSON。
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

/**
 * 核心功能：南兴模式终极实战审计
 */
export const fetchPatternVerification = async (stockInfo: string, volumeRatio: string, base64Image: string | null, apiKey?: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    针对标的 "${stockInfo}" 执行终极实战模式审计。
    用户输入的实时量比为: "${volumeRatio}"。
    ${base64Image ? "【视觉辅助】我上传了最新的 K 线截图，请以此作为最高优先级对齐股价和形态，废弃任何陈旧的搜索数据。" : "请通过 googleSearch 检索最新研报与股价。"}
    
    【核心审计逻辑】
    1. 判定其地量结构是否真实有效。
    2. 评估其爆发确定性。
    3. 给出精确的买入触发点、止损位与博弈逻辑。
    
    输出 JSON。
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

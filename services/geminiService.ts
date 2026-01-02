

// Fix: Added missing imports and functions required by the application components.
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, DualBoardScanResponse, MainBoardScanResponse, LimitUpLadderResponse, StockSynergyResponse, SectorLadderData, JournalEntry, DragonSignalResponse } from "../types";

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
    market_position: { type: Type.STRING, enum: ["板块灵魂/龙头", "中军/核心权重", "跟风/补涨", "独立行情"] },
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
        expected_direction: { type: Type.STRING, enum: ["看涨", "看跌", "高位震荡", "冲高回落", "下杀探底"] },
        confidence: { type: Type.NUMBER, description: "胜率预估，必须是 0-100 之间的整数" },
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
        properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER }, description: { type: Type.STRING } },
        required: ["label", "score", "description"]
      }
    },
    battle_verdict: { type: Type.STRING },
    action_guide: { type: Type.STRING },
    chase_safety_index: { type: Type.NUMBER }
  },
  required: ["name", "code", "synergy_score", "trap_risk_score", "dragon_potential_score", "market_position", "capital_consistency", "turnover_eval", "main_force_portrait", "t_plus_1_prediction", "synergy_factors", "battle_verdict", "action_guide", "chase_safety_index"]
};

const marketDashboardSchema = {
  type: Type.OBJECT,
  properties: {
    data_date: { type: Type.STRING },
    market_indices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          change: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ["up", "down"] },
          percent: { type: Type.STRING }
        },
        required: ["name", "value", "change", "direction", "percent"]
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] },
        net_inflow: { type: Type.STRING },
        capital_mood: { type: Type.STRING }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "capital_mood"]
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
      },
      required: ["score", "summary", "trend"]
    },
    capital_rotation: {
      type: Type.OBJECT,
      properties: {
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        rotation_logic: { type: Type.STRING }
      },
      required: ["inflow_sectors", "outflow_sectors", "rotation_logic"]
    },
    macro_logic: {
      type: Type.OBJECT,
      properties: {
        policy_focus: { type: Type.STRING },
        external_impact: { type: Type.STRING },
        core_verdict: { type: Type.STRING }
      },
      required: ["policy_focus", "external_impact", "core_verdict"]
    }
  },
  required: ["data_date", "market_indices", "market_volume", "market_sentiment", "capital_rotation", "macro_logic"]
};

const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "sideways"] },
    market_summary: { type: Type.STRING },
    monthly_portfolio_summary: { type: Type.STRING },
    highlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ["title", "description"]
    },
    lowlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ["title", "description"]
    },
    execution: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        details: { type: Type.STRING },
        good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } },
        bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["score", "details", "good_behaviors", "bad_behaviors"]
    },
    stock_diagnostics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          verdict: { type: Type.STRING }
        },
        required: ["name", "issues", "verdict"]
      }
    },
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_trend", "market_summary", "highlight", "lowlight", "execution", "stock_diagnostics", "next_period_focus", "improvement_advice"]
};

const sectorLadderSchema = {
  type: Type.OBJECT,
  properties: {
    sector_name: { type: Type.STRING },
    cycle_stage: { type: Type.STRING, enum: ["Starting", "Growing", "Climax", "End", "Receding"] },
    stage_label: { type: Type.STRING },
    risk_score: { type: Type.NUMBER },
    ladder: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tier: { type: Type.STRING },
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                price: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["Leading", "Stagnant", "Following", "Weakening"] },
                performance: { type: Type.STRING },
                health_score: { type: Type.NUMBER },
                logic: { type: Type.STRING }
              },
              required: ["name", "code", "price", "status", "performance", "health_score", "logic"]
            }
          }
        },
        required: ["tier", "stocks"]
      }
    },
    structural_integrity: {
      type: Type.OBJECT,
      properties: {
        synergy_score: { type: Type.NUMBER },
        verdict: { type: Type.STRING },
        is_divergent: { type: Type.BOOLEAN }
      },
      required: ["synergy_score", "verdict", "is_divergent"]
    },
    support_points: { type: Type.ARRAY, items: { type: Type.STRING } },
    warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
    action_advice: { type: Type.STRING }
  },
  required: ["sector_name", "cycle_stage", "stage_label", "risk_score", "ladder", "structural_integrity", "support_points", "warning_signals", "action_advice"]
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
          board: { type: Type.STRING, enum: ["创业板", "科创板"] },
          control_score: { type: Type.NUMBER },
          cost_price: { type: Type.STRING },
          trend_momentum: { type: Type.STRING },
          rating: { type: Type.STRING, enum: ["起爆", "锁筹", "分歧", "出货", "潜伏"] },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING }
        },
        required: ["name", "code", "board", "control_score", "cost_price", "trend_momentum", "rating", "volume_ratio", "logic", "target_price", "support_price"]
      }
    }
  },
  required: ["scan_time", "market_mood", "hot_sectors", "stocks"]
};

const mainBoardScanSchema = {
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
          board: { type: Type.STRING, enum: ["沪市主板", "深市主板"] },
          limit_up_type: { type: Type.STRING, enum: ["首板", "连板"] },
          consecutive_days: { type: Type.NUMBER },
          control_score: { type: Type.NUMBER },
          cost_price: { type: Type.STRING },
          trend_momentum: { type: Type.STRING },
          rating: { type: Type.STRING, enum: ["起爆", "锁筹", "分歧", "出货", "潜伏"] },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING },
          capital_portrait: {
            type: Type.OBJECT,
            properties: {
              main_type: { type: Type.STRING, enum: ["游资主导", "机构抱团", "散户合力", "庄股嫌疑"] },
              key_players: { type: Type.ARRAY, items: { type: Type.STRING } },
              influence_score: { type: Type.NUMBER },
              influence_verdict: { type: Type.STRING }
            },
            required: ["main_type", "key_players", "influence_score", "influence_verdict"]
          }
        },
        required: ["name", "code", "board", "limit_up_type", "consecutive_days", "control_score", "cost_price", "trend_momentum", "rating", "volume_ratio", "logic", "target_price", "support_price"]
      }
    }
  },
  required: ["scan_time", "market_mood", "hot_sectors", "stocks"]
};

const limitUpLadderSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    total_limit_ups: { type: Type.NUMBER },
    sectors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING },
          sector_type: { type: Type.STRING, enum: ["Main", "Sub"] },
          total_count: { type: Type.NUMBER },
          max_height: { type: Type.NUMBER },
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
                    properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } },
                    required: ["name", "code", "logic"]
                  }
                }
              },
              required: ["height", "count", "stocks"]
            }
          },
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
          integrity_score: { type: Type.NUMBER },
          market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] }
        },
        required: ["sector_name", "sector_type", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score", "market_sentiment"]
      }
    },
    market_conclusion: { type: Type.STRING }
  },
  required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"]
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
          signal_type: { type: Type.STRING, enum: ["龙回头", "一进二", "底部反转", "趋势加速"] },
          energy_score: { type: Type.NUMBER },
          alpha_logic: { type: Type.STRING },
          key_target: { type: Type.STRING },
          key_support: { type: Type.STRING },
          volume_status: { type: Type.STRING }
        },
        required: ["name", "code", "signal_type", "energy_score", "alpha_logic", "key_target", "key_support", "volume_status"]
      }
    }
  },
  required: ["scan_time", "market_pulse", "dragon_energy", "signals"]
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
 * 标的合力审计 (多模态) - 核心修复：修复图片传输数组结构 & 强化龙头历史逻辑识别
 */
export const fetchStockSynergy = async (query: string, base64Image: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    对“${query}”执行标的合力审计。
    
    [!!! 龙头定位核心指令 - 参考中国卫星 20->90 逻辑 !!!]：
    1. **历史位置研判**：利用 googleSearch 回溯该标的前 12 个月的价格区间。判定当前是在“底部主升起点”、“中期合力中继”还是“末端情绪赶顶”。
    2. **基因审计**：该标的是否具备“板块灵魂”特质？（即：它涨，板块跟涨；它跌，板块跳水）。
    3. **追涨安全系数**：针对此类具备连板潜力的龙头，分析“分歧转一致”的机会，给出追涨安全指数。
    4. **视觉形态校准**：${base64Image ? "分析图片中的 K 线形态。重点寻找“横盘突破”、“缩量回踩颈线”或“空中加油”等能支撑长波段行情的形态。" : "根据联网数据研判形态。"}
    
    输出必须严格遵守 JSON 格式。
  `;
  
  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: [{ parts }], 
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

/**
 * 龙脉信号审计
 */
export const fetchDragonSignals = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `扫描全市场龙头股、底部金叉及极值回踩信号。过滤 Alpha 级别催化剂，锁定绝对强势。输出必须严格遵守 JSON。`;
  
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

// Fix: Implemented fetchGeminiAnalysis for general LLM queries.
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

// Fix: Implemented fetchMarketDashboard for structured market overviews.
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `生成一份 ${market} 市场的 ${period === 'day' ? '当日' : '本月'} 深度分析报告 JSON。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: marketDashboardSchema
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    structuredData: robustParse(response.text || "{}"),
    market
  };
};

// Fix: Implemented fetchPeriodicReview for historical analysis and trend summaries.
export const fetchPeriodicReview = async (journals: JournalEntry[], periodLabel: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `分析以下 ${periodLabel} 内的 ${market} 交易日志，并生成阶段性总结 JSON。
  日志内容: ${JSON.stringify(journals)}`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    periodicData: robustParse(response.text || "{}"),
    market
  };
};

// Fix: Implemented extractTradingPlan to convert text analysis into actionable plan items.
export const extractTradingPlan = async (analysisContent: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `从以下复盘分析中提取明日交易计划表。输出严格 JSON。
  分析内容: ${analysisContent}`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                action: { type: Type.STRING, enum: ["buy", "sell", "hold", "monitor", "t_trade"] },
                price_target: { type: Type.STRING },
                reason: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["pending", "completed", "skipped", "failed"] }
              },
              required: ["symbol", "action", "reason", "status"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["items", "summary"]
      }
    }
  });
  const parsed = robustParse(response.text || "{}");
  const items = (parsed.items || []).map((item: any) => ({
    ...item,
    id: Math.random().toString(36).substr(2, 9)
  }));
  return { items, summary: parsed.summary || "" };
};

// Fix: Implemented fetchSectorLadderAnalysis for sector cycle and trend mapping.
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `对板块 "${query}" 在 ${market} 市场进行梯队周期审计。联网搜索龙头、中军、补涨标的并对齐最新价。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: sectorLadderSchema
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    ladderData: robustParse(response.text || "{}"),
    market
  };
};

// Fix: Implemented fetchDualBoardScanning for ChiNext and STAR Market limit-up analysis.
export const fetchDualBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `扫描今日创业板与科创板已涨停标的。联网检索并分析控盘强度。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: dualBoardScanSchema
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

// Fix: Implemented fetchMainBoardScanning for Main Board limit-up and capital portrait analysis.
export const fetchMainBoardScanning = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `扫描今日沪深主板涨停标的。联网分析龙虎榜画像，识别顶级游资动向。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: mainBoardScanSchema
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

// Fix: Implemented fetchLimitUpLadder for thematic ladder auditing.
export const fetchLimitUpLadder = async (apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || "" });
  const prompt = `扫描全市场题材涨停梯队。识别 5-3-2-1 结构，锁定绝对主线题材。`;
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

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `对股票 "${query}" 在 ${market} 市场进行深度诊断。结合 K 线图分析 BIAS 风险、行业 Beta 及量价。`;
  
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: [{ parts }],
    config: { tools: [{ googleSearch: {} }] }
  });

  return {
    content: response.text || "",
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || ""
    })).filter((s: any) => s.uri),
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const key = apiKey || process.env.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `识别持仓截图 JSON。`;
  
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: [{ parts }],
    config: { responseMimeType: "application/json" }
  });

  return robustParse(response.text || "{}");
};
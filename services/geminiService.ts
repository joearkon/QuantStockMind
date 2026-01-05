
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
  AnalysisResult, 
  ModelProvider, 
  MarketType, 
  MarketDashboardData, 
  HoldingsSnapshot, 
  PeriodicReviewData, 
  PlanItem, 
  KLineSynergyData, 
  DualBoardScanResponse, 
  MainBoardScanResponse, 
  LimitUpLadderResponse,
  SectorLadderData
} from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// Schema for Market Dashboard
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
          percent: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ['up', 'down'] }
        }
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ['expansion', 'contraction', 'flat'] },
        capital_mood: { type: Type.STRING }
      }
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        trend: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'] }
      }
    },
    capital_rotation: {
      type: Type.OBJECT,
      properties: {
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        rotation_logic: { type: Type.STRING }
      }
    },
    macro_logic: {
      type: Type.OBJECT,
      properties: {
        policy_focus: { type: Type.STRING },
        external_impact: { type: Type.STRING },
        core_verdict: { type: Type.STRING }
      }
    }
  }
};

// Schema for Holdings
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
        }
      }
    }
  }
};

// Schema for Periodic Review
const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ['bull', 'bear', 'sideways'] },
    market_summary: { type: Type.STRING },
    monthly_portfolio_summary: { type: Type.STRING },
    highlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
    },
    lowlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
    },
    execution: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        details: { type: Type.STRING },
        good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } },
        bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    stock_diagnostics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          verdict: { type: Type.STRING }
        }
      }
    },
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

// Schema for Trading Plan extraction
const tradingPlanSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] },
          price_target: { type: Type.STRING },
          reason: { type: Type.STRING }
        }
      }
    },
    summary: { type: Type.STRING }
  }
};

// Schema for Limit-Up Ladder
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
                    properties: {
                      name: { type: Type.STRING },
                      code: { type: Type.STRING },
                      logic: { type: Type.STRING }
                    }
                  }
                }
              }
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
            }
          },
          dragon_seeds: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                capital_intensity: { type: Type.STRING, enum: ["Extreme", "High", "Normal"] },
                seat_analysis: { type: Type.STRING },
                incubation_logic: { type: Type.STRING },
                evolution_stage: { type: Type.STRING, enum: ["Seeding", "Sprouting", "Competing"] }
              }
            }
          },
          integrity_score: { type: Type.NUMBER },
          market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] }
        },
        required: ["sector_name", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score"]
      }
    },
    market_conclusion: { type: Type.STRING }
  },
  required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"]
};

// Schema for Dual Board Scan
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
          board: { type: Type.STRING, enum: ['创业板', '科创板'] },
          control_score: { type: Type.NUMBER },
          cost_price: { type: Type.STRING },
          trend_momentum: { type: Type.STRING },
          rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING }
        }
      }
    }
  }
};

// Schema for Main Board Scan
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
          board: { type: Type.STRING, enum: ['沪市主板', '深市主板'] },
          limit_up_type: { type: Type.STRING, enum: ['首板', '连板'] },
          consecutive_days: { type: Type.NUMBER },
          control_score: { type: Type.NUMBER },
          cost_price: { type: Type.STRING },
          trend_momentum: { type: Type.STRING },
          rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING }
        }
      }
    }
  }
};

// Schema for Sector Ladder Analysis
const sectorLadderSchema = {
  type: Type.OBJECT,
  properties: {
    sector_name: { type: Type.STRING },
    cycle_stage: { type: Type.STRING, enum: ['Starting', 'Growing', 'Climax', 'End', 'Receding'] },
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
                status: { type: Type.STRING, enum: ['Leading', 'Stagnant', 'Following', 'Weakening'] },
                performance: { type: Type.STRING },
                health_score: { type: Type.NUMBER },
                logic: { type: Type.STRING }
              }
            }
          }
        }
      }
    },
    structural_integrity: {
      type: Type.OBJECT,
      properties: {
        synergy_score: { type: Type.NUMBER },
        verdict: { type: Type.STRING },
        is_divergent: { type: Type.BOOLEAN }
      }
    },
    support_points: { type: Type.ARRAY, items: { type: Type.STRING } },
    warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
    action_advice: { type: Type.STRING }
  }
};

// Robust JSON Parser
const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastIndex = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (firstBrace !== -1 && lastIndex !== -1) clean = clean.substring(firstBrace, lastIndex + 1);
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
};

// Fix: Exported fetchLimitUpLadder
export const fetchLimitUpLadder = async (
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `作为顶级 A 股短线量化专家，请利用 googleSearch 实时扫描今日（${dateStr}）全市场的涨停数据并建立梯队矩阵。`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: limitUpLadderSchema
    }
  });

  const parsed = robustParse(response.text || "{}");

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    limitUpLadderData: parsed,
    market: MarketType.CN
  };
};

// Fix: Exported fetchDualBoardScanning
export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**创业板** 和 **科创板** 的【涨停封板】标的并评估控盘分。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      responseSchema: dualBoardScanSchema
    }
  });
  const parsed = robustParse(response.text || "{}");
  return { 
    content: response.text || "", 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.GEMINI_INTL, 
    isStructured: true,
    dualBoardScanData: parsed,
    market: MarketType.CN 
  };
};

// Fix: Exported fetchMainBoardScanning
export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**沪深主板** 的【涨停封板】标的。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      responseSchema: mainBoardScanSchema
    }
  });
  const parsed = robustParse(response.text || "{}");
  return { 
    content: response.text || "", 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.GEMINI_INTL, 
    isStructured: true,
    mainBoardScanData: parsed,
    market: MarketType.CN 
  };
};

// Fix: Exported fetchGeminiAnalysis
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

// Fix: Exported fetchMarketDashboard
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `生成一份 ${market} 的${period === 'day' ? '当日' : '本月'}市场深度分析报告。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: marketDashboardSchema
    }
  });
  const parsed = robustParse(response.text || "{}");
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    structuredData: parsed,
    market
  };
};

// Fix: Exported fetchStockDetailWithImage
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { text: `对 ${market} 的股票 "${query}" 进行深度量化分析。结合图片中的 K 线形态。` };
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

// Fix: Exported parseBrokerageScreenshot
export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { text: "解析截图中的持仓数据，输出 JSON。" };
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });
  return robustParse(response.text || "{}");
};

// Fix: Exported fetchPeriodicReview
export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `对以下历史交易记录进行【${label}】阶段性复盘：${JSON.stringify(journals)}`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });
  const parsed = robustParse(response.text || "{}");
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    periodicData: parsed,
    market
  };
};

// Fix: Exported extractTradingPlan
export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `从以下分析文本中提取具体的交易计划项：\n\n${content}`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });
  const parsed = robustParse(response.text || "{}");
  return {
    items: parsed.items?.map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9), status: 'pending' })) || [],
    summary: parsed.summary || ""
  };
};

// Fix: Exported fetchSectorLadderAnalysis
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `分析 ${market} 板块 "${query}" 的生命周期梯队及风险指数。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: sectorLadderSchema
    }
  });
  const parsed = robustParse(response.text || "{}");
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    ladderData: parsed,
    market
  };
};

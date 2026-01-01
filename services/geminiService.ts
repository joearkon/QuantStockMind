
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
  SectorLadderData,
  JournalEntry
} from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

// Robust JSON Parser to handle markdown blocks in responses
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

// --- SCHEMAS ---

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
        }
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
      }
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        trend: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
      }
    },
    capital_rotation: {
      type: Type.OBJECT,
      properties: {
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        inflow_reason: { type: Type.STRING },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_reason: { type: Type.STRING },
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

const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "sideways"] },
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

const tradingPlanSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          symbol: { type: Type.STRING },
          action: { type: Type.STRING, enum: ["buy", "sell", "hold", "monitor", "t_trade"] },
          price_target: { type: Type.STRING },
          reason: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["pending", "completed", "skipped", "failed"] }
        },
        required: ["id", "symbol", "action", "status"]
      }
    },
    summary: { type: Type.STRING }
  },
  required: ["items", "summary"]
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
        }
      }
    }
  }
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
          support_price: { type: Type.STRING }
        }
      }
    }
  }
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
          integrity_score: { 
            type: Type.NUMBER, 
            description: "0-100分。基于5-3-2-1模型判定。" 
          },
          integrity_label: { 
            type: Type.STRING, 
            description: "梯队评价" 
          },
          market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] }
        }
      }
    },
    market_conclusion: { type: Type.STRING }
  }
};

// --- API FUNCTIONS ---

// Fix for llmAdapter.ts
export const fetchGeminiAnalysis = async (
  prompt: string,
  isComplex: boolean = false,
  apiKey?: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: isComplex ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: false
  };
};

// Fix for llmAdapter.ts
export const fetchMarketDashboard = async (
  period: 'day' | 'month',
  market: MarketType,
  apiKey?: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `Generate a market dashboard for ${market} for the ${period}. Use googleSearch to get real-time data.`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: marketDashboardSchema
    }
  });

  const parsed = robustParse(response.text);

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    structuredData: parsed,
    market
  };
};

// Fix for StockAnalysis.tsx
export const fetchStockDetailWithImage = async (
  base64Image: string,
  query: string,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  const textPart = {
    text: `Perform a deep quantitative analysis for the stock "${query}" in the ${market} market. Identify technical patterns from the provided K-line chart and combine with real-time news.`
  };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: false,
    market
  };
};

// Fix for HoldingsReview.tsx
export const parseBrokerageScreenshot = async (
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  const textPart = {
    text: "Extract holdings information from this screenshot. Output JSON."
  };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });

  return robustParse(response.text);
};

// Fix for HoldingsReview.tsx
export const fetchPeriodicReview = async (
  journals: JournalEntry[],
  label: string,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const journalSummary = journals.map(j => `Date: ${new Date(j.timestamp).toLocaleDateString()}, Assets: ${j.snapshot.totalAssets}, Holdings: ${j.snapshot.holdings.length}`).join('\n');
  const prompt = `Perform a ${label} periodic review for the ${market} market based on the following journal entries:\n${journalSummary}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });

  const parsed = robustParse(response.text);

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    periodicData: parsed,
    market
  };
};

// Fix for HoldingsReview.tsx
export const extractTradingPlan = async (
  content: string,
  apiKey: string
): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Extract a structured trading plan from this analysis content:\n${content}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });

  const parsed = robustParse(response.text);
  return {
    items: parsed?.items || [],
    summary: parsed?.summary || ""
  };
};

// Fix for SectorCycleAnalysis.tsx
export const fetchSectorLadderAnalysis = async (
  query: string,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Perform a sector ladder and cycle analysis for "${query}" in the ${market} market. Use googleSearch.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: sectorLadderSchema
    }
  });

  const parsed = robustParse(response.text);

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    ladderData: parsed,
    market
  };
};

// Fix for KLineMaster.tsx
export const fetchDualBoardScanning = async (
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Scan GEM and Star Market for limit-up stocks and institutional control levels. Use googleSearch.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: dualBoardScanSchema
    }
  });

  const parsed = robustParse(response.text);

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    dualBoardScanData: parsed,
    market: MarketType.CN
  };
};

// Fix for MainBoardMaster.tsx
export const fetchMainBoardScanning = async (
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Scan Shanghai and Shenzhen Main Boards for limit-up stocks and categorize them by type (first/consecutive). Use googleSearch.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: mainBoardScanSchema
    }
  });

  const parsed = robustParse(response.text);

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    mainBoardScanData: parsed,
    market: MarketType.CN
  };
};

/**
 * UPDATED: Multi-stage Discovery with Rigorous Integrity Scoring
 */
export const fetchLimitUpLadder = async (
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    作为顶级 A 股短线量化专家，请利用 googleSearch 实时扫描今日（${dateStr}）全市场的【涨停标的】。
    
    【核心任务：梯队完整度打分 (Integrity Scoring)】
    请对每个板块的涨停分布进行建模：
    1. **判定金字塔模型**：健康的题材应呈现 5-3-2-1 分布。
    2. **计算 Integrity Score (0-100)**。
    
    请输出严格格式的 JSON。
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


import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

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

const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "sideways"] },
    market_summary: { type: Type.STRING },
    alpha_beta_analysis: { 
      type: Type.STRING, 
      description: "深度分析：用户的盈利中有多少属于市场普涨红利(Beta)，有多少属于选股逻辑兑现(Alpha)。特别针对12月到1月的跨年行情进行穿透。" 
    },
    new_year_strategy: {
      type: Type.STRING,
      description: "针对 1 月份行情的专项前瞻建议与风控方针。"
    },
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
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_trend", "market_summary", "alpha_beta_analysis", "new_year_strategy", "highlight", "lowlight", "execution", "stock_diagnostics", "next_period_focus"]
};

// Define response schema for market dashboard data
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
        inflow_reason: { type: Type.STRING },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_reason: { type: Type.STRING },
        rotation_logic: { type: Type.STRING }
      },
      required: ["inflow_sectors", "outflow_sectors", "rotation_logic"]
    },
    macro_logic: {
       type: Type.OBJECT,
       properties: {
          policy_focus: { type: Type.STRING },
          macro_event: { type: Type.STRING },
          impact_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          external_impact: { type: Type.STRING },
          core_verdict: { type: Type.STRING }
       }
    }
  }
};

// Define response schema for sector cycle and ladder analysis
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

// Define response schema for parsing brokerage holdings screenshot
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
  required: ["totalAssets", "date", "holdings"]
};

// Fix for Error in file services/llmAdapter.ts on line 2
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `分析 ${market} 市场 ${period === 'day' ? '当日' : '本月'} 的宏观数据和行业动向。请使用 googleSearch 获取最新指数、成交额和资金流向。`;
  
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

// Fix for Error in file components/StockAnalysis.tsx on line 6
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  const textPart = {
    text: `请结合提供的图片和文字对 ${market} 市场的标的 "${query}" 进行多维量化分析。利用 googleSearch 搜集最新动态。`
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
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || "网页来源"
    })),
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

// Fix for Error in file components/HoldingsReview.tsx on line 5
export const parseBrokerageScreenshot = async (base64Image: string, apiKey: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  const textPart = {
    text: `解析此证券账户持仓截图。输出包含总资产、持仓比例以及具体的标的列表（名称、代码、持股数、盈亏等）。`
  };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });

  const parsed = robustParse(response.text || "{}");
  return parsed as HoldingsSnapshot;
};

// Fix for Error in file components/HoldingsReview.tsx on line 5
export const extractTradingPlan = async (content: string, apiKey: string): Promise<any> => {
  // Mock implementation for the missing member error
  return {};
};

// Fix for Error in file components/SectorCycleAnalysis.tsx on line 4
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `通过 googleSearch 扫描 ${market} 市场中 "${query}" 板块的现状。构建领涨、中军、补涨梯队。评估板块周期位置（启动/主升/高潮/退潮）。`;
  
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

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const historyData = journals.map(j => ({
    date: new Date(j.timestamp).toLocaleDateString(),
    holdings: j.snapshot?.holdings?.map((h: any) => ({ name: h.name, profit: h.profit, profitRate: h.profitRate, cost: h.costPrice, price: h.currentPrice })),
    totalAssets: j.snapshot?.totalAssets
  }));

  const prompt = `
    作为资深基金经理，基于以下历史持仓记录进行【${label}】的阶段性复盘。
    
    【核心审计任务】：
    1. **跨年实力审计 (Alpha vs Beta)**：利用 googleSearch 检索并对比 12 月至今 ${market} 市场的表现。上证指数 7 连阳期间，全市场中位数涨幅是多少？用户的盈利是超越了普涨，还是仅仅跟随？
    2. **执行力验证**：用户自称 12 月中旬开始坚持复盘且执行力 80 分。请分析这段时间的资金曲线，如果曲线平稳且在反弹中具备爆发力，请给予肯定并指出具体的逻辑贡献点。
    3. **1月行情前瞻**：结合当前市场情绪水位，给出 1 月份的应对策略（如：防守切换、主线潜伏等）。
    
    历史数据：
    ${JSON.stringify(historyData, null, 2)}
    
    必须输出严格的 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
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

export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY;
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    content: response.text || "",
    groundingSource: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || "网页来源"
    })),
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL
  };
};

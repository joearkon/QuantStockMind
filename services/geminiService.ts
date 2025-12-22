
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// Sector Ladder Schema
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
                status: { type: Type.STRING, enum: ["Leading", "Stagnant", "Following", "Weakening"] },
                performance: { type: Type.STRING },
                health_score: { type: Type.NUMBER },
                logic: { type: Type.STRING }
              },
              required: ["name", "code", "status", "performance", "health_score", "logic"]
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

// Market Dashboard Schema
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
        required: ["name", "value", "direction"]
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING, enum: ["expansion", "contraction", "flat"] },
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

// Holdings Snapshot Schema
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
        required: ["name", "code", "volume", "costPrice", "currentPrice"]
      }
    }
  },
  required: ["totalAssets", "holdings"]
};

// Periodic Review Schema
const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "sideways"] },
    market_summary: { type: Type.STRING },
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
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_trend", "market_summary", "highlight", "lowlight", "execution", "next_period_focus"]
};

// Trading Plan Schema
const tradingPlanSchema = {
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
          reason: { type: Type.STRING }
        },
        required: ["symbol", "action", "reason"]
      }
    },
    summary: { type: Type.STRING }
  },
  required: ["items", "summary"]
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

/**
 * Basic analysis with text-based prompting.
 */
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
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

/**
 * Fetches market dashboard data with structured output.
 */
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `生成一份 ${market} 市场 ${period === 'day' ? '今日' : '本月'} 的深度研报。包含指数、成交量、资金轮动、情绪评分。请联网搜索最新数据。`;

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

/**
 * Multimodal analysis for stocks using an image and text.
 */
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `请深度分析截图中的股票 "${query}" 的技术形态与量价关系。${market === MarketType.CN ? '注意 A 股特色题材。' : ''}`;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image
    }
  };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

/**
 * Parses a brokerage screenshot into a structured holdings snapshot.
 */
export const parseBrokerageScreenshot = async (base64Image: string, apiKey: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = "请识别这张持仓截图中的所有数据，包括总资产、仓位占比以及详细持仓列表（名称、代码、数量、成本价、现价、盈亏）。";

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image
    }
  };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });

  return robustParse(response.text || "{}") as HoldingsSnapshot;
};

/**
 * Generates a periodic review from a series of journals.
 */
export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const historyText = journals.map(j => `日期: ${new Date(j.timestamp).toLocaleDateString()}, 盈亏: ${j.snapshot?.holdings?.reduce((sum: number, h: any) => sum + (h.profit || 0), 0)}`).join('\n');
  const prompt = `基于以下历史交易记录生成一份【${label}】的阶段性总结：\n${historyText}\n请重点分析执行力、高光点与不足点。`;

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

/**
 * Extracts a trading plan from analysis text.
 */
export const extractTradingPlan = async (content: string, apiKey: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `从以下分析报告中提取“明日交易计划”：\n\n${content}\n\n请识别出明确的 标的、动作(buy/sell/hold/monitor/t_trade)、价格目标、理由。`;

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
    items: (parsed.items || []).map((item: any) => ({ ...item, id: Math.random().toString(36).substring(7), status: 'pending' })),
    summary: parsed.summary || "交易计划提取"
  };
};

/**
 * Sector Ladder Analysis using Search Grounding.
 */
export const fetchSectorLadderAnalysis = async (sectorName: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为顶级 A 股量化专家，深度研判板块：“${sectorName}” 的生命周期。
    
    【严苛判别准则 - 必须执行】
    如果符合以下任一“凋零特征”，必须将其归类为 "End" (末期) 或 "Receding" (退潮期)，禁止判定为启动/成长：
    1. 资金面：主力资金日均净流出 > 10亿，或北向资金持续减持。
    2. 技术面：板块指数跌破 60日线 或 年线；成交量萎缩至前期高峰的 50% 以下。
    3. 逻辑面：行业从“政策强驱动”转向“市场化常态/存量博弈”（如当前的房地产、成熟期的新能源）。
    4. 龙头表现：板块内 80% 个股处于下降通道，龙头个股高位破位或反弹乏力。

    【输出结构】
    - 一梯队（龙头）：识别真龙头，判断其是否在“诱多”或“破位”。
    - 二梯队（中军）：评估大市值个股的承接力，是否已经“拒绝跟涨”。
    - 行情延续/终结：给出极具实战意义的预判信号。
    
    请输出严格的 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: sectorLadderSchema
    }
  });

  const text = response.text || "{}";
  const parsed = robustParse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    ladderData: parsed,
    market
  };
};

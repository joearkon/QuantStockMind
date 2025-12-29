
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, ChipAnalysisData, SectorLadderData } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

const chipAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    code: { type: Type.STRING },
    current_price: { type: Type.STRING },
    control_score: { type: Type.NUMBER },
    control_status: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
    main_cost: { type: Type.STRING },
    cost_distance: { type: Type.STRING },
    profit_ratio: { type: Type.STRING },
    chip_concentration: { type: Type.STRING },
    recent_big_flow: { type: Type.STRING },
    positions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          change: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["type", "change", "description"]
      }
    },
    battle_verdict: { type: Type.STRING }
  },
  required: ["name", "code", "current_price", "control_score", "control_status", "main_cost", "cost_distance", "profit_ratio", "chip_concentration", "recent_big_flow", "positions", "battle_verdict"]
};

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
        required: ["symbol", "action", "reason", "status"]
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
 * 筹码大师：主力控盘与成本分析
 */
export const fetchInstitutionalChipAnalysis = async (
  query: string,
  _apiKey: string,
  market: MarketType = MarketType.CN
): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    作为资深筹码分布与机构博弈专家，分析标的 "${query}" 的主力控盘度与核心成本。
    
    [!!! 核心分析任务 !!!]
    1. 联网检索：获取该股最近一次季报/中报的【股东人数变动】（筹码趋向集中还是分散）。
    2. 资金审计：利用 googleSearch 检索该股最近 1 个月的【大宗交易】价格与【龙虎榜机构净买入】。
    3. 成本测算：基于筹码密集峰原理，测算出机构/主力的【平均持仓成本价】。
    4. 控盘打分：给出 0-100 的控盘分数。80+ 代表高度控盘，50 以下代表筹码涣散。
    5. 外资动向：查阅【北向资金】（如果是 A 股）最近 10 日的持股比例变化。

    请直接输出 JSON，不要多余文字。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: chipAnalysisSchema
    }
  });

  const parsed = robustParse(response.text || "{}");

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    chipData: parsed,
    market
  };
};

/**
 * 获取股票详情及图片分析
 */
export const fetchStockDetailWithImage = async (
  base64Image: string,
  query: string,
  market: MarketType,
  _apiKey: string
): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image,
    },
  };
  const textPart = {
    text: `请结合该股票的 K 线图 "${query}" 进行深度量化分析。请分析 K 线形态、乖离率以及行业 Beta 过滤。`,
  };
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

/**
 * 解析经纪商截图中的持仓
 */
export const parseBrokerageScreenshot = async (
  base64Image: string,
  _apiKey: string
): Promise<HoldingsSnapshot> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: '请识别该截图中的所有持仓数据（名称、代码、持仓量、成本价、现价、盈亏、盈亏率、市值），并以 JSON 格式返回。' }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });
  return robustParse(response.text);
};

/**
 * 获取阶段性复盘报告
 */
export const fetchPeriodicReview = async (
  journals: any[],
  periodLabel: string,
  market: MarketType,
  _apiKey: string
): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `分析以下交易日志并生成 ${periodLabel} 的深度复盘报告（包含综合评分、市场趋势、高光/低谷点、执行审计、个股诊断、改进建议及下阶段焦点）： ${JSON.stringify(journals)}`;
  
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
    periodicData: robustParse(response.text),
    market
  };
};

/**
 * 从分析文本中提取交易计划
 */
export const extractTradingPlan = async (
  analysisText: string,
  _apiKey: string
): Promise<{ items: PlanItem[], summary: string }> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `从以下复盘分析报告中提取明日具体的交易计划（标的、操作类型、目标价、逻辑理由）： ${analysisText}`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });
  
  const parsed = robustParse(response.text);
  // Ensure each item has a unique ID
  if (parsed && parsed.items) {
    parsed.items = parsed.items.map((item: any) => ({
      ...item,
      id: item.id || Math.random().toString(36).substr(2, 9)
    }));
  }
  return parsed;
};

/**
 * 板块梯队效能分析
 */
export const fetchSectorLadderAnalysis = async (
  query: string,
  market: MarketType,
  _apiKey: string
): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `分析板块 "${query}" 的生命周期阶段、梯队结构（领涨、中军、补涨）、风险分数、结构性风险以及操作建议。请联网搜索最新行情。`;
  
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
    ladderData: robustParse(response.text),
    market
  };
};

/**
 * 扫描创业板机会
 */
export const fetchChiNextMarketScan = async (_apiKey: string): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: "扫描今日创业板具有合力潜力的个股机会，输出打分表。",
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { 
    content: response.text || "", 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.GEMINI_INTL, 
    isStructured: true, 
    klineSynergyData: robustParse(response.text || "{}"), 
    market: MarketType.CN 
  };
};

/**
 * K线合力研判
 */
export const fetchKLineSynergyAnalysis = async (query: string, base64Image: string | null, market: MarketType, _apiKey: string): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: `针对 "${query}" 进行 K 线合力深度研判，分析明后两日股价路线。` }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: 'image/png', data: base64Image } });
  }
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return { 
    content: response.text || "", 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.GEMINI_INTL, 
    isStructured: true, 
    klineSynergyData: robustParse(response.text || "{}"), 
    market 
  };
};

/**
 * 通用 Gemini 分析
 */
export const fetchGeminiAnalysis = async (prompt: string, _isComplex: boolean, _apiKey: string): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

/**
 * 市场看板
 */
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, _apiKey: string): Promise<AnalysisResult> => {
  // Always initialize with the hardcoded named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `提供 ${market} 市场的${period === 'day' ? '当日' : '本月'}看板分析，包含指数、成交量、资金流向、宏观逻辑等。`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
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

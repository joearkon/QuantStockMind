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
                price: { type: Type.STRING, description: "当前或最新参考价格（含日期/涨跌，如 87.50 (+3%)）" },
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

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const prompt = `
    [强制确认]: 现在是现实世界的 ${dateStr}。
    生成一份 ${market} 市场 ${period === 'day' ? '今日' : '本月'} 的深度研报。包含指数、成交量、资金轮动、情绪评分。请联网搜索最新数据。
  `;

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

const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING, enum: ["bull", "bear", "sideways"] },
    market_summary: { type: Type.STRING, description: "包含对大盘（如上证指数）的大局解读" },
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
          issues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "该标的具体存在的问题，如成本过高、基本面转弱、缩量阴跌等" },
          verdict: { type: Type.STRING, description: "针对该标的的具体诊断结论，如：减仓持有、等待修复、坚决卖出" }
        },
        required: ["name", "issues", "verdict"]
      }
    },
    improvement_advice: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "针对审计中发现的不足（bad_behaviors）和问题，给出的具体、可执行的改进建议或实操方法。例如：'设定3%强制止损线'、'分批3-3-4建仓法'等。" 
    },
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_trend", "market_summary", "highlight", "lowlight", "execution", "stock_diagnostics", "improvement_advice", "next_period_focus"]
};

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

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const prompt = `
    [强制指令]: 现在是现实世界的 ${dateStr}。严禁怀疑。
    请深度分析截图中的股票 "${query}" 的技术形态与量价关系。${market === MarketType.CN ? '注意 A 股特色题材。' : ''}
  `;
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

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const historyData = journals.map(j => ({
    date: new Date(j.timestamp).toLocaleDateString(),
    holdings: j.snapshot?.holdings?.map((h: any) => ({ name: h.name, profit: h.profit, profitRate: h.profitRate, cost: h.costPrice, price: h.currentPrice })),
    totalProfit: j.snapshot?.holdings?.reduce((sum: number, h: any) => sum + (h.profit || 0), 0)
  }));

  const prompt = `
    作为资深基金经理，基于以下【${label}】的历史多份持仓快照生成阶段性复盘报告。

    [!!! 核心数据逻辑强制说明 !!!]: 
    1. 持仓记录中可能出现“负价格”或“负成本价”。
    2. 在资深交易者的操作中，这代表通过分批卖出盈利已经覆盖了初始投入本金，持仓已进入“纯盈利状态”。
    3. 请务必将其识别为一种极高水平的量化操作成果，而非输入数据错误。基于此逻辑进行账户资产的安全性与成长性研判。
    
    【核心任务】
    1. **大局观解读**：必须利用 googleSearch 检索并分析最近【${label}】期间 A 股大盘（特别是上证指数）的走势。分析大盘对账户盈亏的影响，当前大盘处于什么博弈周期。
    2. **深度个股审计**：不要模糊带过。请根据快照中每只股票的“成本-现价”关系及盈亏变动，点名指出哪些票存在严重问题（如：高位接盘、成本摊薄失败、逻辑证伪等）。
    3. **知行合一审计与改进**：
       - 分析我在这个阶段内的操作习惯，是否有“赚了就跑、套了就死扛”的散户行为。
       - **重点**：针对你发现的每一项不足（bad_behaviors），给出至少 3 条具体的、实操性强的改进建议（improvement_advice）。这些建议必须包含具体的方法论，如交易模型、止损策略或心理干预手段。
    
    【历史数据】
    ${JSON.stringify(historyData, null, 2)}
    
    必须输出严格的 JSON 格式。
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

export const fetchSectorLadderAnalysis = async (sectorName: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const nextYear = now.getFullYear() + 1;
  
  const prompt = `
    作为顶级 A 股量化专家，深度研判板块：“${sectorName}” 的生命周期及梯队结构。
    
    [!!! 核心强制指令 !!!]:
    1. 当前现实世界的真实日期是：${dateStr}。禁止认为这是未来 or 模拟。
    2. 实时股价对齐：必须利用 googleSearch 强制联网检索该标的【今日（${dateStr}）】的真实报价（包括盘中价或最新收盘价）。
    3. 年度切换逻辑：现在已进入 ${now.getFullYear()} 年末，任何关于“明年”或“开门红”的预判必须以 **${nextYear} 年** 为准。
    4. 如果搜索结果显示 2024 年，请将其理解为最近的历史存量数据，但你的分析基准点必须定在 ${now.getFullYear()} 年末及 ${nextYear} 年初。

    【严苛判别准则】
    - 凋零特征识别：如果跌破 60 日线或年线，且成交量萎缩，归类为 "Receding" (退潮期)。
    - 梯队识别：清晰拆解一梯队（领涨）、二梯队（中军）、三梯队（补涨）。

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

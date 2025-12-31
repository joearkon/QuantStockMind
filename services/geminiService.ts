

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, MarketDashboardData, HoldingsSnapshot, PeriodicReviewData, PlanItem, KLineSynergyData, DualBoardScanResponse, MainBoardScanResponse } from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// Dual Board Scan Schema
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
          trend_momentum: { type: Type.STRING, description: "封板动能描述（如：一字封死、T字板、回封强力）" },
          rating: { type: Type.STRING, enum: ["起爆", "锁筹", "分歧", "出货", "潜伏"] },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING }
        },
        required: ["name", "code", "board", "control_score", "cost_price", "trend_momentum", "rating", "logic"]
      }
    }
  },
  required: ["scan_time", "market_mood", "stocks"]
};

// Main Board Scan Schema (Enhanced)
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
        },
        required: ["name", "code", "board", "limit_up_type", "consecutive_days", "control_score", "cost_price", "trend_momentum", "rating", "logic"]
      }
    }
  },
  required: ["scan_time", "market_mood", "stocks"]
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

export const fetchDualBoardScanning = async (
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**创业板** 和 **科创板** 的【涨停封板】标的。
    
    [!!! 极重要指令 - 只要涨停股 !!!]
    1. 目标范围：仅限今日涨幅达 20%（或接近 20% 且处于封板状态）的创业板、科创板个股。
    2. 筛选数量：精选 **20 只** 涨停标的。如果今日涨停总数不足 20 只，请列出所有已涨停标的，并补充涨幅大于 15% 且主力资金净流入前列的强势备选。
    3. 核心审计维度：
       - **主力控盘分 (Control Score)**: 基于封单金额占成交额比例、撤单频率、以及涨停前的拉升角度。
       - **封板动能 (Trend Momentum)**: 描述封板质量。例如：“早盘秒板、资金溢价极高”或“烂板回封、筹码交换充分”。
       - **主力核心成本**: 重点计算今日主攻资金在分时图上的平均扫货价格。
    4. [!!! 严格剔除 !!!]: 严禁输出任何“安全垫”或“估值”逻辑，只看【势能】与【资金博弈】。
    
    请输出严格格式的 JSON。
  `;

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

export const fetchMainBoardScanning = async (
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    作为顶级 A 股量化短线专家，请利用 googleSearch 实时扫描今日（${dateStr}）**上证主板** 和 **深证主板** 的【涨停封板】标的。
    
    [!!! 核心进化指令 !!!]
    1. 目标范围：仅限今日涨幅 10%（或封板中）的沪深主板个股。
    2. **涨停类型识别**：
       - **首板**：今日为该标的近期首个涨停。
       - **连板**：今日为连续涨停的第 N 天（请务必准确计算 N）。
    3. 筛选数量：精选 **20 只** 核心涨停标的。
    4. 核心维度：主力控盘分（0-100）、扫货成本、封板动能。
    
    请输出严格格式的 JSON，包含 limit_up_type (首板/连板) 和 consecutive_days (数字)。
  `;

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

export const fetchKLineSynergyAnalysis = async (
  query: string,
  base64Image: string | null,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    作为资深 A 股技术面与资金博弈专家，请针对标的 "${query}" 进行【3-5日K线合力分析】。
    
    [!!! 核心任务 !!!]
    1. 形态解构：识别最近 3-5 个交易日的 K 线组合形态（如：多方炮、揉搓线、仙人指路等）。
    2. 合力测算：通过联网检索该股最近 3 日的【主力净流入/流出】数据和【成交量变化】。判断是“机构与游资共振”还是“散户跟风”。
    3. 视觉校准：${base64Image ? "必须根据上传的 K 线截图，识别图中每一根 K 线实体的收盘价位置、上下影线长度。" : "根据联网检索的最新 OHLVC 数据进行分析。"}
    4. 趋势预判：基于当前合力状态，预判后续 1-3 日的走势（进攻、洗盘、补跌）。

    请输出严格格式的 JSON。
  `;

  const contents: any = { parts: [{ text: prompt }] };
  if (base64Image) {
    contents.parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Image }
    });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: klineSynergySchema
    }
  });

  const parsed = robustParse(response.text || "{}");

  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    klineSynergyData: parsed,
    market
  };
};

const klineSynergySchema = {
  type: Type.OBJECT,
  properties: {
    pattern_name: { type: Type.STRING },
    synergy_score: { type: Type.NUMBER },
    time_frame: { type: Type.STRING },
    logic_timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING },
          action: { type: Type.STRING },
          psychology: { type: Type.STRING }
        },
        required: ["day", "action", "psychology"]
      }
    },
    synergy_factors: {
      type: Type.OBJECT,
      properties: {
        volume_resonance: { type: Type.NUMBER },
        price_strength: { type: Type.NUMBER },
        capital_alignment: { type: Type.NUMBER }
      },
      required: ["volume_resonance", "price_strength", "capital_alignment"]
    },
    prediction: {
      type: Type.OBJECT,
      properties: {
        trend: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
        probability: { type: Type.STRING },
        target_window: { type: Type.STRING },
        key_observation: { type: Type.STRING }
      },
      required: ["trend", "probability", "target_window", "key_observation"]
    },
    battle_summary: { type: Type.STRING }
  },
  required: ["pattern_name", "synergy_score", "time_frame", "logic_timeline", "synergy_factors", "prediction", "battle_summary"]
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
    monthly_portfolio_summary: { type: Type.STRING, description: "本月所有持股的综合演进、调仓逻辑及最终表现总结（仅在月度复盘时生成）" },
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
    [强制指令]: 现在是现实世界的 ${dateStr}。
    请深度分析截图中的股票 "${query}" 的技术形态与量价关系。

    [新增量化逻辑指令]:
    1. **乖离率 (BIAS) 风险审计**: 请通过 Google Search 检索该标的的最新 20/60/120 日均线价格。计算当前价与均线的偏离度。如果正乖离过大（如高于 15-20%），必须发出“追涨风险”警警报。
    2. **行业 Beta 过滤法**: 请检索该标不所属板块（如商业航天、半导体）的今日整体涨跌。如果板块整体走弱但该股处于支撑位，需判断其为“良性洗盘”而非“逻辑证伪”，防止用户情绪化洗下车。
    3. **量价一致性**: 分析成交量是否属于“缩量回调”还是“放量滞涨”。
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

  const isMonthly = label.includes("月");
  const monthlyInstruction = isMonthly ? `
    [!!! 月度持股演进强化指令 !!!]:
    1. **本月全周期复盘**: 请根据提供的历史数据，梳理本月内我所有出现过的持股名称。
    2. **风格漂移与板块切换**: 分析本月我是否在不同板块间频繁切换？哪些切换是成功的（Alpha 贡献），哪些是由于 FOMO 导致的失败操作。
    3. **持股清单演进**: 在 'monthly_portfolio_summary' 字段中，提供一个清晰的“本月持仓演变”综述。例如：“月初重仓半导体，月中由于XX政策切换至商业航天，目前主要持有XX进行趋势跟踪”。
    4. **胜率统计**: 简单统计本月盈利标的与亏损标的的比例，并总结核心赢面或亏损来源。
  ` : "";

  const prompt = `
    作为资深基金经理，基于以下【${label}】的历史多份持仓快照生成阶段性复盘报告。

    ${monthlyInstruction}

    [!!! 核心诊断增强指令 !!!]:
    1. **追涨杀跌行为审计**: 请结合历史股价趋势，审查我是否在股票大幅偏离 20 日均线（正乖离过大）时进行了加仓操作。如果是，请严厉指出其本质是 FOMO 情绪。
    2. **情绪化清仓审计**: 请利用 Google Search 审查我清仓的标的在随后几日的表现。如果我清仓是因为短期板块回调（Beta 下跌）而错失了随后几日的反包行情，请指出这是“情绪化被洗出”，并给出如何识别“良性洗盘”的建议。
    3. **行业 Beta 过滤**: 分析盈亏变动中，有多少是随大流的 Beta，有多少是由于选股逻辑产生的 Alpha。
    
    【核心任务】
    1. **大局观解读**：利用 googleSearch 检索并分析最近期间 A 股大盘走势。
    2. **深度个股审计**：点名指出哪些票存在严重问题。
    3. **知行合一审计与改进**：
       - 分析操作习惯，特别是“高位追涨”和“低位被震下车”的情况。
       - 针对每一项不足，给出具体的实操改进方法。
    
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
  const prompt = `从以下分析报告中提取“明日交易计划”：\n\n${content}\n\n请识别出明确的 标的、动作(buy/sell/hold/monitor/t_trade Walton)、价格目标、理由。`;
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

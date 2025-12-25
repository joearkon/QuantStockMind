
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, UserSettings } from "../types";

// ... (hotlistSchema and institutionalInsightsSchema remain same)
const hotlistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    ranking: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          visit_frequency: { type: Type.STRING },
          institution_count: { type: Type.NUMBER },
          core_logic: { type: Type.STRING },
          potential_rating: { type: Type.STRING, enum: ["High", "Medium"] }
        },
        required: ["name", "code", "visit_frequency", "institution_count", "core_logic", "potential_rating"]
      }
    },
    sector_heat: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }
      }
    }
  },
  required: ["summary", "ranking", "sector_heat"]
};

const institutionalInsightsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detailed_signals: {
      type: Type.OBJECT,
      properties: {
        lh_list: { type: Type.STRING },
        block_trades: { type: Type.STRING },
        spread_trend: { type: Type.STRING }
      },
      required: ["lh_list", "block_trades", "spread_trend"]
    },
    dragon_tiger_list: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          net_buy: { type: Type.STRING, description: "机构席位净买入额 (如: 5200万)" },
          reason: { type: Type.STRING, description: "上榜理由 (如: 连续三日内涨幅偏离值累计达20%)" },
          intensity: { type: Type.NUMBER, description: "博弈强度 0-100" }
        },
        required: ["name", "code", "net_buy", "reason", "intensity"]
      }
    },
    fund_flow: {
      type: Type.OBJECT,
      properties: {
        main_inflow_amt: { type: Type.STRING },
        main_outflow_amt: { type: Type.STRING },
        top_inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        trend_desc: { type: Type.STRING }
      },
      required: ["main_inflow_amt", "main_outflow_amt", "top_inflow_sectors", "trend_desc"]
    },
    top_surveyed_sectors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING },
          intensity: { type: Type.NUMBER },
          top_stocks: { type: Type.ARRAY, items: { type: Type.STRING } },
          reason: { type: Type.STRING }
        },
        required: ["sector_name", "intensity", "top_stocks", "reason"]
      }
    },
    key_institution_views: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution_name: { type: Type.STRING },
          sentiment: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] },
          viewpoint: { type: Type.STRING },
          target_sector: { type: Type.STRING }
        },
        required: ["institution_name", "sentiment", "viewpoint", "target_sector"]
      }
    },
    smart_money_trends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          signal_type: { type: Type.STRING },
          concept_name: { type: Type.STRING },
          flow_status: { type: Type.STRING, enum: ["net_inflow", "net_outflow"] },
          key_driver: { type: Type.STRING }
        },
        required: ["signal_type", "concept_name", "flow_status", "key_driver"]
      }
    }
  },
  required: ["detailed_signals", "dragon_tiger_list", "fund_flow", "top_surveyed_sectors", "key_institution_views", "smart_money_trends"]
};

const capitalFlowReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    total_main_inflow: { type: Type.STRING, description: "今日全天净流入额。严禁输入长句，仅限类似 '+250亿' 或 '-12.5亿' 这种短字符串。" },
    market_sentiment_tag: { type: Type.STRING },
    lhb_list: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          net_buy: { type: Type.STRING, description: "席位净买入额。极简，如 '1.2亿'" },
          institutional_buy_count: { type: Type.NUMBER },
          hot_money_participation: { type: Type.STRING },
          logic: { type: Type.STRING },
          impact_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        },
        required: ["name", "code", "net_buy", "logic", "impact_level"]
      }
    },
    sector_flow_ranking: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.NUMBER, description: "百分比值，不带百分号" },
          type: { type: Type.STRING, enum: ["in", "out"] }
        },
        required: ["name", "value", "type"]
      }
    },
    money_quality_analysis: { type: Type.STRING }
  },
  required: ["summary", "total_main_inflow", "lhb_list", "sector_flow_ranking", "money_quality_analysis"]
};

// ... (fetchHighFreqSurveys and fetchInstitutionalInsights remain same)
export const fetchHighFreqSurveys = async (
  market: MarketType,
  _apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    作为资深投研分析师，利用 googleSearch 检索 ${market} 市场最近 1-2 周内【机构调研】数据。
    
    【核心目标】
    筛选并列出被机构调研“最频繁、次数最多、参与机构数量最集中”的公司排行榜。
    机构频繁调研往往预示着基本面的反转或重大题材的爆发。
    
    必须输出 JSON 格式。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: hotlistSchema
    }
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    hotlistData: parsed,
    market
  };
};

export const fetchInstitutionalInsights = async (
  _currentModel: ModelProvider,
  market: MarketType,
  _settings: UserSettings
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    [真实时间确认]: 现在是现实世界的 ${dateStr}。
    作为资深机构交易员，利用 googleSearch 深度分析 ${market} 市场当日最核心的机构大资金动向。
    输出必须严格遵守 JSON 格式。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: institutionalInsightsSchema
    }
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    institutionalData: parsed,
    market
  };
};

export const fetchDailyCapitalFlowReport = async (
  market: MarketType
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  const prompt = `
    [绝对时间指令]: 当前时间是 ${dateStr}。
    请利用 googleSearch 检索 ${market} 市场今日的【龙虎榜明细】和【全市场主力资金流入流出】情况。
    
    【强制规范要求】:
    1. total_main_inflow 字段必须是极简的数值文本（如 '+150亿'），禁止输入长难句。
    2. lhb_list 字段识别今日龙虎榜中机构席位大买、游资抱团最显著的前 6 只个股。
    3. money_quality_analysis 字段需要一段 100 字左右的专业深度成色审计，分析资金是散户化还是机构化。
    
    必须输出严格的 JSON。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: capitalFlowReportSchema
    }
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    capitalFlowData: parsed,
    market
  };
};

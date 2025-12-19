
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, UserSettings } from "../types";

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

// Added institutionalInsightsSchema for structured data extraction
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
  required: ["detailed_signals", "top_surveyed_sectors", "key_institution_views", "smart_money_trends"]
};

export const fetchHighFreqSurveys = async (
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为资深投研分析师，利用 googleSearch 检索 ${market} 市场最近 1-2 周内【机构调研】数据。
    
    【核心目标】
    筛选并列出被机构调研“最频繁、次数最多、参与机构数量最集中”的公司排行榜。
    机构频繁调研往往预示着基本面的反转或重大题材的爆发。
    
    【要求】
    1. 挖掘出前 5-8 名高频标的。
    2. 指出为什么这些标的被频繁调研（背后的核心基本面逻辑）。
    3. 给出热度行业统计。
    
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

/**
 * Implementation of fetchInstitutionalInsights to fix import error in InstitutionalMonitor.tsx
 */
export const fetchInstitutionalInsights = async (
  currentModel: ModelProvider,
  market: MarketType,
  settings: UserSettings
): Promise<AnalysisResult> => {
  const apiKey = settings.geminiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    作为资深机构交易员，利用 googleSearch 深度分析 ${market} 市场的机构大资金动向。
    1. 扫描龙虎榜 (Dragon Tiger List) 中的机构席位买卖净额。
    2. 扫描大宗交易 (Block Trades) 的折溢价情况。
    3. 分析主力资金主动买卖盘差额 (Spread Trend)。
    4. 汇总近期机构重点调研的行业热度分布。
    5. 汇总主流内外资券商（如中金、高盛等）对当前市场的核心观点。
    
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

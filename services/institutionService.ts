import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, InstitutionalInsight } from "../types";
import { fetchExternalAI } from "./externalLlmService";
import { runGeminiSafe } from "./geminiService"; // Updated import

const GEMINI_MODEL = "gemini-2.5-flash"; // Reference only

// --- Schema for Institutional Data ---
const institutionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    market_heat_summary: { type: Type.STRING, description: "Brief summary of overall institutional activity intensity." },
    top_surveyed_sectors: {
      type: Type.ARRAY,
      description: "List of sectors with high visit frequency from institutions.",
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING },
          intensity: { type: Type.NUMBER, description: "0-100 score of survey intensity" },
          top_stocks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific stocks visited" },
          reason: { type: Type.STRING, description: "Why are they interested?" }
        },
        required: ["sector_name", "intensity", "top_stocks", "reason"]
      }
    },
    key_institution_views: {
      type: Type.ARRAY,
      description: "Specific viewpoints from major banks/brokers.",
      items: {
        type: Type.OBJECT,
        properties: {
          institution_name: { type: Type.STRING, description: "e.g. Morgan Stanley, CITIC" },
          type: { type: Type.STRING, enum: ["foreign", "domestic"] },
          viewpoint: { type: Type.STRING, description: "Core argument/outlook" },
          target_sector: { type: Type.STRING },
          sentiment: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
        },
        required: ["institution_name", "type", "viewpoint", "target_sector", "sentiment"]
      }
    },
    smart_money_trends: {
      type: Type.ARRAY,
      description: "Trends of Hot Money / Youzi / Leveraged Funds.",
      items: {
        type: Type.OBJECT,
        properties: {
          concept_name: { type: Type.STRING },
          flow_status: { type: Type.STRING, enum: ["net_inflow", "net_outflow"] },
          key_driver: { type: Type.STRING }
        },
        required: ["concept_name", "flow_status", "key_driver"]
      }
    }
  },
  required: ["market_heat_summary", "top_surveyed_sectors", "key_institution_views", "smart_money_trends"]
};

/**
 * Fetch Institutional Insights
 */
export const fetchInstitutionalInsights = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  
  const prompt = `
    你是一位专注于跟踪【机构动向】与【主力资金】的金融分析师。
    当前日期: ${dateStr}。市场: ${market}。

    请利用搜索工具，查询最近一周/一月的：
    1. **机构调研热度 (Institutional Surveys)**: 哪些板块/个股接待了最多的基金经理和券商分析师调研？(国内公募/私募)
    2. **外资/投行观点 (Foreign Institutions)**: 摩根大通(JPM)、高盛(Goldman)、摩根士丹利(Morgan Stanley) 等外资大行发布的最新中国市场研报核心观点是什么？
    3. **游资/聪明钱动向 (Smart Money)**: 市场活跃资金(龙虎榜/营业部)正在攻击哪些题材？

    要求：
    - 必须基于**真实搜索到的近期数据**。
    - 区分“国内机构”与“外资机构”。
    - 输出 JSON 格式。
  `;

  // 1. Gemini Implementation
  if (provider === ModelProvider.GEMINI_INTL) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      // Fix: Added 'gemini-3-pro-preview' as the second argument for runGeminiSafe
      const response = await runGeminiSafe(ai, 'gemini-3-pro-preview', {
        contents: prompt + `\n\nStrictly output valid JSON matching this schema: ${JSON.stringify(institutionSchema)}`,
        config: {
          tools: [{ googleSearch: {} }],
        }
      }, "Institutional Insights");

      const text = response.text || "{}";
      let structuredData: InstitutionalInsight;

      try {
        let clean = text.trim();
        clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }
        structuredData = JSON.parse(clean);
      } catch (e) {
        console.warn("JSON Parse Failed", e);
        throw new Error("模型返回的数据格式无法解析，请重试。");
      }

      return {
        content: text,
        timestamp: Date.now(),
        modelUsed: provider,
        isStructured: true,
        institutionalData: structuredData,
        market
      };

    } catch (e: any) {
      throw new Error(`Gemini Institution Error: ${e.message}`);
    }
  }

  // 2. Hunyuan Implementation
  if (provider === ModelProvider.HUNYUAN_CN) {
    const apiKey = settings?.hunyuanKey;
    if (!apiKey) throw new Error("Hunyuan API Key missing");

    const result = await fetchExternalAI(provider, apiKey, prompt, false, undefined, market, true);
    
    try {
      let clean = result.content.trim();
      clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          clean = clean.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(clean);
      result.institutionalData = parsed;
      result.isStructured = true;
    } catch (e) {
      throw new Error("腾讯混元模型返回的数据格式有误。");
    }

    return result;
  }

  throw new Error("Unsupported Provider");
};
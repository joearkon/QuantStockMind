
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, InstitutionalInsight } from "../types";
import { fetchExternalAI } from "./externalLlmService";
import { runGeminiSafe } from "./geminiService";

// 获取有效的 API Key (环境变量优先，本地存储兜底)
const getApiKey = () => {
  if (process.env.API_KEY) return process.env.API_KEY;
  const saved = localStorage.getItem('quantmind_settings');
  if (saved) {
    const settings = JSON.parse(saved);
    return settings.geminiKey || "";
  }
  return "";
};

const institutionSchema = {
  type: Type.OBJECT,
  properties: {
    market_heat_summary: { type: Type.STRING },
    top_companies: {
      type: Type.ARRAY,
      description: "近一周调研频次最高的个股列表",
      items: {
        type: Type.OBJECT,
        properties: {
          rank: { type: Type.INTEGER },
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          survey_count: { type: Type.STRING, description: "调研家数或频次描述" },
          intensity: { type: Type.NUMBER, description: "0-100热度" },
          core_logic: { type: Type.STRING, description: "机构关注的核心问题" },
          institution_types: { type: Type.ARRAY, items: { type: Type.STRING }, description: "参与机构类型如公募、外资等" }
        },
        required: ["rank", "name", "code", "survey_count", "intensity", "core_logic"]
      }
    },
    top_surveyed_sectors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING },
          intensity: { type: Type.NUMBER },
          reason: { type: Type.STRING }
        }
      }
    },
    key_institution_views: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution_name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["foreign", "domestic"] },
          viewpoint: { type: Type.STRING },
          sentiment: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] }
        }
      }
    },
    smart_money_trends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          concept_name: { type: Type.STRING },
          flow_status: { type: Type.STRING, enum: ["net_inflow", "net_outflow"] },
          key_driver: { type: Type.STRING }
        }
      }
    }
  },
  required: ["market_heat_summary", "top_companies", "top_surveyed_sectors", "key_institution_views", "smart_money_trends"]
};

export const fetchInstitutionalInsights = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any
): Promise<AnalysisResult> => {
  const apiKey = getApiKey();
  const dateStr = new Date().toLocaleDateString('zh-CN');
  
  const prompt = `
    你是一位专业的 A 股机构动向研究员。今天是 ${dateStr}。分析市场：${market}。
    
    核心任务：
    1. **搜索近 7 天调研最活跃的公司**：利用联网搜索功能，找出过去一周接待调研机构家数排名前 10 的个股。
    2. **调研逻辑拆解**：针对这些个股，指出机构最关心的核心逻辑（如：业绩拐点、新产品订单、海外出海进展）。
    3. **外资视野**：搜索大行（如高盛、瑞银、大摩）对当前 A 股的核心看法。
    4. **聪明钱流向**：识别北向资金或知名游资正在攻击的题材。

    【硬性要求】：
    - **严禁返回英文，所有个股名称、行业名、逻辑描述必须为简体中文。**
    - 股票代码必须真实。
    - 指数名称必须为中文，禁止出现 "Shanghai Composite" 等。
  `;

  if (provider === ModelProvider.GEMINI_INTL) {
    if (!apiKey) throw new Error("请先在设置中配置 Gemini API Key");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await runGeminiSafe(ai, "gemini-3-pro-preview", {
        contents: prompt + `\n\n请严格按此 JSON Schema 返回：${JSON.stringify(institutionSchema)}`,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: institutionSchema 
        }
      }, "Institutional Insights");

      return {
        content: response.text || "{}",
        timestamp: Date.now(),
        modelUsed: provider,
        isStructured: true,
        institutionalData: JSON.parse(response.text || "{}"),
        market
      };
    } catch (e: any) {
      throw new Error(`机构动向服务暂时不可用: ${e.message}`);
    }
  }

  // Hunyuan fallback
  const hunyuanKey = settings?.hunyuanKey;
  if (!hunyuanKey) throw new Error("请配置混元 API Key");
  return await fetchExternalAI(provider, hunyuanKey, prompt, false, undefined, market, true);
};

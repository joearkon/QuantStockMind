
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse, ForesightReport } from "../types";
import { fetchExternalAI } from "./externalLlmService";

const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  try { return JSON.parse(clean); } catch (e) {}
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) clean = clean.substring(firstBrace, lastBrace + 1);
  try { return JSON.parse(clean); } catch (e) { return null; }
};

const chainSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    policy_theme: { type: Type.STRING },
    analysis_summary: { type: Type.STRING },
    supply_chain_matrix: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          user_holding: { type: Type.STRING },
          opportunities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stock_name: { type: Type.STRING },
                stock_code: { type: Type.STRING },
                relation_type: { type: Type.STRING },
                logic_core: { type: Type.STRING },
                policy_match: { type: Type.STRING }
              },
              required: ["stock_name", "stock_code", "relation_type", "logic_core", "policy_match"]
            }
          }
        },
        required: ["user_holding", "opportunities"]
      }
    }
  },
  required: ["policy_theme", "analysis_summary", "supply_chain_matrix"]
};

const foresightSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    monthly_focus: { type: Type.STRING },
    catalysts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date_window: { type: Type.STRING, description: "具体时间点，如：2025年5月15日-17日" },
          event_name: { type: Type.STRING },
          theme_label: { type: Type.STRING },
          logic_chain: { type: Type.STRING, description: "事件如何传导至股价的深度逻辑" },
          opportunity_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          suggested_stocks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["date_window", "event_name", "theme_label", "logic_chain", "opportunity_level", "suggested_stocks"]
      }
    },
    rotation_warning: { type: Type.STRING },
    macro_policy_insight: { type: Type.STRING }
  },
  required: ["monthly_focus", "catalysts", "rotation_warning", "macro_policy_insight"]
};

export const fetchOpportunityMining = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any,
  inputData: string = "", 
  mode: 'chain' | 'foresight' = 'chain'
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  let systemInstruction = "";
  let userPrompt = "";

  if (mode === 'chain') {
    systemInstruction = "你是一位精通产业链上下游关联的量化策略分析师。请挖掘指定标的的产业链机会。";
    userPrompt = `当前日期: ${dateStr}。输入: 【${inputData}】。请搜索最新行业进展，挖掘具备共振逻辑的标的。`;
  } else {
    // 极大增强题材前瞻逻辑
    systemInstruction = `你是一位顶级题材博弈专家。你的任务是利用联网搜索，挖掘未来 30-60 天内即将发生的“重大确定性题材催化剂”。
    重点寻找：
    1. 行业顶级峰会/博览会日期（如：WAIC, 华为开发者大会, 苹果发布会）。
    2. 关键政策落地节点（如：三中全会具体日期、相关部委文件下发预期）。
    3. 重大工程进度/发射节点（如：神舟发射、低轨卫星组网节点）。
    
    你必须给出具体的“日期窗口”和“预期差分析”。不能只给空洞的新闻，要给能提前埋伏的交易机会。`;
    userPrompt = `当前真实日期是 ${dateStr}。目标板块关键字: 【${inputData || "全行业重点扫描"}】。请联网搜索并生成一份题材前瞻日历。`;
  }

  if (provider === ModelProvider.GEMINI_INTL) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const schemaToUse = mode === 'chain' ? chainSchema : foresightSchema;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: schemaToUse
      }
    });

    const parsed = robustParse(response.text);
    return {
      content: response.text,
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: true,
      opportunityData: mode === 'chain' ? parsed : undefined,
      foresightData: mode === 'foresight' ? parsed : undefined,
      market
    };
  }

  // 兜底处理 (Hunyuan 等其他模型逻辑保持兼容)
  const apiKey = settings?.hunyuanKey;
  const result = await fetchExternalAI(provider, apiKey, systemInstruction + "\n" + userPrompt, false, undefined, market, true);
  return result;
};

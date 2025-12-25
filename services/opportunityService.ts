
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse, ForesightReport } from "../types";
import { fetchExternalAI } from "./externalLlmService";

// --- Robust Parser ---
const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  
  // 1. 尝试直接解析
  try {
    return JSON.parse(clean);
  } catch (e) {
    // 失败则继续尝试清理
  }

  // 2. 移除 Markdown 代码块标记 (兼容 ```json 和 ```)
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
  
  // 3. 提取第一个 { 或 [ 到最后一个 } 或 ] 之间的内容
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  const start = (firstBrace !== -1 && firstBracket !== -1) ? Math.min(firstBrace, firstBracket) : (firstBrace !== -1 ? firstBrace : firstBracket);
  
  const lastBrace = clean.lastIndexOf('}');
  const lastBracket = clean.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);

  if (start !== -1 && end !== -1 && end > start) {
    clean = clean.substring(start, end + 1);
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Opportunity JSON Parse Error:", e, "Original Text:", text);
    return null;
  }
};

// --- Schema Definitions ---

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

const deploySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    policy_theme: { type: Type.STRING },
    analysis_summary: { type: Type.STRING },
    deployment_plan: {
      type: Type.OBJECT,
      properties: {
        focus_directions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sector: { type: Type.STRING },
              inflow_status: { type: Type.STRING },
              logic: { type: Type.STRING }
            },
            required: ["sector", "inflow_status", "logic"]
          }
        },
        top_picks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              code: { type: Type.STRING },
              sector: { type: Type.STRING },
              risk_tag: { type: Type.STRING },
              reason: { type: Type.STRING },
              buy_point: { type: Type.STRING }
            },
            required: ["name", "code", "sector", "risk_tag", "reason", "buy_point"]
          }
        }
      },
      required: ["focus_directions", "top_picks"]
    }
  },
  required: ["policy_theme", "analysis_summary", "deployment_plan"]
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
          date_window: { type: Type.STRING },
          event_name: { type: Type.STRING },
          theme_label: { type: Type.STRING },
          logic_chain: { type: Type.STRING },
          opportunity_level: { type: Type.STRING },
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
  mode: 'chain' | 'deploy' | 'foresight' = 'chain'
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  let systemInstruction = "";
  let userPrompt = "";

  if (mode === 'chain') {
    systemInstruction = "你是一位精通产业链上下游关联的量化策略分析师。请通过联网搜索挖掘指定标的的产业链机会（上游/下游/侧向）。请严格按要求返回 JSON。";
    userPrompt = `当前日期: ${dateStr}。我的持仓或关注: 【${inputData || "科技成长股"}】。请搜索最新行业进展，挖掘关联标的。`;
  } else if (mode === 'deploy') {
    systemInstruction = "你是一位擅长捕捉主力资金偏好与板块轮动的基金经理。请基于资金风格推荐进场方向。请严格按要求返回 JSON。";
    userPrompt = `当前日期: ${dateStr}。我的资金偏好风格: 【${inputData || "稳健增长"}】。请分析今日大盘资金博弈情况并给出建议。`;
  } else {
    systemInstruction = "你是一位顶级宏观策略师，擅长预判未来 1 个月内的重大政策催化剂。请严格按要求返回 JSON。";
    userPrompt = `当前日期: ${dateStr}。请重点搜索未来 30-60 天内的行业重大会议、政策窗口、工程节点。`;
  }

  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    let schemaToUse = chainSchema;
    if (mode === 'deploy') schemaToUse = deploySchema;
    if (mode === 'foresight') schemaToUse = foresightSchema;

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
    if (!parsed) throw new Error("模型返回数据解析失败，请检查网络或更换模型重试。");

    return {
      content: response.text,
      timestamp: Date.now(),
      modelUsed: provider,
      isStructured: true,
      opportunityData: mode !== 'foresight' ? parsed : undefined,
      foresightData: mode === 'foresight' ? parsed : undefined,
      market
    };
  }

  if (provider === ModelProvider.HUNYUAN_CN) {
    const apiKey = settings?.hunyuanKey;
    const result = await fetchExternalAI(provider, apiKey, systemInstruction + "\n" + userPrompt, false, undefined, market, true);
    const parsed = robustParse(result.content);
    if (parsed) {
      if (mode === 'foresight') result.foresightData = parsed;
      else result.opportunityData = parsed;
      result.isStructured = true;
    } else {
       throw new Error("混元模型返回结构不符，解析失败。");
    }
    return result;
  }

  throw new Error("不支持的 Provider");
};

import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse } from "../types";
import { fetchExternalAI } from "./externalLlmService";

const GEMINI_MODEL = "gemini-2.5-flash";

// --- Schema: Chain Mining & Deployment ---
const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis_summary: { type: Type.STRING, description: "Analysis summary." },
    policy_theme: { type: Type.STRING, description: "Current Theme." },
    // Mode 1 fields
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
              }
            }
          }
        }
      }
    },
    rotation_strategy: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          current_sector: { type: Type.STRING },
          next_sector: { type: Type.STRING },
          reason: { type: Type.STRING },
          catalyst: { type: Type.STRING }
        }
      }
    },
    // Mode 2 fields
    deployment_plan: {
      type: Type.OBJECT,
      properties: {
        market_environment: { type: Type.STRING, description: "Current market phase judgment." },
        suggested_style: { type: Type.STRING, description: "e.g. Aggressive, Low-suction, or Balanced." },
        focus_directions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sector: { type: Type.STRING },
              logic: { type: Type.STRING },
              inflow_status: { type: Type.STRING }
            },
            required: ["sector", "logic", "inflow_status"]
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
              reason: { type: Type.STRING },
              buy_point: { type: Type.STRING },
              risk_tag: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["name", "code", "sector", "reason", "buy_point", "risk_tag"]
          }
        }
      },
      required: ["market_environment", "suggested_style", "focus_directions", "top_picks"]
    }
  }
};

/**
 * Mining Logic: Supply Chain Resonance OR Capital Deployment
 */
export const fetchOpportunityMining = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any,
  inputData: string = "", // User Holdings OR Style Preference
  mode: 'chain' | 'deploy' = 'chain'
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  let systemPrompt = "";
  let userPrompt = "";

  if (mode === 'chain') {
    // --- MODE 1: Supply Chain Mining ---
    systemPrompt = `
      你是一位精通 A 股产业链逻辑与国家宏观战略的资深基金经理。
      【核心任务】
      1. **产业链穿透**: 针对用户持有的核心标的，挖掘其上游或下游中，尚未被充分炒作的"隐形冠军"。
      2. **战略对齐**: 推荐必须紧扣当前的国家宏观战略。
      3. **板块搭配**: 结果中请务必包含主板标的 (60x/00x) 和科创/创业板标的 (688x/300x)。
    `;
    userPrompt = `
      当前日期: ${dateStr}。
      我的持仓/关注: 【${inputData || "热门科技"}】。
      请生成【产业链协同与黑马挖掘报告】，找出上游/关联标的，并给出轮动策略。
    `;
  } else {
    // --- MODE 2: Capital Deployment (Fresh Funds) ---
    systemPrompt = `
      你是一位擅长捕捉【主力资金流向】与【题材热点】的实战型游资/机构操盘手。
      用户手握现金，希望进场。
      【核心任务】
      1. **扫描热点**: 搜索今日/本周 A股市场最强的题材板块和主力净流入最多的方向。
      2. **机构动向**: 重点关注有“机构席位买入”或“北向资金大幅加仓”的个股。
      3. **选股策略**: 根据用户的风格偏好（${inputData}），推荐 3-5 只具体标的。
         - 如果偏好激进：找龙头、打板客关注的票。
         - 如果偏好稳健：找趋势中军、机构重仓票。
    `;
    userPrompt = `
      当前日期: ${dateStr}。
      我的资金风格偏好: 【${inputData || "综合/稳健"}】。
      请生成【资金进场配置方案 (Capital Deployment Plan)】:
      1. 判断当前市场环境适合什么策略？
      2. 找出 2-3 个主力资金主攻方向。
      3. 精选 3-5 只个股，注明买入逻辑（如：机构大买、图形突破、政策利好）和建议买点。
    `;
  }

  // 1. Gemini Implementation
  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: systemPrompt + "\n" + userPrompt + `\n\nReturn strict JSON matching this schema: ${JSON.stringify(opportunitySchema)}`,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const text = response.text || "{}";
      let structuredData: OpportunityResponse;

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
        opportunityData: structuredData,
        market
      };

    } catch (e: any) {
      throw new Error(`Gemini Strategy Error: ${e.message}`);
    }
  }

  // 2. Hunyuan Implementation
  if (provider === ModelProvider.HUNYUAN_CN) {
    const apiKey = settings?.hunyuanKey;
    if (!apiKey) throw new Error("Hunyuan API Key missing");

    const finalPrompt = `${systemPrompt}\n${userPrompt}\n\nIMPORTANT: Return valid JSON only matching the schema requirements.`;
    
    const result = await fetchExternalAI(provider, apiKey, finalPrompt, false, undefined, market, true);
    
    try {
      let clean = result.content.trim();
      clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          clean = clean.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(clean);
      result.opportunityData = parsed;
      result.isStructured = true;
    } catch (e) {
      console.warn("Hunyuan JSON parse failed for Strategy Mining", e);
      throw new Error("腾讯混元模型返回的数据格式有误，未能生成有效的 JSON 报告。");
    }

    return result;
  }

  throw new Error("Unsupported Provider");
};
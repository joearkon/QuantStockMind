import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse } from "../types";
import { fetchExternalAI } from "./externalLlmService";

const GEMINI_MODEL = "gemini-2.5-flash";

const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    month: { type: Type.STRING, description: "Current Month (Chinese)" },
    market_phase: { type: Type.STRING, description: "Current market phase description (Chinese)" },
    opportunities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING, description: "Sector Name in Chinese" },
          reason_seasonality: { type: Type.STRING, description: "Historical performance in this month (Chinese)" },
          reason_fund_flow: { type: Type.STRING, description: "Recent Main Force/Institutional flow divergence (Chinese)" },
          avoid_reason: { type: Type.STRING, description: "Why this is NOT an overheated/hyped sector (Chinese)" },
          representative_stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Stock Name" },
                code: { type: Type.STRING, description: "Stock Code" },
                current_price: { type: Type.STRING },
                logic: { type: Type.STRING, description: "Technical + Fundamental logic (Chinese)" }
              }
            }
          }
        },
        required: ["sector_name", "reason_seasonality", "reason_fund_flow", "avoid_reason", "representative_stocks"]
      }
    }
  },
  required: ["month", "market_phase", "opportunities"]
};

/**
 * Mining Logic: Seasonality + Fund Flow - Hype
 */
export const fetchOpportunityMining = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const month = now.toLocaleString('zh-CN', { month: 'long' });
  const dateStr = now.toLocaleDateString('zh-CN');

  // Core Prompt Strategy: "Contrarian but supported by Data"
  // FORCE CHINESE OUTPUT IN SYSTEM PROMPT
  const systemPrompt = `
    你是一位精通“日历效应”(Seasonality)和“主力资金追踪”(Smart Money)的资深量化策略师。
    
    你的目标: 为用户挖掘“低位潜力股” (Hidden Gems)。
    
    CRITICAL RULES:
    1. **Avoid Overheated Sectors**: 拒绝推荐过去2周涨幅已超过20%的热门板块。我们要找的是“低位潜伏”的机会。
    2. **Seasonality Focus**: 分析历史上 ${month} 表现最好的板块 (回顾过去5-10年数据)。
    3. **Fund Flow Verification**: 必须联网搜索最近3-5天“主力资金”或“北向资金”净流入、但股价尚未大涨的板块。
    4. **Output Language**: JSON中的所有文本字段必须严格使用**简体中文** (Simplified Chinese)。
  `;

  const userPrompt = `
    当前日期: ${dateStr}. 市场: ${market === 'CN' ? 'A股' : market === 'HK' ? '港股' : '美股'}.
    
    请作为我的“短线精灵” (Short-term Wizard):
    1. 搜索该市场 ${month} 的历史最佳表现板块。
    2. 搜索最近3-5日的具体“主力资金净流入”数据。
    3. 筛选出3个符合 [历史胜率高] 且 [近期资金在流入] 且 [当前未过热] 的板块。
    4. 每个板块推荐2只技术形态未破位的代表个股。

    输出格式必须是严格的 JSON。请确保所有分析、理由和逻辑都使用中文描述。
  `;

  // 1. Handle Gemini
  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      // We explicitly ask for JSON in the prompt for robustness, 
      // but also use schemas where possible or regex parsing.
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: systemPrompt + "\n" + userPrompt + `\n\nReturn strict JSON matching this schema: ${JSON.stringify(opportunitySchema)}`,
        config: {
          tools: [{ googleSearch: {} }],
          // Inject schema into prompt text instead of responseSchema when using tools to avoid conflicts
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
      throw new Error(`Gemini Mining Error: ${e.message}`);
    }
  }

  // 2. Handle Hunyuan (External)
  if (provider === ModelProvider.HUNYUAN_CN) {
    const apiKey = settings?.hunyuanKey;
    if (!apiKey) throw new Error("Hunyuan API Key missing");

    // Re-use the existing external fetcher but wrap the prompt for JSON
    const finalPrompt = `${systemPrompt}\n${userPrompt}\n\nIMPORTANT: Return valid JSON only. Structure:\n${JSON.stringify(opportunitySchema, null, 2)}`;
    
    // Pass forceJson = true to disable Markdown instructions
    const result = await fetchExternalAI(provider, apiKey, finalPrompt, false, undefined, market, true);
    
    // Attempt to parse the content as JSON
    try {
      let clean = result.content.trim();
      clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          clean = clean.substring(firstBrace, lastBrace + 1);
      }
      result.opportunityData = JSON.parse(clean);
      result.isStructured = true;
    } catch (e) {
      console.warn("Hunyuan JSON parse failed for Opportunity Mining", e);
      throw new Error("腾讯混元模型返回的数据格式有误，未能生成 JSON。");
    }

    return result;
  }

  throw new Error("Unsupported Provider");
};
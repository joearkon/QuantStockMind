import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse } from "../types";
import { fetchExternalAI } from "./externalLlmService";

const GEMINI_MODEL = "gemini-2.5-flash";

const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    month: { type: Type.STRING, description: "Current Month" },
    market_phase: { type: Type.STRING, description: "Current market phase description" },
    opportunities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector_name: { type: Type.STRING },
          reason_seasonality: { type: Type.STRING, description: "Historical performance in this month" },
          reason_fund_flow: { type: Type.STRING, description: "Recent Main Force/Institutional flow divergence" },
          avoid_reason: { type: Type.STRING, description: "Why this is NOT an overheated/hyped sector" },
          representative_stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                current_price: { type: Type.STRING },
                logic: { type: Type.STRING, description: "Technical + Fundamental logic" }
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
  const systemPrompt = `
    You are a professional quantitative strategist specializing in "Calendar Effects" (Seasonality) and "Smart Money" tracking.
    
    Your Goal: Find "Hidden Gems" for the user.
    
    CRITICAL RULES:
    1. **Avoid Overheated Sectors**: Do NOT recommend sectors that have already risen >20% in the last 2 weeks. We want "Low Position" (低位) opportunities.
    2. **Seasonality Focus**: Analyze what usually performs well in ${month} historically (over last 5-10 years).
    3. **Fund Flow Verification**: You MUST search for sectors where 'Main Force' (主力) or 'Northbound' (北向) funds are net BUYING recently, but the price hasn't exploded yet.
    4. **Divergence**: Look for "Price Flat/Down + Money Inflow" patterns.
  `;

  const userPrompt = `
    Current Date: ${dateStr}. Market: ${market === 'CN' ? 'A-Share' : market === 'HK' ? 'HK Stocks' : 'US Stocks'}.
    
    Please act as my "Short-term Wizard". 
    1. Search for the historical best performing sectors in ${month} for this market.
    2. Search for the specific 'Main Force Net Inflow' (主力资金净流入) data for the past 3-5 days.
    3. Identify 3 sectors that match: [Historical Seasonality OK] AND [Recent Money Inflow OK] AND [Not Overheated].
    4. For each sector, pick 2 representative stocks that are technically sound (not broken trends).

    Output STRICT JSON.
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
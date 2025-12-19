
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse } from "../types";
import { fetchExternalAI } from "./externalLlmService";
import { runGeminiSafe, GEMINI_MODEL_COMPLEX } from "./geminiService";

const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis_summary: { type: Type.STRING },
    policy_theme: { type: Type.STRING },
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
    deployment_plan: {
      type: Type.OBJECT,
      properties: {
        market_environment: { type: Type.STRING },
        suggested_style: { type: Type.STRING },
        focus_directions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sector: { type: Type.STRING },
              logic: { type: Type.STRING },
              inflow_status: { type: Type.STRING }
            }
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
            }
          }
        }
      }
    }
  }
};

export const fetchOpportunityMining = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any,
  inputData: string = "",
  mode: 'chain' | 'deploy' = 'chain'
): Promise<AnalysisResult> => {
  const prompt = `分析 ${market} 市场 ${mode === 'chain' ? '产业链' : '资金配置'}。输入: ${inputData}`;

  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await runGeminiSafe(ai, GEMINI_MODEL_COMPLEX, {
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: opportunitySchema
        }
      }, "Opportunity Mining");

      return {
        content: response.text || "{}",
        timestamp: Date.now(),
        modelUsed: provider,
        isStructured: true,
        opportunityData: JSON.parse(response.text || "{}"),
        market
      };
    } catch (e: any) { throw e; }
  }

  const hunyuanKey = settings?.hunyuanKey;
  if (!hunyuanKey) throw new Error("Hunyuan Key missing");
  return await fetchExternalAI(provider, hunyuanKey, prompt, false, undefined, market, true);
};

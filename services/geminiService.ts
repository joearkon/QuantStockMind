
import { GoogleGenAI, Type } from "@google/genai";
import { 
  AnalysisResult, 
  ModelProvider, 
  MarketType, 
  HoldingsSnapshot, 
  PeriodicReviewData, 
  PlanItem
} from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

const robustParse = (text: string): any => {
  if (!text) return null;
  let clean = text.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = clean.search(/[{[]/);
  const lastCurly = clean.lastIndexOf('}');
  const lastSquare = clean.lastIndexOf(']');
  const lastIndex = Math.max(lastCurly, lastSquare);
  if (firstBrace !== -1 && lastIndex !== -1 && lastIndex > firstBrace) {
    clean = clean.substring(firstBrace, lastIndex + 1);
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
};

// Added fetchGeminiAnalysis for llmAdapter
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean = false, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
  };
};

// Added fetchMarketDashboard for llmAdapter
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `Generate a ${period} market dashboard for ${market} in JSON format.`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  const structuredData = robustParse(response.text || "{}");
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    structuredData,
    market
  };
};

// Added fetchStockDetailWithImage for StockAnalysis
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string, currentPrice?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { text: `Analyze stock ${query} in ${market} market. Current price: ${currentPrice}.` };
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    market
  };
};

// Added fetchSectorLadderAnalysis for SectorCycleAnalysis
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Analyze sector cycle for ${query} in ${market} market in JSON format.`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    ladderData: robustParse(response.text || "{}"),
    market
  };
};

// Added fetchDualBoardScanning for KLineMaster
export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = "Scan dual board limit-up stocks in JSON format.";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    dualBoardScanData: robustParse(response.text || "{}"),
  };
};

// Added fetchMainBoardScanning for MainBoardMaster
export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = "Scan main board limit-up stocks in JSON format.";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    mainBoardScanData: robustParse(response.text || "{}"),
  };
};

// Added fetchLimitUpLadder for LimitUpLadder
export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = "Scan limit-up ladder and seeds in JSON format.";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    limitUpLadderData: robustParse(response.text || "{}"),
  };
};

// Added fetchStockSynergy for SynergyAudit
export const fetchStockSynergy = async (query: string, marketImg: string | null, holdingsImg: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [{ text: `Audit synergy for ${query}.` }];
  if (marketImg) parts.push({ inlineData: { mimeType: 'image/jpeg', data: marketImg } });
  if (holdingsImg) parts.push({ inlineData: { mimeType: 'image/jpeg', data: holdingsImg } });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
    }
  });
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    stockSynergyData: robustParse(response.text || "{}"),
  };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { 
    text: `你是一位精通 A 股券商 App 界面（如东吴、同花顺、东财）的 OCR 专家。
    请解析这张持仓截图，识别并提取以下数据：
    1. 总资产 (totalAssets)
    2. 仓位占比 (positionRatio)
    3. 持仓列表 (holdings): 包含名称、代码、持仓量(volume)、成本价(costPrice)、现价(currentPrice)、盈亏额(profit)、盈亏率(profitRate)。
    
    [重要]: 
    - 如果识别到负成本，请保留原始数值。
    - 确保代码为 6 位数字。
    - 输出 JSON。` 
  };
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalAssets: { type: Type.NUMBER },
          positionRatio: { type: Type.NUMBER },
          date: { type: Type.STRING },
          holdings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                volume: { type: Type.NUMBER },
                costPrice: { type: Type.NUMBER },
                currentPrice: { type: Type.NUMBER },
                profit: { type: Type.NUMBER },
                profitRate: { type: Type.STRING },
                marketValue: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    }
  });
  return robustParse(response.text || "{}");
};

export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `你是一位职业操盘手。请根据以下分析报告，提取出具体的“明日交易计划表”。
  要求：
  1. 必须包含具体的标的名称或代码。
  2. 动作必须是 [buy, sell, hold, monitor, t_trade] 之一。
  3. 如果报告提到了买入/卖出价，必须提取。
  4. 生成一份简短的战略总纲。
  
  分析报告：
  ${content}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] },
                price_target: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["symbol", "action", "reason"]
            }
          },
          summary: { type: Type.STRING }
        }
      }
    }
  });
  
  const parsed = robustParse(response.text || "{}");
  return {
    items: parsed.items?.map((it: any) => ({ ...it, id: crypto.randomUUID(), status: 'pending' })) || [],
    summary: parsed.summary || ""
  };
};

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `对以下历史交易记录进行【${label}】阶段性总结。重点分析：
  1. 执行力评分 (知行合一审计)。
  2. 哪些操作导致了盈利/亏损。
  3. 下一阶段的战术改进。
  历史记录：${JSON.stringify(journals)}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          market_trend: { type: Type.STRING },
          market_summary: { type: Type.STRING },
          highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } },
          lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } },
          execution: { 
            type: Type.OBJECT, 
            properties: { 
              score: { type: Type.NUMBER }, 
              details: { type: Type.STRING },
              good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } },
              bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }
            } 
          },
          stock_diagnostics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                verdict: { type: Type.STRING }
              }
            }
          },
          next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  // Fixed 'market' property error by ensuring AnalysisResult type includes it
  return { 
    content: response.text || "", 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.GEMINI_INTL, 
    isStructured: true, 
    periodicData: robustParse(response.text || "{}"), 
    market 
  };
};

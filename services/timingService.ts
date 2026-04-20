
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType } from "../types";

const timingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    action: { type: Type.STRING, enum: ["Buy", "Wait", "Sell", "Reduce"] },
    position_score: { type: Type.NUMBER },
    entry_logic: { type: Type.STRING },
    entry_price_window: { type: Type.STRING },
    stop_loss: { type: Type.STRING },
    target_profit: { type: Type.STRING },
    kline_analysis: { type: Type.STRING }
  },
  required: ["action", "position_score", "entry_logic", "entry_price_window", "stop_loss", "target_profit", "kline_analysis"]
};

const batchTimingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    market_context: { type: Type.STRING },
    overall_risk_score: { type: Type.NUMBER },
    stocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          win_rate: { type: Type.NUMBER },
          verdict: { type: Type.STRING, enum: ["Immediate", "Pullback", "Wait", "Avoid"] },
          verdict_label: { type: Type.STRING },
          sector_heat: { type: Type.NUMBER },
          capital_flow: { type: Type.STRING, enum: ["Inflow", "Neutral", "Outflow"] },
          technical_score: { type: Type.NUMBER },
          logic_summary: { type: Type.STRING },
          key_price: { type: Type.STRING }
        },
        required: ["name", "code", "win_rate", "verdict", "verdict_label", "sector_heat", "capital_flow", "technical_score", "logic_summary", "key_price"]
      }
    }
  },
  required: ["market_context", "overall_risk_score", "stocks"]
};

export const fetchTimingAnalysis = async (
  code: string,
  base64Image: string | null,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    你是一位精通缠论、波浪理论及量价关系的顶级择时专家。
    【任务】请针对股票代码 "${code}" 进行择时诊断。
    ${base64Image ? "【输入】我提供了一张该标的的 K 线走势截图。请优先结合图中展现的 K 线形态、成交量、支撑压力位进行视觉诊断。" : "【输入】请通过联网搜索该标不最近的日线形态和关键位置。"}
    
    【核心研判要求】
    1. 评估当前所处位置：是底部放量启动、半山腰震荡、还是高位见顶放量？
    2. 是否合适进场：给出具体的操作建议 (Buy/Wait/Sell/Reduce)。
    3. 进场时机：如果是 Wait，要等什么信号？如果是 Buy，具体什么价位进场？
    
    必须输出 JSON 格式。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: timingSchema
    }
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    timingData: parsed,
    market
  };
};

export const fetchBatchTimingAnalysis = async (
  stockList: string,
  base64Image: string | null,
  market: MarketType,
  apiKey: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    作为资深 A 股量化交易员，对以下股票进行批量择时打分。
    ${stockList ? `待分析列表: "${stockList}"` : "请直接识别图片中出现的股票列表。"}
    
    【关键指令：视觉校准】
    ${base64Image ? "【重要】我上传了一张行情 App 的截图。请识别图中每只股票的【最新实时价格】和【涨跌幅形态】。如果搜索到的价格与图中不符，必须以图片中的实时价格为准进行风险评估和买入建议位的计算。" : ""}

    【研判要求】
    1. 结合联网搜索该标的所属板块今日热度。
    2. 评估当前的买入胜率 (Win Rate)。
    3. 给出明确决策（现价买入、回踩买入、继续观望、放弃）。
    4. 给出核心建议价位（必须基于截图中的实时价进行测算，确保建议价位具有实操性）。
    
    输出必须严格遵守 JSON。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: batchTimingSchema
    }
  });

  const text = response.text || "{}";
  const parsed = JSON.parse(text);

  return {
    content: text,
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    batchTimingData: parsed,
    market
  };
};

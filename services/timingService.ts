
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
    ${base64Image ? "【输入】我提供了一张该标的的 K 线走势截图。请优先结合图中展现的 K 线形态、成交量、支撑压力位进行视觉诊断。" : "【输入】请通过联网搜索该标的最近的日线形态和关键位置。"}
    
    【核心研判要求】
    1. 评估当前所处位置：是底部放量启动、半山腰震荡、还是高位见顶放量？
    2. 是否合适进场：给出具体的操作建议 (Buy/Wait/Sell/Reduce)。
    3. 进场时机：如果是 Wait，要等什么信号？如果是 Buy，具体什么价位进场？
    
    必须输出 JSON 格式。
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
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

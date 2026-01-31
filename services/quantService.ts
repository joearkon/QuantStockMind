
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType } from "../types";

const quantVaneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    data_freshness: { type: Type.STRING, description: "数据时效描述：如'实时早盘'、'午间汇总'、'盘后全量'" },
    overall_mood: { type: Type.STRING },
    top_synergy_pool: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          net_amount: { type: Type.STRING },
          time_slot: { type: Type.STRING, description: "动作发生时间段：如'今日早盘'、'昨日收盘'" },
          direction: { type: Type.STRING, enum: ['Buy', 'Sell'] },
          intensity_score: { type: Type.NUMBER },
          logic: { type: Type.STRING }
        },
        required: ["name", "code", "net_amount", "direction"]
      }
    },
    quant_boarding_list: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          net_amount: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ['Buy', 'Sell'] },
          logic: { type: Type.STRING }
        },
        required: ["name", "code", "net_amount", "direction"]
      }
    },
    quant_grabbing_list: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          net_amount: { type: Type.STRING },
          direction: { type: Type.STRING, enum: ['Buy', 'Sell'] },
          logic: { type: Type.STRING }
        },
        required: ["name", "code", "net_amount", "direction"]
      }
    },
    risk_warning: { type: Type.STRING }
  },
  required: ["scan_time", "data_freshness", "overall_mood", "top_synergy_pool", "quant_boarding_list", "quant_grabbing_list", "risk_warning"]
};

export const fetchQuantClusterAnalysis = async (market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const hour = now.getHours();
  
  // 核心逻辑：锁定 2 个交易日范围
  let timeInstruction = "";
  if (hour < 15) {
    timeInstruction = `当前处于盘中。请重点审计【今日上午盘(早盘)异动】与【前一交易日】的量化合力。对比今日早盘吸筹与昨日席位留存。`;
  } else {
    timeInstruction = `当前已收盘。请重点审计【今日收盘龙虎榜】与【昨日席位】。分析这两日内量化资金的连续性流向。`;
  }

  const prompt = `
    【硬核指令：2日量化合力极速审计】
    今日日期: ${dateStr}。作为量化席位研究员，利用 googleSearch 检索 ${market} 市场【最近 2 个交易日】的龙虎榜与异动成交数据。
    
    [重点任务]：
    1. **锁定 2 日视窗**：严格对比“昨日全天”与“今日最新（含上午盘异动）”的数据。
    2. **量化标的池扩容**：挖掘至少 30 只具体个股。
    3. **时序追溯**：在 time_slot 中标注该动作是发生在“今日早盘”还是“昨日收盘”。
    4. **数值真值**：准确提取龙虎榜快报中的【净买额】（如：净买 1.49亿）。
    
    [输出要求]：
    - 语言全中文，严格遵守 JSON Schema 格式。
    - ${timeInstruction}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: quantVaneSchema
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return {
    content: response.text || "",
    timestamp: Date.now(),
    modelUsed: ModelProvider.GEMINI_INTL,
    isStructured: true,
    quantVaneData: parsed,
    market
  };
};

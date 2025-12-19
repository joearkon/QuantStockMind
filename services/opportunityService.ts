import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse, ForesightReport } from "../types";
import { fetchExternalAI } from "./externalLlmService";
import { runGeminiSafe } from "./geminiService";

// --- Foresight Schema ---
const foresightSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    monthly_focus: { type: Type.STRING, description: "Monthly core theme summary. Must be concise and impactful." },
    catalysts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date_window: { type: Type.STRING },
          event_name: { type: Type.STRING },
          theme_label: { type: Type.STRING },
          logic_chain: { type: Type.STRING },
          opportunity_level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          suggested_stocks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["date_window", "event_name", "theme_label", "logic_chain", "opportunity_level", "suggested_stocks"]
      }
    },
    rotation_warning: { type: Type.STRING, description: "Warning about sector rotation risks." },
    macro_policy_insight: { type: Type.STRING, description: "Deep insight into macro policies." }
  },
  required: ["monthly_focus", "catalysts", "rotation_warning", "macro_policy_insight"]
};

// --- JSON Templates for Non-Gemini Models ---
const CHAIN_JSON_TEMPLATE = `
{
  "policy_theme": "产业链逻辑主线名称",
  "analysis_summary": "深度的产业背景分析总结",
  "supply_chain_matrix": [
    {
      "user_holding": "输入的标的名称",
      "opportunities": [
        {
          "stock_name": "关联股票名",
          "stock_code": "股票代码",
          "relation_type": "上游/下游/侧向竞争/技术外溢",
          "logic_core": "核心关联逻辑描述",
          "policy_match": "政策匹配度描述"
        }
      ]
    }
  ]
}
`;

const DEPLOY_JSON_TEMPLATE = `
{
  "policy_theme": "资金选股逻辑名称",
  "analysis_summary": "今日市场资金偏好深度分析",
  "deployment_plan": {
    "focus_directions": [
      { "sector": "板块名", "inflow_status": "主力介入/高位获利/低吸潜伏", "logic": "介入逻辑" }
    ],
    "top_picks": [
      { "name": "股票名", "code": "代码", "sector": "所属行业", "risk_tag": "High/Medium/Low", "reason": "推荐理由", "buy_point": "建议介入点位" }
    ]
  }
}
`;

/**
 * Mining Logic: Supply Chain Resonance OR Capital Deployment OR Theme Foresight
 */
export const fetchOpportunityMining = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any,
  inputData: string = "", 
  mode: 'chain' | 'deploy' | 'foresight' = 'chain'
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  let systemPrompt = "";
  let userPrompt = "";

  if (mode === 'chain') {
    systemPrompt = `你是一位精通 A 股产业链逻辑与国家宏观战略的资深基金经理。挖掘标的的上游/下游/侧向机会。`;
    userPrompt = `当前日期: ${dateStr}。我的持仓/关注: 【${inputData || "热门科技"}】。请通过联网搜索识别其产业链位置，挖掘出具有潜力的关联标的。`;
  } else if (mode === 'deploy') {
    systemPrompt = `你是一位擅长捕捉【主力资金流向】与【题材热点】的实战型游资。根据现金风格偏好推荐进场方向。`;
    userPrompt = `当前日期: ${dateStr}。我的资金风格: 【${inputData || "综合/稳健"}】。请联网扫描全市场资金流向、大宗交易和主力买卖情况，筛选相关标的。`;
  } else {
    systemPrompt = `你是一位顶级策略分析师，擅长预测【政策催化剂】与【题材轮动时间节点】。`;
    userPrompt = `当前日期: ${dateStr}。请重点扫描未来 1-2 个月（特别是 2025年1月及以后）的增量利好。必须包含具体的时间窗口、事件名称、相关受益个股（真实代码）。`;
  }

  // 1. Gemini Implementation
  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const config: any = {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      };

      if (mode === 'foresight') {
        config.responseSchema = foresightSchema;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: systemPrompt + "\n" + userPrompt,
        config: config
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);

      return {
        content: text,
        timestamp: Date.now(),
        modelUsed: provider,
        isStructured: true,
        opportunityData: mode !== 'foresight' ? parsed : undefined,
        foresightData: mode === 'foresight' ? parsed : undefined,
        market
      };
    } catch (e: any) {
      throw new Error(`Gemini 分析错误: ${e.message}`);
    }
  }

  // 2. Hunyuan Implementation
  if (provider === ModelProvider.HUNYUAN_CN) {
    const apiKey = settings?.hunyuanKey;
    
    // 显式添加输出模板到 Prompt，解决混元在 mining 模式下不知道 JSON 结构的问题
    let finalPrompt = systemPrompt + "\n" + userPrompt;
    if (mode === 'chain') {
      finalPrompt += `\n[重要要求]: 请输出以下结构的有效 JSON 字符串：\n${CHAIN_JSON_TEMPLATE}`;
    } else if (mode === 'deploy') {
      finalPrompt += `\n[重要要求]: 请输出以下结构的有效 JSON 字符串：\n${DEPLOY_JSON_TEMPLATE}`;
    } else {
      // Foresight 使用 foresightSchema 的结构
      finalPrompt += `\n[重要要求]: 请输出符合“月度前瞻”格式的 JSON。包含 monthly_focus, catalysts (数组, 包含 event_name, logic_chain, suggested_stocks 等), rotation_warning, macro_policy_insight 字段。`;
    }

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
      if (mode === 'foresight') {
        result.foresightData = parsed;
      } else {
        result.opportunityData = parsed;
      }
      result.isStructured = true;
    } catch (e) {
      console.error("Hunyuan JSON parse failed", e, result.content);
      throw new Error("混元模型 JSON 结构解析失败。可能是因为模型未按预期格式返回数据，请尝试再次点击“扫描”。");
    }
    return result;
  }

  throw new Error("不支持的 Provider");
};
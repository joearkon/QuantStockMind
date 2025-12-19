
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
    userPrompt = `当前日期: ${dateStr}。我的持仓/关注: 【${inputData || "热门科技"}】。找出产业链标的，提供真实股票代码。`;
  } else if (mode === 'deploy') {
    systemPrompt = `你是一位擅长捕捉【主力资金流向】与【题材热点】的实战型游资。根据现金风格偏好推荐进场方向。`;
    userPrompt = `当前日期: ${dateStr}。我的资金风格: 【${inputData || "综合/稳健"}】。提供 3-5 只带逻辑的标的，提供真实完整代码。`;
  } else {
    // --- MODE: Theme Foresight ---
    systemPrompt = `
      你是一位顶级策略分析师，擅长预测【政策催化剂】与【题材轮动时间节点】。
      【核心任务】
      1. **未来扫描**: 深度检索接下来 60 天内可能对 ${market} 产生重大影响的政策窗口、行业会议、科技突破计划、重大工程节点（如火箭发射、峰会开幕）。
      2. **逻辑穿透**: 像“12月长征十二号火箭发射带动商业航天”一样，预判下一个“具备确定性的潜在题材”。
      3. **风险提示**: 识别哪些题材已经利好兑现，哪些正处于“预期差”极大的低位。
    `;
    userPrompt = `
      当前日期: ${dateStr}。请重点扫描未来 1-2 个月（特别是 2025年1月及以后）的增量利好。
      必须包含具体的时间窗口、事件名称、相关受益个股（真实代码）。
      禁止返回空字段。
    `;
  }

  // 1. Gemini Implementation
  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      // 关键修复：显式应用 responseSchema
      const config: any = {
        tools: [{ googleSearch: {} }],
      };

      if (mode === 'foresight') {
        config.responseMimeType = "application/json";
        config.responseSchema = foresightSchema;
      }

      const response = await runGeminiSafe(ai, {
        contents: systemPrompt + "\n" + userPrompt,
        config: config
      }, "Opportunity/Foresight Mining");

      const text = response.text || "{}";
      let clean = text.trim();
      clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          clean = clean.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(clean);

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
    // 混元模式下 forceJson=true 强制返回 JSON
    const result = await fetchExternalAI(provider, apiKey, systemPrompt + "\n" + userPrompt, false, undefined, market, true);
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
      throw new Error("模型 JSON 解析失败，请重试。");
    }
    return result;
  }

  throw new Error("不支持的 Provider");
};

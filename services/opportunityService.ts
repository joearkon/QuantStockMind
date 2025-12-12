import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, ModelProvider, MarketType, OpportunityResponse } from "../types";
import { fetchExternalAI } from "./externalLlmService";

const GEMINI_MODEL = "gemini-2.5-flash";

// --- New Schema: Supply Chain & Policy Focus ---
const strategySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis_summary: { type: Type.STRING, description: "Brief analysis of current market phase relating to user holdings." },
    policy_theme: { type: Type.STRING, description: "The specific National Strategy Theme or Industry Logic (e.g., 'New Productive Forces', 'Domestic Substitution', 'Consumer Recovery')" },
    supply_chain_matrix: {
      type: Type.ARRAY,
      description: "Analysis of upstream/downstream opportunities for user's specific stocks.",
      items: {
        type: Type.OBJECT,
        properties: {
          user_holding: { type: Type.STRING, description: "The stock name provided by user" },
          opportunities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stock_name: { type: Type.STRING },
                stock_code: { type: Type.STRING },
                relation_type: { type: Type.STRING, description: "e.g., 'Core Upstream Supplier', 'Liquid Cooling Partner'" },
                logic_core: { type: Type.STRING, description: "Why is this a dark horse? e.g. 'Sole supplier of X material'" },
                policy_match: { type: Type.STRING, description: "How it fits current National Strategy (e.g. 15th Plan, Domestic Substitution)" }
              },
              required: ["stock_name", "stock_code", "relation_type", "logic_core", "policy_match"]
            }
          }
        },
        required: ["user_holding", "opportunities"]
      }
    },
    rotation_strategy: {
      type: Type.ARRAY,
      description: "Suggestions for switching positions (High->Low)",
      items: {
        type: Type.OBJECT,
        properties: {
          current_sector: { type: Type.STRING, description: "Where the user might be now (or what is hot)" },
          next_sector: { type: Type.STRING, description: "Where to rotate next" },
          reason: { type: Type.STRING, description: "Logic for rotation" },
          catalyst: { type: Type.STRING, description: "Trigger event or policy expectation" }
        },
        required: ["current_sector", "next_sector", "reason", "catalyst"]
      }
    }
  },
  required: ["analysis_summary", "policy_theme", "supply_chain_matrix", "rotation_strategy"]
};

// --- Template for Hunyuan ---
const hunyuanStrategyTemplate = {
  analysis_summary: "当前市场分析总结...",
  policy_theme: "国产替代：核心基础零部件",
  supply_chain_matrix: [
    {
      user_holding: "中科曙光",
      opportunities: [
        {
          stock_name: "某某科技",
          stock_code: "300xxx",
          relation_type: "液冷核心部件供应商",
          logic_core: "曙光液冷服务器出货量激增，该公司为其独家供应快接头，市值仅50亿，弹性大。",
          policy_match: "符合国家算力绿色低碳化战略"
        }
      ]
    }
  ],
  rotation_strategy: [
    {
      current_sector: "高位纯AI软件炒作",
      next_sector: "低位算力硬件上游 (材料/温控)",
      reason: "财报季临近，纯题材炒作面临证伪，资金将回流有业绩支撑的硬件上游。",
      catalyst: "国家数据局即将发布的新算力规划"
    }
  ]
};

/**
 * Mining Logic: Supply Chain Resonance & Policy Alignment
 */
export const fetchOpportunityMining = async (
  provider: ModelProvider,
  market: MarketType,
  settings: any,
  userHoldings: string = ""
): Promise<AnalysisResult> => {
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');

  // Logic:
  // 1. Analyze User Holdings (e.g., Guoji Jinggong, Zhongke Sugon).
  // 2. Identify Strategy relevance (Policy/Industry Cycle).
  // 3. Find Upstream/Downstream "Shadow Stocks" (Dark Horses).
  // 4. Suggest Rotation.

  const systemPrompt = `
    你是一位精通 A 股产业链逻辑与国家宏观战略（如十五五规划、新质生产力、国产替代、内需复苏）的资深基金经理。
    你的核心能力不是看简单的K线，而是挖掘**产业链协同**与**预期差**。
    
    【核心任务】
    1. **产业链穿透 (Supply Chain Penetration)**：针对用户持有的核心标的，挖掘其**上游**（原材料、核心零部件）或**下游**（核心应用）中，尚未被充分炒作的"隐形冠军"或"黑马"。
    2. **战略与逻辑对齐**: 你的推荐必须紧扣当前的**国家宏观战略**或**产业周期逻辑**。
    3. **板块搭配 (Board Mix)**: 挖掘结果请务必**同时包含**：
       - **主板标的** (60x/00x)：适合稳健配置。
       - **科创/创业板标的** (688x/300x)：作为技术卡位观察或高弹性补充。
       *(注：即使科创板不是用户的主战场，也请列出以供全产业链逻辑对比)*
    4. **高低切换**: 给出板块轮动建议。
    
    【数据要求】
    - 必须联网搜索最新的产业链关系、供应商名单。
    - 严禁废话，只输出干货逻辑。
  `;

  const userPrompt = `
    当前日期: ${dateStr}。
    
    我的持仓/关注方向: 【${userHoldings || "当前市场热门题材, 科技成长, 核心资产"}】。

    请为我生成一份【产业链协同与黑马挖掘报告】：
    
    1. **产业链协同矩阵**: 
       - 针对我的关注方向，为每个方向找出 2-3 个具体的**上游**或**关联**标的。
       - **重要要求**：结果中请列出 **1-2个主板标的 (60x/00x)** 和 **1-2个科创/创业板标的 (688x/300x)**。我需要看到不同板块在同一产业链上的分布情况（例如：主板做集成，科创板做核心材料）。
       - 说明它们与"当前主流宏观逻辑"（如新质生产力、国产替代、复苏等）的匹配度。
    
    2. **资金轮动策略**:
       - 假设我现在想做高低切换，下一个风口可能轮动到哪里？
       - 给出明确的逻辑和催化剂。

    输出必须为严格的 JSON 格式。
  `;

  // 1. Gemini Implementation
  if (provider === ModelProvider.GEMINI_INTL) {
    const apiKey = settings?.geminiKey || process.env.API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: systemPrompt + "\n" + userPrompt + `\n\nReturn strict JSON matching this schema: ${JSON.stringify(strategySchema)}`,
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

    const finalPrompt = `${systemPrompt}\n${userPrompt}\n\nIMPORTANT: Return valid JSON only. Output MUST strictly follow this structure example:\n${JSON.stringify(hunyuanStrategyTemplate, null, 2)}`;
    
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

      // Validation
      if (!parsed.supply_chain_matrix || !Array.isArray(parsed.supply_chain_matrix)) {
         throw new Error("Missing supply_chain_matrix");
      }

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
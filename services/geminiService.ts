
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
  AnalysisResult, 
  ModelProvider, 
  MarketType, 
  MarketDashboardData, 
  HoldingsSnapshot, 
  PeriodicReviewData, 
  PlanItem, 
  KLineSynergyData, 
  DualBoardScanResponse, 
  MainBoardScanResponse, 
  LimitUpLadderResponse,
  StockSynergyResponse,
  SectorLadderData,
  JournalEntry
} from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 

// --- Utils ---
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

// --- Schemas ---

const trendHighScoutSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    trend_market_sentiment: { type: Type.STRING },
    hot_breakout_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          breakout_type: { type: Type.STRING, enum: ['历史新高', '阶段新高', '平台突破'] },
          sky_limit_score: { type: Type.NUMBER },
          ma5_distance_percent: { type: Type.NUMBER },
          last_30d_max_surge: { type: Type.NUMBER },
          vol_status: { type: Type.STRING, enum: ['缩量中继', '放量突破', '天量分歧'] },
          pattern_label: { type: Type.STRING, enum: ['空中加油', '老鸭头', '横盘突破'] },
          active_capital_type: { type: Type.STRING },
          logic_breakout: { type: Type.STRING },
          stop_loss_ma5: { type: Type.STRING },
          is_blue_sky: { type: Type.BOOLEAN }
        },
        required: ["name", "code", "breakout_type", "sky_limit_score", "ma5_distance_percent", "logic_breakout", "stop_loss_ma5"]
      }
    },
    risk_warning: { type: Type.STRING }
  },
  required: ["scan_time", "trend_market_sentiment", "candidates", "risk_warning"]
};

const hotMoneyAmbushSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    turnaround_strategy_summary: { type: Type.STRING },
    high_elastic_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          elasticity_score: { type: Type.NUMBER }, 
          market_cap_label: { type: Type.STRING }, 
          catch_up_anchor_leader: { type: Type.STRING }, 
          position_grade: { type: Type.STRING, enum: ['极低位', '相对低位', '中位震荡'] },
          pit_depth_percent: { type: Type.NUMBER },
          dormant_days: { type: Type.NUMBER },
          sector_name: { type: Type.STRING },
          k_pattern_sign: { type: Type.STRING },
          turnaround_logic: { type: Type.STRING },
          logic_confidence: { type: Type.NUMBER },
          phase: { type: Type.STRING, enum: ['GoldenPit', 'Dormant', 'Stirring'] },
          estimated_logic_area: { type: Type.STRING }
        },
        required: ["name", "code", "elasticity_score", "market_cap_label", "catch_up_anchor_leader", "turnaround_logic", "logic_confidence", "position_grade"]
      }
    },
    rotation_insight: { type: Type.STRING }
  },
  required: ["scan_time", "turnaround_strategy_summary", "candidates", "rotation_insight"]
};

const marketDashboardSchema = { 
  type: Type.OBJECT, 
  properties: { 
    data_date: { type: Type.STRING }, 
    market_indices: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          name: { type: Type.STRING }, 
          value: { type: Type.STRING }, 
          change: { type: Type.STRING }, 
          percent: { type: Type.STRING }, 
          direction: { type: Type.STRING, enum: ['up', 'down'] } 
        }, 
        required: ["name", "value", "percent", "direction"] 
      } 
    }, 
    market_volume: { 
      type: Type.OBJECT, 
      properties: { 
        total_volume: { type: Type.STRING }, 
        volume_delta: { type: Type.STRING }, 
        volume_trend: { type: Type.STRING, enum: ['expansion', 'contraction', 'flat'] }, 
        capital_mood: { type: Type.STRING } 
      }, 
      required: ["total_volume", "volume_delta", "volume_trend"] 
    }, 
    market_sentiment: { 
      type: Type.OBJECT, 
      properties: { 
        score: { type: Type.NUMBER }, 
        summary: { type: Type.STRING }, 
        trend: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'] }, 
        warning_level: { type: Type.STRING, enum: ['Normal', 'Overheated', 'Extreme'] } 
      }, 
      required: ["score", "summary", "trend"] 
    }, 
    capital_composition: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { 
          type: { type: Type.STRING, enum: ['Foreign', 'Institutional', 'HotMoney', 'Retail'] }, 
          label: { type: Type.STRING }, 
          percentage: { type: Type.NUMBER }, 
          trend: { type: Type.STRING, enum: ['increasing', 'decreasing', 'stable'] }, 
          description: { type: Type.STRING }, 
          target_sectors: { type: Type.ARRAY, items: { type: Type.STRING } } 
        }, 
        required: ["type", "label", "percentage", "trend", "description", "target_sectors"] 
      } 
    }, 
    capital_rotation: { 
      type: Type.OBJECT, 
      properties: { 
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, 
        rotation_logic: { type: Type.STRING } 
      }, 
      required: ["inflow_sectors", "outflow_sectors", "rotation_logic"] 
    }, 
    macro_logic: { 
      type: Type.OBJECT, 
      properties: { 
        policy_focus: { type: Type.STRING }, 
        external_impact: { type: Type.STRING }, 
        core_verdict: { type: Type.STRING } 
      }, 
      required: ["policy_focus", "core_verdict"] 
    } 
  }, 
  required: ["data_date", "market_indices", "market_volume", "market_sentiment", "capital_composition", "capital_rotation", "macro_logic"] 
};

// --- Services ---

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');
  
  let indexNames = "";
  if (market === MarketType.CN) indexNames = "上证指数, 深证成指, 创业板指, 科创50, 沪深300";
  else if (market === MarketType.HK) indexNames = "恒生指数, 恒生科技指数";
  else if (market === MarketType.US) indexNames = "标普500, 纳斯达克, 道琼斯";

  const prompt = `
    【绝对任务：市场实时数据审计】
    当前系统真实时间: ${timeContext}。
    
    [!!! 数据真实性校验 - 严禁幻觉 !!!]:
    1. 你必须利用 googleSearch 检索东方财富(eastmoney)、同花顺(10jqka) 或 新浪财经 的【今日实时】数据。
    2. **上证指数校验**：目前真实的上证指数位于 3000-3500 点区间（除非发生历史性大涨）。严禁返回 4000+ 或 2000 以下的陈旧/模拟数值。
    3. **成交额校验**：核实 A 股全天成交额（如 1.5万亿、8000亿等）。
    
    [重点探测逻辑]：
    - 四路资金（北向、内资机构、游资、散户）今日重点进攻的板块。
    - 宏观环境对盘面的最新影响（如美联储议息、国内政策发布）。
    
    目标指数列表: ${indexNames}。
    输出格式：严格 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: marketDashboardSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: parsed, market };
};

export const fetchTrendHighScout = async (apiKey: string, mainBoardOnly: boolean = true): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  
  const boardConstraint = mainBoardOnly ? `
    [!!! 极其重要：标的范围限制 !!!]
    - 用户仅能操作【沪深主板】标的。
    - 严禁返回代码以 300, 301 (创业板), 688 (科创板), 8, 4, 9 开头的标的。
    - 仅允许 000, 001, 002, 003 (深市主板) 和 60 (沪市主板) 开头的标的。
    - 如果你找到一个好标的是 300 开头，请直接忽略它，寻找下一个符合主板条件的标的。
  ` : "";

  const prompt = `
    【顶级新高猎手指令 3.5：主板突破与空中加油】
    今日日期: ${dateStr}。
    ${boardConstraint}
    
    [!!! 核心选股逻辑：新高 > 活性 !!!]:
    1. **上方无压力**：抓取正在创出【历史新高】或【250日新高】的主板标的。
    2. **空中加油形态**：寻找在高位缩量横盘、且【5日均线 (MA5)】支撑不破的标的。
    3. **回溯活性**：过去 30 天内有过涨停记录或单日 7% 以上大涨。
    4. **市值限制**：50亿 - 250亿。
    
    输出严格 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: trendHighScoutSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, trendHighScoutData: parsed, market: MarketType.CN };
};

export const fetchHotMoneyAmbush = async (apiKey: string, mainBoardOnly: boolean = true): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  
  const boardConstraint = mainBoardOnly ? `
    [!!! 极其重要：标的范围限制 !!!]
    - 用户仅能操作【沪深主板】标的。
    - 严禁返回 300, 301, 688 等创业板/科创板标的。
    - 仅允许 000, 001, 002, 003 (深市主板) 和 60 (沪市主板) 开头的 10% 权限股票。
  ` : "";

  const prompt = `
    【核心指令：主板翻身战法 3.4 - 补涨对齐】
    今日日期: ${dateStr}。
    ${boardConstraint}
    
    [!!! 选股偏好：弹性 > 规模 !!!]:
    1. **排除巨无霸**：避开中石油、农业银行等沉重蓝筹。
    2. **锁定主板活跃小马**：市值 50亿 - 150亿 之间，有过连板基因。
    3. **补涨逻辑**：寻找主板中对应行业龙头的低位影子股。
    
    输出严格 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: hotMoneyAmbushSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, hotMoneyAmbushData: parsed, market: MarketType.CN };
};

// ... remaining services (fetchStockSynergy, fetchLimitUpLadder, etc.) remain as they were ...
export const fetchStockSynergy = async (query: string, base64MarketImage: string | null, base64HoldingsImage: string | null, apiKey: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const prompt = `作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。必须从上传的第一张图片中识别最新股价分析其缩量或形态。输出 JSON。`; const parts: any[] = [{ text: prompt }]; if (base64MarketImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64MarketImage } }); if (base64HoldingsImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64HoldingsImage } }); const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts }, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, used_current_price: { type: Type.STRING }, synergy_score: { type: Type.NUMBER }, trap_risk_score: { type: Type.NUMBER }, dragon_potential_score: { type: Type.NUMBER }, market_position: { type: Type.STRING }, capital_consistency: { type: Type.STRING }, main_force_cost_anchor: { type: Type.OBJECT, properties: { estimated_cost: { type: Type.STRING }, safety_margin_percent: { type: Type.NUMBER }, risk_level: { type: Type.STRING, enum: ["低风险", "中等溢价", "高危泡沫", "成本线下/黄金区"] } }, required: ["estimated_cost", "safety_margin_percent", "risk_level"] }, turnover_eval: { type: Type.OBJECT, properties: { current_rate: { type: Type.STRING }, is_sufficient: { type: Type.BOOLEAN }, verdict: { type: Type.STRING } }, required: ["current_rate", "is_sufficient", "verdict"] }, main_force_portrait: { type: Type.OBJECT, properties: { lead_type: { type: Type.STRING }, entry_cost_est: { type: Type.STRING }, hold_status: { type: Type.STRING } }, required: ["lead_type", "entry_cost_est", "hold_status"] }, t_plus_1_prediction: { type: Type.OBJECT, properties: { expected_direction: { type: Type.STRING }, confidence: { type: Type.NUMBER }, price_range: { type: Type.STRING }, opening_strategy: { type: Type.STRING }, logic: { type: Type.STRING } }, required: ["expected_direction", "confidence", "price_range", "opening_strategy", "logic"] }, synergy_factors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER }, description: { type: Type.STRING } }, required: ["label", "score", "description"] } }, battle_verdict: { type: Type.STRING }, action_guide: { type: Type.STRING }, chase_safety_index: { type: Type.NUMBER } }, required: [ "name", "code", "used_current_price", "synergy_score", "trap_risk_score", "dragon_potential_score", "market_position", "capital_consistency", "main_force_cost_anchor", "turnover_eval", "main_force_portrait", "t_plus_1_prediction", "synergy_factors", "battle_verdict", "action_guide", "chase_safety_index" ] } } }); const parsed = robustParse(response.text || ""); if (!parsed || !parsed.name) throw new Error("模型返回数据不完整。"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, stockSynergyData: parsed }; };
export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const now = new Date(); const dateStr = now.toLocaleDateString('zh-CN'); const prompt = `【指令：全量真实涨停梯队深度扫描】今日现实日期: ${dateStr}。作为顶级 A 股短线量化专家，请利用 googleSearch 扫描今日全市场【真实且正在封板】的涨停标的。[强制要求：全量扫描与扩容] 1. 严禁只抓取排名前几位的股票。必须返回今日全市场分布在各板块的 20-30 只真实涨停标的。2. 检索最新的行情分级榜单，涵盖 5 板、3 板、2 板及首板全梯队。3. 仅返回涨幅等于或超过 9.8%（主板）或 19.8%（双创）的标的。`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, total_limit_ups: { type: Type.NUMBER }, sectors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, sector_type: { type: Type.STRING, enum: ["Main", "Sub"] }, total_count: { type: Type.NUMBER }, max_height: { type: Type.NUMBER }, ladder_matrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, count: { type: Type.NUMBER }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } } } } } } }, dragon_leader: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, consecutive_days: { type: Type.NUMBER }, strength_score: { type: Type.NUMBER }, reason: { type: Type.STRING } } }, dragon_seeds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, capital_intensity: { type: Type.STRING, enum: ["Extreme", "High", "Normal"] }, seat_analysis: { type: Type.STRING }, incubation_logic: { type: Type.STRING }, evolution_stage: { type: Type.STRING, enum: ["Seeding", "Sprouting", "Competing"] } } } }, integrity_score: { type: Type.NUMBER }, market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] } }, required: ["sector_name", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score"] } }, market_conclusion: { type: Type.STRING } }, required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"] } } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: parsed, market: MarketType.CN }; };
export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const now = new Date(); const dateStr = now.toLocaleDateString('zh-CN'); const prompt = `【指令：双创 20% 涨停标的全量深度审计】今日现实日期: ${dateStr}。请利用 googleSearch 扫描今日创业板和科创板的所有【真实收盘】涨停标的。[!!! 数量扩容指令 !!!]：1. **杜绝敷衍**：如果今日双创有超过 10 家涨停，你必须全部列出，目标返回 15-20 只左右的高关注度标的。2. **时间对齐**：必须寻找标题或内容中明确注明是 "${dateStr}" 或 "今日盘后" 的实时行情。3. **20% 涨停过滤**：仅抓取涨幅在 19.8% 以上且收盘依然保持封板状态的标的。`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, market_mood: { type: Type.STRING }, hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, board: { type: Type.STRING, enum: ['创业板', '科创板'] }, consecutive_days: { type: Type.NUMBER }, control_score: { type: Type.NUMBER }, cost_price: { type: Type.STRING }, trend_momentum: { type: Type.STRING }, rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, volume_ratio: { type: Type.STRING }, logic: { type: Type.STRING }, target_price: { type: Type.STRING }, support_price: { type: Type.STRING }, capital_detail: { type: Type.OBJECT, properties: { net_buy_amount: { type: Type.STRING }, large_order_ratio: { type: Type.STRING }, seats: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["net_buy_amount", "large_order_ratio", "seats"] } }, required: ["name", "code", "consecutive_days", "control_score", "capital_detail"] } } } } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dualBoardScanData: parsed, market: MarketType.CN }; };
export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const now = new Date(); const dateStr = now.toLocaleDateString('zh-CN'); const prompt = `【核心指令：全量沪深主板涨停标的扫描 - 杜绝截断】当前现实日期: ${dateStr}。请利用 googleSearch 检索【今日即 ${dateStr}】沪深主板真实封死涨停的标的。[!!! 绝对任务清单 !!!]：1. **数量要求**：严禁只返回 5-6 只。主板行情好的时候通常有几十只涨停，请务必返回今日最核心、最具题材代表性的 **20-30 只** 标的。2. **强制校验**：万科A (000002)、中国联通等大盘股，如果今日只是“异动”而非“涨停”，绝对不允许出现在名单中。AI 必须核实其今日收盘价对应的真实涨幅是否 > 9.8%。3. **真实性锚定**：搜索词应使用 "A股${dateStr}涨停全貌"、"${dateStr} 沪深京涨停股一览"。如果没有检索到今日的完整表格，请结合多个搜索结果进行拼凑还原，确保覆盖面最广。`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, market_mood: { type: Type.STRING }, hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, board: { type: Type.STRING, enum: ['沪市主板', '深市主板'] }, limit_up_type: { type: Type.STRING, enum: ['首板', '连板'] }, consecutive_days: { type: Type.NUMBER }, control_score: { type: Type.NUMBER }, cost_price: { type: Type.STRING }, trend_momentum: { type: Type.STRING }, rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, volume_ratio: { type: Type.STRING }, logic: { type: Type.STRING }, target_price: { type: Type.STRING }, support_price: { type: Type.STRING }, capital_detail: { type: Type.OBJECT, properties: { net_buy_amount: { type: Type.STRING }, large_order_ratio: { type: Type.STRING }, seats: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["net_buy_amount", "large_order_ratio", "seats"] } }, required: ["name", "code", "consecutive_days", "control_score", "capital_detail"] } } } } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: parsed, market: MarketType.CN }; };
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }] } }); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL }; };
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string, currentPrice?: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const now = new Date(); const timeContext = now.toLocaleString('zh-CN'); const prompt = `作为顶级 A 股量化交易专家，请对标的 "${query}" (市场: ${market}) 进行深度量化研判。【核心任务：视觉对齐与指标纠正】你面前有一张该标的的实时行情截图。1. **强制识别盘面价格**: 请优先 from 图中提取最新的【现价】、【涨跌幅】、【成交额/量】。2. **量价关系审计**: 观察图中成交量柱状图，判断当前形态是“放量攻击”、“缩量回调”还是“高位分歧”。3. **均线形态校准**: 识别 K 线与均线（MA5/10/20/60）的相对位置，判断是否存在明显的支撑 or 乖离率过大的情况。[!!! 绝对优先级逻辑 !!!]: 1. 如果用户手动指定了现价 (${currentPrice || '未手动指定'})，则以该价格为最高优先级。2. 否则，必须提取【截图中的视觉价格】作为逻辑基准进行后续诊断。3. 联网搜索 (googleSearch) 的数据仅用于行业背景、近期利好/利空公告。**严禁使用搜索到的滞后价格覆盖截图中的实时视觉数据**。参考盘面时间: ${timeContext}请输出详细诊断报告。`; const parts = [ { text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } } ]; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts }, config: { tools: [{ googleSearch: {} }] } }); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market }; };
export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => { const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } }; const textPart = { text: "解析截图中的持仓数据，输出 JSON。" }; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts: [imagePart, textPart] }, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { totalAssets: { type: Type.NUMBER }, positionRatio: { type: Type.NUMBER }, date: { type: Type.STRING }, holdings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.NUMBER }, costPrice: { type: Type.NUMBER }, currentPrice: { type: Type.NUMBER }, profit: { type: Type.NUMBER }, profitRate: { type: Type.STRING }, marketValue: { type: Type.NUMBER } } } } } } } }); return robustParse(response.text || "{}"); };
export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); const prompt = `对以下历史交易记录进行【${label}】阶段性复盘：${JSON.stringify(journals)}`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, market_trend: { type: Type.STRING, enum: ['bull', 'bear', 'sideways'] }, market_summary: { type: Type.STRING }, monthly_portfolio_summary: { type: Type.STRING }, highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, stock_diagnostics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, issues: { type: Type.ARRAY, items: { type: Type.STRING } }, verdict: { type: Type.STRING } } } }, next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }, improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } } } } } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsed, market }; };
export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => { const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); const prompt = `从以下分析文本中提取具体的交易计划项：\n\n${content}`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] }, price_target: { type: Type.STRING }, reason: { type: Type.STRING } } } }, summary: { type: Type.STRING } } } } }); const parsed = robustParse(response.text || "{}"); return { items: parsed.items?.map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9), status: 'pending' })) || [], summary: parsed.summary || "" }; };
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const prompt = `分析 ${market} 板块 "${query}" 的生命周期梯队及风险指数。`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, cycle_stage: { type: Type.STRING, enum: ['Starting', 'Growing', 'Climax', 'End', 'Receding'] }, stage_label: { type: Type.STRING }, risk_score: { type: Type.NUMBER }, ladder: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tier: { type: Type.STRING }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, price: { type: Type.STRING }, status: { type: Type.STRING, enum: ['Leading', 'Stagnant', 'Following', 'Weakening'] }, performance: { type: Type.STRING }, health_score: { type: Type.NUMBER }, logic: { type: Type.STRING } } } } } } }, structural_integrity: { type: Type.OBJECT, properties: { synergy_score: { type: Type.NUMBER }, verdict: { type: Type.STRING }, is_divergent: { type: Type.BOOLEAN } } }, support_points: { type: Type.ARRAY, items: { type: Type.STRING } }, warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } }, action_advice: { type: Type.STRING } } } } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: parsed, market }; };

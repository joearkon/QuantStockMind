
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
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

const marketDashboardSchema = { 
  type: Type.OBJECT, 
  properties: { 
    data_date: { type: Type.STRING }, 
    market_status: { type: Type.STRING },
    closing_commentary: { type: Type.STRING },
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
          description: { type: Type.STRING }
        },
        required: ["type", "label", "percentage", "trend", "description"]
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
  required: ["data_date", "market_status", "market_indices", "market_volume", "market_sentiment", "capital_composition", "capital_rotation", "macro_logic"]
};

const hotMoneyAmbushSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    market_summary: { type: Type.STRING },
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          recent_lh_count: { type: Type.NUMBER },
          top_seats: { type: Type.ARRAY, items: { type: Type.STRING } },
          net_inflow_amount: { type: Type.STRING },
          institutional_participation: { type: Type.BOOLEAN },
          ambush_rating: { type: Type.STRING, enum: ['Strong', 'Normal', 'Avoid'] },
          ambush_logic: { type: Type.STRING },
          target_entry_price: { type: Type.STRING },
          stop_loss_price: { type: Type.STRING }
        },
        required: ["name", "code", "recent_lh_count", "top_seats", "ambush_rating", "ambush_logic"]
      }
    },
    seat_focus: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          seat_name: { type: Type.STRING },
          bias_direction: { type: Type.STRING },
          recent_activity: { type: Type.STRING }
        },
        required: ["seat_name", "bias_direction"]
      }
    }
  },
  required: ["scan_time", "market_summary", "candidates"]
};

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

export const fetchHotMoneyAmbush = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  
  const prompt = `
    【指令：2个交易日顶级席位潜伏审计】
    今日日期: ${dateStr}。作为顶级 A 股席位专家，利用 googleSearch 检索 A 股【最近 2 个交易日】内的【龙虎榜 (Dragon-Tiger List)】数据。
    
    [重点审计清单]：
    1. **极速对比**：寻找在昨日买入、今日依然活跃或今日强势介入的顶级席位标的。
    2. **识别席位**：
       - 陈小群 (大连黄河路/世纪大道)
       - 呼家楼 (中信总部/京城分公司)
       - 机构专用席位 (Institutional Seats)
    3. **逻辑挖掘**：分析标的是否处于首板后的回踩或二波加速。
    
    输出必须为严格 JSON 格式。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: hotMoneyAmbushSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, hotMoneyAmbushData: parsed, market: MarketType.CN };
};

export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');
  
  const isPostMarket = now.getHours() >= 15;
  const closingFocus = isPostMarket ? "重点检索今日【最终收盘数据】及【收盘点评/全貌】。" : "重点检索【当前实时/午盘】数据。";

  let indexNames = "";
  if (market === MarketType.CN) indexNames = "上证指数, 深证成指, 创业板指, 科创50, 沪深300";
  else if (market === MarketType.HK) indexNames = "恒生指数, 恒生科技指数";
  else if (market === MarketType.US) indexNames = "标普500, 纳斯达克, 道琼斯";

  const prompt = `
    【绝对任务：盘面全量数据审计与收盘核对】
    当前时间: ${timeContext}。作为首席量化分析师，利用 googleSearch 检索 ${market} 的盘面数据。
    
    ${closingFocus}
    
    [重点探测逻辑]：
    1. **指数真值核对**：必须获取今日最新的 ${indexNames} 的数值、涨跌幅。如果已收盘，必须确保数值为收盘真值。
    2. **收盘点评 (closing_commentary)**：总结今日盘面特征（如：V型反转、缩量阴跌、光头阳线等）。
    3. **四路资金拆解**：
       - **外资**：北向资金今日全天净流入/流出总额及主要方向。
       - **国内机构**：主流公募、社保等的大宗交易或关键调仓信号。
       - **顶级游资**：审计今日收盘后公布的龙虎榜数据。
       - **散户热度**：检索“拉萨天团”活跃度及社交平台人气排名。
    4. **市场状态 (market_status)**：识别为 "已收盘"、"盘后复盘" 或 "交易中"。
    
    输出 JSON表单。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: marketDashboardSchema }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: parsed, market };
};

export const fetchStockSynergy = async (query: string, base64MarketImage: string | null, base64HoldingsImage: string | null, apiKey: string): Promise<AnalysisResult> => { 
  const ai = new GoogleGenAI({ apiKey }); 
  const prompt = `作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。必须从上传的第一张图片中识别最新股价。输出 JSON。`; 
  const parts: any[] = [{ text: prompt }]; 
  if (base64MarketImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64MarketImage } }); 
  if (base64HoldingsImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64HoldingsImage } }); 
  const response: GenerateContentResponse = await ai.models.generateContent({ 
    model: GEMINI_MODEL_COMPLEX, 
    contents: { parts }, 
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: stockSynergySchema } 
  }); 
  const parsed = robustParse(response.text || ""); 
  if (!parsed || !parsed.name) throw new Error("模型返回数据不完整。"); 
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, stockSynergyData: parsed }; 
};

const stockSynergySchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, used_current_price: { type: Type.STRING }, synergy_score: { type: Type.NUMBER }, trap_risk_score: { type: Type.NUMBER }, dragon_potential_score: { type: Type.NUMBER }, market_position: { type: Type.STRING }, capital_consistency: { type: Type.STRING }, main_force_cost_anchor: { type: Type.OBJECT, properties: { estimated_cost: { type: Type.STRING }, safety_margin_percent: { type: Type.NUMBER }, risk_level: { type: Type.STRING, enum: ["低风险", "中等溢价", "高危泡沫", "成本线下/黄金区"] } }, required: ["estimated_cost", "safety_margin_percent", "risk_level"] }, turnover_eval: { type: Type.OBJECT, properties: { current_rate: { type: Type.STRING }, is_sufficient: { type: Type.BOOLEAN }, verdict: { type: Type.STRING } }, required: ["current_rate", "is_sufficient", "verdict"] }, main_force_portrait: { type: Type.OBJECT, properties: { lead_type: { type: Type.STRING }, entry_cost_est: { type: Type.STRING }, hold_status: { type: Type.STRING } }, required: ["lead_type", "entry_cost_est", "hold_status"] }, t_plus_1_prediction: { type: Type.OBJECT, properties: { expected_direction: { type: Type.STRING }, confidence: { type: Type.NUMBER }, price_range: { type: Type.STRING }, opening_strategy: { type: Type.STRING }, logic: { type: Type.STRING } }, required: ["expected_direction", "confidence", "price_range", "opening_strategy", "logic"] }, synergy_factors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER }, description: { type: Type.STRING } }, required: ["label", "score", "description"] } }, battle_verdict: { type: Type.STRING }, action_guide: { type: Type.STRING }, chase_safety_index: { type: Type.NUMBER } }, required: [ "name", "code", "used_current_price", "synergy_score", "trap_risk_score", "dragon_potential_score", "market_position", "capital_consistency", "main_force_cost_anchor", "turnover_eval", "main_force_portrait", "t_plus_1_prediction", "synergy_factors", "battle_verdict", "action_guide", "chase_safety_index" ] };

export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => { 
  const ai = new GoogleGenAI({ apiKey }); 
  const now = new Date(); 
  const dateStr = now.toLocaleDateString('zh-CN'); 
  const prompt = `【指令：全量真实涨停梯队深度扫描】今日现实日期: ${dateStr}。作为顶级 A 股短线量化专家，请利用 googleSearch 扫描今日全市场【真实且正在封板】的涨停标的。[重点要求：全量扫描与扩容] 1. 严禁只抓取排名前几位的股票。必须返回今日全市场分布在各板块的 20-30 只真实涨停标的。2. 检索最新的行情分级榜单，涵盖 5 板、3 板、2 板及首板全梯队。3. 仅返回涨幅等于或超过 9.8%（主板）或 19.8%（双创）的标的。`; 
  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: prompt, 
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: limitUpLadderSchema } 
  }); 
  const parsed = robustParse(response.text || "{}"); 
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: parsed, market: MarketType.CN }; 
};

const limitUpLadderSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, total_limit_ups: { type: Type.NUMBER }, sectors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, sector_type: { type: Type.STRING, enum: ["Main", "Sub"] }, total_count: { type: Type.NUMBER }, max_height: { type: Type.NUMBER }, ladder_matrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { height: { type: Type.NUMBER }, count: { type: Type.NUMBER }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } } } } } } }, dragon_leader: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, consecutive_days: { type: Type.NUMBER }, strength_score: { type: Type.NUMBER }, reason: { type: Type.STRING } } }, dragon_seeds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, capital_intensity: { type: Type.STRING, enum: ["Extreme", "High", "Normal"] }, seat_analysis: { type: Type.STRING }, incubation_logic: { type: Type.STRING }, evolution_stage: { type: Type.STRING, enum: ["Seeding", "Sprouting", "Competing"] } } } }, integrity_score: { type: Type.NUMBER }, market_sentiment: { type: Type.STRING, enum: ["Rising", "Climax", "Diverging", "Falling"] } }, required: ["sector_name", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score"] } }, market_conclusion: { type: Type.STRING } }, required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"] };

export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => { 
  const ai = new GoogleGenAI({ apiKey }); 
  const now = new Date(); 
  const dateStr = now.toLocaleDateString('zh-CN'); 
  const prompt = `【指令：双创 20% 涨停标的全量深度审计】
今日现实日期: ${dateStr}。请利用 googleSearch 扫描今日创业板和科创板的所有【真实收盘】涨停标的。

[!!! 严苛真实性校验 !!!]：
1. **涨幅阈值**：仅抓取收盘涨幅 >= 19.8% 的标的。
2. **拒绝陈旧数据**：必须检索明确标注为 "${dateStr}" 或 "今日收盘" 的快讯。如果搜索结果中的股价不是今日最新值，**严禁将其列入名单**。
3. **炸板过滤**：通过搜索关键词 "炸板"、"回落" 排除今日曾经涨停但收盘未封板的股票。
4. **杜绝敷衍**：目标返回今日双创板块最核心的 10-20 只真实涨停标的。`; 

  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: prompt, 
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: dualBoardScanSchema } 
  }); 
  const parsed = robustParse(response.text || "{}"); 
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dualBoardScanData: parsed, market: MarketType.CN }; 
};

const capitalDetailSchema = { type: Type.OBJECT, properties: { net_buy_amount: { type: Type.STRING }, large_order_ratio: { type: Type.STRING }, seats: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["net_buy_amount", "large_order_ratio", "seats"] };

const dualBoardScanSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, market_mood: { type: Type.STRING }, hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, board: { type: Type.STRING, enum: ['创业板', '科创板'] }, consecutive_days: { type: Type.NUMBER }, control_score: { type: Type.NUMBER }, cost_price: { type: Type.STRING }, trend_momentum: { type: Type.STRING }, rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, volume_ratio: { type: Type.STRING }, logic: { type: Type.STRING }, target_price: { type: Type.STRING }, support_price: { type: Type.STRING }, capital_detail: capitalDetailSchema }, required: ["name", "code", "consecutive_days", "control_score", "capital_detail"] } } } };

export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => { 
  const ai = new GoogleGenAI({ apiKey }); 
  const now = new Date(); 
  const dateStr = now.toLocaleDateString('zh-CN'); 
  const prompt = `【核心指令：今日主板真实涨停全量扫描 - 杜绝幻觉】
当前现实日期: ${dateStr}。请利用 googleSearch 检索【今日即 ${dateStr}】沪深主板真实封死涨停的标的。

[!!! 零容忍纠偏清单 !!!]：
1. **强制百分比核验**：AI 必须确信标的今日收盘涨幅在 9.8% - 10.1% 之间。严禁将今日“异动”但未涨停、或昨日涨停今日大跌的股票混入。
2. **排除旧闻**：如果搜索结果中提到的是“昨日涨停”、“前几日连板”，但今日未封板，**绝对不允许出现在名单中**。
3. **数量要求**：返回今日最核心、最具题材代表性的 20-30 只标的。若今日行情火爆（百股涨停），请优先返回高连板标的。
4. **真实性校验**：通过检索 "今日 A 股涨停一览表"、"今日龙虎榜" 等实时新闻进行多重印证。

输出格式：严格 JSON。`; 

  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: prompt, 
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: mainBoardScanSchema } 
  }); 
  const parsed = robustParse(response.text || "{}"); 
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: parsed, market: MarketType.CN }; 
};

const mainBoardScanSchema = { type: Type.OBJECT, properties: { scan_time: { type: Type.STRING }, market_mood: { type: Type.STRING }, hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, board: { type: Type.STRING, enum: ['沪市主板', '深市主板'] }, limit_up_type: { type: Type.STRING, enum: ['首板', '连板'] }, consecutive_days: { type: Type.NUMBER }, control_score: { type: Type.NUMBER }, cost_price: { type: Type.STRING }, trend_momentum: { type: Type.STRING }, rating: { type: Type.STRING, enum: ['起爆', '锁筹', '分歧', '出货', '潜伏'] }, volume_ratio: { type: Type.STRING }, logic: { type: Type.STRING }, target_price: { type: Type.STRING }, support_price: { type: Type.STRING }, capital_detail: capitalDetailSchema }, required: ["name", "code", "consecutive_days", "control_score", "capital_detail"] } } } };

export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => { 
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); 
  const response = await ai.models.generateContent({ 
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY, 
    contents: prompt, 
    config: { tools: [{ googleSearch: {} }] } 
  }); 
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL }; 
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string, currentPrice?: string): Promise<AnalysisResult> => { 
  const ai = new GoogleGenAI({ apiKey }); 
  const now = new Date(); 
  const timeContext = now.toLocaleString('zh-CN'); 
  const prompt = `
    作为顶级 A 股量化交易专家，请对标的 "${query}" (市场: ${market}) 进行深度量化研判。
    
    【核心任务：视觉至上与数据纠偏 (Visual-First Grounding)】
    你面前有一张该标的的实时行情截图。
    1. **强制识别视觉真值**: 请从图中提取最新的【现价】、【涨跌幅】、【K线形态】、【MACD/RSI/均线位置】。
    2. **IMAGE IS TRUTH**: 如果联网搜索 (googleSearch) 的价格 or 形态与图中不符，**必须以截图中的视觉数据为最高优先级**。搜索数据仅用于补充公司背景 and 长期业绩。
    3. **形态审计**: 观察图中成交量柱状图，判断是“放量攻击”、“缩量回调”还是“高位分歧”。
    4. **基准校准**: 如果用户手动指定了现价 (${currentPrice || '未手动指定'})，以手动为准；否则必须提取图中视觉价格。
    
    参考时间: ${timeContext}
    请输出详细诊断报告，报告必须包含专门的“视觉提取指标”章节。
  `; 
  const parts = [ { text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } } ]; 
  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_COMPLEX, 
    contents: { parts }, 
    config: { tools: [{ googleSearch: {} }] } 
  }); 
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market }; 
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => { 
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); 
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } }; 
  const textPart = { text: "解析截图中的持仓数据，输出 JSON。" }; 
  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: { parts: [imagePart, textPart] }, 
    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { totalAssets: { type: Type.NUMBER }, positionRatio: { type: Type.NUMBER }, date: { type: Type.STRING }, holdings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, volume: { type: Type.NUMBER }, costPrice: { type: Type.NUMBER }, currentPrice: { type: Type.NUMBER }, profit: { type: Type.NUMBER }, profitRate: { type: Type.STRING }, marketValue: { type: Type.NUMBER } } } } } } } }); return robustParse(response.text || "{}"); };
export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); const prompt = `对以下历史交易记录进行【${label}】阶段性复盘：${JSON.stringify(journals)}`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { responseMimeType: "application/json", responseSchema: periodicReviewSchema } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsed, market }; };
const periodicReviewSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, market_trend: { type: Type.STRING, enum: ['bull', 'bear', 'sideways'] }, market_summary: { type: Type.STRING }, monthly_portfolio_summary: { type: Type.STRING }, highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, stock_diagnostics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, issues: { type: Type.ARRAY, items: { type: Type.STRING } }, verdict: { type: Type.STRING } } } }, next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }, improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } } } };
export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => { const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY }); const prompt = `从以下分析文本中提取具体的交易计划项：\n\n${content}`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { responseMimeType: "application/json", responseSchema: tradingPlanSchema } }); const parsed = robustParse(response.text || "{}"); return { items: parsed.items?.map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9), status: 'pending' })) || [], summary: parsed.summary || "" }; };
const tradingPlanSchema = { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, action: { type: Type.STRING, enum: ['buy', 'sell', 'hold', 'monitor', 't_trade'] }, price_target: { type: Type.STRING }, reason: { type: Type.STRING } } } }, summary: { type: Type.STRING } } };
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => { const ai = new GoogleGenAI({ apiKey }); const prompt = `分析 ${market} 板块 "${query}" 的生命周期梯队及风险指数。`; const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: sectorLadderSchema } }); const parsed = robustParse(response.text || "{}"); return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: parsed, market }; };
const sectorLadderSchema = { type: Type.OBJECT, properties: { sector_name: { type: Type.STRING }, cycle_stage: { type: Type.STRING, enum: ['Starting', 'Growing', 'Climax', 'End', 'Receding'] }, stage_label: { type: Type.STRING }, risk_score: { type: Type.NUMBER }, ladder: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { tier: { type: Type.STRING }, stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, price: { type: Type.STRING }, status: { type: Type.STRING, enum: ['Leading', 'Stagnant', 'Following', 'Weakening'] }, performance: { type: Type.STRING }, health_score: { type: Type.NUMBER }, logic: { type: Type.STRING } } } } } } }, structural_integrity: { type: Type.OBJECT, properties: { synergy_score: { type: Type.NUMBER }, verdict: { type: Type.STRING }, is_divergent: { type: Type.BOOLEAN } } }, support_points: { type: Type.ARRAY, items: { type: Type.STRING } }, warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } }, action_advice: { type: Type.STRING } } };

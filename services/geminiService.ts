
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

// --- Common Schema Parts ---
const capitalDetailSchema = {
  type: Type.OBJECT,
  properties: {
    net_buy_amount: { type: Type.STRING },
    large_order_ratio: { type: Type.STRING },
    seats: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["net_buy_amount", "large_order_ratio", "seats"]
};

// --- Main Schemas ---

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
    3. **成交额校验**：核实 A 股全天成交额。
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
    - 严禁返回代码以 300, 301, 688, 8, 4, 9 开头的标的。
    - 仅允许 000, 001, 002, 003 和 60 开头的标的。
  ` : "";

  const prompt = `
    【顶级新高猎手指令 3.5：主板突破与空中加油】
    今日日期: ${dateStr}。
    ${boardConstraint}
    1. **上方无压力**：抓取正在创出【历史新高】或【250日新高】的主板标的。
    2. **空中加油形态**：寻找在高位缩量横盘、且【5日均线 (MA5)】支撑不破的标的。
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
  ` : "";

  const prompt = `
    【核心指令：主板翻身战法 3.4 - 补涨对齐】
    今日日期: ${dateStr}。
    ${boardConstraint}
    1. **锁定主板活跃小马**：市值 50亿 - 150亿 之间。
    2. **补涨逻辑**：寻找主板中对应行业龙头的低位影子股。
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

export const fetchStockSynergy = async (query: string, base64MarketImage: string | null, base64HoldingsImage: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `作为顶级游资操盘手，对标的 "${query}" 进行【合力与主力成本深度审计】。输出 JSON。`;
  const parts: any[] = [{ text: prompt }];
  if (base64MarketImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64MarketImage } });
  if (base64HoldingsImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64HoldingsImage } });
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        code: { type: Type.STRING },
        used_current_price: { type: Type.STRING },
        synergy_score: { type: Type.NUMBER },
        trap_risk_score: { type: Type.NUMBER },
        dragon_potential_score: { type: Type.NUMBER },
        market_position: { type: Type.STRING },
        capital_consistency: { type: Type.STRING },
        main_force_cost_anchor: {
          type: Type.OBJECT,
          properties: {
            estimated_cost: { type: Type.STRING },
            safety_margin_percent: { type: Type.NUMBER },
            risk_level: { type: Type.STRING }
          },
          required: ["estimated_cost", "safety_margin_percent", "risk_level"]
        },
        turnover_eval: {
          type: Type.OBJECT,
          properties: {
            current_rate: { type: Type.STRING },
            is_sufficient: { type: Type.BOOLEAN },
            verdict: { type: Type.STRING }
          },
          required: ["current_rate", "is_sufficient", "verdict"]
        },
        main_force_portrait: {
          type: Type.OBJECT,
          properties: {
            lead_type: { type: Type.STRING },
            entry_cost_est: { type: Type.STRING },
            hold_status: { type: Type.STRING }
          },
          required: ["lead_type", "entry_cost_est", "hold_status"]
        },
        t_plus_1_prediction: {
          type: Type.OBJECT,
          properties: {
            expected_direction: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            price_range: { type: Type.STRING },
            opening_strategy: { type: Type.STRING },
            logic: { type: Type.STRING }
          },
          required: ["expected_direction", "confidence", "price_range", "opening_strategy", "logic"]
        },
        synergy_factors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { label: { type: Type.STRING }, score: { type: Type.NUMBER }, description: { type: Type.STRING } },
            required: ["label", "score", "description"]
          }
        },
        battle_verdict: { type: Type.STRING },
        action_guide: { type: Type.STRING },
        chase_safety_index: { type: Type.NUMBER }
      },
      required: ["name", "code", "synergy_score", "battle_verdict", "action_guide"]
    }}
  });
  const parsed = robustParse(response.text || "");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, stockSynergyData: parsed };
};

export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `【指令：全量真实涨停梯队深度扫描】今日日期: ${dateStr}。扫描全市场涨停标的梯队。`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json", 
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scan_time: { type: Type.STRING },
          total_limit_ups: { type: Type.NUMBER },
          sectors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sector_name: { type: Type.STRING },
                sector_type: { type: Type.STRING },
                total_count: { type: Type.NUMBER },
                max_height: { type: Type.NUMBER },
                ladder_matrix: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      height: { type: Type.NUMBER },
                      count: { type: Type.NUMBER },
                      stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } } } }
                    }
                  }
                },
                dragon_leader: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, consecutive_days: { type: Type.NUMBER }, strength_score: { type: Type.NUMBER }, reason: { type: Type.STRING } } },
                integrity_score: { type: Type.NUMBER },
                market_sentiment: { type: Type.STRING }
              },
              required: ["sector_name", "total_count"]
            }
          },
          market_conclusion: { type: Type.STRING }
        },
        required: ["scan_time", "total_limit_ups", "sectors"]
      }
    }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: parsed, market: MarketType.CN };
};

export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `【指令：双创 20% 涨停标的全量深度审计】今日日期: ${dateStr}。`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json", 
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scan_time: { type: Type.STRING },
          market_mood: { type: Type.STRING },
          hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                board: { type: Type.STRING },
                consecutive_days: { type: Type.NUMBER },
                control_score: { type: Type.NUMBER },
                capital_detail: capitalDetailSchema,
                rating: { type: Type.STRING },
                logic: { type: Type.STRING }
              },
              required: ["name", "code", "consecutive_days", "control_score", "capital_detail"]
            }
          }
        }
      }
    }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dualBoardScanData: parsed, market: MarketType.CN };
};

export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN');
  const prompt = `【核心指令：全量沪深主板涨停标的扫描】今日日期: ${dateStr}。`;
  
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json", 
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scan_time: { type: Type.STRING },
          market_mood: { type: Type.STRING },
          hot_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                board: { type: Type.STRING },
                consecutive_days: { type: Type.NUMBER },
                control_score: { type: Type.NUMBER },
                capital_detail: capitalDetailSchema,
                rating: { type: Type.STRING },
                logic: { type: Type.STRING }
              },
              required: ["name", "code", "consecutive_days", "control_score", "capital_detail"]
            }
          }
        }
      }
    }
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: parsed, market: MarketType.CN };
};

export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string, currentPrice?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');
  const prompt = `作为顶级 A 股量化交易专家，请对标的 "${query}" 进行诊断。参考时间: ${timeContext}`;
  const parts = [ { text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } } ];
  const response = await ai.models.generateContent({ model: GEMINI_MODEL_PRIMARY, contents: { parts }, config: { tools: [{ googleSearch: {} }] } });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
  const textPart = { text: "解析截图中的持仓数据，输出 JSON。" };
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

export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `对以下历史交易记录进行【${label}】阶段性复盘：${JSON.stringify(journals)}`;
  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: prompt, 
    config: { 
      responseMimeType: "application/json", 
      responseSchema: { 
        type: Type.OBJECT, 
        properties: { 
          score: { type: Type.NUMBER }, 
          market_trend: { type: Type.STRING, enum: ['bull', 'bear', 'sideways'] }, 
          market_summary: { type: Type.STRING }, 
          monthly_portfolio_summary: { type: Type.STRING }, 
          highlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, 
          lowlight: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } }, 
          execution: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, details: { type: Type.STRING }, good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }, bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } } } }, 
          stock_diagnostics: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, issues: { type: Type.ARRAY, items: { type: Type.STRING } }, verdict: { type: Type.STRING } } } }, 
          next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } }, 
          improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } } 
        } 
      } 
    } 
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsed, market };
};

export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  const prompt = `从以下分析文本中提取具体的交易计划项：\n\n${content}`;
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
              } 
            } 
          }, 
          summary: { type: Type.STRING } 
        } 
      } 
    } 
  });
  const parsed = robustParse(response.text || "{}");
  return { items: parsed.items?.map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9), status: 'pending' })) || [], summary: parsed.summary || "" };
};

export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `分析 ${market} 板块 "${query}" 的生命周期梯队及风险指数。`;
  const response = await ai.models.generateContent({ 
    model: GEMINI_MODEL_PRIMARY, 
    contents: prompt, 
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json", 
      responseSchema: { 
        type: Type.OBJECT, 
        properties: { 
          sector_name: { type: Type.STRING }, 
          cycle_stage: { type: Type.STRING, enum: ['Starting', 'Growing', 'Climax', 'End', 'Receding'] }, 
          stage_label: { type: Type.STRING }, 
          risk_score: { type: Type.NUMBER }, 
          ladder: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                tier: { type: Type.STRING }, 
                stocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, price: { type: Type.STRING }, status: { type: Type.STRING }, performance: { type: Type.STRING }, health_score: { type: Type.NUMBER }, logic: { type: Type.STRING } } } } 
              } 
            } 
          }, 
          structural_integrity: { type: Type.OBJECT, properties: { synergy_score: { type: Type.NUMBER }, verdict: { type: Type.STRING }, is_divergent: { type: Type.BOOLEAN } } }, 
          support_points: { type: Type.ARRAY, items: { type: Type.STRING } }, 
          warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } }, 
          action_advice: { type: Type.STRING } 
        } 
      } 
    } 
  });
  const parsed = robustParse(response.text || "{}");
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: parsed, market };
};

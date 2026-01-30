
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
  JournalEntry,
  QuantSynergyResponse,
  QuantDiscoveryResponse,
  MainWaveReplicationResponse
} from "../types";

const GEMINI_MODEL_PRIMARY = "gemini-3-flash-preview"; 
const GEMINI_MODEL_COMPLEX = "gemini-3-pro-preview";

// --- Schemas ---

const mainWaveSchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    market_momentum: { type: Type.STRING },
    top_clones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          replicate_score: { type: Type.NUMBER },
          institutional_backing: { type: Type.STRING },
          trend_stage: { type: Type.STRING },
          wave_gain_so_far: { type: Type.STRING },
          two_thirty_verdict: { type: Type.STRING },
          t_trading_plan: {
            type: Type.OBJECT,
            properties: {
              high_sell: { type: Type.STRING },
              low_buy: { type: Type.STRING },
              volatility: { type: Type.STRING }
            },
            required: ["high_sell", "low_buy"]
          },
          copy_logic: { type: Type.STRING }
        },
        required: ["name", "code", "replicate_score", "institutional_backing", "trend_stage", "wave_gain_so_far", "two_thirty_verdict", "t_trading_plan", "copy_logic"]
      }
    },
    tactical_advice: { type: Type.STRING }
  },
  required: ["scan_time", "market_momentum", "top_clones", "tactical_advice"]
};

const quantDiscoverySchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    market_quant_mood: { type: Type.STRING },
    top_targets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          code: { type: Type.STRING },
          synergy_score: { type: Type.NUMBER },
          quant_intensity: { type: Type.STRING },
          algo_tag: { type: Type.STRING },
          battle_logic: { type: Type.STRING },
          entry_point: { type: Type.STRING },
          potential_gain: { type: Type.STRING },
          risk_level: { type: Type.STRING },
          sector_cohesion_level: { type: Type.NUMBER },
          is_sector_leader: { type: Type.BOOLEAN },
          peer_count: { type: Type.NUMBER }
        },
        required: ["name", "code", "synergy_score", "quant_intensity", "algo_tag", "battle_logic", "entry_point", "potential_gain", "risk_level", "sector_cohesion_level", "is_sector_leader", "peer_count"]
      }
    },
    quant_cluster_sectors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          attack_intensity: { type: Type.NUMBER },
          description: { type: Type.STRING },
          hot_peers: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "attack_intensity", "description", "hot_peers"]
      }
    }
  },
  required: ["scan_time", "market_quant_mood", "top_targets", "quant_cluster_sectors"]
};

const quantSynergySchema = {
  type: Type.OBJECT,
  properties: {
    scan_time: { type: Type.STRING },
    stock_name: { type: Type.STRING },
    stock_code: { type: Type.STRING },
    synergy_score: { type: Type.NUMBER },
    quant_intensity: { type: Type.STRING },
    algo_signatures: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          probability: { type: Type.NUMBER },
          description: { type: Type.STRING }
        },
        required: ["name", "probability", "description"]
      }
    },
    execution_model: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING },
        entry_anchor: { type: Type.STRING },
        exit_anchor: { type: Type.STRING },
        stop_loss: { type: Type.STRING },
        strategy_logic: { type: Type.STRING }
      },
      required: ["action", "entry_anchor", "exit_anchor", "stop_loss", "strategy_logic"]
    },
    market_cohesion: {
      type: Type.OBJECT,
      properties: {
        sector_sync: { type: Type.NUMBER },
        index_correlation: { type: Type.STRING },
        verdict: { type: Type.STRING }
      },
      required: ["sector_sync", "index_correlation", "verdict"]
    }
  },
  required: ["scan_time", "stock_name", "stock_code", "synergy_score", "quant_intensity", "algo_signatures", "execution_model", "market_cohesion"]
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
          ambush_rating: { type: Type.STRING },
          ambush_logic: { type: Type.STRING },
          target_entry_price: { type: Type.STRING },
          stop_loss_price: { type: Type.STRING }
        },
        required: ["name", "code", "recent_lh_count", "top_seats", "net_inflow_amount", "institutional_participation", "ambush_rating", "ambush_logic", "target_entry_price", "stop_loss_price"]
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
        required: ["seat_name", "bias_direction", "recent_activity"]
      }
    }
  },
  required: ["scan_time", "market_summary", "candidates", "seat_focus"]
};

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
          direction: { type: Type.STRING },
          percent: { type: Type.STRING }
        },
        required: ["name", "value", "change", "direction", "percent"]
      }
    },
    market_volume: {
      type: Type.OBJECT,
      properties: {
        total_volume: { type: Type.STRING },
        volume_delta: { type: Type.STRING },
        volume_trend: { type: Type.STRING },
        net_inflow: { type: Type.STRING },
        capital_mood: { type: Type.STRING }
      },
      required: ["total_volume", "volume_delta", "volume_trend", "net_inflow", "capital_mood"]
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        trend: { type: Type.STRING },
        warning_level: { type: Type.STRING }
      },
      required: ["score", "summary", "trend"]
    },
    capital_composition: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          label: { type: Type.STRING },
          percentage: { type: Type.NUMBER },
          trend: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["type", "label", "percentage", "trend", "description"]
      }
    },
    capital_rotation: {
      type: Type.OBJECT,
      properties: {
        inflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        inflow_reason: { type: Type.STRING },
        outflow_sectors: { type: Type.ARRAY, items: { type: Type.STRING } },
        outflow_reason: { type: Type.STRING },
        rotation_logic: { type: Type.STRING },
        top_inflow_stocks: { type: Type.ARRAY, items: { type: Type.STRING } }
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
      required: ["policy_focus", "external_impact", "core_verdict"]
    }
  },
  required: ["data_date", "market_indices", "market_volume", "market_sentiment", "capital_composition", "capital_rotation", "macro_logic"]
};

const stockSynergySchema = {
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
        properties: {
          label: { type: Type.STRING },
          score: { type: Type.NUMBER },
          description: { type: Type.STRING }
        },
        required: ["label", "score", "description"]
      }
    },
    battle_verdict: { type: Type.STRING },
    action_guide: { type: Type.STRING },
    chase_safety_index: { type: Type.NUMBER }
  },
  required: ["name", "code", "synergy_score", "main_force_cost_anchor", "t_plus_1_prediction", "battle_verdict", "action_guide"]
};

const sectorLadderSchema = {
  type: Type.OBJECT,
  properties: {
    sector_name: { type: Type.STRING },
    cycle_stage: { type: Type.STRING },
    stage_label: { type: Type.STRING },
    risk_score: { type: Type.NUMBER },
    ladder: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tier: { type: Type.STRING },
          stocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                price: { type: Type.STRING },
                status: { type: Type.STRING },
                performance: { type: Type.STRING },
                health_score: { type: Type.NUMBER },
                logic: { type: Type.STRING }
              },
              required: ["name", "code", "price", "status", "performance", "health_score", "logic"]
            }
          }
        },
        required: ["tier", "stocks"]
      }
    },
    structural_integrity: {
      type: Type.OBJECT,
      properties: {
        synergy_score: { type: Type.NUMBER },
        verdict: { type: Type.STRING },
        is_divergent: { type: Type.BOOLEAN }
      },
      required: ["synergy_score", "verdict", "is_divergent"]
    },
    support_points: { type: Type.ARRAY, items: { type: Type.STRING } },
    warning_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
    action_advice: { type: Type.STRING }
  },
  required: ["sector_name", "cycle_stage", "risk_score", "ladder", "structural_integrity", "action_advice"]
};

const limitUpLadderSchema = {
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
                stocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, logic: { type: Type.STRING } },
                    required: ["name", "code", "logic"]
                  }
                }
              },
              required: ["height", "count", "stocks"]
            }
          },
          dragon_leader: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              code: { type: Type.STRING },
              consecutive_days: { type: Type.NUMBER },
              strength_score: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ["name", "code", "consecutive_days", "strength_score", "reason"]
          },
          dragon_seeds: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                capital_intensity: { type: Type.STRING },
                seat_analysis: { type: Type.STRING },
                incubation_logic: { type: Type.STRING },
                evolution_stage: { type: Type.STRING }
              },
              required: ["name", "code", "capital_intensity", "seat_analysis", "incubation_logic", "evolution_stage"]
            }
          },
          integrity_score: { type: Type.NUMBER },
          market_sentiment: { type: Type.STRING }
        },
        required: ["sector_name", "sector_type", "total_count", "max_height", "ladder_matrix", "dragon_leader", "integrity_score", "market_sentiment"]
      }
    },
    market_conclusion: { type: Type.STRING }
  },
  required: ["scan_time", "total_limit_ups", "sectors", "market_conclusion"]
};

const dualBoardScanSchema = {
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
          cost_price: { type: Type.STRING },
          trend_momentum: { type: Type.STRING },
          rating: { type: Type.STRING },
          volume_ratio: { type: Type.STRING },
          logic: { type: Type.STRING },
          target_price: { type: Type.STRING },
          support_price: { type: Type.STRING },
          capital_detail: {
            type: Type.OBJECT,
            properties: {
              net_buy_amount: { type: Type.STRING },
              large_order_ratio: { type: Type.STRING },
              seats: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["net_buy_amount", "large_order_ratio", "seats"]
          }
        },
        required: ["name", "code", "board", "consecutive_days", "control_score", "rating", "logic", "capital_detail"]
      }
    }
  },
  required: ["scan_time", "market_mood", "hot_sectors", "stocks"]
};

const holdingsSnapshotSchema = {
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
        },
        required: ["name", "code", "volume", "costPrice", "currentPrice", "profit", "profitRate", "marketValue"]
      }
    }
  },
  required: ["totalAssets", "date", "holdings"]
};

const periodicReviewSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    market_trend: { type: Type.STRING },
    market_summary: { type: Type.STRING },
    monthly_portfolio_summary: { type: Type.STRING },
    highlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ["title", "description"]
    },
    lowlight: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
      required: ["title", "description"]
    },
    execution: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        details: { type: Type.STRING },
        good_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } },
        bad_behaviors: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["score", "details", "good_behaviors", "bad_behaviors"]
    },
    stock_diagnostics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issues: { type: Type.ARRAY, items: { type: Type.STRING } },
          verdict: { type: Type.STRING }
        },
        required: ["name", "issues", "verdict"]
      }
    },
    next_period_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvement_advice: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["score", "market_trend", "market_summary", "highlight", "lowlight", "execution", "stock_diagnostics", "next_period_focus", "improvement_advice"]
};

const tradingPlanSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          symbol: { type: Type.STRING },
          action: { type: Type.STRING },
          price_target: { type: Type.STRING },
          reason: { type: Type.STRING },
          status: { type: Type.STRING }
        },
        required: ["id", "symbol", "action", "reason", "status"]
      }
    },
    summary: { type: Type.STRING }
  },
  required: ["items", "summary"]
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

/**
 * 主升战术复刻服务 (复刻金海通模式)
 */
export const replicateMainWaveTactic = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const now = new Date();
  const timeContext = now.toLocaleString('zh-CN');

  const prompt = `
    【核心任务：寻找下一个“金海通” —— 主升浪战术复刻】
    当前时间: ${timeContext}。
    
    战术背景：
    用户曾在 1 月下旬通过“机构调研信息”发现标的，该标的处于主升浪中继（涨幅已大但势能未减），并在 14:30 尾盘确认强度后介入，通过“趋势持有+日内做T”获得了超额回报。
    
    任务：利用 googleSearch 扫描 A 股全市场，寻找符合以下【金海通基因】的标的：
    1. **机构调研背书**：近 7 日内有明确机构现场调研、或知名自媒体深度解析、基本面逻辑反转的标的。
    2. **主升浪中继形态**：近期（近 10 日）涨幅在 20%-50% 之间，成交量维持高位且不缩量，均线呈现强力多头排列。
    3. **尾盘博弈价值**：分析该标的今日分时走势，若当前接近或处于 14:30，判断其尾盘是否具备封板或稳住高位的潜力。
    4. **做T空间**：振幅较大，具备日内 3% 以上做T空间的标的。
    
    输出严格 JSON。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json", 
      responseSchema: mainWaveSchema 
    }
  });
  const parsed = robustParse(response.text || "{}");
  return { 
    content: response.text || "", 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.GEMINI_INTL, 
    isStructured: true, 
    mainWaveData: parsed, 
    market: MarketType.CN 
  };
};

/**
 * 探测板块量化集结情况
 */
export const discoverQuantSynergy = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "探测 A 股市场当前量化算法密集度最高的板块，识别兵团扫货趋势。";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: quantDiscoverySchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, quantDiscoveryData: parsed };
};

/**
 * 单股量化合力审计
 */
export const fetchQuantSynergy = async (query: string, base64Image: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: `审计股票 ${query} 的量化算法合力情况。` }];
  if (base64Image) {
    parts.push({ inlineData: { data: base64Image, mimeType: 'image/png' } });
  }
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: quantSynergySchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, quantSynergyData: parsed };
};

/**
 * 龙虎潜伏哨扫描
 */
export const fetchHotMoneyAmbush = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "扫描近期龙虎榜，寻找顶级游资正在潜伏建仓的标的。";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: hotMoneyAmbushSchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, hotMoneyAmbushData: parsed };
};

/**
 * 市场全览看板数据
 */
export const fetchMarketDashboard = async (period: 'day' | 'month', market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `生成 ${market} 市场 ${period} 看板深度透析数据。`;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: marketDashboardSchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, structuredData: parsed, market };
};

/**
 * 标的主力合力深度审计
 */
export const fetchStockSynergy = async (query: string, base64MarketImage: string | null, base64HoldingsImage: string | null, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: `深度审计标的 ${query} 的主力合力。` }];
  if (base64MarketImage) parts.push({ inlineData: { data: base64MarketImage, mimeType: 'image/png' } });
  if (base64HoldingsImage) parts.push({ inlineData: { data: base64HoldingsImage, mimeType: 'image/png' } });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: stockSynergySchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, stockSynergyData: parsed };
};

/**
 * 涨停梯队与龙苗审计
 */
export const fetchLimitUpLadder = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "扫描全市场涨停梯队，并识别游资正在栽培的龙苗标的。";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: limitUpLadderSchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, limitUpLadderData: parsed };
};

/**
 * 双创涨停扫描
 */
export const fetchDualBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "扫描今日创业板与科创板的涨停标的与控盘细节。";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: dualBoardScanSchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, dualBoardScanData: parsed };
};

/**
 * 沪深主板涨停扫描
 */
export const fetchMainBoardScanning = async (apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "扫描今日沪深主板的涨停标的与资金核验细节。";
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: dualBoardScanSchema // Re-use compatible schema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, mainBoardScanData: parsed };
};

/**
 * 通用文本分析
 */
export const fetchGeminiAnalysis = async (prompt: string, isComplex: boolean, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: isComplex ? GEMINI_MODEL_COMPLEX : GEMINI_MODEL_PRIMARY,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL };
};

/**
 * 视觉增强的个股详细诊断
 */
export const fetchStockDetailWithImage = async (base64Image: string, query: string, market: MarketType, apiKey: string, currentPrice?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: `对股票 ${query} (${market}) 进行深度量化诊断。参考现价: ${currentPrice || '见图'}。` }
      ]
    },
    config: { tools: [{ googleSearch: {} }] }
  });
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, market };
};

/**
 * 识别券商持仓截图
 */
export const parseBrokerageScreenshot = async (base64Image: string, apiKey?: string): Promise<HoldingsSnapshot> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: "将此券商持仓截图解析为结构化 JSON。提取总资产、仓位占比、日期及每项持仓的详细信息（名称、代码、股数、成本、现价、盈亏）。" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: holdingsSnapshotSchema
    }
  });
  return robustParse(response.text);
};

/**
 * 阶段性复盘报告
 */
export const fetchPeriodicReview = async (journals: any[], label: string, market: MarketType, apiKey?: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const journalsText = JSON.stringify(journals);
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_COMPLEX,
    contents: `基于以下历史交易日志进行 ${label} 阶段性复盘分析：\n${journalsText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: periodicReviewSchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, periodicData: parsed, market };
};

/**
 * 提取交易计划
 */
export const extractTradingPlan = async (content: string, apiKey?: string): Promise<{ items: PlanItem[], summary: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `从以下分析报告中提取明日具体的交易计划项目和策略总纲：\n${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: tradingPlanSchema
    }
  });
  return robustParse(response.text);
};

/**
 * 板块梯队周期分析
 */
export const fetchSectorLadderAnalysis = async (query: string, market: MarketType, apiKey: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL_PRIMARY,
    contents: `对板块 ${query} (${market}) 进行梯队结构与生命周期诊断。`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: sectorLadderSchema
    }
  });
  const parsed = robustParse(response.text);
  return { content: response.text || "", timestamp: Date.now(), modelUsed: ModelProvider.GEMINI_INTL, isStructured: true, ladderData: parsed, market };
};

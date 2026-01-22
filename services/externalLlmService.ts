
import { AnalysisResult, ModelProvider, MarketDashboardData, MarketType, HoldingsSnapshot } from "../types";

const PROVIDER_CONFIG = {
  [ModelProvider.HUNYUAN_CN]: {
    baseUrl: "/api/hunyuan", 
    model: "hunyuan-pro", 
    visionModel: "hunyuan-vision",
    name: "Tencent Hunyuan"
  }
};

/**
 * Enhanced fetch with streaming support for text analysis
 */
export const fetchExternalAIStream = async (
  provider: ModelProvider,
  apiKey: string,
  prompt: string,
  onChunk: (text: string) => void,
  maxTokens: number = 2000
): Promise<void> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Model provider configuration missing.`);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: "You are a senior stock analyst. Output concise Markdown. NO placeholders like XXX." },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let finished = false;

  if (!reader) throw new Error("Failed to initialize stream reader.");

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) {
      finished = true;
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('data: ')) {
        const jsonStr = line.replace('data: ', '').trim();
        if (jsonStr === '[DONE]') {
          finished = true;
          break;
        }
        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices[0]?.delta?.content || "";
          if (content) onChunk(content);
        } catch (e) {
          // Skip malformed chunks
        }
      }
    }
  }
};

/**
 * Specifically for Stock Analysis with Image Correction (Hunyuan)
 */
export const fetchHunyuanStockVision = async (
  apiKey: string,
  prompt: string,
  base64Image: string,
  market: MarketType = MarketType.CN
): Promise<AnalysisResult> => {
  const config = PROVIDER_CONFIG[ModelProvider.HUNYUAN_CN];
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.visionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 3000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Hunyuan Vision API Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  return { 
    content, 
    timestamp: Date.now(), 
    modelUsed: ModelProvider.HUNYUAN_CN, 
    market 
  };
};

/**
 * Robust JSON parsing that extracts object/array from noisy text
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("Empty response text");
  let clean = text.trim();
  
  // Remove possible markdown code blocks
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  
  // Find the first { or [ and last } or ]
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
    console.error("JSON Parse Error:", e, "Source:", clean);
    throw new Error(`数据解析失败: 模型返回格式异常。建议切换 Gemini 再次尝试。`); 
  }
}

// Keep existing non-stream functions for compatibility
export const fetchExternalAI = async (
  provider: ModelProvider,
  apiKey: string,
  prompt: string,
  isDashboard: boolean,
  period?: 'day' | 'month',
  market: MarketType = MarketType.CN,
  forceJson: boolean = false,
  maxTokens: number = 3000
): Promise<AnalysisResult> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  if (!config) throw new Error(`Config missing for provider ${provider}`);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: `Senior Stock Market Expert. ${forceJson ? 'Output valid JSON only.' : 'Output professional analysis.'}` },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
       const err = await response.text();
       throw new Error(`HTTP ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    let structuredData: MarketDashboardData | undefined;
    if (isDashboard || forceJson) {
      structuredData = robustJsonParse(content);
    }

    return { 
      content, 
      timestamp: Date.now(), 
      modelUsed: provider, 
      market, 
      isStructured: !!structuredData, 
      structuredData 
    };
  } catch (error: any) {
    throw error;
  }
};

export const analyzeImageWithExternal = async (
  provider: ModelProvider,
  base64Image: string,
  apiKey: string
): Promise<HoldingsSnapshot> => {
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.visionModel || config.model,
      messages: [{ role: 'user', content: [{ type: 'text', text: "Parse holdings JSON" }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` }}] }],
      stream: false
    })
  });
  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  return robustJsonParse(content);
};

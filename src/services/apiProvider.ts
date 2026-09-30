export interface ApiProviderAdapter {
  type: string;
  generate(params: GenerateParams): Promise<GenerateResponse>;
  validateConfig(config: ProviderConfig): string | null;
}

export interface GenerateParams {
  prompt: string;
  config: ProviderConfig;
  size?: string;
  quality?: string;
  styleId?: string;
}

export interface GenerateResponse {
  success: boolean;
  imageUrl?: string;
  errorMsg?: string;
}

export interface ProviderConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  [key: string]: string | number | boolean | undefined;
}

const adapters: Map<string, ApiProviderAdapter> = new Map();

export function registerAdapter(adapter: ApiProviderAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function getAdapter(type: string): ApiProviderAdapter | undefined {
  return adapters.get(type);
}

export function getRegisteredTypes(): string[] {
  return Array.from(adapters.keys());
}

/**
 * 智能补全 API URL 路径
 * 如果用户只输入了域名（如 https://api.lk888.ai），自动补全为 /v1/images/generations
 */
export function smartUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname.length < 2) {
      return rawUrl.replace(/\/$/, '') + '/v1/images/generations';
    }
  } catch { /* URL 解析失败，保持原样 */ }
  return rawUrl;
}

/**
 * 通过 Electron 主进程发送 API 请求
 * 主进程使用 Node.js 的 https 模块，不受 CORS 限制
 */
async function apiFetch(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; data: string; ok: boolean }> {
  // 优先使用 Electron 主进程 IPC（绕过 CORS）
  if (typeof window !== 'undefined' && window.electronAPI?.api?.fetch) {
    return window.electronAPI.api.fetch(url, options);
  }
  // 降级到浏览器 fetch
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, data, ok: response.ok };
}

/**
 * 从 API 错误响应中提取可读错误信息
 */
function parseError(_status: number, data: string): string {
  try {
    const errJson = JSON.parse(data);
    return errJson?.error?.message || errJson?.message || JSON.stringify(errJson).slice(0, 200);
  } catch {
    return data.slice(0, 200);
  }
}

/**
 * 从成功响应中提取图片 URL
 */
function parseImageUrl(data: string): string | null {
  try {
    const json = JSON.parse(data);
    if (json?.data?.[0]?.b64_json) {
      return `data:image/png;base64,${json.data[0].b64_json}`;
    }
    const candidates = [
      json?.data?.[0]?.url,
      json?.url,
      json?.image_url,
      json?.imageUrl,
      json?.output?.[0]?.url,
      json?.result?.url,
      json?.result?.[0]?.url,
      ...(Array.isArray(json?.images) ? [json.images[0]] : []),
    ];
    const url = candidates.find((c: unknown) => c && typeof c === 'string');
    return url ? String(url) : null;
  } catch {
    return null;
  }
}

registerAdapter({
  type: 'sora',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config, size = '1024x1024', quality = 'standard' } = params;

    try {
      const qMap: Record<string, string> = { 'standard': 'medium', 'hd': 'high', 'ultra': 'xhigh' };
      const q = qMap[quality] || quality;
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model || 'sora-v1', prompt, size, quality: q, n: 1 }),
      });

      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }

      const imageUrl = parseImageUrl(res.data);
      if (!imageUrl) {
        return { success: false, errorMsg: `API返回数据中未找到图片URL。返回: ${res.data.slice(0, 300)}` };
      }
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'dalle',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config, size = '1024x1024', quality = 'standard' } = params;

    try {
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model || 'dall-e-3', prompt, size, quality, response_format: 'url' }),
      });

      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }

      const imageUrl = parseImageUrl(res.data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'stable-diffusion',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config, size = '1024x1024' } = params;

    try {
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          prompt,
          width: parseInt(size.split('x')[0]) || 1024,
          height: parseInt(size.split('x')[1]) || 1024,
          steps: 30,
          cfg_scale: 7,
        }),
      });

      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }

      const data = JSON.parse(res.data);
      const imageUrl = data?.image || data?.url || (Array.isArray(data?.images) ? data.images[0] : undefined);

      if (!imageUrl) {
        return { success: false, errorMsg: 'API返回数据中未找到图片' };
      }

      if (imageUrl.startsWith('data:')) {
        return { success: true, imageUrl };
      }

      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'midjourney',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;

    try {
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: config.model || 'midjourney-v6',
        }),
      });

      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }

      const data = JSON.parse(res.data);
      const imageUrl = data?.url || data?.image_url || (Array.isArray(data?.images) ? data.images[0] : undefined);

      if (!imageUrl) {
        return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      }

      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'custom',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config, size = '1024x1024', quality = 'standard' } = params;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      // 发送完整的 OpenAI 兼容参数，适配大多数中转API
      const body: Record<string, unknown> = {
        prompt,
        model: config.model || 'custom-model',
        n: 1,
        size,
      };

      // 质量参数映射：standard/hd/ultra → auto/medium/high/xhigh
      // 兼容不同 API 的 quality 取值
      if (quality) {
        const qualityMap: Record<string, string> = {
          'standard': 'medium',
          'hd': 'high',
          'ultra': 'xhigh',
        };
        body.quality = qualityMap[quality] || quality;
      }

      // 如果 config 中有额外参数，合并进来
      if (config.extraParams) {
        try {
          const extra = JSON.parse(config.extraParams as string);
          Object.assign(body, extra);
        } catch { /* 忽略解析错误 */ }
      }

      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }

      const imageUrl = parseImageUrl(res.data);
      if (!imageUrl) {
        return { success: false, errorMsg: `API返回数据中未找到图片URL。返回内容: ${res.data.slice(0, 300)}` };
      }
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

function extractImageUrl(data: any): string | undefined {
  if (!data) return undefined;
  const candidates = [
    data?.url,
    data?.image_url,
    data?.imageUrl,
    data?.image,
    data?.data?.[0]?.url,
    data?.data?.[0]?.image_url,
    data?.data?.url,
    data?.data?.image_url,
    ...(Array.isArray(data?.images) ? [data.images[0]] : []),
    ...(Array.isArray(data?.data) ? [data.data[0]] : []),
    ...(Array.isArray(data?.output) ? [data.output[0]] : []),
  ];
  const found = candidates.find(c => c && typeof c === 'string');
  return found ? String(found) : undefined;
}

registerAdapter({
  type: 'openai-gpt-image',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config, size = '1024x1024', quality = 'medium' } = params;
    try {
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model || 'gpt-image-2', prompt, size, quality, n: 1 }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const imageUrl = parseImageUrl(res.data);
      if (!imageUrl) return { success: false, errorMsg: `API返回数据中未找到图片URL。返回: ${res.data.slice(0, 300)}` };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'stability-ai',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config, size = '1024x1024' } = params;
    try {
      const [w, h] = size.split('x').map(n => parseInt(n) || 1024);
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'stable-diffusion-xl-1.0',
          prompt: [{ text: prompt, weight: 1 }],
          width: w,
          height: h,
          output: ['url'],
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = data?.image?.url || data?.url || extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'flux',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': config.apiKey,
        },
        body: JSON.stringify({
          prompt,
          model: config.model || 'flux-pro',
          width: 1024,
          height: 1024,
          steps: 28,
          prompt_upscale: true,
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = data?.image_url || data?.url || extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'pollinations',
  validateConfig(): string | null {
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const model = config.model || 'flux';
      const width = 1024;
      const height = 1024;
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${width}&height=${height}&nologo=true`;
      const res = await apiFetch(url, { method: 'GET' });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status})` };
      }
      return { success: true, imageUrl: url };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'google-imagen',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const model = config.model || 'imagen-3.0-fast-generate';
      const apiUrl = config.apiUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const url = config.apiUrl.includes('key=') ? apiUrl : `${apiUrl}?key=${config.apiKey}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generation_config: { candidate_count: 1 },
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const candidates = data?.candidates?.[0]?.content?.parts;
      const imagePart = candidates?.find((p: any) => p?.inlineData);
      if (!imagePart?.inlineData?.data) {
        return { success: false, errorMsg: 'API返回数据中未找到图片' };
      }
      const mimeType = imagePart.inlineData.mimeType || 'image/png';
      const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'hunyuan',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const res = await apiFetch(config.apiUrl || 'https://hunyuan.tencentcloudapi.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'X-TC-Action': 'TextToImageLite',
          'X-TC-Version': '2023-09-01',
        },
        body: JSON.stringify({
          Prompt: prompt,
          Model: config.model || 'hunyuan-image-3.0',
          Style: 'cyberpunk',
          LogoAdd: 'Disable',
          LogoPara: '',
          Resolution: '1024:1024',
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = data?.ResultImageSet?.ResultImageList?.[0]?.ImageUrl || extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'seedream',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiUrl) return 'API地址不能为空';
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const res = await apiFetch(smartUrl(config.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'seedream-4.0',
          prompt,
          width: 1024,
          height: 1024,
          num_images: 1,
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'ideogram',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const res = await apiFetch(config.apiUrl || 'https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': config.apiKey,
        },
        body: JSON.stringify({
          image_request: {
            prompt,
            model: config.model || 'ideogram-v2',
            aspect_ratio: 'ASPECT_RATIO_1_1',
          },
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = data?.data?.[0]?.url || extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'leonardo',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const res = await apiFetch(config.apiUrl || 'https://cloud.leonardo.ai/api/rest/v1/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          modelId: config.model || 'leonardo-phoenix',
          width: 1024,
          height: 1024,
          numImages: 1,
          seed: 0,
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = data?.generations?.[0]?.imageUrl || extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

registerAdapter({
  type: 'runway',
  validateConfig(config: ProviderConfig): string | null {
    if (!config.apiKey) return 'API Key不能为空';
    return null;
  },
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const { prompt, config } = params;
    try {
      const res = await apiFetch(config.apiUrl || 'https://api.dev.runwayml.com/v1/image-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          promptImageUrl: '',
          model: config.model || 'runway-gen4-image',
          promptText: prompt,
          ratio: '720:720',
        }),
      });
      if (!res.ok) {
        return { success: false, errorMsg: `API错误 (${res.status}): ${parseError(res.status, res.data)}` };
      }
      const data = JSON.parse(res.data);
      const imageUrl = extractImageUrl(data);
      if (!imageUrl) return { success: false, errorMsg: 'API返回数据中未找到图片URL' };
      return { success: true, imageUrl };
    } catch (e) {
      return { success: false, errorMsg: `请求失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
});

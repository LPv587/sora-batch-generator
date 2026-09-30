export interface ApiPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: string;
  config: {
    apiUrl: string;
    apiKey: string;
    model: string;
  };
  models: string[];
  features: string[];
  pricing: string;
  website: string;
  setupSteps: string[];
}

export const apiPresets: ApiPreset[] = [
  {
    id: 'openai-gpt-image',
    name: 'OpenAI GPT Image',
    icon: '🟢',
    description: '业界领先的图像生成模型，支持高精度文本渲染和复杂构图理解',
    type: 'openai-gpt-image',
    config: {
      apiUrl: 'https://api.openai.com/v1/images/generations',
      apiKey: '',
      model: 'gpt-image-2',
    },
    models: ['gpt-image-2', 'gpt-image-1.5', 'dall-e-3'],
    features: ['文生图', '图像编辑', '高清质量', '多尺寸'],
    pricing: '$0.04-0.08/张 (1024x1024)',
    website: 'https://platform.openai.com/docs',
    setupSteps: [
      '访问 https://platform.openai.com 注册账号',
      '进入 API Settings 创建 API Key',
      '复制 API Key 粘贴到下方',
      '选择需要的模型（推荐 gpt-image-2）',
    ],
  },
  {
    id: 'stability-ai',
    name: 'Stability AI',
    icon: '🟠',
    description: 'Stable Diffusion 官方 API，开源灵活，支持 SDXL 等多种模型',
    type: 'stability-ai',
    config: {
      apiUrl: 'https://api.stability.ai/v2beta/text-to-image',
      apiKey: '',
      model: 'stable-diffusion-xl-1.0',
    },
    models: [
      'stable-diffusion-xl-1.0',
      'stable-diffusion-3.5-large',
      'stable-diffusion-3.5-large-turbo',
      'stable-diffusion-3-medium',
      'sd3.5-large',
      'sd3.5-large-turbo',
    ],
    features: ['文生图', '图生图', '高清输出', '多模型选择'],
    pricing: '$0.008-0.018/次',
    website: 'https://stability.ai/API',
    setupSteps: [
      '访问 https://stability.ai 注册账号',
      '获取免费 API Key（新用户有50次额度）',
      '选择模型（推荐 SDXL 或 SD 3.5 Large）',
      '高级参数可在高级设置中调整',
    ],
  },
  {
    id: 'flux-bfl',
    name: 'Flux (Black Forest Labs)',
    icon: '⚫',
    description: '高品质写实图像生成，LM Arena 排名第一，Prompt 遵循度极高',
    type: 'flux',
    config: {
      apiUrl: 'https://api.bfl.ml/v1/images',
      apiKey: '',
      model: 'flux-pro',
    },
    models: ['flux-pro', 'flux-dev', 'flux-schnell', 'flux-klein'],
    features: ['写实摄影', '文生图', '极速生成', '高质量'],
    pricing: '$0.05-0.08/张',
    website: 'https://blackforestlabs.ai',
    setupSteps: [
      '访问 https://blackforestlabs.ai 注册账号',
      '申请 API 访问权限',
      '通过 BFL API 或 Replicate/Fal.ai 获取 API Key',
      'flux-pro: 最高质量, flux-schnell: 最快速度',
    ],
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai',
    icon: '🟣',
    description: '免费无门槛 AI 生图 API，无需注册，支持 Flux/Kontext/Turbo 模型',
    type: 'pollinations',
    config: {
      apiUrl: 'https://image.pollinations.ai/prompt',
      apiKey: '',
      model: 'flux',
    },
    models: ['flux', 'kontext', 'turbo'],
    features: ['完全免费', '无需注册', '即时可用', 'GET 请求'],
    pricing: '完全免费',
    website: 'https://pollinations.ai',
    setupSteps: [
      '无需注册！直接使用即可',
      'API 为 GET 请求，prompt 编码在 URL 中',
      '支持参数: model=flux/kontext/turbo, width, height, seed',
      '示例: https://image.pollinations.ai/prompt/sunset?model=flux',
      '注意: 免费用户图片可能带有 Pollinations logo',
    ],
  },
  {
    id: 'google-imagen',
    name: 'Google Imagen',
    icon: '🔵',
    description: 'Google 官方图像生成 API，支持 Nano Banana 和 Imagen 4 模型',
    type: 'google-imagen',
    config: {
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      apiKey: '',
      model: 'imagen-3.0-fast-generate',
    },
    models: [
      'imagen-3.0-fast-generate',
      'imagen-3.0-generate',
      'imagen-4.0-generate',
    ],
    features: ['Google 生态', '4K 输出', '多模态', '企业级'],
    pricing: '$0.02-0.05/张',
    website: 'https://deepmind.google/technologies/imagen-3/',
    setupSteps: [
      '访问 https://console.cloud.google.com 创建项目',
      '启用 Generative AI API',
      '创建 API Key 并配置',
      '选择模型 (imagen-3.0-fast 性价比最高)',
      '需要 Google Cloud 账号',
    ],
  },
  {
    id: 'hunyuan',
    name: '腾讯混元',
    icon: '🟡',
    description: '腾讯混元大模型图像生成，中文理解优秀，支持亚洲人脸',
    type: 'hunyuan',
    config: {
      apiUrl: 'https://hunyuan.tencentcloudapi.com',
      apiKey: '',
      model: 'hunyuan-image-3.0',
    },
    models: ['hunyuan-image-3.0', 'hunyuan-image', 'hunyuan-image-plus'],
    features: ['中文支持', '亚洲人像', '企业级稳定', '多风格'],
    pricing: '约 ¥0.15-0.5/张',
    website: 'https://cloud.tencent.com/product/hunyuan',
    setupSteps: [
      '访问腾讯云 https://cloud.tencent.com 注册',
      '开通混元大模型服务',
      '获取 SecretId 和 SecretKey',
      '通过 API 网关调用',
    ],
  },
  {
    id: 'seedream',
    name: 'Seedream (字节跳动)',
    icon: '🔴',
    description: '字节跳动即梦 AI 图像生成，支持批量生成和风格迁移',
    type: 'seedream',
    config: {
      apiUrl: 'https://api.seedream.cn/v1/generate',
      apiKey: '',
      model: 'seedream-4.0',
    },
    models: ['seedream-4.0', 'seedream-3.0', 'seedream-2.0'],
    features: ['批量生成', '多图融合', '文本渲染', '中文支持'],
    pricing: '约 ¥0.1-0.3/张',
    website: 'https://jimeng.jianying.com',
    setupSteps: [
      '访问即梦 AI 官网或火山引擎注册',
      '申请 API 访问权限',
      '在火山引擎控制台获取 API Key',
      '支持批量生成多张图片',
    ],
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    icon: '🟢',
    description: '专长于图像内文字渲染，海报和设计场景首选',
    type: 'ideogram',
    config: {
      apiUrl: 'https://api.ideogram.ai/generate',
      apiKey: '',
      model: 'ideogram-v2',
    },
    models: ['ideogram-v2', 'ideogram-v1', 'ideogram-turbo'],
    features: ['文字渲染', '海报设计', '快速生成', '风格化'],
    pricing: '$0.05-0.10/张',
    website: 'https://ideogram.ai',
    setupSteps: [
      '访问 https://ideogram.ai 注册账号',
      '申请 API 访问权限',
      '在用户面板获取 API Key',
      'ideogram-v2 支持更好的文字渲染',
    ],
  },
  {
    id: 'leonardo',
    name: 'Leonardo.ai',
    icon: '🎨',
    description: '创作者平台，提供丰富的预设工作流和模型选择',
    type: 'leonardo',
    config: {
      apiUrl: 'https://cloud.leonardo.ai/api/rest/v1/generations',
      apiKey: '',
      model: 'leonardo-phoenix',
    },
    models: ['leonardo-phoenix', 'leonardo-sagemund-2', 'leonardo-diffusion-2'],
    features: ['工作流', '预设丰富', '创作者友好', '多模型'],
    pricing: '$0.02-0.05/张',
    website: 'https://app.leonardo.ai',
    setupSteps: [
      '访问 https://app.leonardo.ai 注册账号',
      '进入 API 设置页面生成 API Key',
      '选择模型 Phoenix (最新) 或 Sagmnd 2',
      '支持通过 API 或 Web 界面使用',
    ],
  },
  {
    id: 'runway',
    name: 'Runway',
    icon: '🎬',
    description: '专业级 AI 创作平台，支持图像和视频生成',
    type: 'runway',
    config: {
      apiUrl: 'https://api.dev.runwayml.com/v1/image-to-image',
      apiKey: '',
      model: 'runway-gen4-image',
    },
    models: ['runway-gen4-image', 'runway-gen3', 'runway-stable-diffusion'],
    features: ['专业级', '图生图', '视频生成', '高质量'],
    pricing: '$0.05-0.15/张',
    website: 'https://runwayml.com',
    setupSteps: [
      '访问 https://runwayml.com 注册账号',
      '申请 API 访问权限',
      '获取 API Key',
      '支持图像和视频生成',
    ],
  },
  {
    id: 'wubianjie-relay',
    name: '无边界中转站',
    icon: '🌐',
    description: '国内可直连的 AI 中转 API 平台，支持即梦(tt-image)、通义千问、GPT Image 等多种模型，OpenAI 兼容接口',
    type: 'custom',
    config: {
      apiUrl: 'https://api.lk888.ai/v1/images/generations',
      apiKey: '',
      model: 'tt-image-2.5',
    },
    models: ['tt-image-2.5', 'tt-image-2', 'qwen-image', 'gk-image-2.0', 'gpt-image-2', 'dall-e-3', 'flux-pro'],
    features: ['国内直连', '无需翻墙', '多模型', 'OpenAI兼容', '批量生成'],
    pricing: '按模型计费，价格约为官方 50-70%',
    website: 'https://api.lk888.ai',
    setupSteps: [
      '访问中转站官网注册账号',
      '在控制台获取 API Key (sk-xxx)',
      '复制 API Key 粘贴到下方',
      '选择需要的模型（推荐 tt-image-2.5 即梦）',
    ],
  },
];

export function getPresetById(id: string): ApiPreset | undefined {
  return apiPresets.find(p => p.id === id);
}

export function getPresetByType(type: string): ApiPreset | undefined {
  return apiPresets.find(p => p.type === type);
}
import { useState } from 'react';
import { getRegisteredTypes } from '../services/apiProvider';
import { apiPresets, ApiPreset } from '../services/apiPresets';

interface SettingsModalProps {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => Promise<void>;
}

const ALL_PROVIDER_TYPES: { value: string; label: string }[] = [
  { value: 'sora', label: 'Sora AI' },
  { value: 'dalle', label: 'DALL-E' },
  { value: 'stable-diffusion', label: 'Stable Diffusion' },
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'custom', label: '自定义' },
  { value: 'openai-gpt-image', label: 'OpenAI GPT Image' },
  { value: 'stability-ai', label: 'Stability AI' },
  { value: 'flux', label: 'Flux (Black Forest Labs)' },
  { value: 'pollinations', label: 'Pollinations.ai (免费)' },
  { value: 'google-imagen', label: 'Google Imagen' },
  { value: 'hunyuan', label: '腾讯混元' },
  { value: 'seedream', label: 'Seedream (字节跳动)' },
  { value: 'ideogram', label: 'Ideogram' },
  { value: 'leonardo', label: 'Leonardo.ai' },
  { value: 'runway', label: 'Runway' },
];

export default function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'providers' | 'presets-market' | 'general' | 'style-presets'>('presets-market');
  const [localSettings, setLocalSettings] = useState<Settings>(JSON.parse(JSON.stringify(settings)));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  const updateProvider = (index: number, updates: Partial<ApiProvider>) => {
    setLocalSettings(prev => {
      const next = { ...prev };
      next.providers = [...prev.providers];
      next.providers[index] = { ...prev.providers[index], ...updates };
      return next;
    });
  };

  const updateProviderConfig = (index: number, configUpdates: Partial<ProviderConfig>) => {
    setLocalSettings(prev => {
      const next = { ...prev };
      next.providers = [...prev.providers];
      next.providers[index] = {
        ...prev.providers[index],
        config: { ...prev.providers[index].config, ...configUpdates },
      };
      return next;
    });
  };

  const updateGeneral = (updates: Partial<GeneralSettings>) => {
    setLocalSettings(prev => ({
      ...prev,
      general: { ...prev.general, ...updates },
    }));
  };

  const updateStylePreset = (index: number, updates: Partial<StylePreset>) => {
    setLocalSettings(prev => {
      const next = { ...prev };
      next.stylePresets = [...prev.stylePresets];
      next.stylePresets[index] = { ...prev.stylePresets[index], ...updates };
      return next;
    });
  };

  const addProvider = () => {
    const types = getRegisteredTypes();
    const newProvider: ApiProvider = {
      id: `provider_${Date.now()}`,
      name: '新的API',
      type: (types[0] || 'custom'),
      config: {
        apiUrl: '',
        apiKey: '',
        model: '',
      },
    };
    setLocalSettings(prev => ({
      ...prev,
      providers: [...prev.providers, newProvider],
    }));
  };

  const removeProvider = (index: number) => {
    setLocalSettings(prev => {
      const next = { ...prev };
      next.providers = prev.providers.filter((_, i) => i !== index);
      if (next.activeProvider === prev.providers[index]?.id && next.providers.length > 0) {
        next.activeProvider = next.providers[0].id;
      }
      return next;
    });
  };

  const addPresetAsProvider = (preset: ApiPreset) => {
    const newProvider: ApiProvider = {
      id: `provider_${Date.now()}`,
      name: preset.name,
      type: preset.type,
      config: {
        apiUrl: preset.config.apiUrl,
        apiKey: '',
        model: preset.config.model,
      },
    };
    setLocalSettings(prev => ({
      ...prev,
      providers: [...prev.providers, newProvider],
      activeProvider: prev.providers.length === 0 ? newProvider.id : prev.activeProvider,
    }));
    setActiveTab('providers');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (localSettings.providers.length === 0) {
        setError('至少需要配置一个API提供商');
        setIsSaving(false);
        return;
      }
      const activeExists = localSettings.providers.some(p => p.id === localSettings.activeProvider);
      if (!activeExists) {
        localSettings.activeProvider = localSettings.providers[0].id;
      }
      await onSave(localSettings);
    } catch (e) {
      setError(`保存失败: ${e}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDirectory = async () => {
    const dir = await window.electronAPI.dialog.selectDirectory();
    if (dir) {
      updateGeneral({ savePath: dir });
    }
  };

  const getTypeLabel = (type: string): string => {
    const found = ALL_PROVIDER_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getPresetModels = (type: string): string[] => {
    const preset = apiPresets.find(p => p.type === type);
    return preset?.models || [];
  };

  const getPresetConfig = (type: string): { apiUrl: string; model: string } | null => {
    const preset = apiPresets.find(p => p.type === type);
    if (!preset) return null;
    return { apiUrl: preset.config.apiUrl, model: preset.config.model };
  };

  const handleTypeChange = (index: number, newType: string) => {
    const preset = apiPresets.find(p => p.type === newType);
    if (preset) {
      updateProvider(index, {
        type: newType,
        name: preset.name,
        config: {
          apiUrl: preset.config.apiUrl,
          apiKey: localSettings.providers[index].config.apiKey,
          model: preset.config.model,
        },
      });
    } else {
      updateProvider(index, { type: newType });
    }
  };

  const renderPresetMarket = () => (
    <div className="preset-market-section">
      <div className="preset-market-header">
        <span className="section-title">🔥 热门 AI 图片生成 API</span>
        <span className="section-subtitle">点击任一预设快速导入 API 配置，填入 API Key 即可使用</span>
      </div>

      <div className="preset-grid">
        {apiPresets.map(preset => {
          const expanded = expandedPreset === preset.id;
          const alreadyAdded = localSettings.providers.some(p => p.type === preset.type);

          return (
            <div key={preset.id} className={`preset-card-item ${expanded ? 'expanded' : ''}`}>
              <div className="preset-card-top" onClick={() => setExpandedPreset(expanded ? null : preset.id)}>
                <div className="preset-icon">{preset.icon}</div>
                <div className="preset-info">
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-desc">{preset.description}</div>
                </div>
                <div className="preset-action-col">
                  {alreadyAdded ? (
                    <span className="badge badge-added">✓ 已添加</span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addPresetAsProvider(preset);
                      }}
                    >
                      ➕ 导入
                    </button>
                  )}
                  <span className="expand-icon">{expanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded && (
                <div className="preset-card-detail">
                  <div className="detail-row">
                    <div className="detail-col">
                      <span className="detail-label">接口地址</span>
                      <code className="detail-code">{preset.config.apiUrl}</code>
                    </div>
                    <div className="detail-col">
                      <span className="detail-label">默认模型</span>
                      <code className="detail-code">{preset.config.model}</code>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-col">
                      <span className="detail-label">模型列表</span>
                      <div className="model-tags">
                        {preset.models.map(m => (
                          <span key={m} className="model-tag">{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-col">
                      <span className="detail-label">支持特性</span>
                      <div className="feature-tags">
                        {preset.features.map(f => (
                          <span key={f} className="feature-tag">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="detail-col">
                      <span className="detail-label">参考价格</span>
                      <span className="pricing-info">{preset.pricing}</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-col full-width">
                      <span className="detail-label">⚡ 使用步骤</span>
                      <ol className="setup-steps">
                        {preset.setupSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-col">
                      <a href={preset.website} target="_blank" rel="noopener noreferrer" className="preset-website">
                        🌐 官方网站
                      </a>
                    </div>
                    <div className="detail-col" style={{ textAlign: 'right' }}>
                      {!alreadyAdded && (
                        <button
                          className="btn btn-primary"
                          onClick={() => addPresetAsProvider(preset)}
                        >
                          ➕ 导入此 API
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 设置中心</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'presets-market' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets-market')}
            >
              🔥 热门API
            </button>
            <button
              className={`settings-tab ${activeTab === 'providers' ? 'active' : ''}`}
              onClick={() => setActiveTab('providers')}
            >
              🔌 API 提供商
            </button>
            <button
              className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              ⚙️ 通用设置
            </button>
            <button
              className={`settings-tab ${activeTab === 'style-presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('style-presets')}
            >
              🎨 风格预设
            </button>
          </div>

          <div className="settings-content">
            {activeTab === 'presets-market' && renderPresetMarket()}

            {activeTab === 'providers' && (
              <div className="providers-section">
                <div className="providers-header">
                  <span className="section-title">API 提供商列表</span>
                  <div className="header-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('presets-market')}
                    >
                      🔥 从热门API导入
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={addProvider}>
                      ➕ 添加提供商
                    </button>
                  </div>
                </div>

                <div className="active-provider-row">
                  <span>当前激活:</span>
                  <select
                    value={localSettings.activeProvider}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, activeProvider: e.target.value }))}
                  >
                    {localSettings.providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {localSettings.providers.map((provider, idx) => {
                  const models = getPresetModels(provider.type);
                  const presetConfig = getPresetConfig(provider.type);

                  return (
                    <div
                      key={provider.id}
                      className={`provider-card ${provider.id === localSettings.activeProvider ? 'active' : ''}`}
                    >
                      <div className="provider-card-header">
                        <input
                          type="text"
                          className="provider-name-input"
                          value={provider.name}
                          onChange={(e) => updateProvider(idx, { name: e.target.value })}
                          placeholder="提供商名称"
                        />
                        <button
                          className="btn-icon btn-remove"
                          onClick={() => removeProvider(idx)}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="provider-type-row">
                        <label>类型:</label>
                        <select
                          value={provider.type}
                          onChange={(e) => handleTypeChange(idx, e.target.value)}
                        >
                          {ALL_PROVIDER_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {presetConfig && (
                          <span className="preset-hint">💡 已选择预设: {getTypeLabel(provider.type)}</span>
                        )}
                      </div>

                      <div className="provider-config">
                        <div className="config-field">
                          <label>API 地址:</label>
                          <input
                            type="text"
                            value={provider.config.apiUrl}
                            onChange={(e) => updateProviderConfig(idx, { apiUrl: e.target.value })}
                            placeholder="https://api.example.com/v1/images/generations (只填域名也可自动补全)"
                          />
                        </div>
                        <div className="config-field">
                          <label>API Key:</label>
                          <input
                            type="password"
                            value={provider.config.apiKey}
                            onChange={(e) => updateProviderConfig(idx, { apiKey: e.target.value })}
                            placeholder="输入你的API Key"
                            autoComplete="off"
                          />
                        </div>
                        <div className="config-field">
                          <label>模型名称:</label>
                          {models.length > 0 ? (
                            <select
                              value={provider.config.model}
                              onChange={(e) => updateProviderConfig(idx, { model: e.target.value })}
                            >
                              {models.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={provider.config.model}
                              onChange={(e) => updateProviderConfig(idx, { model: e.target.value })}
                              placeholder="输入模型名称"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {localSettings.providers.length === 0 && (
                  <div className="empty-state">
                    <span>暂无API提供商，点击上方按钮添加</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'general' && (
              <div className="general-section">
                <div className="config-field">
                  <label>并发线程数:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={localSettings.general.threadCount}
                    onChange={(e) => updateGeneral({ threadCount: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <span className="field-hint">同时生成的图片数量，建议 1-10</span>
                </div>

                <div className="config-field">
                  <label>默认图片尺寸:</label>
                  <select
                    value={localSettings.general.defaultSize}
                    onChange={(e) => updateGeneral({ defaultSize: e.target.value })}
                  >
                    <option value="1024x1024">1024 × 1024 (正方形)</option>
                    <option value="1024x768">1024 × 768 (横屏)</option>
                    <option value="768x1024">768 × 1024 (竖屏)</option>
                    <option value="1920x1080">1920 × 1080 (16:9)</option>
                    <option value="1080x1920">1080 × 1920 (9:16)</option>
                    <option value="512x512">512 × 512 (小尺寸)</option>
                  </select>
                </div>

                <div className="config-field">
                  <label>默认质量:</label>
                  <select
                    value={localSettings.general.defaultQuality}
                    onChange={(e) => updateGeneral({ defaultQuality: e.target.value })}
                  >
                    <option value="standard">标准</option>
                    <option value="hd">高清</option>
                    <option value="ultra">超清</option>
                  </select>
                </div>

                <div className="config-field">
                  <label>自动保存:</label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={localSettings.general.autoSave}
                      onChange={(e) => updateGeneral({ autoSave: e.target.checked })}
                    />
                    <span>生成后自动保存图片到本地</span>
                  </label>
                </div>

                <div className="config-field">
                  <label>保存路径:</label>
                  <div className="path-input-row">
                    <input
                      type="text"
                      value={localSettings.general.savePath}
                      onChange={(e) => updateGeneral({ savePath: e.target.value })}
                      placeholder="选择图片保存目录"
                    />
                    <button className="btn btn-secondary btn-sm" onClick={handleSelectDirectory}>
                      📁 浏览
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'style-presets' && (
              <div className="presets-section">
                <div className="presets-header">
                  <span className="section-title">风格预设</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setLocalSettings(prev => ({
                      ...prev,
                      stylePresets: [
                        ...prev.stylePresets,
                        { id: `preset_${Date.now()}`, name: '新风格', prompt: '' },
                      ],
                    }))}
                  >
                    ➕ 添加预设
                  </button>
                </div>

                <div className="presets-list">
                  {localSettings.stylePresets.map((preset, idx) => (
                    <div key={preset.id} className="preset-card">
                      <input
                        type="text"
                        className="preset-name"
                        value={preset.name}
                        onChange={(e) => updateStylePreset(idx, { name: e.target.value })}
                        placeholder="风格名称"
                      />
                      <textarea
                        className="preset-prompt"
                        value={preset.prompt}
                        onChange={(e) => updateStylePreset(idx, { prompt: e.target.value })}
                        placeholder="风格提示词后缀..."
                        rows={2}
                      />
                      <button
                        className="btn-icon btn-remove"
                        onClick={() => setLocalSettings(prev => ({
                          ...prev,
                          stylePresets: prev.stylePresets.filter((_, i) => i !== idx),
                        }))}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  {localSettings.stylePresets.length === 0 && (
                    <div className="empty-state">
                      <span>暂无风格预设</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {error && <div className="error-message">❌ {error}</div>}
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '💾 保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
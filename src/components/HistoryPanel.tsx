import { useState } from 'react';

interface HistoryPanelProps {
  prompts: PromptItem[];
  onPromptClick: (prompt: PromptItem) => void;
}

type FilterType = 'all' | 'success' | 'failed' | 'pending';

export default function HistoryPanel({ prompts, onPromptClick }: HistoryPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filtered = prompts.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'success') return p.status === 'success';
    if (filter === 'failed') return p.status === 'failed';
    if (filter === 'pending') return p.status === 'pending' || p.status === 'generating';
    return true;
  });

  const images = filtered.filter(p => p.status === 'success' && (p.localPath || p.imageUrl));

  const getImageSrc = (prompt: PromptItem) => {
    if (prompt.localPath) {
      return `file:///${prompt.localPath}`;
    }
    return prompt.imageUrl || '';
  };

  const openPreview = (prompt: PromptItem) => {
    const src = getImageSrc(prompt);
    if (src) {
      setPreviewImage(src);
    }
  };

  const stats = {
    total: prompts.length,
    success: prompts.filter(p => p.status === 'success').length,
    failed: prompts.filter(p => p.status === 'failed').length,
    pending: prompts.filter(p => p.status === 'pending' || p.status === 'generating').length,
  };

  return (
    <div className="history-panel">
      <div className="history-toolbar">
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部 ({stats.total})
          </button>
          <button
            className={`filter-btn ${filter === 'success' ? 'active' : ''}`}
            onClick={() => setFilter('success')}
          >
            ✅ 成功 ({stats.success})
          </button>
          <button
            className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
            onClick={() => setFilter('failed')}
          >
            ❌ 失败 ({stats.failed})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            ⏳ 待处理 ({stats.pending})
          </button>
        </div>
      </div>

      {images.length > 0 ? (
        <div className="image-grid">
          {images.map(prompt => (
            <div
              key={prompt.id}
              className="image-card"
              onClick={() => openPreview(prompt)}
            >
              <img
                src={getImageSrc(prompt)}
                alt={prompt.text}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.3';
                }}
              />
              <div className="image-overlay">
                <span className="prompt-tooltip">{prompt.text}</span>
              </div>
              <div className="image-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPromptClick(prompt);
                  }}
                  title="查看详情"
                >
                  👁️
                </button>
                {prompt.localPath && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.electronAPI.shell.openPath(prompt.localPath!);
                    }}
                    title="打开文件位置"
                  >
                    📁
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">🖼️</span>
          <span>暂无已生成的图片</span>
        </div>
      )}

      {previewImage && (
        <div className="preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="preview-container" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="预览" />
            <button className="btn-close-preview" onClick={() => setPreviewImage(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

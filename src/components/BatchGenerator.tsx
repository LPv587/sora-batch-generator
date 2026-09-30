import { useState, useRef, useCallback } from 'react';
import { getAdapter } from '../services/apiProvider';

interface BatchGeneratorProps {
  settings: Settings | null;
  prompts: PromptItem[];
  isGenerating: boolean;
  onGeneratingChange: (generating: boolean) => void;
  onPromptStatusChange: (id: string, updates: Partial<PromptItem>) => void;
  onBatchStatusChange: (updates: { id: string; data: Partial<PromptItem> }[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function BatchGenerator({
  settings,
  prompts,
  isGenerating,
  onGeneratingChange,
  onPromptStatusChange,
  onBatchStatusChange,
  onShowToast,
}: BatchGeneratorProps) {
  const [progress, setProgress] = useState({ completed: 0, total: 0, failed: 0 });
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const cancelRef = useRef(false);
  const activeProvider = settings?.providers.find(p => p.id === settings?.activeProvider);

  const generate = useCallback(async () => {
    if (!settings || !activeProvider) {
      onShowToast('请先在设置中配置API提供商', 'error');
      return;
    }

    const pendingPrompts = prompts.filter(p => p.status === 'pending' || p.status === 'failed');
    if (pendingPrompts.length === 0) {
      onShowToast('没有待生成的提示词', 'error');
      return;
    }

    const adapter = getAdapter(activeProvider.type);
    if (!adapter) {
      onShowToast(`未找到类型 ${activeProvider.type} 的适配器`, 'error');
      return;
    }

    const configError = adapter.validateConfig(activeProvider.config);
    if (configError) {
      onShowToast(`配置错误: ${configError}`, 'error');
      return;
    }

    const effectiveSize = selectedSize || settings.general.defaultSize;
    const effectiveQuality = selectedQuality || settings.general.defaultQuality;
    const effectivePreset = selectedPresetId
      ? settings.stylePresets.find(p => p.id === selectedPresetId)
      : null;

    onGeneratingChange(true);
    cancelRef.current = false;
    setProgress({ completed: 0, total: pendingPrompts.length, failed: 0 });

    const threadCount = Math.min(
      settings.general.threadCount || 1,
      pendingPrompts.length
    );

    const promptQueue = [...pendingPrompts];
    let completedCount = 0;
    let failedCount = 0;

    const worker = async () => {
      while (promptQueue.length > 0 && !cancelRef.current) {
        const promptItem = promptQueue.shift()!;
        const promptText = effectivePreset
          ? `${promptItem.text}, ${effectivePreset.prompt}`
          : promptItem.text;

        onPromptStatusChange(promptItem.id, { status: 'generating' });

        try {
          const result = await adapter.generate({
            prompt: promptText,
            config: activeProvider.config,
            size: effectiveSize,
            quality: effectiveQuality,
          });

          if (result.success && result.imageUrl) {
            let localPath: string | undefined;

            if (settings.general.autoSave) {
              try {
                const saveDir = settings.general.savePath;
                await window.electronAPI.fs.ensureDir(saveDir);
                const ext = result.imageUrl.includes('data:image')
                  ? result.imageUrl.split(';')[0].split('/')[1] || 'png'
                  : result.imageUrl.split('.').pop()?.split('?')[0] || 'png';
                const filename = `${Date.now()}_${promptItem.id}.${ext}`;
                localPath = await window.electronAPI.file.downloadImage(
                  result.imageUrl,
                  saveDir,
                  filename
                );
              } catch (dlErr) {
                console.error('下载失败:', dlErr);
              }
            }

            onPromptStatusChange(promptItem.id, {
              status: 'success',
              imageUrl: result.imageUrl,
              localPath,
              errorMsg: undefined,
            });
          } else {
            onPromptStatusChange(promptItem.id, {
              status: 'failed',
              errorMsg: result.errorMsg || '未知错误',
            });
            failedCount++;
          }
        } catch (err) {
          onPromptStatusChange(promptItem.id, {
            status: 'failed',
            errorMsg: `生成异常: ${err instanceof Error ? err.message : String(err)}`,
          });
          failedCount++;
        }

        completedCount++;
        setProgress({
          completed: completedCount,
          total: pendingPrompts.length,
          failed: failedCount,
        });
      }
    };

    const workers = Array.from({ length: threadCount }, () => worker());
    await Promise.all(workers);

    onGeneratingChange(false);
    onShowToast(
      cancelRef.current
        ? `已取消 (${completedCount}/${pendingPrompts.length})`
        : `完成! 成功 ${completedCount - failedCount} 个, 失败 ${failedCount} 个`,
      cancelRef.current ? 'info' : 'success'
    );
  }, [settings, activeProvider, prompts, selectedSize, selectedQuality, selectedPresetId, onGeneratingChange, onPromptStatusChange, onShowToast]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleRetryFailed = () => {
    const failedIds = prompts.filter(p => p.status === 'failed').map(p => ({ id: p.id, data: { status: 'pending' as const } }));
    if (failedIds.length > 0) {
      onBatchStatusChange(failedIds);
      onShowToast(`已重置 ${failedIds.length} 条失败记录`, 'info');
    }
  };

  const pendingCount = prompts.filter(p => p.status === 'pending' || p.status === 'failed').length;
  const successCount = prompts.filter(p => p.status === 'success').length;
  const failedCount = prompts.filter(p => p.status === 'failed').length;

  return (
    <div className="batch-generator">
      <div className="generator-header">
        <div className="generator-title">
          <span>🎯 生成控制</span>
        </div>
        <div className="generator-controls">
          <div className="control-row">
            <div className="control-item">
              <label>尺寸:</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                disabled={isGenerating}
              >
                <option value="">默认 ({settings?.general.defaultSize || '1024x1024'})</option>
                <option value="1024x1024">1024 × 1024</option>
                <option value="1024x768">1024 × 768</option>
                <option value="768x1024">768 × 1024</option>
                <option value="1920x1080">1920 × 1080</option>
                <option value="1080x1920">1080 × 1920</option>
                <option value="512x512">512 × 512</option>
              </select>
            </div>
            <div className="control-item">
              <label>质量:</label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                disabled={isGenerating}
              >
                <option value="">默认 ({settings?.general.defaultQuality || 'standard'})</option>
                <option value="standard">标准</option>
                <option value="hd">高清</option>
                <option value="ultra">超清</option>
              </select>
            </div>
            <div className="control-item">
              <label>预设:</label>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                disabled={isGenerating}
              >
                <option value="">不使用</option>
                {settings?.stylePresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="generator-body">
        <div className="stats-row">
          <div className="stat-item stat-pending">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">待生成</span>
          </div>
          <div className="stat-item stat-generating">
            <span className="stat-value">{isGenerating ? progress.completed : 0}</span>
            <span className="stat-label">生成中</span>
          </div>
          <div className="stat-item stat-success">
            <span className="stat-value">{successCount}</span>
            <span className="stat-label">已完成</span>
          </div>
          <div className="stat-item stat-failed">
            <span className="stat-value">{failedCount}</span>
            <span className="stat-label">失败</span>
          </div>
        </div>

        {isGenerating && (
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%',
              }}
            />
            <span className="progress-text">
              {progress.completed} / {progress.total}
            </span>
          </div>
        )}

        <div className="action-row">
          {!isGenerating ? (
            <button
              className="btn btn-large btn-generate"
              onClick={generate}
              disabled={pendingCount === 0 || !activeProvider}
            >
              🚀 开始批量生成
            </button>
          ) : (
            <button className="btn btn-large btn-cancel" onClick={handleCancel}>
              ⏹️ 取消生成
            </button>
          )}
          {failedCount > 0 && !isGenerating && (
            <button className="btn btn-secondary" onClick={handleRetryFailed}>
              🔄 重试失败项
            </button>
          )}
          <span className="status-text">
            {isGenerating
              ? `生成中... ${progress.completed}/${progress.total}`
              : pendingCount > 0
                ? `等待开始... (${pendingCount} 条待生成)`
                : prompts.length > 0
                  ? '全部完成'
                  : '暂无提示词'}
          </span>
        </div>
      </div>
    </div>
  );
}

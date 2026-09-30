import { useState, useRef } from 'react';

interface PromptManagerProps {
  prompts: PromptItem[];
  onAddPrompt: (text: string) => void;
  onAddPrompts: (texts: string[]) => void;
  onDeletePrompt: (id: string) => void;
  onClearAll: () => void;
  onDeleteSelected: (ids: string[]) => void;
  onUpdatePrompt: (id: string, text: string) => void;
  onExportPrompts: () => void;
  disabled: boolean;
}

export default function PromptManager({
  prompts,
  onAddPrompt,
  onAddPrompts,
  onDeletePrompt,
  onClearAll,
  onDeleteSelected,
  onUpdatePrompt,
  onExportPrompts,
  disabled,
}: PromptManagerProps) {
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newPrompt.trim()) return;
    onAddPrompt(newPrompt.trim());
    setNewPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const prompts: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          prompts.push(trimmed.slice(1, -1));
        } else {
          prompts.push(trimmed);
        }
      }
      if (prompts.length > 0 && /^(prompt|提示词|text)/i.test(prompts[0])) {
        prompts.shift();
      }
      const validPrompts = prompts.filter(p => p);
      if (validPrompts.length > 0) {
        onAddPrompts(validPrompts);
      } else {
        alert('CSV文件中未找到有效的提示词');
      }
    } catch (err) {
      alert(`读取文件失败: ${err}`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prompts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prompts.map(p => p.id)));
    }
  };

  const startEdit = (prompt: PromptItem) => {
    setEditingId(prompt.id);
    setEditingText(prompt.text);
  };

  const saveEdit = () => {
    if (editingId && editingText.trim()) {
      onUpdatePrompt(editingId, editingText.trim());
    }
    setEditingId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const applyStyleToAll = async () => {
    if (!selectedStyle) return;
    const stylePrompts = prompts.map(p => `${p.text}, ${selectedStyle}`);
    for (let i = 0; i < prompts.length; i++) {
      onUpdatePrompt(prompts[i].id, stylePrompts[i]);
    }
  };

  const getStatusClass = (status: PromptItem['status']) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'generating': return 'status-generating';
      case 'success': return 'status-success';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  const getStatusText = (status: PromptItem['status']) => {
    switch (status) {
      case 'pending': return '待生成';
      case 'generating': return '生成中';
      case 'success': return '已完成';
      case 'failed': return '失败';
      default: return '';
    }
  };

  return (
    <div className="prompt-manager">
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={disabled}
          />
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
            📂 导入CSV文件
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            const text = prompt('请输入提示词内容:');
            if (text?.trim()) onAddPrompt(text.trim());
          }} disabled={disabled}>
            ➕ 添加提示词
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => {
            if (selectedIds.size === 0) {
              alert('请先选择要删除的项');
              return;
            }
            if (confirm(`确定删除选中的 ${selectedIds.size} 条提示词?`)) {
              onDeleteSelected(Array.from(selectedIds));
              setSelectedIds(new Set());
            }
          }} disabled={disabled || selectedIds.size === 0}>
            🗑️ 删除选中
          </button>
          <button className="btn btn-warning btn-sm" onClick={() => {
            if (confirm('确定清空所有提示词?')) {
              onClearAll();
              setSelectedIds(new Set());
            }
          }} disabled={disabled || prompts.length === 0}>
            🧹 清空全部
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onExportPrompts} disabled={disabled || prompts.length === 0}>
            💾 导出CSV
          </button>
        </div>
        <div className="toolbar-right">
          <div className="style-selector">
            <span className="style-label">风格:</span>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              disabled={disabled}
            >
              <option value="">选择风格预设...</option>
              <option value="photorealistic, highly detailed, 8k">📷 写实摄影</option>
              <option value="anime style, cel shaded, vibrant colors">🎨 动漫风格</option>
              <option value="oil painting, classical art">🖼️ 油画风格</option>
              <option value="watercolor painting, soft washes">💧 水彩风格</option>
              <option value="cyberpunk, neon lights, futuristic">🌆 赛博朋克</option>
              <option value="minimalist, clean, simple">⬜ 极简风格</option>
              <option value="3D render, octane render, cinematic">🎬 3D渲染</option>
              <option value="pixel art, 16-bit style">👾 像素风格</option>
              <option value="watercolor, ink painting, chinese style">🏮 中国风</option>
            </select>
            {selectedStyle && (
              <button className="btn btn-primary btn-sm" onClick={applyStyleToAll} disabled={disabled}>
                应用到全部
              </button>
            )}
          </div>
          <span className="prompt-count">
            💡 双击提示词可编辑 · 总计: {prompts.length} 条
          </span>
        </div>
      </div>

      <div className="add-prompt-row">
        <input
          type="text"
          className="prompt-input"
          placeholder="输入新提示词，按回车添加..."
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={disabled || !newPrompt.trim()}>
          ➕ 添加
        </button>
      </div>

      <div className="prompt-table-wrapper">
        <table className="prompt-table">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={prompts.length > 0 && selectedIds.size === prompts.length}
                  onChange={toggleSelectAll}
                  disabled={disabled || prompts.length === 0}
                />
              </th>
              <th className="col-index">编号</th>
              <th className="col-prompt">提示词</th>
              <th className="col-status">状态</th>
              <th className="col-image">生成图片</th>
              <th className="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {prompts.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  <div className="empty-state">
                    <span className="empty-icon">📝</span>
                    <span>暂无提示词，点击上方按钮添加或导入CSV文件</span>
                  </div>
                </td>
              </tr>
            ) : (
              prompts.map((prompt, idx) => (
                <tr key={prompt.id} className={selectedIds.has(prompt.id) ? 'selected' : ''}>
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(prompt.id)}
                      onChange={() => toggleSelect(prompt.id)}
                      disabled={disabled}
                    />
                  </td>
                  <td className="col-index">{idx + 1}</td>
                  <td className="col-prompt">
                    {editingId === prompt.id ? (
                      <div className="edit-wrapper">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            }
                            if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          autoFocus
                          rows={2}
                        />
                        <div className="edit-actions">
                          <button className="btn btn-primary btn-xs" onClick={saveEdit}>保存</button>
                          <button className="btn btn-secondary btn-xs" onClick={cancelEdit}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <span
                        className="prompt-text"
                        onDoubleClick={() => !disabled && startEdit(prompt)}
                        title="双击编辑"
                      >
                        {prompt.text}
                      </span>
                    )}
                  </td>
                  <td className="col-status">
                    <span className={`status-badge ${getStatusClass(prompt.status)}`}>
                      {getStatusText(prompt.status)}
                    </span>
                    {prompt.errorMsg && (
                      <div className="error-message" title={prompt.errorMsg}>
                        ⚠️ {prompt.errorMsg.length > 80 ? prompt.errorMsg.slice(0, 80) + '...' : prompt.errorMsg}
                      </div>
                    )}
                  </td>
                  <td className="col-image">
                    {prompt.localPath || prompt.imageUrl ? (
                      <div className="image-thumb" onClick={() => {
                        if (prompt.localPath) {
                          window.electronAPI.shell.openPath(prompt.localPath);
                        } else if (prompt.imageUrl) {
                          window.open(prompt.imageUrl, '_blank');
                        }
                      }}>
                        <img
                          src={prompt.localPath ? `file:///${prompt.localPath}` : prompt.imageUrl}
                          alt="生成结果"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.add('show');
                          }}
                        />
                        <span className="thumb-fallback">🖼️</span>
                      </div>
                    ) : (
                      <span className="no-image">-</span>
                    )}
                  </td>
                  <td className="col-actions">
                    <button className="btn-icon" onClick={() => !disabled && startEdit(prompt)} disabled={disabled} title="编辑">
                      ✏️
                    </button>
                    <button className="btn-icon" onClick={() => {
                      if (confirm('确定删除此条提示词?')) {
                        onDeletePrompt(prompt.id);
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.delete(prompt.id);
                          return next;
                        });
                      }
                    }} disabled={disabled} title="删除">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PromptManager from './components/PromptManager';
import SettingsModal from './components/SettingsModal';
import BatchGenerator from './components/BatchGenerator';
import HistoryPanel from './components/HistoryPanel';
import { loadSettings, saveSettings } from './services/storage';
import { generateId } from './utils/csv';
import './App.css';

type TabType = 'prompts' | 'history';

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('prompts');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {
      setSettings(null);
    });
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    // 错误提示显示更久
    setTimeout(() => setToast(null), type === 'error' ? 8000 : 3000);
  }, []);

  const handleAddPrompt = useCallback((text: string) => {
    const newItem: PromptItem = {
      id: generateId(),
      text,
      status: 'pending',
      createdAt: Date.now(),
    };
    setPrompts(prev => [...prev, newItem]);
  }, []);

  const handleAddPrompts = useCallback((texts: string[]) => {
    const newItems: PromptItem[] = texts.map(text => ({
      id: generateId(),
      text,
      status: 'pending',
      createdAt: Date.now(),
    }));
    setPrompts(prev => [...prev, ...newItems]);
    showToast(`成功导入 ${newItems.length} 条提示词`, 'success');
  }, [showToast]);

  const handleDeletePrompt = useCallback((id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setPrompts([]);
  }, []);

  const handleDeleteSelected = useCallback((ids: string[]) => {
    setPrompts(prev => prev.filter(p => !ids.includes(p.id)));
  }, []);

  const handleUpdatePrompt = useCallback((id: string, text: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, text } : p));
  }, []);

  const handlePromptStatusChange = useCallback((id: string, updates: Partial<PromptItem>) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const handleBatchStatusChange = useCallback((updates: { id: string; data: Partial<PromptItem> }[]) => {
    setPrompts(prev => prev.map(p => {
      const update = updates.find(u => u.id === p.id);
      return update ? { ...p, ...update.data } : p;
    }));
  }, []);

  const handleSaveSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    showToast('设置已保存', 'success');
  }, [showToast]);

  const handleExportPrompts = useCallback(async () => {
    if (prompts.length === 0) {
      showToast('没有可导出的提示词', 'error');
      return;
    }
    const savePath = settings?.general.savePath || '';
    const fileName = `prompts_${Date.now()}.csv`;
    const fullPath = savePath ? `${savePath}\\${fileName}` : fileName;
    const success = await window.electronAPI.file.writeCsv(fullPath, prompts.map(p => p.text));
    if (success !== undefined) {
      showToast(`已导出 ${prompts.length} 条提示词`, 'success');
    }
  }, [prompts, settings, showToast]);

  return (
    <div className="app">
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="main-content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            📝 提示词管理与生成
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📂 历史记录
          </button>
        </div>

        {activeTab === 'prompts' && (
          <PromptManager
            prompts={prompts}
            onAddPrompt={handleAddPrompt}
            onAddPrompts={handleAddPrompts}
            onDeletePrompt={handleDeletePrompt}
            onClearAll={handleClearAll}
            onDeleteSelected={handleDeleteSelected}
            onUpdatePrompt={handleUpdatePrompt}
            onExportPrompts={handleExportPrompts}
            disabled={isGenerating}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPanel
            prompts={prompts}
            onPromptClick={(_p) => {
              setActiveTab('prompts');
            }}
          />
        )}

        <BatchGenerator
          settings={settings}
          prompts={prompts}
          isGenerating={isGenerating}
          onGeneratingChange={setIsGenerating}
          onPromptStatusChange={handlePromptStatusChange}
          onBatchStatusChange={handleBatchStatusChange}
          onShowToast={showToast}
        />
      </div>

      {isSettingsOpen && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={async (newSettings) => {
            await handleSaveSettings(newSettings);
            setIsSettingsOpen(false);
          }}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

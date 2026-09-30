interface HeaderProps {
  settings: Settings | null;
  onOpenSettings: () => void;
}

export default function Header({ settings, onOpenSettings }: HeaderProps) {
  const activeProvider = settings?.providers.find(p => p.id === settings.activeProvider);
  const providerName = activeProvider?.name || '未配置';
  const threadCount = settings?.general.threadCount || 1;
  const savePath = settings?.general.savePath || '未设置';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">
          <span className="logo">🎨</span>
          Sora 批量生图工具
        </h1>
        <span className="version">V2.0</span>
      </div>
      <div className="header-center">
        <div className="info-item">
          <span className="info-label">API平台:</span>
          <span className="info-value">{providerName}</span>
        </div>
        <div className="info-divider">|</div>
        <div className="info-item">
          <span className="info-label">线程:</span>
          <span className="info-value">{threadCount}</span>
        </div>
        <div className="info-divider">|</div>
        <div className="info-item">
          <span className="info-label">保存路径:</span>
          <span className="info-value path" title={savePath}>{savePath}</span>
        </div>
      </div>
      <div className="header-right">
        <button className="btn btn-settings" onClick={onOpenSettings}>
          ⚙️ 设置中心
        </button>
      </div>
    </header>
  );
}

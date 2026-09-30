export async function loadSettings(): Promise<Settings> {
  return window.electronAPI.settings.load();
}

export async function saveSettings(settings: Settings): Promise<void> {
  return window.electronAPI.settings.save(settings);
}

export async function resetSettings(): Promise<Settings> {
  return window.electronAPI.settings.reset();
}

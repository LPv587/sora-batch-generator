import { contextBridge, ipcRenderer } from 'electron';

const api = {
  settings: {
    load: (): Promise<Settings> => ipcRenderer.invoke('settings:load'),
    save: (settings: Settings): Promise<void> => ipcRenderer.invoke('settings:save', settings),
    reset: (): Promise<Settings> => ipcRenderer.invoke('settings:reset'),
  },
  dialog: {
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory'),
    selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
      ipcRenderer.invoke('dialog:selectFile', filters),
  },
  file: {
    readCsv: (filePath: string): Promise<string[]> => ipcRenderer.invoke('file:readCsv', filePath),
    writeCsv: (filePath: string, prompts: string[]): Promise<void> =>
      ipcRenderer.invoke('file:writeCsv', filePath, prompts),
    downloadImage: (url: string, savePath: string, filename: string): Promise<string> =>
      ipcRenderer.invoke('file:downloadImage', url, savePath, filename),
  },
  fs: {
    ensureDir: (dirPath: string): Promise<void> => ipcRenderer.invoke('fs:ensureDir', dirPath),
    listFiles: (dirPath: string): Promise<string[]> => ipcRenderer.invoke('fs:listFiles', dirPath),
  },
  shell: {
    openPath: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:openPath', filePath),
  },
  api: {
    fetch: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number }): Promise<{ status: number; data: string; ok: boolean }> =>
      ipcRenderer.invoke('api:fetch', url, options),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

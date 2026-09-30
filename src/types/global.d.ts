declare global {
  interface Window {
    electronAPI: {
      settings: {
        load: () => Promise<Settings>;
        save: (settings: Settings) => Promise<void>;
        reset: () => Promise<Settings>;
      };
      dialog: {
        selectDirectory: () => Promise<string | null>;
        selectFile: (filters?: FileFilter[]) => Promise<string | null>;
      };
      file: {
        readCsv: (filePath: string) => Promise<string[]>;
        writeCsv: (filePath: string, prompts: string[]) => Promise<void>;
        downloadImage: (url: string, savePath: string, filename: string) => Promise<string>;
      };
      fs: {
        ensureDir: (dirPath: string) => Promise<void>;
        listFiles: (dirPath: string) => Promise<string[]>;
      };
      shell: {
        openPath: (filePath: string) => Promise<void>;
      };
      api: {
        fetch: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number }) =>
          Promise<{ status: number; data: string; ok: boolean }>;
      };
    };
  }
}

export {};
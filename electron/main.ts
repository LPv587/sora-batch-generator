import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

let mainWindow: BrowserWindow | null = null;

try {
  const portableUserData = path.join(app.getPath('exe'), '..', 'data');
  if (!fs.existsSync(portableUserData)) {
    fs.mkdirSync(portableUserData, { recursive: true });
  }
  app.setPath('userData', portableUserData);
} catch {}

const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

function loadSettings(): Settings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return getDefaultSettings();
}

function saveSettings(settings: Settings): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function getDefaultSettings(): Settings {
  return {
    activeProvider: 'sora',
    providers: [
      {
        id: 'sora',
        name: 'Sora AI',
        type: 'sora',
        config: {
          apiUrl: 'https://api.sora.ai/v1/images/generations',
          apiKey: '',
          model: 'sora-v1',
        },
      },
    ],
    general: {
      threadCount: 4,
      savePath: path.join(app.getPath('pictures'), 'sora-batch'),
      autoSave: true,
      defaultSize: '1024x1024',
      defaultQuality: 'standard',
    },
    stylePresets: [
      { id: 'realistic', name: '写实风格', prompt: 'photorealistic, high detail, 8k' },
      { id: 'anime', name: '动漫风格', prompt: 'anime style, cel shaded, vibrant colors' },
      { id: 'oil', name: '油画风格', prompt: 'oil painting, classical art, textured brushstrokes' },
      { id: 'watercolor', name: '水彩风格', prompt: 'watercolor painting, soft washes, delicate' },
      { id: 'cyberpunk', name: '赛博朋克', prompt: 'cyberpunk style, neon lights, futuristic, sci-fi' },
      { id: 'minimalist', name: '极简风格', prompt: 'minimalist, clean, simple, elegant' },
    ],
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Sora API 批量生图工具 V2.0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('settings:load', (_event): Settings => {
  return loadSettings();
});

ipcMain.handle('settings:save', (_event, settings: Settings): void => {
  saveSettings(settings);
});

ipcMain.handle('settings:reset', (): Settings => {
  const defaults = getDefaultSettings();
  saveSettings(defaults);
  return defaults;
});

ipcMain.handle('dialog:selectDirectory', async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:selectFile', async (_event, filters?: Electron.FileFilter[]): Promise<string | null> => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'CSV Files', extensions: ['csv'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('file:readCsv', async (_event, filePath: string): Promise<string[]> => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());
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
    return prompts.filter(p => p);
  } catch (e) {
    throw new Error(`读取CSV文件失败: ${e}`);
  }
});

ipcMain.handle('file:writeCsv', async (_event, filePath: string, prompts: string[]): Promise<void> => {
  try {
    const header = '提示词';
    const rows = prompts.map(p => `"${p.replace(/"/g, '""')}"`);
    const content = [header, ...rows].join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (e) {
    throw new Error(`写入CSV文件失败: ${e}`);
  }
});

ipcMain.handle('file:downloadImage', async (_event, url: string, savePath: string, filename: string): Promise<string> => {
  try {
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    let buffer: Buffer;
    // 处理 base64 data URL
    if (url.startsWith('data:image/')) {
      const base64Data = url.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`下载失败: ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    }
    const finalPath = path.join(savePath, filename);
    fs.writeFileSync(finalPath, buffer);
    return finalPath;
  } catch (e) {
    throw new Error(`下载图片失败: ${e}`);
  }
});

ipcMain.handle('shell:openPath', (_event, filePath: string): void => {
  shell.openPath(filePath);
});

ipcMain.handle('fs:ensureDir', (_event, dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

ipcMain.handle('fs:listFiles', (_event, dirPath: string): string[] => {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).filter(f => /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(f));
  } catch {
    return [];
  }
});

// 通过主进程发送 API 请求，绕过浏览器 CORS 限制
ipcMain.handle('api:fetch', async (_event, url: string, options: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number } = {}): Promise<{ status: number; data: string; ok: boolean }> => {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 120000,
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, data, ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300 });
        });
      });

      req.on('error', (e) => {
        resolve({ status: 0, data: JSON.stringify({ error: { message: e.message } }), ok: false });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, data: JSON.stringify({ error: { message: '请求超时(120s)' } }), ok: false });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (e) {
      resolve({ status: 0, data: JSON.stringify({ error: { message: String(e) } }), ok: false });
    }
  });
});

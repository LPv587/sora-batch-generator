interface ProviderConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  [key: string]: string | number | boolean | undefined;
}

interface ApiProvider {
  id: string;
  name: string;
  type: string;
  config: ProviderConfig;
}

interface GeneralSettings {
  threadCount: number;
  savePath: string;
  autoSave: boolean;
  defaultSize: string;
  defaultQuality: string;
}

interface StylePreset {
  id: string;
  name: string;
  prompt: string;
}

interface Settings {
  activeProvider: string;
  providers: ApiProvider[];
  general: GeneralSettings;
  stylePresets: StylePreset[];
}

interface PromptItem {
  id: string;
  text: string;
  status: 'pending' | 'generating' | 'success' | 'failed';
  imageUrl?: string;
  localPath?: string;
  errorMsg?: string;
  createdAt: number;
}

interface GenerateResult {
  success: boolean;
  imageUrl?: string;
  localPath?: string;
  errorMsg?: string;
  promptId: string;
}

interface FileFilter {
  name: string;
  extensions: string[];
}

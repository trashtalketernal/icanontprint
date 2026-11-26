export type LanguageCode = 'en' | 'ru' | 'uk' | 'de' | 'es' | 'fr' | 'ja';

export type MainTabId = 'main' | 'printers' | 'settings';

export interface ScannedPage {
  id: string;
  dataUrl: string;
  isBlank: boolean;
  brightness: number;
  variance: number;
  rotation: number;
}

export interface SyncedDestinationRecord {
  destinationId: string;
  destinationName: string;
  destinationType: string;
  remotePath: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  folder: string;
  createdAt: string;
  pages: ScannedPage[];
  ocrText: string;
  summary: string;
  documentType: string;
  handwrittenConfidence: string;
  tags: string[];
  wordCount: number;
  syncedDestinations: SyncedDestinationRecord[];
}

export interface PrinterSettings {
  paperSize: 'A4' | 'Letter' | '4x6 Photo' | '5x7 Photo';
  quality: 'Standard' | 'High' | 'Draft';
  duplex: boolean;
  colorMode: 'Color' | 'Grayscale';
  borderless: boolean;
  scanDpi: 300 | 600 | 1200;
  scanColor: 'RGB24' | 'Grayscale8' | 'BlackAndWhite1';
  scanSource: 'Platen' | 'Feeder';
}

export interface PrinterDevice {
  id: string;
  model: string;
  ipAddress: string;
  connected: boolean;
  supportsEscl: boolean;
  status: 'Ready' | 'Offline' | 'Busy';
  addedAt: string;
  settings: PrinterSettings;
}

export type RemoteDestinationType = 'googledrive' | 'dropbox' | 'webdav' | 'sftp' | 'webhook';

export interface RemoteDestinationConfig {
  id: string;
  type: RemoteDestinationType;
  name: string;
  enabled: boolean;
  folderPath: string;
  account?: string;
  url?: string;
  host?: string;
  username?: string;
  password?: string;
}

export interface AppSettings {
  language: LanguageCode;
  defaultFolder: string;
  filePrefix: string;
  autoSkipBlankPages: boolean;
  blankThreshold: number;
  handwritingOcrBoost: boolean;
  autoSyncRemote: boolean;
  defaultRemoteId: string;
  requireWifiPrompt: boolean;
}

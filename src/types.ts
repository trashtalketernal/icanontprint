export interface ScannedPage {
  id: string;
  dataUrl: string;
  isBlank: boolean;
  brightness: number;
  rotation: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  createdAt: string;
  pages: ScannedPage[];
  ocrText: string;
  summary: string;
  documentType: string;
  handwrittenConfidence: string;
  tags: string[];
  wordCount: number;
  syncedDestinations: {
    destinationType: string;
    remotePath: string;
    timestamp: string;
  }[];
}

export interface PrinterState {
  connected: boolean;
  model: string;
  ipAddress: string;
  status: 'Ready' | 'Printing' | 'Scanning' | 'Offline' | 'Paper Out';
  inkLevels: {
    black: number;
    cyan: number;
    magenta: number;
    yellow: number;
  };
  paperStock: 'A4' | 'Letter' | '4x6 Photo';
}

export interface RemoteDestinationConfig {
  type: 'googledrive' | 'dropbox' | 'webdav' | 'sftp' | 'webhook';
  name: string;
  account?: string;
  url?: string;
  host?: string;
  connected: boolean;
}

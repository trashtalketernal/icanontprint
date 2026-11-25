import { DocumentRecord, PrinterState, RemoteDestinationConfig } from './types';

export const INITIAL_PRINTER: PrinterState = {
  connected: true,
  model: 'Canon PIXMA TR4720 Series',
  ipAddress: '192.168.1.145',
  status: 'Ready',
  inkLevels: {
    black: 85,
    cyan: 62,
    magenta: 78,
    yellow: 90
  },
  paperStock: 'A4'
};

export const INITIAL_DESTINATIONS: RemoteDestinationConfig[] = [
  { type: 'googledrive', name: 'Google Drive (Primary)', account: 'vakelion.a.v@gmail.com', connected: true },
  { type: 'dropbox', name: 'Dropbox Backup', account: 'Canon Scans Sync', connected: false },
  { type: 'webdav', name: 'Synology NAS WebDAV', url: 'https://nas.local:5006/scans', connected: false },
  { type: 'sftp', name: 'Office SFTP Server', host: 'sftp.office.internal', connected: false },
  { type: 'webhook', name: 'Zapier / Make Automation Webhook', url: 'https://hook.eu1.make.com/canon-print-inbound', connected: true }
];

export const SAMPLE_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc_101',
    title: 'Lecture Notes - Advanced Machine Learning',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    pages: [
      {
        id: 'p1',
        dataUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
        isBlank: false,
        brightness: 92,
        rotation: 0
      },
      {
        id: 'p2',
        dataUrl: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=800&q=80',
        isBlank: false,
        brightness: 88,
        rotation: 0
      }
    ],
    ocrText: `Lecture 4: Transformer Architecture & Self-Attention Mechanisms\n\nKey Formulas:\nAttention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V\n\nNotes:\n- Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.\n- Positional encodings are added to input embeddings because transformers lack recurrence or convolution.`,
    summary: 'Detailed handwritten lecture notes covering Transformer self-attention mathematical formulation and multi-head attention architecture.',
    documentType: 'Handwritten Notes',
    handwrittenConfidence: 'High',
    tags: ['MachineLearning', 'LectureNotes', 'AI'],
    wordCount: 74,
    syncedDestinations: [
      {
        destinationType: 'googledrive',
        remotePath: '/My Drive/Canon Scans/Lecture Notes - Advanced Machine Learning.pdf',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      }
    ]
  },
  {
    id: 'doc_102',
    title: 'Office Hardware Invoice #9482',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    pages: [
      {
        id: 'p3',
        dataUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
        isBlank: false,
        brightness: 95,
        rotation: 0
      }
    ],
    ocrText: `CANON SOLUTIONS INC.\nInvoice Number: #9482\nDate: Nov 24, 2026\n\nItem Description: Canon PIXMA TR4720 High Yield Ink Cartridge (Black & Color Pack)\nQuantity: 3\nUnit Price: $34.99\nSubtotal: $104.97\nTax (8%): $8.40\nTotal Due: $113.37\n\nPayment Status: PAID IN FULL`,
    summary: 'Invoice for Canon high yield ink cartridge purchase totaling $113.37.',
    documentType: 'Invoice',
    handwrittenConfidence: 'High',
    tags: ['Invoice', 'Hardware', 'Office'],
    wordCount: 52,
    syncedDestinations: [
      {
        destinationType: 'webhook',
        remotePath: 'https://hook.eu1.make.com/canon-print-inbound',
        timestamp: new Date(Date.now() - 3600000 * 23).toISOString()
      }
    ]
  }
];

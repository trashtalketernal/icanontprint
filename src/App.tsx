import React, { useEffect, useState } from 'react';
import { Home, Printer, Settings } from 'lucide-react';
import {
  AppSettings,
  DocumentRecord,
  MainTabId,
  PrinterDevice,
  PrinterSettings,
  RemoteDestinationConfig,
} from './types';
import { t } from './i18n';
import { MainTab } from './components/MainTab';
import { PrintersTab } from './components/PrintersTab';
import { SettingsTab } from './components/SettingsTab';
import { ScanWorkflow } from './components/ScanWorkflow';
import { PrintWorkflow } from './components/PrintWorkflow';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { DocumentViewer } from './components/DocumentViewer';

const STORAGE_KEYS = {
  printers: 'canon_print_printers_v1',
  activePrinterId: 'canon_print_active_printer_v1',
  documents: 'canon_print_documents_v1',
  destinations: 'canon_print_destinations_v1',
  settings: 'canon_print_settings_v1',
};

const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paperSize: 'A4',
  quality: 'Standard',
  duplex: false,
  colorMode: 'Color',
  borderless: false,
  scanDpi: 300,
  scanColor: 'RGB24',
  scanSource: 'Platen',
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'en',
  defaultFolder: '/Documents/CanonPRINT',
  filePrefix: 'CanonScan',
  autoSkipBlankPages: true,
  blankThreshold: 88,
  handwritingOcrBoost: true,
  autoSyncRemote: false,
  defaultRemoteId: '',
  requireWifiPrompt: false,
};

const DEFAULT_DESTINATIONS: RemoteDestinationConfig[] = [
  {
    id: 'dest_gdrive',
    type: 'googledrive',
    name: 'Google Drive',
    enabled: false,
    folderPath: '/My Drive/Canon Scans',
    account: '',
  },
  {
    id: 'dest_webdav',
    type: 'webdav',
    name: 'WebDAV / NAS',
    enabled: false,
    folderPath: '/scans',
    url: '',
  },
];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTabId>('main');
  const [printers, setPrinters] = useState<PrinterDevice[]>(() =>
    loadJson<PrinterDevice[]>(STORAGE_KEYS.printers, [])
  );
  const [activePrinterId, setActivePrinterId] = useState<string | null>(() =>
    loadJson<string | null>(STORAGE_KEYS.activePrinterId, null)
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    loadJson<DocumentRecord[]>(STORAGE_KEYS.documents, [])
  );
  const [destinations, setDestinations] = useState<RemoteDestinationConfig[]>(() =>
    loadJson<RemoteDestinationConfig[]>(STORAGE_KEYS.destinations, DEFAULT_DESTINATIONS)
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_APP_SETTINGS,
    ...loadJson<Partial<AppSettings>>(STORAGE_KEYS.settings, {}),
  }));

  const [printerError, setPrinterError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [printModalDocId, setPrintModalDocId] = useState<string | null | undefined>(undefined);
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.printers, JSON.stringify(printers));
    } catch {
      // ignore storage quota errors
    }
  }, [printers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.activePrinterId, JSON.stringify(activePrinterId));
    } catch {
      // ignore
    }
  }, [activePrinterId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documents));
    } catch {
      // ignore
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.destinations, JSON.stringify(destinations));
    } catch {
      // ignore
    }
  }, [destinations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appSettings));
    } catch {
      // ignore
    }
  }, [appSettings]);

  const lang = appSettings.language;
  const activePrinter = printers.find((p) => p.id === activePrinterId) || null;

  const requireConnectedPrinter = (action: () => void) => {
    if (!activePrinter || !activePrinter.connected) {
      setPrinterError(t(lang, 'printerRequiredMessage'));
      return;
    }
    setPrinterError(null);
    action();
  };

  const handleAddPrinter = (input: {
    ipAddress: string;
    model: string;
    supportsEscl: boolean;
    connected: boolean;
  }) => {
    const existing = printers.find((p) => p.ipAddress === input.ipAddress);
    if (existing) {
      const updated = printers.map((p) =>
        p.id === existing.id
          ? {
              ...p,
              model: input.model || p.model,
              supportsEscl: input.supportsEscl,
              connected: input.connected,
              status: (input.connected ? 'Ready' : 'Offline') as PrinterDevice['status'],
            }
          : p
      );
      setPrinters(updated);
      setActivePrinterId(existing.id);
      setPrinterError(null);
      return;
    }

    const newDevice: PrinterDevice = {
      id: `prt_${Date.now()}`,
      model: input.model,
      ipAddress: input.ipAddress,
      connected: input.connected,
      supportsEscl: input.supportsEscl,
      status: input.connected ? 'Ready' : 'Offline',
      addedAt: new Date().toISOString(),
      settings: { ...DEFAULT_PRINTER_SETTINGS },
    };

    setPrinters((prev) => [newDevice, ...prev]);
    setActivePrinterId(newDevice.id);
    setPrinterError(null);
  };

  const handleSelectPrinter = (id: string) => {
    setPrinters((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, connected: true, status: 'Ready' } : p
      )
    );
    setActivePrinterId(id);
    setPrinterError(null);
    setActiveTab('main');
  };

  const handleRemovePrinter = (id: string) => {
    setPrinters((prev) => prev.filter((p) => p.id !== id));
    if (activePrinterId === id) {
      setActivePrinterId(null);
    }
  };

  const handleUpdateCurrentPrinterSettings = (patch: Partial<PrinterSettings>) => {
    if (!activePrinter) return;
    setPrinters((prev) =>
      prev.map((p) =>
        p.id === activePrinter.id ? { ...p, settings: { ...p.settings, ...patch } } : p
      )
    );
  };

  const handleDisconnectPrinter = () => {
    if (!activePrinter) return;
    setPrinters((prev) =>
      prev.map((p) =>
        p.id === activePrinter.id ? { ...p, connected: false, status: 'Offline' } : p
      )
    );
    setActivePrinterId(null);
    setPrinterSettingsOpen(false);
  };

  const handleSaveScannedDocs = (newDocs: DocumentRecord[]) => {
    setDocuments((prev) => [...newDocs, ...prev]);
  };

  const handleUpdateDocument = (updatedDoc: DocumentRecord) => {
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
    setSelectedDocument(updatedDoc);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
  };

  const headerTitle =
    activeTab === 'main'
      ? t(lang, 'appTitle')
      : activeTab === 'printers'
      ? t(lang, 'tabPrinters')
      : t(lang, 'tabSettings');

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#171717] flex flex-col">
      {/* Compact Mobile Top Bar (52px) */}
      <header className="sticky top-0 z-30 h-[52px] bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 flex items-center justify-between">
        <span
          className={`text-base font-bold tracking-tight whitespace-nowrap shrink-0 ${
            activeTab === 'main' ? 'text-[#CC0000]' : 'text-neutral-900'
          }`}
        >
          {headerTitle}
        </span>

        {activePrinter ? (
          <button
            type="button"
            onClick={() => setActiveTab('printers')}
            className="min-h-[40px] max-w-[170px] text-xs font-medium text-neutral-600 truncate whitespace-nowrap"
          >
            {activePrinter.model}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('printers')}
            className="min-h-[40px] text-xs font-semibold text-[#CC0000] whitespace-nowrap shrink-0"
          >
            {t(lang, 'tabPrinters')}
          </button>
        )}
      </header>

      {/* Main Scrollable Viewport */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-4 pb-24">
        {activeTab === 'main' && (
          <MainTab
            lang={lang}
            activePrinter={activePrinter}
            documents={documents}
            onOpenPrint={() => requireConnectedPrinter(() => setPrintModalDocId(null))}
            onOpenScan={() => requireConnectedPrinter(() => setScanOpen(true))}
            onOpenPrinterSettings={() =>
              requireConnectedPrinter(() => setPrinterSettingsOpen(true))
            }
            onGoToPrinters={() => setActiveTab('printers')}
            onSelectDocument={(doc) => setSelectedDocument(doc)}
            printerError={printerError}
            onDismissPrinterError={() => setPrinterError(null)}
          />
        )}

        {activeTab === 'printers' && (
          <PrintersTab
            lang={lang}
            printers={printers}
            activePrinterId={activePrinterId}
            onSelectPrinter={handleSelectPrinter}
            onAddPrinter={handleAddPrinter}
            onRemovePrinter={handleRemovePrinter}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={appSettings}
            onUpdateSettings={(patch) =>
              setAppSettings((prev) => ({ ...prev, ...patch }))
            }
            destinations={destinations}
            onUpdateDestinations={setDestinations}
          />
        )}
      </main>

      {/* Fixed 3-Tab Bottom Navigation Bar */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-safe"
      >
        <div className="max-w-2xl mx-auto grid grid-cols-3 h-14">
          {[
            { id: 'main' as const, label: t(lang, 'tabMain'), icon: Home },
            { id: 'printers' as const, label: t(lang, 'tabPrinters'), icon: Printer },
            { id: 'settings' as const, label: t(lang, 'tabSettings'), icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  active ? 'text-[#CC0000]' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[11px] font-semibold tracking-tight mt-0.5 whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Fullscreen Scan Workflow */}
      {scanOpen && activePrinter && (
        <ScanWorkflow
          printer={activePrinter}
          appSettings={appSettings}
          destinations={destinations}
          onSaveDocuments={handleSaveScannedDocs}
          onClose={() => setScanOpen(false)}
        />
      )}

      {/* Fullscreen Print Workflow */}
      {printModalDocId !== undefined && activePrinter && (
        <PrintWorkflow
          lang={lang}
          printer={activePrinter}
          documents={documents}
          initialDocId={printModalDocId || undefined}
          onClose={() => setPrintModalDocId(undefined)}
        />
      )}

      {/* Current Printer Settings Bottom Sheet */}
      {printerSettingsOpen && activePrinter && (
        <PrinterSettingsModal
          lang={lang}
          printer={activePrinter}
          onUpdateSettings={handleUpdateCurrentPrinterSettings}
          onDisconnect={handleDisconnectPrinter}
          onClose={() => setPrinterSettingsOpen(false)}
        />
      )}

      {/* Integrated Document Viewer */}
      {selectedDocument && (
        <DocumentViewer
          lang={lang}
          document={selectedDocument}
          destinations={destinations}
          onClose={() => setSelectedDocument(null)}
          onUpdateDocument={handleUpdateDocument}
          onDeleteDocument={handleDeleteDocument}
          onPrintDocument={(docId) => {
            setSelectedDocument(null);
            requireConnectedPrinter(() => setPrintModalDocId(docId));
          }}
        />
      )}
    </div>
  );
}

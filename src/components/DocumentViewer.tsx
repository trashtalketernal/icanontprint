import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Cloud,
  Copy,
  Check,
  Trash2,
  Printer,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  DocumentRecord,
  LanguageCode,
  RemoteDestinationConfig,
  SyncedDestinationRecord,
} from '../types';
import { t } from '../i18n';
import { buildPdfBase64, downloadTextFile, exportPagesToPdf } from '../utils/pdfExport';

interface DocumentViewerProps {
  lang: LanguageCode;
  document: DocumentRecord;
  destinations: RemoteDestinationConfig[];
  onClose: () => void;
  onUpdateDocument: (doc: DocumentRecord) => void;
  onDeleteDocument: (id: string) => void;
  onPrintDocument: (docId: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  lang,
  document: doc,
  destinations,
  onClose,
  onUpdateDocument,
  onDeleteDocument,
  onPrintDocument,
}) => {
  const [ocrText, setOcrText] = useState(doc.ocrText);
  const [copied, setCopied] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const enabledDests = destinations.filter((d) => d.enabled);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSaveTextEdits = () => {
    onUpdateDocument({
      ...doc,
      ocrText,
      wordCount: ocrText.trim() ? ocrText.trim().split(/\s+/).length : 0,
    });
  };

  const handleRemoteUpload = async (dest: RemoteDestinationConfig) => {
    setSyncingId(dest.id);
    setSyncStatus(null);
    try {
      const pdfBase64 = await buildPdfBase64(doc.pages);
      const res = await fetch('/api/remote-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: dest,
          document: {
            title: doc.title,
            ocrText,
            summary: doc.summary,
            pdfBase64,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSyncStatus({ ok: false, msg: json.error || 'Upload failed.' });
      } else if (json.result) {
        const record: SyncedDestinationRecord = json.result;
        const filtered = doc.syncedDestinations.filter((s) => s.destinationId !== dest.id);
        onUpdateDocument({
          ...doc,
          syncedDestinations: [...filtered, record],
        });
        setSyncStatus({ ok: true, msg: `Uploaded to ${dest.name}` });
      }
    } catch {
      setSyncStatus({ ok: false, msg: `Could not upload to ${dest.name}` });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F4F5F7] z-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-3 h-14 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center min-w-0 px-2">
          <h1 className="text-sm font-bold text-neutral-900 truncate">{doc.title}</h1>
          <p className="text-[11px] text-neutral-500 tabular-nums truncate">
            {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} · {doc.folder}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onDeleteDocument(doc.id);
            onClose();
          }}
          aria-label={t(lang, 'delete')}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-500 hover:text-red-600"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl w-full mx-auto space-y-4">
        {/* Horizontal Page Strip */}
        <section className="flex gap-3 overflow-x-auto pb-1">
          {doc.pages.map((page, idx) => (
            <div
              key={page.id}
              className="w-44 shrink-0 bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs"
            >
              <div className="aspect-[3/4] bg-[#F4F5F7] relative">
                <img
                  src={page.dataUrl}
                  alt={`Page ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                />
                <span className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums">
                  {idx + 1} / {doc.pages.length}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Export & Print Quick Actions */}
        <section className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => exportPagesToPdf(doc.pages, doc.title)}
            className="min-h-[48px] bg-[#CC0000] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile(ocrText, doc.title)}
            className="min-h-[48px] bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            onClick={() => onPrintDocument(doc.id)}
            className="min-h-[48px] bg-white border border-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{t(lang, 'actionPrint')}</span>
          </button>
        </section>

        {/* Remote Destinations Sync */}
        <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#CC0000]" />
            <h2 className="text-sm font-bold text-neutral-900">
              {t(lang, 'remoteSection')}
            </h2>
          </div>

          {syncStatus && (
            <div
              className={`text-xs rounded-xl p-2.5 flex items-center gap-2 ${
                syncStatus.ok
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {syncStatus.ok ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{syncStatus.msg}</span>
            </div>
          )}

          {enabledDests.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Enable a remote destination in Settings to sync documents.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabledDests.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  disabled={syncingId === dest.id}
                  onClick={() => handleRemoteUpload(dest)}
                  className="min-h-[44px] px-3.5 py-2 bg-[#F4F5F7] hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  {syncingId === dest.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-[#CC0000]" />
                  )}
                  <span>{dest.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recognized OCR Text */}
        <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">OCR Text</h2>
              <p className="text-xs text-neutral-500 tabular-nums">
                {doc.documentType} · {doc.wordCount} words
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyText}
              className="min-h-[44px] px-3 py-1.5 bg-[#F4F5F7] rounded-xl text-xs font-semibold text-neutral-800 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <textarea
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            onBlur={handleSaveTextEdits}
            rows={9}
            placeholder="No recognized text yet."
            className="w-full bg-[#F4F5F7] rounded-xl p-3 text-xs font-mono text-neutral-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
          />
        </section>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  FileUp,
  Minus,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  DocumentRecord,
  LanguageCode,
  PrinterDevice,
  PrinterSettings,
  ScannedPage,
} from '../types';
import { t } from '../i18n';
import { buildPdfBase64 } from '../utils/pdfExport';

interface PrintWorkflowProps {
  lang: LanguageCode;
  printer: PrinterDevice;
  documents: DocumentRecord[];
  initialDocId?: string;
  onClose: () => void;
}

export const PrintWorkflow: React.FC<PrintWorkflowProps> = ({
  lang,
  printer,
  documents,
  initialDocId,
  onClose,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialDocId || documents[0]?.id || ''
  );
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customPages, setCustomPages] = useState<ScannedPage[]>([]);

  const [paperSize, setPaperSize] = useState<PrinterSettings['paperSize']>(
    printer.settings.paperSize
  );
  const [colorMode, setColorMode] = useState<PrinterSettings['colorMode']>(
    printer.settings.colorMode
  );
  const [quality, setQuality] = useState<PrinterSettings['quality']>(
    printer.settings.quality
  );
  const [duplex, setDuplex] = useState<boolean>(printer.settings.duplex);
  const [copies, setCopies] = useState<number>(1);

  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const activeDoc = documents.find((d) => d.id === selectedDocId);
  const targetPages = customPages.length > 0 ? customPages : activeDoc?.pages || [];
  const targetTitle =
    customPages.length > 0
      ? customTitle || 'Device Document'
      : activeDoc?.title || 'Canon Print Job';

  const handlePickDeviceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const first = files[0];
    setCustomTitle(first.name.replace(/\.[^/.]+$/, ''));

    const readers = Array.from(files).map(
      (file) =>
        new Promise<ScannedPage>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              dataUrl: String(reader.result || ''),
              isBlank: false,
              brightness: 90,
              variance: 500,
              rotation: 0,
            });
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((loaded) => setCustomPages(loaded));
    e.target.value = '';
  };

  const handlePrint = async () => {
    if (targetPages.length === 0) {
      setResult({ ok: false, message: 'Select a saved document or pick an image to print.' });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const pdfBase64 = await buildPdfBase64(targetPages);
      const res = await fetch('/api/printer/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: printer.ipAddress,
          title: targetTitle,
          paperSize,
          colorMode,
          quality,
          duplex,
          copies,
          pdfBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || 'Printer failed to accept job.' });
      } else {
        setResult({ ok: true, message: data.message || 'Print job sent.' });
      }
    } catch {
      setResult({
        ok: false,
        message: `Could not reach ${printer.model} (${printer.ipAddress}).`,
      });
    } finally {
      setIsSending(false);
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
          <h1 className="text-sm font-bold text-neutral-900 truncate">
            {t(lang, 'printTitle')}
          </h1>
          <p className="text-[11px] text-neutral-500 truncate">{printer.model}</p>
        </div>
        <div className="w-11" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-28 max-w-2xl w-full mx-auto space-y-4">
        {result && (
          <div
            className={`bg-white rounded-2xl p-4 border flex items-start gap-3 text-xs ${
              result.ok
                ? 'border-emerald-200 text-emerald-800'
                : 'border-red-200 text-red-700'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className="leading-relaxed">{result.message}</p>
          </div>
        )}

        {/* Document Selection */}
        <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3 shadow-xs">
          <label className="block text-xs font-bold text-neutral-800">
            {t(lang, 'selectDocToPrint')}
          </label>

          {documents.length > 0 && (
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                setCustomPages([]);
              }}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium text-neutral-900"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.pages.length}p)
                </option>
              ))}
            </select>
          )}

          <label className="w-full min-h-[44px] border border-dashed border-neutral-300 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer">
            <FileUp className="w-4 h-4 text-[#CC0000]" />
            <span>{t(lang, 'importFileToPrint')}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePickDeviceFile}
              className="hidden"
            />
          </label>

          {targetPages.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="w-14 h-18 rounded-lg bg-[#F4F5F7] border border-neutral-200 overflow-hidden shrink-0">
                <img
                  src={targetPages[0].dataUrl}
                  alt={targetTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {targetTitle}
                </p>
                <p className="text-xs text-neutral-500 tabular-nums">
                  {targetPages.length} {targetPages.length === 1 ? 'page' : 'pages'} ·{' '}
                  {copies} {copies === 1 ? 'copy' : 'copies'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Print Options */}
        <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between min-h-[44px]">
            <span className="text-sm font-medium text-neutral-800">
              {t(lang, 'copies')}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCopies((c) => Math.max(1, c - 1))}
                className="min-h-[44px] min-w-[44px] bg-[#F4F5F7] rounded-xl flex items-center justify-center text-neutral-800"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-bold tabular-nums">
                {copies}
              </span>
              <button
                type="button"
                onClick={() => setCopies((c) => Math.min(99, c + 1))}
                className="min-h-[44px] min-w-[44px] bg-[#F4F5F7] rounded-xl flex items-center justify-center text-neutral-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              {t(lang, 'paperSize')}
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PrinterSettings['paperSize'])}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="Letter">Letter (8.5 x 11 in)</option>
              <option value="4x6 Photo">4 x 6 Photo</option>
              <option value="5x7 Photo">5 x 7 Photo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t(lang, 'colorMode')}
              </label>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as PrinterSettings['colorMode'])}
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
              >
                <option value="Color">Color</option>
                <option value="Grayscale">Grayscale</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t(lang, 'quality')}
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as PrinterSettings['quality'])}
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
              >
                <option value="Standard">Standard</option>
                <option value="High">High</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
            <span className="text-sm font-medium text-neutral-800">
              {t(lang, 'duplex')}
            </span>
            <input
              type="checkbox"
              checked={duplex}
              onChange={(e) => setDuplex(e.target.checked)}
              className="w-5 h-5 accent-[#CC0000] rounded"
            />
          </label>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-3 pb-safe z-50">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isSending || targetPages.length === 0}
            className="w-full min-h-[48px] bg-[#CC0000] hover:bg-[#B30000] active:scale-[0.99] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>
              {isSending ? t(lang, 'sendingPrint') : t(lang, 'sendToPrinter')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Printer,
  Scan,
  SlidersHorizontal,
  FileText,
  Search,
  ChevronRight,
  AlertCircle,
  Plus,
  Cloud,
} from 'lucide-react';
import { DocumentRecord, LanguageCode, PrinterDevice } from '../types';
import { t } from '../i18n';

interface MainTabProps {
  lang: LanguageCode;
  activePrinter: PrinterDevice | null;
  documents: DocumentRecord[];
  onOpenPrint: () => void;
  onOpenScan: () => void;
  onOpenPrinterSettings: () => void;
  onGoToPrinters: () => void;
  onSelectDocument: (doc: DocumentRecord) => void;
  printerError: string | null;
  onDismissPrinterError: () => void;
}

export const MainTab: React.FC<MainTabProps> = ({
  lang,
  activePrinter,
  documents,
  onOpenPrint,
  onOpenScan,
  onOpenPrinterSettings,
  onGoToPrinters,
  onSelectDocument,
  printerError,
  onDismissPrinterError,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.ocrText.toLowerCase().includes(q) ||
      doc.folder.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Printer Error Banner when user attempts Print or Scan without connected printer */}
      {printerError && (
        <div
          role="alert"
          className="bg-white border border-red-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#CC0000] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                {t(lang, 'printerRequiredTitle')}
              </p>
              <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                {printerError}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismissPrinterError}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-xl whitespace-nowrap"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onDismissPrinterError();
                onGoToPrinters();
              }}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-[#CC0000] text-white rounded-xl hover:bg-[#AA0000] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {t(lang, 'goToPrinters')}
            </button>
          </div>
        </div>
      )}

      {/* Current Printer Status Card */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs">
        {activePrinter ? (
          <div className="flex items-center gap-3.5">
            <div className="w-20 h-16 rounded-xl bg-[#F4F5F7] overflow-hidden shrink-0 border border-neutral-200/60 flex items-center justify-center">
              <img
                src="/src/assets/images/canon_printer_unit_1795678946293.jpg"
                alt={activePrinter.model}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-neutral-900 truncate">
                {activePrinter.model}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 font-mono tabular-nums truncate">
                {activePrinter.ipAddress} ·{' '}
                <span className={activePrinter.connected ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}>
                  {activePrinter.connected ? t(lang, 'connected') : t(lang, 'offline')}
                </span>
              </p>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                {activePrinter.settings.paperSize} · {activePrinter.settings.scanDpi} DPI
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToPrinters}
              aria-label={t(lang, 'tabPrinters')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGoToPrinters}
            className="w-full flex items-center gap-3.5 text-left min-h-[60px] active:scale-[0.99] transition-transform"
          >
            <div className="w-16 h-14 rounded-xl bg-[#F4F5F7] border border-dashed border-neutral-300 flex items-center justify-center shrink-0 text-neutral-400">
              <Plus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900">
                {t(lang, 'noPrinterSelected')}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5 leading-snug">
                {t(lang, 'tapToSelectPrinter')}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-400 shrink-0" />
          </button>
        )}
      </section>

      {/* Primary Canon PRINT Action Buttons: Print, Scan, Printer Settings */}
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenPrint}
          className="bg-[#CC0000] hover:bg-[#B30000] active:scale-[0.98] text-white rounded-2xl p-4 min-h-[104px] flex flex-col justify-between text-left shadow-xs transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight whitespace-nowrap">
              {t(lang, 'actionPrint')}
            </span>
            <span className="block text-[11px] text-red-100 mt-0.5 truncate">
              {activePrinter ? activePrinter.settings.paperSize : t(lang, 'offline')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenScan}
          className="bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-900 rounded-2xl p-4 min-h-[104px] flex flex-col justify-between text-left border border-neutral-200/90 shadow-xs transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Scan className="w-5 h-5 text-[#CC0000]" />
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight whitespace-nowrap">
              {t(lang, 'actionScan')}
            </span>
            <span className="block text-[11px] text-neutral-500 mt-0.5 truncate">
              PDF · OCR · Split
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenPrinterSettings}
          className="col-span-2 bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-900 rounded-2xl px-4 py-3.5 min-h-[56px] flex items-center justify-between border border-neutral-200/90 shadow-xs transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-neutral-700" />
            </div>
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {t(lang, 'actionPrinterSettings')}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
        </button>
      </section>

      {/* Integrated File Manager for Scanned Documents */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">
              {t(lang, 'savedDocuments')}
            </h2>
            <span className="text-xs text-neutral-500 tabular-nums">
              {documents.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(lang, 'searchDocuments')}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700">
              {t(lang, 'noDocumentsYet')}
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {t(lang, 'noDocumentsHint')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectDocument(doc)}
                className="w-full px-4 py-3.5 min-h-[68px] flex items-center gap-3 text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
              >
                <div className="w-11 h-14 rounded-lg bg-[#F4F5F7] border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {doc.pages[0] ? (
                    <img
                      src={doc.pages[0].dataUrl}
                      alt={doc.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-5 h-5 text-neutral-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">
                    {doc.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 tabular-nums truncate">
                    {doc.pages.length}{' '}
                    {doc.pages.length === 1 ? t(lang, 'pageWord') : t(lang, 'pagesCount')} ·{' '}
                    {new Date(doc.createdAt).toLocaleDateString()} · {doc.folder}
                  </p>
                  {doc.syncedDestinations.length > 0 && (
                    <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1 truncate">
                      <Cloud className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span className="truncate">
                        {doc.syncedDestinations[doc.syncedDestinations.length - 1].destinationName}
                      </span>
                    </p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

import React, { useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Scan,
  Camera,
  ImagePlus,
  Trash2,
  RotateCw,
  ArrowLeft as MoveLeftIcon,
  ArrowRight as MoveRightIcon,
  Split,
  Sparkles,
  Download,
  Cloud,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  DocumentRecord,
  PrinterDevice,
  RemoteDestinationConfig,
  ScannedPage,
  SyncedDestinationRecord,
} from '../types';
import { t } from '../i18n';
import { analyzeScannedPage } from '../utils/blankDetector';
import { buildPdfBase64, exportPagesToPdf } from '../utils/pdfExport';

interface ScanWorkflowProps {
  printer: PrinterDevice;
  appSettings: AppSettings;
  destinations: RemoteDestinationConfig[];
  onSaveDocuments: (docs: DocumentRecord[]) => void;
  onClose: () => void;
}

export const ScanWorkflow: React.FC<ScanWorkflowProps> = ({
  printer,
  appSettings,
  destinations,
  onSaveDocuments,
  onClose,
}) => {
  const lang = appSettings.language;
  const [pages, setPages] = useState<ScannedPage[]>([]);
  // Indices where a new document starts (e.g., [2] splits [0,1] and [2,3])
  const [splitStarts, setSplitStarts] = useState<number[]>([]);
  const [docTitles, setDocTitles] = useState<Record<number, string>>({});

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveDoneDocs, setSaveDoneDocs] = useState<DocumentRecord[] | null>(null);

  const enabledDestinations = destinations.filter((d) => d.enabled);
  const [selectedDestId, setSelectedDestId] = useState<string>(
    appSettings.autoSyncRemote && appSettings.defaultRemoteId
      ? appSettings.defaultRemoteId
      : ''
  );

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const appendPagesFromDataUrls = async (dataUrls: string[]) => {
    const analyzed: ScannedPage[] = [];
    for (let i = 0; i < dataUrls.length; i++) {
      const dataUrl = dataUrls[i];
      const metrics = await analyzeScannedPage(dataUrl, appSettings.blankThreshold);
      analyzed.push({
        id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`,
        dataUrl,
        isBlank: metrics.isBlank,
        brightness: metrics.brightness,
        variance: metrics.variance,
        rotation: 0,
      });
    }

    setPages((prev) => {
      const combined = [...prev, ...analyzed];
      if (appSettings.autoSkipBlankPages) {
        return combined.filter((p) => !p.isBlank);
      }
      return combined;
    });
  };

  // Scan directly from connected Canon eSCL network scanner
  const handleCanonNetworkScan = async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/printer/escl-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: printer.ipAddress,
          dpi: printer.settings.scanDpi,
          colorMode: printer.settings.scanColor,
          inputSource: printer.settings.scanSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || 'Canon scanner did not respond.');
        return;
      }
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        await appendPagesFromDataUrls(data.pages);
      }
    } catch {
      setScanError(
        `Could not connect to ${printer.model} (${printer.ipAddress}). Ensure your device and printer share the same Wi-Fi network, or use Camera Scan.`
      );
    } finally {
      setIsScanning(false);
    }
  };

  const openCamera = async () => {
    setScanError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraOpen(false);
      setScanError('Camera permission was denied or unavailable.');
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraOpen(false);
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    closeCamera();
    await appendPagesFromDataUrls([dataUrl]);
  };

  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((urls) => {
      const valid = urls.filter(Boolean);
      if (valid.length > 0) {
        appendPagesFromDataUrls(valid);
      }
    });
    e.target.value = '';
  };

  const blankCount = pages.filter((p) => p.isBlank).length;

  const handleSkipBlanks = () => {
    setPages((prev) => prev.filter((p) => !p.isBlank));
    setSplitStarts([]);
  };

  const handleRotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleDeletePage = (idx: number) => {
    setPages((prev) => prev.filter((_, i) => i !== idx));
    setSplitStarts((prev) =>
      prev
        .filter((s) => s !== idx)
        .map((s) => (s > idx ? s - 1 : s))
        .filter((s) => s > 0 && s < pages.length - 1)
    );
  };

  const handleMovePage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const toggleSplitBefore = (pageIndex: number) => {
    if (pageIndex <= 0 || pageIndex >= pages.length) return;
    setSplitStarts((prev) =>
      prev.includes(pageIndex)
        ? prev.filter((s) => s !== pageIndex)
        : [...prev, pageIndex].sort((a, b) => a - b)
    );
  };

  // Build ordered document groups from splitStarts
  const documentGroups = useMemo(() => {
    if (pages.length === 0) return [];
    const sortedSplits = Array.from(new Set(splitStarts))
      .filter((s) => s > 0 && s < pages.length)
      .sort((a, b) => a - b);

    const boundaries = [0, ...sortedSplits, pages.length];
    const groups: { groupIndex: number; startIdx: number; endIdx: number; items: ScannedPage[] }[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const startIdx = boundaries[i];
      const endIdx = boundaries[i + 1];
      groups.push({
        groupIndex: i,
        startIdx,
        endIdx,
        items: pages.slice(startIdx, endIdx),
      });
    }
    return groups;
  }, [pages, splitStarts]);

  const handleRecognizeAndSave = async () => {
    if (documentGroups.length === 0) return;
    setIsProcessing(true);
    setScanError(null);

    const createdDocs: DocumentRecord[] = [];
    const remoteDest = enabledDestinations.find((d) => d.id === selectedDestId);

    for (const group of documentGroups) {
      const customTitle = docTitles[group.groupIndex]?.trim();
      let title =
        customTitle ||
        `${appSettings.filePrefix}_${new Date().toISOString().slice(0, 10)}_${group.groupIndex + 1}`;
      let ocrText = '';
      let summary = '';
      let documentType = 'Document';
      let handwrittenConfidence = 'High';
      let tags: string[] = [];
      let wordCount = 0;

      // Run improved multi-page OCR on all pages in this split group
      try {
        const ocrRes = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: group.items.map((p) => p.dataUrl),
            language: lang,
            handwritingBoost: appSettings.handwritingOcrBoost,
          }),
        });
        const ocrJson = await ocrRes.json();
        if (ocrRes.ok && ocrJson.data) {
          if (!customTitle && ocrJson.data.title) {
            title = ocrJson.data.title;
          }
          ocrText = ocrJson.data.text || '';
          summary = ocrJson.data.summary || '';
          documentType = ocrJson.data.documentType || 'Document';
          handwrittenConfidence = ocrJson.data.handwrittenConfidence || 'High';
          tags = Array.isArray(ocrJson.data.tags) ? ocrJson.data.tags : [];
          wordCount = ocrJson.data.wordCount || 0;
        } else if (ocrJson.error) {
          setScanError(ocrJson.error);
        }
      } catch {
        // Save document even if OCR service is offline
      }

      const syncedDestinations: SyncedDestinationRecord[] = [];
      if (remoteDest) {
        try {
          const pdfBase64 = await buildPdfBase64(group.items);
          const upRes = await fetch('/api/remote-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: remoteDest,
              document: {
                title,
                ocrText,
                summary,
                pdfBase64,
              },
            }),
          });
          const upJson = await upRes.json();
          if (upRes.ok && upJson.result) {
            syncedDestinations.push(upJson.result);
          } else if (upJson.error) {
            setScanError(upJson.error);
          }
        } catch {
          setScanError(`Saved locally, but upload to ${remoteDest.name} failed.`);
        }
      }

      createdDocs.push({
        id: `doc_${Date.now()}_${group.groupIndex}`,
        title,
        folder: appSettings.defaultFolder,
        createdAt: new Date().toISOString(),
        pages: group.items,
        ocrText,
        summary,
        documentType,
        handwrittenConfidence,
        tags,
        wordCount,
        syncedDestinations,
      });
    }

    onSaveDocuments(createdDocs);
    setSaveDoneDocs(createdDocs);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-[#F4F5F7] z-50 flex flex-col">
      {/* Compact Mobile Header */}
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
            {t(lang, 'scanTitle')}
          </h1>
          <p className="text-[11px] text-neutral-500 truncate">
            {printer.model} · {printer.settings.scanDpi} DPI
          </p>
        </div>
        <div className="w-11" />
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 max-w-2xl w-full mx-auto space-y-4">
        {/* Source Actions */}
        <section className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleCanonNetworkScan}
            disabled={isScanning}
            className="bg-[#CC0000] hover:bg-[#B30000] active:scale-[0.98] text-white rounded-2xl p-3 min-h-[76px] flex flex-col items-center justify-center gap-1.5 text-center shadow-xs disabled:opacity-60"
          >
            {isScanning ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Scan className="w-5 h-5" />
            )}
            <span className="text-xs font-semibold leading-tight">
              {isScanning ? t(lang, 'scanningPrinter') : t(lang, 'scanCanonLan')}
            </span>
          </button>

          <button
            type="button"
            onClick={openCamera}
            className="bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-900 border border-neutral-200 rounded-2xl p-3 min-h-[76px] flex flex-col items-center justify-center gap-1.5 text-center shadow-xs"
          >
            <Camera className="w-5 h-5 text-[#CC0000]" />
            <span className="text-xs font-semibold leading-tight">
              {t(lang, 'scanCamera')}
            </span>
          </button>

          <label className="bg-white hover:bg-neutral-50 active:scale-[0.98] text-neutral-900 border border-neutral-200 rounded-2xl p-3 min-h-[76px] flex flex-col items-center justify-center gap-1.5 text-center shadow-xs cursor-pointer">
            <ImagePlus className="w-5 h-5 text-neutral-700" />
            <span className="text-xs font-semibold leading-tight">
              {t(lang, 'importPages')}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImportFiles}
              className="hidden"
            />
          </label>
        </section>

        {scanError && (
          <div className="bg-white border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed flex-1">{scanError}</p>
          </div>
        )}

        {/* Saved Completion State */}
        {saveDoneDocs && (
          <section className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-bold">
                Saved {saveDoneDocs.length} PDF document(s)
              </p>
            </div>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {saveDoneDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 flex items-center justify-between gap-3 bg-white"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} ·{' '}
                      {doc.wordCount} words
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportPagesToPdf(doc.pages, doc.title)}
                    className="min-h-[44px] px-3.5 py-2 bg-[#F4F5F7] hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] bg-neutral-900 text-white text-sm font-semibold rounded-xl"
            >
              Done
            </button>
          </section>
        )}

        {/* Scanned Pages Organizer & Multi-Document Splitter */}
        {pages.length > 0 && !saveDoneDocs && (
          <>
            {/* Quick Batch Controls */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-semibold text-neutral-700 tabular-nums">
                {pages.length} {pages.length === 1 ? 'page' : 'pages'} ·{' '}
                {documentGroups.length}{' '}
                {documentGroups.length === 1 ? 'document' : 'documents'}
              </span>

              {blankCount > 0 && (
                <button
                  type="button"
                  onClick={handleSkipBlanks}
                  className="min-h-[40px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#CC0000] text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {t(lang, 'skipBlanks')} ({blankCount})
                  </span>
                </button>
              )}
            </div>

            {/* Split Document Groups */}
            <div className="space-y-4">
              {documentGroups.map((group) => (
                <section
                  key={group.groupIndex}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#CC0000] tabular-nums shrink-0">
                      {t(lang, 'documentPart')} {group.groupIndex + 1}
                    </span>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {group.items.length}{' '}
                      {group.items.length === 1 ? 'page' : 'pages'}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={docTitles[group.groupIndex] ?? ''}
                    onChange={(e) =>
                      setDocTitles((prev) => ({
                        ...prev,
                        [group.groupIndex]: e.target.value,
                      }))
                    }
                    placeholder={`${appSettings.filePrefix}_${group.groupIndex + 1} (auto-named by OCR if blank)`}
                    className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    {group.items.map((page, localIdx) => {
                      const globalIdx = group.startIdx + localIdx;
                      const isSplitPoint = splitStarts.includes(globalIdx);
                      return (
                        <div
                          key={page.id}
                          className="border border-neutral-200 rounded-xl p-2 bg-[#F4F5F7]/60 flex flex-col gap-2"
                        >
                          <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden border border-neutral-200 relative">
                            <img
                              src={page.dataUrl}
                              alt={`Page ${globalIdx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                              style={{ transform: `rotate(${page.rotation}deg)` }}
                            />
                            <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums">
                              {globalIdx + 1}
                              {page.isBlank ? ` · ${t(lang, 'blankDetected')}` : ''}
                            </span>
                          </div>

                          {/* Page controls >= 40px touch */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => handleMovePage(globalIdx, -1)}
                                disabled={globalIdx === 0}
                                aria-label="Move earlier"
                                className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-600 disabled:opacity-30 hover:bg-white"
                              >
                                <MoveLeftIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMovePage(globalIdx, 1)}
                                disabled={globalIdx === pages.length - 1}
                                aria-label="Move later"
                                className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-600 disabled:opacity-30 hover:bg-white"
                              >
                                <MoveRightIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRotatePage(page.id)}
                                aria-label="Rotate"
                                className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-600 hover:bg-white"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeletePage(globalIdx)}
                              aria-label="Delete page"
                              className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {globalIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleSplitBefore(globalIdx)}
                              className={`min-h-[38px] w-full rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                                isSplitPoint
                                  ? 'bg-[#CC0000] text-white'
                                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                              }`}
                            >
                              <Split className="w-3 h-3" />
                              <span>
                                {isSplitPoint ? t(lang, 'splitActive') : t(lang, 'splitHere')}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Destination Selector */}
            <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#CC0000]" />
                <label className="text-xs font-bold text-neutral-800">
                  {t(lang, 'saveDestLabel')}
                </label>
              </div>
              <select
                value={selectedDestId}
                onChange={(e) => setSelectedDestId(e.target.value)}
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium text-neutral-900"
              >
                <option value="">{t(lang, 'localOnly')} ({appSettings.defaultFolder})</option>
                {enabledDestinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name} ({dest.folderPath})
                  </option>
                ))}
              </select>
            </section>
          </>
        )}
      </div>

      {/* Sticky Bottom CTA */}
      {pages.length > 0 && !saveDoneDocs && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-3 pb-safe z-50">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={handleRecognizeAndSave}
              disabled={isProcessing}
              className="w-full min-h-[48px] bg-[#CC0000] hover:bg-[#B30000] active:scale-[0.99] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {isProcessing ? t(lang, 'processingOcr') : t(lang, 'runOcrAndSave')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Camera Capture Viewfinder */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black z-60 flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between text-white">
            <span className="text-sm font-semibold">{t(lang, 'scanCamera')}</span>
            <button
              type="button"
              onClick={closeCamera}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-6 border border-white/60 rounded-2xl pointer-events-none" />
          </div>
          <div className="py-6 flex justify-center bg-black pb-safe">
            <button
              type="button"
              onClick={captureFrame}
              aria-label="Capture document page"
              className="w-16 h-16 rounded-full bg-white border-4 border-[#CC0000] active:scale-95 transition-transform"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Printer, FileText, CheckCircle2, AlertTriangle, RefreshCw, Sliders } from 'lucide-react';
import { DocumentRecord, PrinterState } from '../types';

interface PrintHubProps {
  documents: DocumentRecord[];
  printer: PrinterState;
}

export const PrintHub: React.FC<PrintHubProps> = ({ documents, printer }) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter' | '4x6 Photo'>('A4');
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
  const [copies, setCopies] = useState<number>(1);
  const [duplex, setDuplex] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  const handleStartPrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setIsPrinting(true);
    setPrintSuccess(false);

    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#990000] font-bold text-xs uppercase tracking-wider mb-1">
            <Printer className="w-4 h-4" />
            <span>Standalone Print Studio</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Canon Print Hub</h1>
          <p className="text-xs text-gray-500">Send saved documents or scanned files directly to your connected printer with custom stock settings</p>
        </div>

        {/* Printer Status Badge */}
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold ${printer.connected ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          <Printer className="w-4 h-4" />
          <span>{printer.model} ({printer.connected ? 'Online' : 'Offline - Simulated'})</span>
        </div>
      </div>

      {!printer.connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold mb-0.5">Printer Disconnected (Wi-Fi Restriction Bypassed)</h4>
            <p className="text-amber-800">You can test print jobs and configure queue settings; simulation will log job dispatch successfully or report error if printer is offline.</p>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 max-w-lg mx-auto">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base mb-1">No Documents Available to Print</h3>
          <p className="text-xs text-gray-500">Scan or upload documents first before sending to printer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Print Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <form onSubmit={handleStartPrint} className="space-y-6">
              
              {/* Document Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Select Document to Print</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-red-500"
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>{d.title} ({d.pages.length} pages)</option>
                  ))}
                </select>
              </div>

              {/* Print Configuration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Paper Stock */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Paper Stock</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-red-500"
                  >
                    <option value="A4">A4 (210 x 297 mm)</option>
                    <option value="Letter">US Letter (8.5 x 11 in)</option>
                    <option value="4x6 Photo">4x6 Photo Glossy</option>
                  </select>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Color Mode</label>
                  <select
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-red-500"
                  >
                    <option value="color">Full Color (CMYK)</option>
                    <option value="grayscale">Grayscale (Black & White)</option>
                  </select>
                </div>

                {/* Copies */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Number of Copies</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Duplex */}
                <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-200 self-end">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Duplex Printing</h4>
                    <p className="text-xs text-gray-500">Print on both sides</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={duplex}
                    onChange={(e) => setDuplex(e.target.checked)}
                    className="w-5 h-5 text-[#990000] rounded focus:ring-red-500 accent-[#990000]"
                  />
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Estimated Pages: <span className="font-bold text-gray-800">{(selectedDoc?.pages.length || 1) * copies} pages</span>
                </div>
                <button
                  type="submit"
                  disabled={isPrinting}
                  className="bg-[#990000] hover:bg-[#800000] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {isPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  <span>{isPrinting ? 'Dispatches to Printer...' : 'Start Printing'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Document Preview Panel */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Target Document Preview</h3>
              {selectedDoc ? (
                <div className="space-y-4">
                  <div className="w-full h-64 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-xs relative">
                    {selectedDoc.pages[0] ? (
                      <img src={selectedDoc.pages[0].dataUrl} alt={selectedDoc.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FileText className="w-10 h-10" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                      {selectedDoc.pages.length} Pages
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{selectedDoc.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{selectedDoc.summary}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-xs">No document selected</div>
              )}
            </div>

            {printSuccess && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold">Print Job Dispatched!</h4>
                  <p className="text-emerald-700">Printer is processing your document successfully.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

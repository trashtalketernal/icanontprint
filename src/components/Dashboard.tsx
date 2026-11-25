import React from 'react';
import { Scan, Printer, FileText, Cloud, ArrowRight, CheckCircle2, Sparkles, UploadCloud, Layers } from 'lucide-react';
import { DocumentRecord, PrinterState, RemoteDestinationConfig } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  documents: DocumentRecord[];
  printer: PrinterState;
  destinations: RemoteDestinationConfig[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  documents,
  printer,
  destinations
}) => {
  const connectedDestinations = destinations.filter(d => d.connected).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#990000] via-[#b30000] to-[#7a0000] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full text-xs font-medium mb-4 text-red-100">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Gemini AI OCR & Remote Cloud Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Canon PRINT Pro & Scan Suite
          </h1>
          <p className="text-red-100 text-sm sm:text-base leading-relaxed mb-6">
            Experience lightning-fast scanning with automatic blank page removal, multi-document batch splitting, high-accuracy handwriting OCR, and seamless remote destination sync.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('scanner')}
              className="bg-white text-[#990000] font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-red-50 transition-all flex items-center space-x-2 text-sm"
            >
              <Scan className="w-4 h-4" />
              <span>Start New Scan</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className="bg-black/30 hover:bg-black/40 text-white font-medium px-6 py-3 rounded-xl transition-all flex items-center space-x-2 text-sm border border-white/20"
            >
              <FileText className="w-4 h-4" />
              <span>Document Library ({documents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          onClick={() => setActiveTab('scanner')}
          className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-[#990000] rounded-xl group-hover:bg-[#990000] group-hover:text-white transition-colors">
              <Scan className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#990000] transition-colors" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Scan & Batch Studio</h3>
          <p className="text-xs text-gray-500">Skip blank pages, reorder, and split into multiple documents.</p>
        </div>

        <div 
          onClick={() => setActiveTab('files')}
          className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-[#990000] rounded-xl group-hover:bg-[#990000] group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold bg-red-50 text-[#990000] px-2.5 py-1 rounded-full">{documents.length} Saved</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Document Manager</h3>
          <p className="text-xs text-gray-500">Search OCR text, tags, preview PDFs, and export.</p>
        </div>

        <div 
          onClick={() => setActiveTab('remote')}
          className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-[#990000] rounded-xl group-hover:bg-[#990000] group-hover:text-white transition-colors">
              <Cloud className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{connectedDestinations} Active Sync</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Remote Destinations</h3>
          <p className="text-xs text-gray-500">Google Drive, Dropbox, WebDAV, SFTP, and Webhooks.</p>
        </div>

        <div 
          onClick={() => setActiveTab('print')}
          className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-[#990000] rounded-xl group-hover:bg-[#990000] group-hover:text-white transition-colors">
              <Printer className="w-6 h-6" />
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${printer.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {printer.connected ? 'Ready' : 'Offline'}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Print Studio</h3>
          <p className="text-xs text-gray-500">Standalone printing with custom paper stock & color controls.</p>
        </div>
      </div>

      {/* Recent Scans Section */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recent Scanned Documents</h2>
            <p className="text-xs text-gray-500">Handwriting-optimized OCR extracted and ready for remote sync</p>
          </div>
          <button
            onClick={() => setActiveTab('files')}
            className="text-sm font-semibold text-[#990000] hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.slice(0, 4).map((doc) => (
            <div key={doc.id} className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex space-x-4 items-start hover:border-red-200 transition-all">
              <div className="w-20 h-24 bg-gray-200 rounded-xl overflow-hidden shrink-0 border border-gray-300 relative shadow-xs">
                {doc.pages[0] ? (
                  <img src={doc.pages[0].dataUrl} alt={doc.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FileText className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {doc.pages.length}p
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[#990000] px-2 py-0.5 rounded">
                    {doc.documentType}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm truncate mb-1">{doc.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{doc.summary || doc.ocrText}</p>
                <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                  <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>OCR: {doc.handwrittenConfidence} Conf</span>
                  </span>
                  {doc.syncedDestinations.length > 0 && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium flex items-center space-x-1">
                      <UploadCloud className="w-3 h-3" />
                      <span>Synced</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { FileText, Search, Tag, Download, Cloud, Trash2, Eye, Sparkles, CheckCircle2, ArrowUpRight, Filter } from 'lucide-react';
import { DocumentRecord, RemoteDestinationConfig } from '../types';
import { exportPagesToPdf, downloadTextFile } from '../utils/pdfExport';

interface FileManagerProps {
  documents: DocumentRecord[];
  onDeleteDocument: (id: string) => void;
  destinations: RemoteDestinationConfig[];
  onSyncDocument: (docId: string, destinationType: string) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  documents,
  onDeleteDocument,
  destinations,
  onSyncDocument
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(documents.flatMap(d => d.tags)));

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.ocrText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'ALL' || doc.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleSyncToRemote = async (doc: DocumentRecord, destType: string) => {
    setSyncingId(doc.id);
    const destConfig = destinations.find(d => d.type === destType);
    try {
      const res = await fetch('/api/remote-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationType: destType,
          destinationConfig: destConfig || {},
          document: { title: doc.title }
        })
      });
      const json = await res.json();
      if (json.success) {
        onSyncDocument(doc.id, destType);
      }
    } catch (e) {
      console.error('Remote sync error:', e);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#990000] font-bold text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Integrated File Manager</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Document Library ({documents.length})</h1>
          <p className="text-xs text-gray-500">Search OCR text, inspect handwriting notes, export PDFs, and sync to remote cloud storage</p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search OCR text, titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Tags:</span>
          </span>
          <button
            onClick={() => setSelectedTag('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              selectedTag === 'ALL' ? 'bg-[#990000] text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Documents
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                selectedTag === tag ? 'bg-[#990000] text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 max-w-lg mx-auto">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base mb-1">No Documents Found</h3>
          <p className="text-xs text-gray-500">Try adjusting your search query or scan new documents in the Scan Studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
              
              {/* Card Header Image Preview */}
              <div className="h-48 bg-gray-100 relative overflow-hidden border-b border-gray-100 cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                {doc.pages[0] ? (
                  <img src={doc.pages[0].dataUrl} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FileText className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <span className="text-white font-bold text-sm truncate drop-shadow">{doc.title}</span>
                </div>
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {doc.pages.length} Pages
                </div>
                <div className="absolute top-3 left-3 bg-[#990000] text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {doc.documentType}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 line-clamp-2">{doc.summary || doc.ocrText}</p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {doc.tags.map(t => (
                      <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* OCR & Remote Sync Badge */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>OCR: {doc.handwrittenConfidence} Conf</span>
                    </span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Synced Destinations */}
                  {doc.syncedDestinations.length > 0 && (
                    <div className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center justify-between">
                      <span className="truncate">Synced: {doc.syncedDestinations[0].remotePath}</span>
                      <CheckCircle2 className="w-3 h-3 shrink-0 ml-1 text-blue-600" />
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3 py-2 rounded-xl transition-colors flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View OCR</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => exportPagesToPdf(doc.pages, doc.title)}
                      title="Download PDF"
                      className="p-2 bg-red-50 hover:bg-red-100 text-[#990000] rounded-xl transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      title="Delete Document"
                      className="p-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Preview & OCR Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-red-100 text-[#990000] px-2 py-0.5 rounded font-bold uppercase">
                    {previewDoc.documentType}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(previewDoc.createdAt).toLocaleString()}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{previewDoc.title}</h2>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Side by Side View */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              
              {/* Left: Pages Preview */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Document Pages ({previewDoc.pages.length})</h3>
                <div className="space-y-3">
                  {previewDoc.pages.map((p, i) => (
                    <div key={p.id} className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-xs">
                      <img src={p.dataUrl} alt={`Page ${i + 1}`} className="w-full h-auto object-contain max-h-96 mx-auto" />
                      <div className="bg-black/70 text-white text-xs px-3 py-1 flex justify-between">
                        <span>Page {i + 1}</span>
                        <span>{p.brightness}% Brightness</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Gemini AI OCR Transcribed Text */}
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#990000]" />
                    <span>Gemini AI OCR Transcription</span>
                  </h3>
                  <button
                    onClick={() => downloadTextFile(previewDoc.ocrText, previewDoc.title)}
                    className="text-xs text-[#990000] font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download TXT</span>
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex-1 font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-96">
                  {previewDoc.ocrText}
                </div>

                {/* Summary & Tags */}
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 space-y-2">
                  <h4 className="text-xs font-bold text-[#990000]">AI Summary</h4>
                  <p className="text-xs text-gray-700">{previewDoc.summary}</p>
                </div>

                {/* Remote Sync Actions */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sync to Remote Destination</h4>
                  <div className="flex flex-wrap gap-2">
                    {destinations.map(d => (
                      <button
                        key={d.type}
                        onClick={() => handleSyncToRemote(previewDoc, d.type)}
                        disabled={syncingId === previewDoc.id}
                        className="text-xs bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-medium px-3 py-2 rounded-xl transition-colors flex items-center space-x-1.5 shadow-2xs"
                      >
                        <Cloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>{d.name.split(' ')[0]}</span>
                        <ArrowUpRight className="w-3 h-3 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => exportPagesToPdf(previewDoc.pages, previewDoc.title)}
                className="bg-[#990000] hover:bg-[#800000] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download Full PDF</span>
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

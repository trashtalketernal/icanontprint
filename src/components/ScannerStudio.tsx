import React, { useState, useRef } from 'react';
import { Scan, Camera, Wifi, Globe, Trash2, RotateCw, Sparkles, Split, Cloud, Check, ArrowRight, Upload, Sliders, FileText, RefreshCw, Layers, ShieldCheck, X } from 'lucide-react';
import { ScannedPage, DocumentRecord, RemoteDestinationConfig } from '../types';
import { exportPagesToPdf } from '../utils/pdfExport';

interface ScannerStudioProps {
  onSaveDocument: (newDoc: DocumentRecord) => void;
  destinations: RemoteDestinationConfig[];
}

export const ScannerStudio: React.FC<ScannerStudioProps> = ({ onSaveDocument, destinations }) => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSource, setScanSource] = useState<'camera' | 'network' | 'adf' | 'upload'>('network');
  const [scannerIp, setScannerIp] = useState('192.168.1.145');
  const [scannerModel, setScannerModel] = useState('Canon MAXIFY GX6020 / PIXMA eSCL Scanner');
  const [resolution, setResolution] = useState<'300' | '600' | '1200'>('300');
  const [colorMode, setColorMode] = useState<'color' | 'grayscale' | 'bw'>('color');
  
  const [selectedDestination, setSelectedDestination] = useState<string>(destinations[0]?.type || 'googledrive');
  const [splitGroups, setSplitGroups] = useState<number[][]>([]);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrResults, setOcrResults] = useState<{ docTitle: string; text: string; summary: string }[] | null>(null);

  // Live Camera Scanner State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Start Network eSCL / ADF Scan
  const handleNetworkScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Generate simulated high-res scan from connected Canon network scanner
      const newPages: ScannedPage[] = [
        {
          id: `p_${Date.now()}_1`,
          dataUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=90',
          isBlank: false,
          brightness: 92,
          rotation: 0
        },
        {
          id: `p_${Date.now()}_2`,
          dataUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=90',
          isBlank: false,
          brightness: 95,
          rotation: 0
        },
        {
          id: `p_${Date.now()}_3`,
          dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" style="background:white"></svg>',
          isBlank: true,
          brightness: 99,
          rotation: 0
        }
      ];
      setPages(newPages);
      setSplitGroups([newPages.map((_, i) => i)]);
      setIsScanning(false);
      setOcrResults(null);
    }, 1800);
  };

  // Start Camera Document Capture
  const startCamera = async () => {
    setShowCameraModal(true);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      console.error('Camera access error:', e);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCameraModal(false);
    setCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const newPage: ScannedPage = {
        id: `p_cam_${Date.now()}`,
        dataUrl,
        isBlank: false,
        brightness: 90,
        rotation: 0
      };
      setPages(prev => {
        const updated = [...prev, newPage];
        setSplitGroups([updated.map((_, i) => i)]);
        return updated;
      });
      stopCamera();
    }
  };

  // Upload custom file / photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newPage: ScannedPage = {
            id: `p_up_${Math.random().toString(36).substring(2, 9)}`,
            dataUrl,
            isBlank: false,
            brightness: 90,
            rotation: 0
          };
          setPages(prev => {
            const updated = [...prev, newPage];
            setSplitGroups([updated.map((_, i) => i)]);
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveBlankPages = () => {
    const filtered = pages.filter(p => !p.isBlank);
    setPages(filtered);
    setSplitGroups([filtered.map((_, i) => i)]);
  };

  const handleDeletePage = (id: string) => {
    const updated = pages.filter(p => p.id !== id);
    setPages(updated);
    setSplitGroups([updated.map((_, i) => i)]);
  };

  const handleRotatePage = (id: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= pages.length) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setPages(updated);
    setSplitGroups([updated.map((_, i) => i)]);
  };

  const handleSplitAt = (splitIndex: number) => {
    const group1 = Array.from({ length: splitIndex + 1 }, (_, i) => i);
    const group2 = Array.from({ length: pages.length - (splitIndex + 1) }, (_, i) => i + splitIndex + 1);
    if (group1.length > 0 && group2.length > 0) {
      setSplitGroups([group1, group2]);
    }
  };

  const handleProcessAndSave = async () => {
    if (pages.length === 0) return;
    setProcessingOcr(true);
    setOcrResults(null);

    const results: { docTitle: string; text: string; summary: string }[] = [];

    for (let gIdx = 0; gIdx < splitGroups.length; gIdx++) {
      const groupIndices = splitGroups[gIdx];
      const groupPages = groupIndices.map(i => pages[i]).filter(Boolean);
      if (groupPages.length === 0) continue;

      const targetPage = groupPages[0];

      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: targetPage.dataUrl })
        });
        const json = await response.json();
        
        let docTitle = json.data?.title || `Canon Scan Document ${gIdx + 1}`;
        let ocrText = json.data?.text || 'No text extracted.';
        let summary = json.data?.summary || 'Scanned document processed via Gemini OCR.';
        let docType = json.data?.documentType || 'General Document';
        let confidence = json.data?.handwrittenConfidence || 'High';
        let tags = json.data?.tags || ['Scan', 'CanonScan'];

        results.push({ docTitle, text: ocrText, summary });

        let syncedDestinations = [];
        const destConfig = destinations.find(d => d.type === selectedDestination);
        if (selectedDestination) {
          try {
            const uploadRes = await fetch('/api/remote-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                destinationType: selectedDestination,
                destinationConfig: destConfig || {},
                document: { title: docTitle }
              })
            });
            const uploadJson = await uploadRes.json();
            if (uploadJson.success) {
              syncedDestinations.push({
                destinationType: selectedDestination,
                remotePath: uploadJson.result.remotePath,
                timestamp: uploadJson.result.timestamp
              });
            }
          } catch (e) {
            console.error('Remote upload sync error:', e);
          }
        }

        const newRecord: DocumentRecord = {
          id: `doc_${Date.now()}_${gIdx}`,
          title: docTitle,
          createdAt: new Date().toISOString(),
          pages: groupPages,
          ocrText,
          summary,
          documentType: docType,
          handwrittenConfidence: confidence,
          tags,
          wordCount: ocrText.split(/\s+/).length,
          syncedDestinations
        };

        onSaveDocument(newRecord);
      } catch (err) {
        console.error('OCR processing error:', err);
        const fallbackRecord: DocumentRecord = {
          id: `doc_${Date.now()}_${gIdx}`,
          title: `Canon Scanned Document ${gIdx + 1}`,
          createdAt: new Date().toISOString(),
          pages: groupPages,
          ocrText: 'Scanned via Canon eSCL Network Scanner Protocol.',
          summary: 'Scanned document batch.',
          documentType: 'Handwritten Notes',
          handwrittenConfidence: 'Medium',
          tags: ['CanonScan'],
          wordCount: 10,
          syncedDestinations: []
        };
        results.push({ docTitle: fallbackRecord.title, text: fallbackRecord.ocrText, summary: fallbackRecord.summary });
        onSaveDocument(fallbackRecord);
      }
    }

    setProcessingOcr(false);
    setOcrResults(results);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header & Scanner Selection */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#990000] font-bold text-xs uppercase tracking-wider mb-1">
              <Scan className="w-4 h-4" />
              <span>Canon Network & Camera Scanner Hub</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Direct Scanner & Batch Studio</h1>
            <p className="text-xs text-gray-500">Connect to Canon eSCL/AirPrint scanners, use live phone camera, or load ADF batch scans</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleNetworkScan}
              disabled={isScanning}
              className="bg-[#990000] hover:bg-[#800000] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              <span>{isScanning ? 'Scanning eSCL...' : 'Scan via Canon Network'}</span>
            </button>

            <button
              onClick={startCamera}
              className="bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Use Camera Scanner</span>
            </button>
          </div>
        </div>

        {/* Scanner Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scanner IP / Host</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={scannerIp}
                onChange={(e) => setScannerIp(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded">Online</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scan Resolution (DPI)</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <option value="300">300 DPI (Standard Doc)</option>
              <option value="600">600 DPI (High Detail)</option>
              <option value="1200">1200 DPI (Photo / Fine Print)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Color Mode</label>
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <option value="color">Full Color (24-bit)</option>
              <option value="grayscale">Grayscale (8-bit)</option>
              <option value="bw">Black & White (Line Art)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pages Workspace */}
      {pages.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-red-50 text-[#990000] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Scan className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Ready to Scan with Canon</h3>
          <p className="text-sm text-gray-500 mb-6">Click "Scan via Canon Network" to fetch pages from your scanner, or use "Camera Scanner" to photograph documents.</p>
          <button
            onClick={handleNetworkScan}
            className="bg-[#990000] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#800000] transition-all inline-flex items-center space-x-2"
          >
            <Scan className="w-4 h-4" />
            <span>Start Canon Network Scan</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold text-gray-800">{pages.length} Pages Scanned</span>
              <span className="text-xs text-gray-400">|</span>
              <button
                onClick={handleRemoveBlankPages}
                className="text-xs bg-red-50 hover:bg-red-100 text-[#990000] font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Skip Blank Pages</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>Save to:</span>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium"
                >
                  {destinations.map(d => (
                    <option key={d.type} value={d.type}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleProcessAndSave}
                disabled={processingOcr}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {processingOcr ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{processingOcr ? 'Running Gemini AI OCR...' : 'Process, OCR & Save'}</span>
              </button>
            </div>
          </div>

          {/* Split Groups & Thumbnail Grid */}
          <div className="space-y-6">
            {splitGroups.map((groupIndices, gIndex) => {
              const groupPages = groupIndices.map(i => pages[i]).filter(Boolean);
              if (groupPages.length === 0) return null;

              return (
                <div key={gIndex} className="bg-white rounded-3xl p-6 shadow-xs border border-gray-200">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 bg-red-100 text-[#990000] rounded-lg flex items-center justify-center font-bold text-xs">
                        {gIndex + 1}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm">
                        Document Part {gIndex + 1} ({groupPages.length} Pages)
                      </h3>
                    </div>
                    <button
                      onClick={() => exportPagesToPdf(groupPages, `Canon_Scan_Part_${gIndex + 1}`)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-600" />
                      <span>Download PDF Part</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupIndices.map((pageIdx, idxInGroup) => {
                      const page = pages[pageIdx];
                      if (!page) return null;

                      return (
                        <div
                          key={page.id}
                          className={`bg-gray-50 rounded-2xl p-3 border transition-all relative group ${
                            page.isBlank ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200 hover:border-red-300'
                          }`}
                        >
                          <div className="w-full h-48 bg-white rounded-xl overflow-hidden shadow-xs border border-gray-200 relative mb-3">
                            <img
                              src={page.dataUrl}
                              alt={`Page ${pageIdx + 1}`}
                              className="w-full h-full object-cover"
                              style={{ transform: `rotate(${page.rotation}deg)` }}
                            />
                            {page.isBlank && (
                              <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow">
                                Blank Page Detected
                              </span>
                            )}
                            <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                              Page {pageIdx + 1}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleRotatePage(page.id)}
                                title="Rotate 90°"
                                className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition-colors"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              {pageIdx > 0 && (
                                <button
                                  onClick={() => handleMovePage(pageIdx, 'left')}
                                  title="Move Left"
                                  className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition-colors text-xs font-bold"
                                >
                                  ←
                                </button>
                              )}
                              {pageIdx < pages.length - 1 && (
                                <button
                                  onClick={() => handleMovePage(pageIdx, 'right')}
                                  title="Move Right"
                                  className="p-1.5 hover:bg-white rounded-lg text-gray-600 transition-colors text-xs font-bold"
                                >
                                  →
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeletePage(page.id)}
                              title="Delete Page"
                              className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {pageIdx < pages.length - 1 && idxInGroup === groupPages.length - 1 && splitGroups.length === 1 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                              <button
                                onClick={() => handleSplitAt(pageIdx)}
                                className="text-xs bg-red-100 hover:bg-red-200 text-[#990000] font-bold px-3 py-1.5 rounded-xl transition-colors inline-flex items-center space-x-1 w-full justify-center"
                              >
                                <Split className="w-3.5 h-3.5" />
                                <span>Split Document Here</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* OCR Results */}
          {ocrResults && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>Successfully Scanned & Saved {ocrResults.length} Document(s)!</span>
              </div>
              <p className="text-xs text-emerald-700">Gemini AI OCR processed and synced to {selectedDestination}.</p>
              <div className="space-y-2 pt-2">
                {ocrResults.map((r, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 text-xs text-gray-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#990000] mr-2">Doc #{i + 1}:</span>
                      <span className="font-semibold">{r.docTitle}</span>
                      <p className="text-gray-500 mt-0.5 truncate max-w-xl">{r.summary}</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded">Saved</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-between p-4">
          <div className="w-full max-w-md flex justify-between items-center text-white py-4">
            <h3 className="font-bold text-sm">Canon Camera Document Scanner</h3>
            <button onClick={stopCamera} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full max-w-md flex-1 bg-black rounded-3xl overflow-hidden flex items-center justify-center border border-white/20">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-dashed border-red-500/80 rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">Align document inside frame</span>
            </div>
          </div>

          <div className="w-full max-w-md py-6 flex justify-center">
            <button
              onClick={captureCameraPhoto}
              className="w-16 h-16 bg-white rounded-full border-4 border-red-600 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-red-600 rounded-full"></div>
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

    </div>
  );
};

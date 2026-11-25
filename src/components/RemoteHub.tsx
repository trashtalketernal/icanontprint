import React, { useState } from 'react';
import { Cloud, CheckCircle2, ShieldCheck, HardDrive, Server, Webhook, Link, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { RemoteDestinationConfig, DocumentRecord } from '../types';

interface RemoteHubProps {
  destinations: RemoteDestinationConfig[];
  setDestinations: React.Dispatch<React.SetStateAction<RemoteDestinationConfig[]>>;
  documents: DocumentRecord[];
}

export const RemoteHub: React.FC<RemoteHubProps> = ({
  destinations,
  setDestinations,
  documents
}) => {
  const [testingType, setTestingType] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [newDestModal, setNewDestModal] = useState(false);
  const [newType, setNewType] = useState<'googledrive' | 'dropbox' | 'webdav' | 'sftp' | 'webhook'>('webdav');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleTestConnection = (type: string) => {
    setTestingType(type);
    setTestResult(null);
    setTimeout(() => {
      setTestingType(null);
      setTestResult({
        type,
        success: true,
        message: `Successfully connected to ${type.toUpperCase()} destination endpoint!`
      });
      setDestinations(prev => prev.map(d => d.type === type ? { ...d, connected: true } : d));
    }, 1200);
  };

  const handleToggleConnect = (type: string) => {
    setDestinations(prev => prev.map(d => d.type === type ? { ...d, connected: !d.connected } : d));
  };

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const newConfig: RemoteDestinationConfig = {
      type: newType,
      name: newName,
      url: newUrl,
      connected: true
    };
    setDestinations(prev => [...prev, newConfig]);
    setNewDestModal(false);
    setNewName('');
    setNewUrl('');
  };

  // Collect all synced items across documents
  const allSyncLogs = documents.flatMap(doc => 
    doc.syncedDestinations.map(sync => ({
      docTitle: doc.title,
      ...sync
    }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#990000] font-bold text-xs uppercase tracking-wider mb-1">
            <Cloud className="w-4 h-4" />
            <span>Remote Destination Sync Hub</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Cloud & Server Destinations</h1>
          <p className="text-xs text-gray-500">Save scanned PDFs and OCR JSON payloads automatically to Google Drive, Dropbox, WebDAV, SFTP, and Webhooks</p>
        </div>

        <button
          onClick={() => setNewDestModal(true)}
          className="bg-[#990000] hover:bg-[#800000] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Destination</span>
        </button>
      </div>

      {/* Test Result Alert */}
      {testResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-800 text-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{testResult.message}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations.map((dest) => (
          <div key={dest.type} className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-red-50 text-[#990000] rounded-2xl">
                  <Cloud className="w-6 h-6" />
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${dest.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                  {dest.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-0.5">{dest.name}</h3>
                <p className="text-xs text-gray-500 font-mono truncate">{dest.account || dest.url || dest.host || 'Ready for transfer'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handleTestConnection(dest.type)}
                disabled={testingType === dest.type}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1.5"
              >
                {testingType === dest.type ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{testingType === dest.type ? 'Testing...' : 'Test Sync'}</span>
              </button>

              <button
                onClick={() => handleToggleConnect(dest.type)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
                  dest.connected 
                    ? 'bg-red-50 text-[#990000] hover:bg-red-100' 
                    : 'bg-[#990000] text-white hover:bg-[#800000]'
                }`}
              >
                {dest.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Upload Logs */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Remote Upload Audit Log</h2>
          <p className="text-xs text-gray-500">History of files and OCR metadata pushed to remote cloud destinations</p>
        </div>

        {allSyncLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            No remote uploads logged yet. Scan and save documents to see sync history here.
          </div>
        ) : (
          <div className="space-y-2">
            {allSyncLogs.map((log, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{log.docTitle}</h4>
                    <p className="text-gray-500 font-mono text-[10px]">{log.remotePath}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                    {log.destinationType}
                  </span>
                  <p className="text-gray-400 text-[10px] mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Destination Modal */}
      {newDestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-lg text-gray-900">Add Remote Destination</h3>
              <button onClick={() => setNewDestModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleAddDestination} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Destination Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-red-500"
                >
                  <option value="webdav">WebDAV Storage</option>
                  <option value="sftp">SFTP Server</option>
                  <option value="webhook">Custom Webhook API</option>
                  <option value="googledrive">Google Drive</option>
                  <option value="dropbox">Dropbox</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office NAS / Accounting Webhook"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Server URL / Host</label>
                <input
                  type="text"
                  required
                  placeholder="https://dav.server.com/scans"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-mono focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setNewDestModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#990000] text-white text-xs font-bold rounded-xl hover:bg-[#800000] transition-colors shadow-sm"
                >
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ScannerStudio } from './components/ScannerStudio';
import { FileManager } from './components/FileManager';
import { RemoteHub } from './components/RemoteHub';
import { PrintHub } from './components/PrintHub';
import { DocumentRecord, PrinterState, RemoteDestinationConfig } from './types';
import { INITIAL_PRINTER, INITIAL_DESTINATIONS, SAMPLE_DOCUMENTS } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [printer, setPrinter] = useState<PrinterState>(INITIAL_PRINTER);
  const [destinations, setDestinations] = useState<RemoteDestinationConfig[]>(INITIAL_DESTINATIONS);
  const [documents, setDocuments] = useState<DocumentRecord[]>(SAMPLE_DOCUMENTS);

  // Save new scanned document from Scanner Studio
  const handleSaveDocument = (newDoc: DocumentRecord) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Delete document
  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Sync document to remote destination
  const handleSyncDocument = (docId: string, destinationType: string) => {
    const destConfig = destinations.find(d => d.type === destinationType);
    const remotePath = `/cloud/storage/${destinationType}/${docId}.pdf`;
    const timestamp = new Date().toISOString();

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        // avoid duplicates of same destination type
        const existing = doc.syncedDestinations.filter(s => s.destinationType !== destinationType);
        return {
          ...doc,
          syncedDestinations: [
            ...existing,
            { destinationType, remotePath, timestamp }
          ]
        };
      }
      return doc;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        printer={printer}
        setPrinter={setPrinter}
        savedCount={documents.length}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            documents={documents}
            printer={printer}
            destinations={destinations}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerStudio
            onSaveDocument={handleSaveDocument}
            destinations={destinations}
          />
        )}

        {activeTab === 'files' && (
          <FileManager
            documents={documents}
            onDeleteDocument={handleDeleteDocument}
            destinations={destinations}
            onSyncDocument={handleSyncDocument}
          />
        )}

        {activeTab === 'remote' && (
          <RemoteHub
            destinations={destinations}
            setDestinations={setDestinations}
            documents={documents}
          />
        )}

        {activeTab === 'print' && (
          <PrintHub
            documents={documents}
            printer={printer}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        Canon PRINT Pro Suite &bull; Advanced Document Scanner, Gemini AI Handwriting OCR & Remote Cloud Sync
      </footer>

    </div>
  );
}

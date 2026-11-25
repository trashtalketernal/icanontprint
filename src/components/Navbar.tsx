import React from 'react';
import { Printer, Wifi, WifiOff, Scan, FileText, Cloud, HardDrive, Cpu, AlertTriangle } from 'lucide-react';
import { PrinterState } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  printer: PrinterState;
  setPrinter: React.Dispatch<React.SetStateAction<PrinterState>>;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  printer,
  setPrinter,
  savedCount
}) => {
  const [showPrinterModal, setShowPrinterModal] = React.useState(false);

  return (
    <header className="bg-[#990000] text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-white text-[#990000] rounded-lg flex items-center justify-center font-black text-xl shadow-inner">
              C
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wide">Canon PRINT</span>
                <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-widest text-red-100">PRO SUITE</span>
              </div>
              <p className="text-xs text-red-200 hidden sm:block">Advanced Scan, OCR & Remote Destination Hub</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Cpu },
              { id: 'scanner', label: 'Scan Studio', icon: Scan },
              { id: 'files', label: `Documents (${savedCount})`, icon: FileText },
              { id: 'remote', label: 'Remote Sync', icon: Cloud },
              { id: 'print', label: 'Print Hub', icon: Printer },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-black/30 text-white shadow-inner'
                      : 'text-red-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Printer Status Widget */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPrinterModal(true)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                printer.connected
                  ? 'bg-emerald-600 text-white shadow hover:bg-emerald-700'
                  : 'bg-amber-600 text-white shadow hover:bg-amber-700'
              }`}
              title="Click to manage printer connection"
            >
              {printer.connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                  <span className="hidden sm:inline">Connected ({printer.ipAddress})</span>
                  <span className="sm:hidden">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-200" />
                  <span className="hidden sm:inline">Printer Offline (Wi-Fi Simulated Off)</span>
                  <span className="sm:hidden">Offline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex items-center justify-around bg-[#7a0000] py-2 px-2 border-t border-red-900">
        {[
          { id: 'dashboard', label: 'Home', icon: Cpu },
          { id: 'scanner', label: 'Scan', icon: Scan },
          { id: 'files', label: `Files (${savedCount})`, icon: FileText },
          { id: 'remote', label: 'Cloud', icon: Cloud },
          { id: 'print', label: 'Print', icon: Printer },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1 px-2 rounded text-xs ${
                isActive ? 'text-white font-bold bg-black/20' : 'text-red-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Printer Settings Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-red-50 text-[#990000] rounded-xl">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Printer & Connection Hub</h3>
                  <p className="text-xs text-gray-500">Standalone mode: No strict Wi-Fi router required</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrinterModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm text-gray-700">{printer.model}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${printer.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {printer.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>IP Address: <span className="font-mono">{printer.ipAddress}</span></p>
                  <p>Status: <span className="font-medium text-gray-800">{printer.status}</span></p>
                </div>
              </div>

              {/* Wi-Fi & Connection Simulator */}
              <div className="flex items-center justify-between bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
                <div className="flex items-center space-x-2.5">
                  <Wifi className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">Wi-Fi Restriction Bypassed</h4>
                    <p className="text-xs text-blue-700">App operates offline; simulates printer link.</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrinter(p => ({ ...p, connected: !p.connected, status: p.connected ? 'Offline' : 'Ready' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    printer.connected
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {printer.connected ? 'Simulate Disconnect' : 'Connect Printer'}
                </button>
              </div>

              {/* Ink Levels */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estimated Ink Levels</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Black', level: printer.inkLevels.black, color: 'bg-gray-900' },
                    { label: 'Cyan', level: printer.inkLevels.cyan, color: 'bg-cyan-500' },
                    { label: 'Magenta', level: printer.inkLevels.magenta, color: 'bg-pink-500' },
                    { label: 'Yellow', level: printer.inkLevels.yellow, color: 'bg-yellow-400' },
                  ].map((ink, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                      <div className="h-16 w-4 bg-gray-200 mx-auto rounded-full relative overflow-hidden flex items-end">
                        <div className={`w-full rounded-full ${ink.color}`} style={{ height: `${ink.level}%` }}></div>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-700 mt-1 block">{ink.label}</span>
                      <span className="text-[10px] text-gray-500">{ink.level}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {!printer.connected && (
                <div className="flex items-start space-x-2 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>Printer is offline. You can still scan, organize pages, run AI OCR, and save files to remote cloud destinations!</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowPrinterModal(false)}
                className="px-4 py-2 bg-[#990000] text-white text-sm font-medium rounded-xl hover:bg-[#800000] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

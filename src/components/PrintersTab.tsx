import React, { useState } from 'react';
import {
  Wifi,
  Printer,
  Plus,
  RefreshCw,
  Check,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { LanguageCode, PrinterDevice } from '../types';
import { t } from '../i18n';

interface DiscoveredPrinter {
  ipAddress: string;
  model: string;
  supportsEscl: boolean;
}

interface PrintersTabProps {
  lang: LanguageCode;
  printers: PrinterDevice[];
  activePrinterId: string | null;
  onSelectPrinter: (id: string) => void;
  onAddPrinter: (printer: { ipAddress: string; model: string; supportsEscl: boolean; connected: boolean }) => void;
  onRemovePrinter: (id: string) => void;
}

export const PrintersTab: React.FC<PrintersTabProps> = ({
  lang,
  printers,
  activePrinterId,
  onSelectPrinter,
  onAddPrinter,
  onRemovePrinter,
}) => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredPrinter[]>([]);
  const [discoveryNotice, setDiscoveryNotice] = useState<string | null>(null);

  const [manualIp, setManualIp] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  const handleSearchLan = async () => {
    setIsDiscovering(true);
    setDiscoveryNotice(null);
    setDiscovered([]);

    try {
      const res = await fetch('/api/printer/discover', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setDiscoveryNotice(data.error || 'Could not scan local network.');
      } else {
        const list: DiscoveredPrinter[] = data.printers || [];
        setDiscovered(list);
        if (list.length === 0) {
          setDiscoveryNotice(
            'No printers responded to automatic LAN discovery. Enter your Canon printer IP below.'
          );
        }
      }
    } catch {
      setDiscoveryNotice('Network discovery failed. Enter your Canon printer IP manually below.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ip = manualIp.trim();
    if (!ip) return;

    setIsProbing(true);
    setProbeError(null);

    try {
      const res = await fetch('/api/printer/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: ip }),
      });
      const data = await res.json();

      if (!res.ok) {
        setProbeError(data.error || 'Failed to check printer IP.');
        return;
      }

      onAddPrinter({
        ipAddress: ip,
        model: manualModel.trim() || data.model || `Canon Printer (${ip})`,
        supportsEscl: Boolean(data.supportsEscl),
        connected: Boolean(data.reachable),
      });

      if (!data.reachable) {
        setProbeError(
          `Saved ${ip}, but it did not respond on LAN right now. Make sure the printer is powered on and on the same Wi-Fi before printing or scanning.`
        );
      }

      setManualIp('');
      setManualModel('');
    } catch {
      setProbeError('Could not reach server to probe IP address.');
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* LAN / Wi-Fi Discovery Card */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              {t(lang, 'findPrintersTitle')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              eSCL · AirPrint · IPP · RAW 9100
            </p>
          </div>
          <button
            type="button"
            onClick={handleSearchLan}
            disabled={isDiscovering}
            className="min-h-[44px] px-4 py-2 bg-[#CC0000] hover:bg-[#B30000] active:scale-[0.98] text-white text-xs font-semibold rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all whitespace-nowrap shrink-0"
          >
            {isDiscovering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>
              {isDiscovering ? t(lang, 'searchingLan') : t(lang, 'searchLanBtn')}
            </span>
          </button>
        </div>

        {discoveryNotice && (
          <p className="text-xs text-neutral-600 bg-[#F4F5F7] rounded-xl p-3 leading-relaxed">
            {discoveryNotice}
          </p>
        )}

        {discovered.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-neutral-500">
              {t(lang, 'discoveredTitle')}
            </p>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {discovered.map((item) => (
                <div
                  key={item.ipAddress}
                  className="p-3 flex items-center justify-between gap-3 bg-white"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {item.model}
                    </p>
                    <p className="text-xs text-neutral-500 font-mono tabular-nums">
                      {item.ipAddress}
                      {item.supportsEscl ? ' · eSCL Scanner' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAddPrinter({
                        ipAddress: item.ipAddress,
                        model: item.model,
                        supportsEscl: item.supportsEscl,
                        connected: true,
                      })
                    }
                    className="min-h-[44px] px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 active:scale-[0.98]"
                  >
                    {t(lang, 'selectPrinterBtn')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Manual IP Add Card */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-neutral-900">
          {t(lang, 'addByIpTitle')}
        </h2>

        <form onSubmit={handleManualAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              inputMode="decimal"
              required
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder={t(lang, 'ipPlaceholder')}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            />
            <input
              type="text"
              value={manualModel}
              onChange={(e) => setManualModel(e.target.value)}
              placeholder={t(lang, 'modelPlaceholder')}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            />
          </div>

          <button
            type="submit"
            disabled={isProbing}
            className="w-full min-h-[44px] bg-neutral-900 hover:bg-black active:scale-[0.99] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          >
            {isProbing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>
              {isProbing ? t(lang, 'probingPrinter') : t(lang, 'addPrinterBtn')}
            </span>
          </button>
        </form>

        {probeError && (
          <div className="flex items-start gap-2.5 text-xs text-red-700 bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{probeError}</p>
          </div>
        )}
      </section>

      {/* Added / Saved Printers List */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">
            {t(lang, 'addedPrintersTitle')}
          </h2>
          <span className="text-xs text-neutral-500 tabular-nums">
            {printers.length}
          </span>
        </div>

        {printers.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Printer className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
              {t(lang, 'noAddedPrinters')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {printers.map((printer) => {
              const isActive = printer.id === activePrinterId;
              return (
                <div
                  key={printer.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectPrinter(printer.id)}
                    className="flex-1 min-w-0 text-left flex items-center gap-3 min-h-[44px]"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#CC0000] text-white'
                          : 'bg-[#F4F5F7] text-neutral-600'
                      }`}
                    >
                      {isActive ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Printer className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {printer.model}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono tabular-nums truncate">
                        {printer.ipAddress} ·{' '}
                        {isActive
                          ? t(lang, 'activeLabel')
                          : printer.connected
                          ? t(lang, 'connected')
                          : t(lang, 'offline')}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemovePrinter(printer.id)}
                    aria-label={t(lang, 'removeBtn')}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

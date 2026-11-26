import React from 'react';
import { X } from 'lucide-react';
import { LanguageCode, PrinterDevice, PrinterSettings } from '../types';
import { t } from '../i18n';

interface PrinterSettingsModalProps {
  lang: LanguageCode;
  printer: PrinterDevice;
  onUpdateSettings: (patch: Partial<PrinterSettings>) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  lang,
  printer,
  onUpdateSettings,
  onDisconnect,
  onClose,
}) => {
  const s = printer.settings;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto pb-safe">
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-neutral-900 truncate">
              {t(lang, 'printerSettingsTitle')}
            </h2>
            <p className="text-xs text-neutral-500 font-mono truncate">
              {printer.model} · {printer.ipAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              {t(lang, 'paperSize')}
            </label>
            <select
              value={s.paperSize}
              onChange={(e) =>
                onUpdateSettings({ paperSize: e.target.value as PrinterSettings['paperSize'] })
              }
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="4x6 Photo">4 x 6 Photo</option>
              <option value="5x7 Photo">5 x 7 Photo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t(lang, 'quality')}
              </label>
              <select
                value={s.quality}
                onChange={(e) =>
                  onUpdateSettings({ quality: e.target.value as PrinterSettings['quality'] })
                }
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
              >
                <option value="Standard">Standard</option>
                <option value="High">High</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t(lang, 'colorMode')}
              </label>
              <select
                value={s.colorMode}
                onChange={(e) =>
                  onUpdateSettings({ colorMode: e.target.value as PrinterSettings['colorMode'] })
                }
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
              >
                <option value="Color">Color</option>
                <option value="Grayscale">Grayscale</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t(lang, 'scanDpiLabel')}
              </label>
              <select
                value={s.scanDpi}
                onChange={(e) =>
                  onUpdateSettings({ scanDpi: Number(e.target.value) as 300 | 600 | 1200 })
                }
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
              >
                <option value={300}>300 DPI</option>
                <option value={600}>600 DPI</option>
                <option value={1200}>1200 DPI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t(lang, 'scanSourceLabel')}
              </label>
              <select
                value={s.scanSource}
                onChange={(e) =>
                  onUpdateSettings({ scanSource: e.target.value as 'Platen' | 'Feeder' })
                }
                className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
              >
                <option value="Platen">Flatbed</option>
                <option value="Feeder">ADF Feeder</option>
              </select>
            </div>
          </div>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
            <span className="text-sm font-medium text-neutral-800">
              {t(lang, 'duplex')}
            </span>
            <input
              type="checkbox"
              checked={s.duplex}
              onChange={(e) => onUpdateSettings({ duplex: e.target.checked })}
              className="w-5 h-5 accent-[#CC0000] rounded"
            />
          </label>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] bg-[#CC0000] text-white text-sm font-semibold rounded-xl"
          >
            {t(lang, 'save')}
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="w-full min-h-[44px] bg-[#F4F5F7] text-neutral-700 text-xs font-semibold rounded-xl"
          >
            {t(lang, 'disconnectPrinter')}
          </button>
        </div>
      </div>
    </div>
  );
};

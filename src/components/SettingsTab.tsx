import React, { useState } from 'react';
import {
  Folder,
  Cloud,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  AppSettings,
  LanguageCode,
  RemoteDestinationConfig,
  RemoteDestinationType,
} from '../types';
import { LANGUAGE_LABELS, t } from '../i18n';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  destinations: RemoteDestinationConfig[];
  onUpdateDestinations: React.Dispatch<React.SetStateAction<RemoteDestinationConfig[]>>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  destinations,
  onUpdateDestinations,
}) => {
  const lang = settings.language;
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [newType, setNewType] = useState<RemoteDestinationType>('webdav');
  const [newName, setNewName] = useState('');
  const [newUrlOrHost, setNewUrlOrHost] = useState('');
  const [newFolderPath, setNewFolderPath] = useState('/CanonScans');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleAddRemote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const item: RemoteDestinationConfig = {
      id: `dest_${Date.now()}`,
      type: newType,
      name: newName.trim(),
      enabled: true,
      folderPath: newFolderPath.trim() || '/CanonScans',
      url: newType === 'webdav' || newType === 'webhook' ? newUrlOrHost.trim() : undefined,
      host: newType === 'sftp' ? newUrlOrHost.trim() : undefined,
      account: newType === 'googledrive' || newType === 'dropbox' ? newUrlOrHost.trim() : undefined,
      username: newUsername.trim() || undefined,
      password: newPassword || undefined,
    };

    onUpdateDestinations((prev) => [...prev, item]);
    onUpdateSettings({ defaultRemoteId: item.id });
    setShowAddRemote(false);
    setNewName('');
    setNewUrlOrHost('');
    setNewUsername('');
    setNewPassword('');
    setStatusMessage({ ok: true, text: `Added "${item.name}" to remote destinations.` });
  };

  const handleToggleDestination = (id: string) => {
    onUpdateDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const handleDeleteDestination = (id: string) => {
    onUpdateDestinations((prev) => prev.filter((d) => d.id !== id));
    if (settings.defaultRemoteId === id) {
      onUpdateSettings({ defaultRemoteId: '' });
    }
  };

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div
          className={`rounded-2xl p-3.5 text-xs flex items-center justify-between gap-3 border ${
            statusMessage.ok
              ? 'bg-white border-emerald-200 text-emerald-800'
              : 'bg-white border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {statusMessage.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="truncate">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Language */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#CC0000]" />
          <h2 className="text-sm font-bold text-neutral-900">
            {t(lang, 'languageSection')}
          </h2>
        </div>

        <select
          value={settings.language}
          onChange={(e) => onUpdateSettings({ language: e.target.value as LanguageCode })}
          className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
        >
          {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
      </section>

      {/* Folders & File Naming */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[#CC0000]" />
          <h2 className="text-sm font-bold text-neutral-900">
            {t(lang, 'foldersSection')}
          </h2>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              {t(lang, 'defaultFolderLabel')}
            </label>
            <input
              type="text"
              value={settings.defaultFolder}
              onChange={(e) => onUpdateSettings({ defaultFolder: e.target.value })}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              {t(lang, 'filePrefixLabel')}
            </label>
            <input
              type="text"
              value={settings.filePrefix}
              onChange={(e) => onUpdateSettings({ filePrefix: e.target.value })}
              className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#CC0000]/30"
            />
          </div>
        </div>
      </section>

      {/* Remote Destinations */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#CC0000]" />
            <h2 className="text-sm font-bold text-neutral-900">
              {t(lang, 'remoteSection')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowAddRemote(true)}
            className="min-h-[44px] px-3.5 py-2 bg-[#F4F5F7] hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t(lang, 'addRemoteBtn')}</span>
          </button>
        </div>

        <label className="flex items-center justify-between gap-3 py-1 min-h-[44px] cursor-pointer">
          <span className="text-sm text-neutral-800">{t(lang, 'autoSyncLabel')}</span>
          <input
            type="checkbox"
            checked={settings.autoSyncRemote}
            onChange={(e) => onUpdateSettings({ autoSyncRemote: e.target.checked })}
            className="w-5 h-5 accent-[#CC0000] rounded"
          />
        </label>

        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
          {destinations.map((dest) => (
            <div key={dest.id} className="p-3 flex items-center justify-between gap-3 bg-white">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {dest.name}
                </p>
                <p className="text-xs text-neutral-500 font-mono truncate">
                  {dest.url || dest.host || dest.account || dest.folderPath}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleDestination(dest.id)}
                  className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    dest.enabled
                      ? 'bg-[#CC0000] text-white'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {dest.enabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDestination(dest.id)}
                  aria-label={t(lang, 'delete')}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scan & OCR Engine Settings */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-neutral-900">
          {t(lang, 'scanOcrSection')}
        </h2>

        <label className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer">
          <span className="text-sm text-neutral-800">{t(lang, 'autoSkipBlankLabel')}</span>
          <input
            type="checkbox"
            checked={settings.autoSkipBlankPages}
            onChange={(e) => onUpdateSettings({ autoSkipBlankPages: e.target.checked })}
            className="w-5 h-5 accent-[#CC0000] rounded"
          />
        </label>

        <div>
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
            <span>{t(lang, 'blankSensitivityLabel')}</span>
            <span className="font-mono tabular-nums">{settings.blankThreshold}%</span>
          </div>
          <input
            type="range"
            min={65}
            max={98}
            value={settings.blankThreshold}
            onChange={(e) => onUpdateSettings({ blankThreshold: Number(e.target.value) })}
            className="w-full accent-[#CC0000]"
          />
        </div>

        <label className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer">
          <span className="text-sm text-neutral-800">{t(lang, 'handwritingBoostLabel')}</span>
          <input
            type="checkbox"
            checked={settings.handwritingOcrBoost}
            onChange={(e) => onUpdateSettings({ handwritingOcrBoost: e.target.checked })}
            className="w-5 h-5 accent-[#CC0000] rounded"
          />
        </label>
      </section>

      {/* Network Policy */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-2">
        <h2 className="text-sm font-bold text-neutral-900">
          {t(lang, 'networkSection')}
        </h2>
        <label className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer">
          <span className="text-xs text-neutral-700 leading-relaxed">
            {t(lang, 'noWifiLockLabel')}
          </span>
          <input
            type="checkbox"
            checked={!settings.requireWifiPrompt}
            onChange={(e) => onUpdateSettings({ requireWifiPrompt: !e.target.checked })}
            className="w-5 h-5 accent-[#CC0000] rounded shrink-0"
          />
        </label>
      </section>

      {/* Add Remote Destination Bottom Sheet */}
      {showAddRemote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">
                {t(lang, 'addRemoteBtn')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRemote(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRemote} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Protocol / Service
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as RemoteDestinationType)}
                  className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-medium"
                >
                  <option value="webdav">WebDAV / Nextcloud / NAS</option>
                  <option value="webhook">Webhook Endpoint (POST)</option>
                  <option value="sftp">SFTP Server</option>
                  <option value="googledrive">Google Drive Folder</option>
                  <option value="dropbox">Dropbox Folder</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Home NAS Scans"
                  className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  {newType === 'webdav' || newType === 'webhook'
                    ? 'Endpoint URL'
                    : newType === 'sftp'
                    ? 'Server Host'
                    : 'Account Email'}
                </label>
                <input
                  type="text"
                  required
                  value={newUrlOrHost}
                  onChange={(e) => setNewUrlOrHost(e.target.value)}
                  placeholder={
                    newType === 'webdav'
                      ? 'https://nas.local/webdav/scans'
                      : newType === 'webhook'
                      ? 'https://example.com/upload-hook'
                      : newType === 'sftp'
                      ? '192.168.1.50'
                      : 'name@example.com'
                  }
                  className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Remote Folder Path
                </label>
                <input
                  type="text"
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm font-mono"
                />
              </div>

              {(newType === 'webdav' || newType === 'sftp') && (
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username (optional)"
                    className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password (optional)"
                    className="w-full min-h-[44px] bg-[#F4F5F7] rounded-xl px-3.5 text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#CC0000] text-white text-sm font-semibold rounded-xl hover:bg-[#B30000] active:scale-[0.99] transition-all"
              >
                {t(lang, 'save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

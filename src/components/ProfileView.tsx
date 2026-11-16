import React, { useState } from 'react';
import {
  Bell,
  Check,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  Database,
  FileSpreadsheet,
  Moon,
  RefreshCw,
  Sun,
  Monitor,
  Trash2,
  User,
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  isValidAppsScriptUrl,
  testAppsScriptConnection,
} from '../services/googleSheetsSync';
import {
  CycleRecord,
  DailyLog,
  SyncStatus,
  ThemeMode,
  UserProfile,
} from '../types/cycle';
import { calculateAge, calculateBMI } from '../utils/cycleCalculator';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileViewProps {
  profile: UserProfile;
  cycles: CycleRecord[];
  logs: Record<string, DailyLog>;
  theme: ThemeMode;
  syncStatus: SyncStatus;
  onSaveProfile: (updated: UserProfile) => void;
  onChangeTheme: (mode: ThemeMode) => void;
  onPushToSheet: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  cycles,
  logs,
  theme,
  syncStatus,
  onSaveProfile,
  onChangeTheme,
  onPushToSheet,
  onPullFromSheet,
  onLoadSampleData,
  onClearAllData,
}) => {
  const [form, setForm] = useState<UserProfile>(profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(!profile.appsScriptUrl);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [testingConn, setTestingConn] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Sync unit display helpers
  const displayWeight =
    form.weightKg === ''
      ? ''
      : form.weightUnit === 'lbs'
        ? Math.round(Number(form.weightKg) * 2.20462 * 10) / 10
        : form.weightKg;

  const displayHeight =
    form.heightCm === ''
      ? ''
      : form.heightUnit === 'ft'
        ? Math.round((Number(form.heightCm) / 30.48) * 100) / 100
        : form.heightCm;

  const handleWeightChange = (val: string) => {
    if (val === '') {
      setForm((p) => ({ ...p, weightKg: '' }));
      return;
    }
    const num = Number(val);
    if (Number.isNaN(num)) return;
    const kg = form.weightUnit === 'lbs' ? Math.round((num / 2.20462) * 10) / 10 : num;
    setForm((p) => ({ ...p, weightKg: kg }));
  };

  const handleHeightChange = (val: string) => {
    if (val === '') {
      setForm((p) => ({ ...p, heightCm: '' }));
      return;
    }
    const num = Number(val);
    if (Number.isNaN(num)) return;
    const cm = form.heightUnit === 'ft' ? Math.round(num * 30.48 * 10) / 10 : num;
    setForm((p) => ({ ...p, heightCm: cm }));
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...form,
      updatedAt: new Date().toISOString(),
    };
    onSaveProfile(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    try {
      const res = await testAppsScriptConnection(form.appsScriptUrl);
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Connected to Google Sheet "${res.sheetName || 'Spreadsheet'}".`,
        });
        onSaveProfile({
          ...form,
          updatedAt: new Date().toISOString(),
        });
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Could not reach Apps Script Web App.',
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Network error while reaching Apps Script URL.',
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (!form.notificationsEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        return;
      }
    }
    const next = {
      ...form,
      notificationsEnabled: !form.notificationsEnabled,
      updatedAt: new Date().toISOString(),
    };
    setForm(next);
    onSaveProfile(next);
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      cycles,
      logs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunacycle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const age = calculateAge(form.birthday);
  const bmi = calculateBMI(form.weightKg, form.heightCm);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50">
          Profile &amp; Google Sheets Database
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
          Personalize your cycle baselines, appearance, offline PWA installation, and Google Apps Script cloud sync.
        </p>
      </div>

      {/* PWA Install Card */}
      <PWAInstallButton variant="card" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Personal Profile Setup */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-center gap-2.5 mb-5">
            <User className="h-5 w-5 text-[#BE3455] dark:text-rose-400" />
            <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
              Personal Profile &amp; Baselines
            </h2>
          </div>

          <form onSubmit={handleSubmitProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Maya Santos"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Birthday
                </label>
                {age !== null && (
                  <span className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                    {age} years old
                  </span>
                )}
              </div>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
              />
            </div>

            {/* Weight & Height */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
                    Weight
                  </label>
                  <div className="inline-flex rounded-lg bg-stone-100 p-0.5 text-[11px] dark:bg-zinc-900">
                    {(['kg', 'lbs'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, weightUnit: unit }))}
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          form.weightUnit === unit
                            ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                            : 'text-stone-500 dark:text-zinc-400'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="450"
                  value={displayWeight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder={form.weightUnit === 'kg' ? 'e.g. 58' : 'e.g. 128'}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
                    Height
                  </label>
                  <div className="inline-flex rounded-lg bg-stone-100 p-0.5 text-[11px] dark:bg-zinc-900">
                    {(['cm', 'ft'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, heightUnit: unit }))}
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          form.heightUnit === unit
                            ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                            : 'text-stone-500 dark:text-zinc-400'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  step={form.heightUnit === 'ft' ? '0.01' : '0.5'}
                  min="1"
                  max="250"
                  value={displayHeight}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  placeholder={form.heightUnit === 'cm' ? 'e.g. 163' : 'e.g. 5.35'}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                />
              </div>
            </div>

            {bmi && (
              <div className="rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs text-stone-700 dark:bg-zinc-900 dark:text-zinc-300 tabular-nums">
                Estimated BMI: <strong className="font-semibold">{bmi.value}</strong> · {bmi.label}
              </div>
            )}

            {/* Regular Cycle Baselines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Regular Cycle Length (Days)
                </label>
                <input
                  type="number"
                  min={20}
                  max={45}
                  value={form.baselineCycleLength}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      baselineCycleLength: Number(e.target.value) || 28,
                    }))
                  }
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Regular Period Duration (Days)
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={form.baselinePeriodLength}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      baselinePeriodLength: Number(e.target.value) || 5,
                    }))
                  }
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#BE3455] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a62a48] dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                {savedNotice ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Profile Saved</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Google Sheet Apps Script Database Setup */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
                  Google Sheet Apps Script Database
                </h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Sync your profile, cycles, and daily logs directly to your own Google Sheet.
                </p>
              </div>
            </div>
          </div>

          {/* Sync Status Summary */}
          <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-stone-800 dark:text-zinc-200">
                <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {!isValidAppsScriptUrl(form.appsScriptUrl)
                    ? 'Local Offline Storage Only'
                    : syncStatus.state === 'syncing'
                      ? 'Syncing with Google Sheet...'
                      : syncStatus.state === 'error'
                        ? 'Sync Needs Attention'
                        : 'Google Sheet Connected'}
                </span>
              </span>
              {syncStatus.pendingCount > 0 && (
                <span className="font-mono-nums text-amber-700 dark:text-amber-400">
                  {syncStatus.pendingCount} pending
                </span>
              )}
            </div>
            {syncStatus.lastSyncedAt && (
              <p className="mt-1 text-stone-500 dark:text-zinc-400 tabular-nums">
                Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
              </p>
            )}
            {syncStatus.errorMessage && (
              <p className="mt-1 text-rose-600 dark:text-rose-400">
                {syncStatus.errorMessage}
              </p>
            )}
          </div>

          {/* Web App URL Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                Apps Script Web App URL
              </label>
              <input
                type="url"
                value={form.appsScriptUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, appsScriptUrl: e.target.value }))
                }
                placeholder="https://script.google.com/macros/s/.../exec"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-mono text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            {testResult && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  testResult.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testingConn || !form.appsScriptUrl.trim()}
                onClick={handleTestConnection}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingConn ? 'animate-spin' : ''}`} />
                <span>Test &amp; Save URL</span>
              </button>

              <button
                type="button"
                disabled={
                  syncStatus.state === 'syncing' ||
                  !isValidAppsScriptUrl(form.appsScriptUrl)
                }
                onClick={() => {
                  onSaveProfile({ ...form, updatedAt: new Date().toISOString() });
                  onPushToSheet();
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Push to Sheet</span>
              </button>

              <button
                type="button"
                disabled={
                  syncStatus.state === 'syncing' ||
                  !isValidAppsScriptUrl(form.appsScriptUrl)
                }
                onClick={() => {
                  onSaveProfile({ ...form, updatedAt: new Date().toISOString() });
                  onPullFromSheet();
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <CloudDownload className="h-3.5 w-3.5" />
                <span>Pull from Sheet</span>
              </button>
            </div>
          </div>

          {/* Setup Guide & Copyable Code.gs */}
          <div className="mt-5 border-t border-stone-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowScriptGuide((v) => !v)}
              className="text-xs font-semibold text-[#BE3455] hover:underline dark:text-rose-400"
            >
              {showScriptGuide
                ? 'Hide Google Apps Script Setup Guide'
                : 'Show Google Apps Script Setup Guide & Code'}
            </button>

            {showScriptGuide && (
              <div className="mt-3 space-y-3">
                <ol className="space-y-1.5 text-xs text-stone-600 dark:text-zinc-400 list-decimal list-inside">
                  <li>Create a new Google Sheet and open <strong>Extensions &rarr; Apps Script</strong>.</li>
                  <li>Copy the script below and paste it into <code>Code.gs</code>, replacing any existing code.</li>
                  <li>Click <strong>Deploy &rarr; New deployment</strong>, choose <strong>Web app</strong>.</li>
                  <li>Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>.</li>
                  <li>Authorize and paste the generated <code>/exec</code> URL above.</li>
                </ol>

                <div className="relative">
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied Code.gs</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Apps Script Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Appearance, Alerts & Local Data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Theme & Alerts */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
            Appearance &amp; Fertile Alerts
          </h2>

          <div className="mt-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
                Theme Mode
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-stone-100 p-1 dark:bg-zinc-900">
                {(
                  [
                    { id: 'light', label: 'Light', Icon: Sun },
                    { id: 'dark', label: 'Dark', Icon: Moon },
                    { id: 'system', label: 'System', Icon: Monitor },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeTheme(id)}
                    className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      theme === id
                        ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-4 dark:border-zinc-800">
              <div className="flex items-start gap-2.5">
                <Bell className="mt-0.5 h-4 w-4 text-[#BE3455] dark:text-rose-400" />
                <div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                    Fertile Window &amp; Period Notifications
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    Notify via browser when entering peak fertility or 2 days before menstruation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.notificationsEnabled}
                onClick={handleNotificationToggle}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  form.notificationsEnabled
                    ? 'bg-[#BE3455] dark:bg-rose-600'
                    : 'bg-stone-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    form.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Local Data Management */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-stone-700 dark:text-zinc-300" />
            <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
              Local Backup &amp; Sample Data
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            All data is stored offline on your device first and synced to Google Sheets whenever connected.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportJSON}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Export JSON Backup
            </button>

            <button
              type="button"
              onClick={onLoadSampleData}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Load Sample 5-Cycle History
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Local Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllData();
                    setConfirmClear(false);
                  }}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Delete All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

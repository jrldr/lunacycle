import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Calendar as CalendarIcon,
  Home,
  Moon,
  Plus,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { CalendarView } from './components/CalendarView';
import { DailyLogModal } from './components/DailyLogModal';
import { InsightsView } from './components/InsightsView';
import { OverviewView } from './components/OverviewView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ProfileView } from './components/ProfileView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTheme } from './hooks/useTheme';
import {
  isValidAppsScriptUrl,
  pullAllFromGoogleSheet,
  pushAllToGoogleSheet,
} from './services/googleSheetsSync';
import {
  createDefaultProfile,
  generateSampleHistory,
  loadLocalState,
  mergeDailyBleedingIntoCycles,
  safeGetStorageItem,
  safeSetStorageItem,
  saveLocalCycles,
  saveLocalLogs,
  saveLocalProfile,
  setHasOnboarded,
  setLastSyncedAt,
  setPendingSyncCount,
} from './services/localStore';
import { CycleRecord, DailyLog, SyncStatus, UserProfile } from './types/cycle';
import {
  addDaysISO,
  calculateForecast,
  formatShortDate,
  getTodayISO,
  normalizeCycles,
} from './utils/cycleCalculator';

type ActiveTab = 'overview' | 'calendar' | 'insights' | 'profile';

export default function App() {
  const initial = useMemo(() => loadLocalState(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [profile, setProfile] = useState<UserProfile>(initial.profile);
  const [cycles, setCycles] = useState<CycleRecord[]>(initial.cycles);
  const [logs, setLogs] = useState<Record<string, DailyLog>>(initial.logs);
  const [hasOnboarded, setOnboardedState] = useState<boolean>(initial.hasOnboarded);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: initial.pendingCount > 0 ? 'offline' : 'idle',
    lastSyncedAt: initial.lastSyncedAt,
    pendingCount: initial.pendingCount,
  });

  // Quick setup inline state (only shown before user logs first cycle or dismisses)
  const [quickName, setQuickName] = useState(initial.profile.name || '');
  const [quickStartDate, setQuickStartDate] = useState(addDaysISO(getTodayISO(), -10));
  const [quickCycleLen, setQuickCycleLen] = useState(initial.profile.baselineCycleLength || 28);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(getTodayISO());
  const [modalTab, setModalTab] = useState<'daily' | 'period'>('daily');
  const [editingCycle, setEditingCycle] = useState<CycleRecord | null>(null);

  const isOnline = useOnlineStatus();
  const { theme, setTheme, toggleQuick } = useTheme();
  const syncTimerRef = useRef<number | null>(null);

  const forecast = useMemo(
    () => calculateForecast(cycles, profile),
    [cycles, profile]
  );

  // Persist local state whenever profile, cycles, or logs change
  useEffect(() => {
    saveLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveLocalCycles(cycles);
  }, [cycles]);

  useEffect(() => {
    saveLocalLogs(logs);
  }, [logs]);

  const executePushSync = useCallback(
    async (
      targetProfile: UserProfile,
      targetCycles: CycleRecord[],
      targetLogs: Record<string, DailyLog>
    ) => {
      if (!isValidAppsScriptUrl(targetProfile.appsScriptUrl)) return;
      if (!navigator.onLine) {
        setSyncStatus((prev) => ({
          ...prev,
          state: 'offline',
        }));
        return;
      }

      setSyncStatus((prev) => ({ ...prev, state: 'syncing', errorMessage: undefined }));
      try {
        const res = await pushAllToGoogleSheet(targetProfile.appsScriptUrl, {
          profile: targetProfile,
          cycles: targetCycles,
          logs: targetLogs,
        });
        if (res.ok) {
          const nowIso = res.syncedAt || new Date().toISOString();
          setPendingSyncCount(0);
          setLastSyncedAt(nowIso);
          setSyncStatus({
            state: 'synced',
            lastSyncedAt: nowIso,
            pendingCount: 0,
          });
        } else {
          setSyncStatus((prev) => ({
            ...prev,
            state: 'error',
            errorMessage: res.error || 'Sync failed',
          }));
        }
      } catch (err) {
        setSyncStatus((prev) => ({
          ...prev,
          state: 'error',
          errorMessage:
            err instanceof Error ? err.message : 'Unable to reach Google Apps Script',
        }));
      }
    },
    []
  );

  const scheduleCloudSync = useCallback(
    (
      nextProfile: UserProfile,
      nextCycles: CycleRecord[],
      nextLogs: Record<string, DailyLog>
    ) => {
      if (!isValidAppsScriptUrl(nextProfile.appsScriptUrl)) return;

      const nextPending = syncStatus.pendingCount + 1;
      setPendingSyncCount(nextPending);
      setSyncStatus((prev) => ({
        ...prev,
        pendingCount: nextPending,
        state: navigator.onLine ? prev.state : 'offline',
      }));

      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }

      if (navigator.onLine) {
        syncTimerRef.current = window.setTimeout(() => {
          executePushSync(nextProfile, nextCycles, nextLogs);
        }, 1200);
      }
    },
    [executePushSync, syncStatus.pendingCount]
  );

  // Auto-flush offline queue when connectivity is restored
  useEffect(() => {
    if (
      isOnline &&
      syncStatus.pendingCount > 0 &&
      isValidAppsScriptUrl(profile.appsScriptUrl)
    ) {
      executePushSync(profile, cycles, logs);
    }
  }, [isOnline, syncStatus.pendingCount, profile, cycles, logs, executePushSync]);

  // Trigger daily fertile window or period notification if user opted in
  useEffect(() => {
    if (!profile.notificationsEnabled || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const today = getTodayISO();
    const lastNotifiedKey = 'lunacycle_last_alert_date';
    if (safeGetStorageItem(lastNotifiedKey) === today) return;

    if (forecast.isPeakFertility) {
      new Notification('LunaCycle · Peak Fertility Day', {
        body: `You are in your peak fertility phase (ovulation est. ${formatShortDate(
          forecast.ovulationDate
        )}).`,
        icon: '/pwa-192x192.png',
      });
      safeSetStorageItem(lastNotifiedKey, today);
    } else if (forecast.isInFertileWindow) {
      new Notification('LunaCycle · Entering Fertile Window', {
        body: `Your fertile window runs ${formatShortDate(
          forecast.fertileWindowStart
        )} – ${formatShortDate(forecast.fertileWindowEnd)}.`,
        icon: '/pwa-192x192.png',
      });
      safeSetStorageItem(lastNotifiedKey, today);
    } else if (forecast.isPeriodSoon) {
      new Notification('LunaCycle · Upcoming Period Reminder', {
        body: `Your next period is expected in ${forecast.daysUntilNextPeriod} day(s) around ${formatShortDate(
          forecast.nextPeriodStart
        )}.`,
        icon: '/pwa-192x192.png',
      });
      safeSetStorageItem(lastNotifiedKey, today);
    }
  }, [profile.notificationsEnabled, forecast]);

  const handleOpenLogModal = (
    dateISO: string,
    tab: 'daily' | 'period' = 'daily',
    cycle: CycleRecord | null = null
  ) => {
    setModalDate(dateISO);
    setModalTab(tab);
    setEditingCycle(cycle);
    setModalOpen(true);
  };

  const handleSaveDailyLog = (log: DailyLog) => {
    const nextLogs = { ...logs, [log.date]: log };
    const hasBleeding = log.flow !== 'none';
    const nextCycles = mergeDailyBleedingIntoCycles(cycles, log.date, hasBleeding);

    setLogs(nextLogs);
    setCycles(nextCycles);
    if (!hasOnboarded) {
      setOnboardedState(true);
      setHasOnboarded(true);
    }
    scheduleCloudSync(profile, nextCycles, nextLogs);
  };

  const handleSaveCycleRecord = (record: CycleRecord) => {
    const exists = cycles.some((c) => c.id === record.id);
    const updatedList = exists
      ? cycles.map((c) => (c.id === record.id ? record : c))
      : [...cycles, record];
    const normalized = normalizeCycles(updatedList);

    setCycles(normalized);
    if (!hasOnboarded) {
      setOnboardedState(true);
      setHasOnboarded(true);
    }
    scheduleCloudSync(profile, normalized, logs);
  };

  const handleDeleteCycleRecord = (cycleId: string) => {
    const nextCycles = normalizeCycles(cycles.filter((c) => c.id !== cycleId));
    setCycles(nextCycles);
    scheduleCloudSync(profile, nextCycles, logs);
  };

  const handleQuickStartPeriodToday = () => {
    const today = getTodayISO();
    const existingLog = logs[today];
    const nextLog: DailyLog = {
      date: today,
      flow: existingLog && existingLog.flow !== 'none' ? existingLog.flow : 'medium',
      symptoms: existingLog?.symptoms || [],
      mood: existingLog?.mood,
      cervicalMucus: existingLog?.cervicalMucus,
      bbtCelsius: existingLog?.bbtCelsius,
      notes: existingLog?.notes || 'Period started',
      updatedAt: new Date().toISOString(),
    };
    handleSaveDailyLog(nextLog);
  };

  const handleSaveProfile = (updated: UserProfile) => {
    setProfile(updated);
    if (!hasOnboarded) {
      setOnboardedState(true);
      setHasOnboarded(true);
    }
    scheduleCloudSync(updated, cycles, logs);
  };

  const handlePullFromSheet = async () => {
    if (!isValidAppsScriptUrl(profile.appsScriptUrl)) return;
    setSyncStatus((prev) => ({ ...prev, state: 'syncing', errorMessage: undefined }));
    try {
      const res = await pullAllFromGoogleSheet(profile.appsScriptUrl);
      if (!res.ok) {
        setSyncStatus((prev) => ({
          ...prev,
          state: 'error',
          errorMessage: res.error || 'Unable to pull from Google Sheet',
        }));
        return;
      }

      if (res.profile) {
        setProfile((prev) => ({
          ...prev,
          ...res.profile,
          appsScriptUrl: prev.appsScriptUrl,
        }));
      }
      if (Array.isArray(res.cycles)) {
        setCycles(normalizeCycles(res.cycles));
      }
      if (res.logs && typeof res.logs === 'object') {
        setLogs(res.logs);
      }

      const nowIso = new Date().toISOString();
      setPendingSyncCount(0);
      setLastSyncedAt(nowIso);
      setOnboardedState(true);
      setHasOnboarded(true);
      setSyncStatus({
        state: 'synced',
        lastSyncedAt: nowIso,
        pendingCount: 0,
      });
    } catch (err) {
      setSyncStatus((prev) => ({
        ...prev,
        state: 'error',
        errorMessage:
          err instanceof Error ? err.message : 'Network error pulling from Google Sheet',
      }));
    }
  };

  const handleLoadSampleData = () => {
    const sample = generateSampleHistory();
    setCycles(sample.cycles);
    setLogs(sample.logs);
    setOnboardedState(true);
    setHasOnboarded(true);
    scheduleCloudSync(profile, sample.cycles, sample.logs);
  };

  const handleClearAllData = () => {
    const freshProfile = createDefaultProfile();
    setProfile(freshProfile);
    setCycles([]);
    setLogs({});
    setPendingSyncCount(0);
    setOnboardedState(false);
    setHasOnboarded(false);
    setSyncStatus({ state: 'idle', pendingCount: 0 });
  };

  const handleQuickSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: UserProfile = {
      ...profile,
      name: quickName.trim(),
      baselineCycleLength: quickCycleLen,
      updatedAt: new Date().toISOString(),
    };
    const firstCycle: CycleRecord = {
      id: `cycle_${quickStartDate}_${Date.now()}`,
      startDate: quickStartDate,
      endDate: addDaysISO(quickStartDate, (updatedProfile.baselinePeriodLength || 5) - 1),
      periodLength: updatedProfile.baselinePeriodLength || 5,
      notes: 'Initial logged cycle',
      updatedAt: new Date().toISOString(),
    };
    const nextCycles = normalizeCycles([...cycles, firstCycle]);
    setProfile(updatedProfile);
    setCycles(nextCycles);
    setOnboardedState(true);
    setHasOnboarded(true);
    scheduleCloudSync(updatedProfile, nextCycles, logs);
  };

  const navItems: Array<{ id: ActiveTab; label: string; Icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', Icon: Home },
    { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
    { id: 'insights', label: 'Insights', Icon: Activity },
    { id: 'profile', label: 'Profile', Icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F7] text-[#1A1618] dark:bg-[#0E0D11] dark:text-[#F4EFF2] pb-20 md:pb-10">
      {/* Top Bar Contract: [Brand title] — [4 nav links] — [1 primary action] */}
      <header className="sticky top-0 z-30 h-12 md:h-16 border-b border-stone-200/90 bg-[#FAF8F7]/90 backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#0E0D11]/90">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="font-display text-lg sm:text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50 whitespace-nowrap shrink-0"
          >
            LunaCycle
          </button>

          {/* Zone 2: Desktop 4-Link Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6"
          >
            {navItems.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'border-[#BE3455] text-stone-900 dark:border-rose-400 dark:text-zinc-50'
                      : 'border-transparent text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenLogModal(getTodayISO(), 'daily')}
              className="inline-flex min-h-[36px] md:min-h-[40px] items-center gap-1.5 rounded-xl bg-[#BE3455] px-3.5 md:px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#a62a48] whitespace-nowrap shrink-0 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Today</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">
        {/* Workspace Utility Toolbar (Theme Toggle, PWA Install, Sync Info) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 pb-3 dark:border-zinc-800/70">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
            <span>
              {isValidAppsScriptUrl(profile.appsScriptUrl)
                ? syncStatus.state === 'syncing'
                  ? 'Syncing with Google Sheets...'
                  : syncStatus.state === 'error'
                    ? 'Google Sheets sync error — saved locally'
                    : 'Synced with Google Sheets'
                : 'Offline-first local storage'}
            </span>
            {syncStatus.pendingCount > 0 && (
              <span className="font-mono-nums text-amber-700 dark:text-amber-400">
                · {syncStatus.pendingCount} queued
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton variant="compact" />
            <button
              type="button"
              onClick={toggleQuick}
              aria-label="Toggle dark mode"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 whitespace-nowrap dark:border-zinc-800 dark:bg-[#17151C] dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Offline Connectivity Banner */}
        <OfflineIndicator pendingCount={syncStatus.pendingCount} />

        {/* First-Run Quick Onboarding Card (Inline, Non-Blocking) */}
        {!hasOnboarded && cycles.length === 0 && activeTab === 'overview' && (
          <section className="rounded-2xl border border-rose-200 bg-white p-5 sm:p-6 dark:border-rose-900/50 dark:bg-[#17151C]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="font-display text-lg sm:text-xl font-semibold text-stone-900 dark:text-zinc-50">
                  Calibrate Your Cycle Forecast in Seconds
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-zinc-400">
                  Enter your most recent period start date to forecast your next menstruation and fertile window, or explore immediately with sample data. You can connect your Google Sheet Apps Script anytime in Profile.
                </p>
              </div>

              <form
                onSubmit={handleQuickSetupSubmit}
                className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-400">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 min-h-[42px] w-full sm:w-36 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-400">
                    Last Period Start
                  </label>
                  <input
                    type="date"
                    required
                    value={quickStartDate}
                    onChange={(e) => setQuickStartDate(e.target.value)}
                    className="mt-1 min-h-[42px] w-full sm:w-40 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 tabular-nums dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-zinc-400">
                    Cycle Days
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={45}
                    value={quickCycleLen}
                    onChange={(e) => setQuickCycleLen(Number(e.target.value) || 28)}
                    className="mt-1 min-h-[42px] w-full sm:w-20 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 tabular-nums dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[42px] rounded-xl bg-[#BE3455] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a62a48] whitespace-nowrap dark:bg-rose-600 dark:hover:bg-rose-500"
                >
                  Start Tracking
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="min-h-[42px] rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 whitespace-nowrap dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Load Sample Data
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Active View */}
        {activeTab === 'overview' && (
          <OverviewView
            profile={profile}
            cycles={cycles}
            logs={logs}
            forecast={forecast}
            onOpenLogModal={handleOpenLogModal}
            onQuickStartPeriodToday={handleQuickStartPeriodToday}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            cycles={cycles}
            logs={logs}
            forecast={forecast}
            onOpenLogModal={(date, tab) => handleOpenLogModal(date, tab)}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView cycles={cycles} logs={logs} forecast={forecast} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            cycles={cycles}
            logs={logs}
            theme={theme}
            syncStatus={syncStatus}
            onSaveProfile={handleSaveProfile}
            onChangeTheme={setTheme}
            onPushToSheet={() => executePushSync(profile, cycles, logs)}
            onPullFromSheet={handlePullFromSheet}
            onLoadSampleData={handleLoadSampleData}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone, <=15% height combined with top bar) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 backdrop-blur-md md:hidden pb-safe dark:border-zinc-800/90 dark:bg-[#17151C]/95"
      >
        <div className="grid h-14 grid-cols-4 items-center">
          {navItems.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-[#BE3455] dark:text-rose-400'
                    : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                <span className="text-[10px] font-semibold tracking-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Daily Log & Period Range Modal / Bottom Sheet */}
      <DailyLogModal
        isOpen={modalOpen}
        initialDate={modalDate}
        existingLog={logs[modalDate]}
        initialTab={modalTab}
        editingCycle={editingCycle}
        onClose={() => {
          setModalOpen(false);
          setEditingCycle(null);
        }}
        onSaveDailyLog={handleSaveDailyLog}
        onSaveCycleRecord={handleSaveCycleRecord}
        onDeleteCycleRecord={handleDeleteCycleRecord}
      />
    </div>
  );
}

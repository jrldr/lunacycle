import React from 'react';
import {
  BellRing,
  Calendar,
  ChevronRight,
  Droplets,
  Edit3,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { CycleForecast, CycleRecord, DailyLog, UserProfile } from '../types/cycle';
import {
  addDaysISO,
  formatShortDate,
  getTodayISO,
  parseISODate,
} from '../utils/cycleCalculator';
import { CycleRing } from './CycleRing';

interface OverviewViewProps {
  profile: UserProfile;
  cycles: CycleRecord[];
  logs: Record<string, DailyLog>;
  forecast: CycleForecast;
  onOpenLogModal: (dateISO: string, tab?: 'daily' | 'period', cycle?: CycleRecord | null) => void;
  onQuickStartPeriodToday: () => void;
  onNavigateTab: (tab: 'overview' | 'calendar' | 'insights' | 'profile') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  cycles,
  logs,
  forecast,
  onOpenLogModal,
  onQuickStartPeriodToday,
  onNavigateTab,
}) => {
  const todayISO = getTodayISO();
  const todayLog = logs[todayISO];

  // Build 7-day horizontal date scroller (3 days prior, today, 3 days ahead)
  const sevenDays = Array.from({ length: 7 }, (_, i) => addDaysISO(todayISO, i - 3));

  const sortedCyclesDesc = [...cycles].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  );

  // Determine contextual alert banner (Fertile Window / Peak Ovulation / Upcoming Period)
  let alertBanner: {
    tone: 'fertile' | 'period' | 'upcoming_fertile';
    title: string;
    message: string;
  } | null = null;

  if (forecast.isPeakFertility) {
    alertBanner = {
      tone: 'fertile',
      title: 'Peak Fertility Window Active',
      message: `Ovulation is forecasted around ${formatShortDate(
        forecast.ovulationDate
      )}. Conception probability is at its monthly peak today.`,
    };
  } else if (forecast.isInFertileWindow) {
    alertBanner = {
      tone: 'fertile',
      title: 'Entering Fertile Window',
      message: `Your fertile phase runs ${formatShortDate(
        forecast.fertileWindowStart
      )} – ${formatShortDate(forecast.fertileWindowEnd)}. Estimated ovulation on ${formatShortDate(
        forecast.ovulationDate
      )}.`,
    };
  } else if (forecast.daysUntilFertileWindow > 0 && forecast.daysUntilFertileWindow <= 3) {
    alertBanner = {
      tone: 'upcoming_fertile',
      title: `Fertile Window Starts in ${forecast.daysUntilFertileWindow} Day${
        forecast.daysUntilFertileWindow === 1 ? '' : 's'
      }`,
      message: `Your most fertile phase opens ${formatShortDate(
        forecast.fertileWindowStart
      )} through ${formatShortDate(forecast.fertileWindowEnd)}.`,
    };
  } else if (forecast.isPeriodSoon) {
    alertBanner = {
      tone: 'period',
      title: `Next Period Expected in ${forecast.daysUntilNextPeriod} Day${
        forecast.daysUntilNextPeriod === 1 ? '' : 's'
      }`,
      message: `Based on your ${forecast.averageCycleLength}-day average cycle, menstruation is forecasted for ${formatShortDate(
        forecast.nextPeriodStart
      )}.`,
    };
  }

  return (
    <div className="space-y-6">
      {/* Greeting & Quick Sync Context */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            {profile.name ? ` · Welcome back, ${profile.name}` : ''}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50 text-balance">
            Cycle Rhythm &amp; Fertility Forecast
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onQuickStartPeriodToday}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-50 whitespace-nowrap dark:border-zinc-800 dark:bg-[#17151C] dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Droplets className="h-4 w-4 text-[#BE3455] dark:text-rose-400" />
            <span>Period Started Today</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenLogModal(todayISO, 'period')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-50 whitespace-nowrap dark:border-zinc-800 dark:bg-[#17151C] dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            <span>Add Past Period</span>
          </button>
        </div>
      </div>

      {/* Fertile / Period Alert Banner */}
      {alertBanner && (
        <div
          role="status"
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 ${
            alertBanner.tone === 'period'
              ? 'border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100'
              : 'border-teal-200 bg-teal-50/80 text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                alertBanner.tone === 'period'
                  ? 'bg-rose-100 text-[#BE3455] dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300'
              }`}
            >
              {alertBanner.tone === 'period' ? (
                <BellRing className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold">{alertBanner.title}</h2>
              <p className="mt-0.5 text-xs opacity-90">{alertBanner.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('calendar')}
            className="inline-flex min-h-[40px] items-center gap-1 self-start sm:self-center text-xs font-semibold underline-offset-4 hover:underline whitespace-nowrap shrink-0"
          >
            <span>View Calendar</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Hero Split: Cycle Wheel + Key Forecast Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Radial Cycle Ring */}
        <section className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Current Cycle Overview
            </h2>
            <span className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
              {forecast.currentCycleStart
                ? `Started ${formatShortDate(forecast.currentCycleStart)}`
                : 'Using baseline cycle'}
            </span>
          </div>

          <CycleRing
            forecast={forecast}
            onLogToday={() => onOpenLogModal(todayISO, 'daily')}
          />

          <p className="mt-5 border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-600 dark:border-zinc-800 dark:text-zinc-400">
            {forecast.phaseDescription}
          </p>
        </section>

        {/* Right: 4-Metric Forecast Grid + 3-Month Horizon */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Next Period */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                Next Menstruation Forecast
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-stone-900 dark:text-zinc-50 tabular-nums">
                {formatShortDate(forecast.nextPeriodStart)}
              </p>
              <p className="mt-1 text-xs text-stone-600 dark:text-zinc-400 tabular-nums">
                Expected window: {formatShortDate(forecast.nextPeriodStart)} –{' '}
                {formatShortDate(forecast.nextPeriodEnd)}
              </p>
            </div>

            {/* Fertility Window */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                  Fertility Window
                </p>
                <span
                  className={`text-xs font-semibold ${
                    forecast.fertilityLevel === 'Peak'
                      ? 'text-teal-700 dark:text-teal-300'
                      : forecast.fertilityLevel === 'High'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-stone-500 dark:text-zinc-400'
                  }`}
                >
                  {forecast.fertilityLevel} Today
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-stone-900 dark:text-zinc-50 tabular-nums">
                {formatShortDate(forecast.fertileWindowStart)} –{' '}
                {formatShortDate(forecast.fertileWindowEnd)}
              </p>
              <p className="mt-1 text-xs text-stone-600 dark:text-zinc-400 tabular-nums">
                Peak ovulation day: {formatShortDate(forecast.ovulationDate)}
              </p>
            </div>

            {/* Average Cycle Days */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                Average Cycle Days
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-50 tabular-nums">
                  {forecast.averageCycleLength} days
                </span>
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                  {forecast.isUsingBaselineFallback
                    ? '· Regular baseline'
                    : `· From ${forecast.completedCyclesCount} cycle${
                        forecast.completedCyclesCount === 1 ? '' : 's'
                      }`}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-zinc-400">
                {forecast.cycleRegularityLabel}
                {forecast.cycleVariationDays > 0
                  ? ` (±${Math.round(forecast.cycleVariationDays / 2)}d variance)`
                  : ''}
              </p>
            </div>

            {/* Average Period Duration */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                Average Period Duration
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-50 tabular-nums">
                  {forecast.averagePeriodLength} days
                </span>
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                  · Typical 2–7d
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-zinc-400">
                {cycles.length} logged period{cycles.length === 1 ? '' : 's'} on record
              </p>
            </div>
          </div>

          {/* Upcoming 3-Cycle Horizon Table */}
          <div className="flex-1 rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                Upcoming 3-Cycle Forecast
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('insights')}
                className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-[#BE3455] hover:underline dark:text-rose-400"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Hormone &amp; Trend Charts</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="py-2 pr-3 font-medium">Cycle</th>
                    <th className="py-2 pr-3 font-medium">Fertile Window</th>
                    <th className="py-2 pr-3 font-medium">Ovulation</th>
                    <th className="py-2 font-medium">Next Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800/80 tabular-nums">
                  {forecast.futurePredictions.map((p) => (
                    <tr key={p.cycleIndex} className="text-stone-800 dark:text-zinc-200">
                      <td className="py-2.5 pr-3 font-medium">
                        {p.cycleIndex === 1 ? 'Upcoming' : `+${p.cycleIndex} Cycles`}
                      </td>
                      <td className="py-2.5 pr-3 text-teal-700 dark:text-teal-300 font-medium">
                        {formatShortDate(p.fertileStart)} – {formatShortDate(p.fertileEnd)}
                      </td>
                      <td className="py-2.5 pr-3">{formatShortDate(p.ovulationDate)}</td>
                      <td className="py-2.5 font-semibold text-[#BE3455] dark:text-rose-400">
                        {formatShortDate(p.periodStart)} – {formatShortDate(p.periodEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal 7-Day Scroller & Today's Symptoms */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            Quick Daily Log
          </h2>
          <button
            type="button"
            onClick={() => onOpenLogModal(todayISO, 'daily')}
            className="text-xs font-semibold text-[#BE3455] hover:underline dark:text-rose-400"
          >
            {todayLog ? 'Edit Today' : 'Log Today'}
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {sevenDays.map((iso) => {
            const d = parseISODate(iso);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
            const dayNum = d.getDate();
            const isToday = iso === todayISO;
            const log = logs[iso];
            const hasFlow = log && log.flow !== 'none';
            const hasSyms = log && (log.symptoms.length > 0 || Boolean(log.mood));

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onOpenLogModal(iso, 'daily')}
                className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl border py-2 transition-colors ${
                  isToday
                    ? 'border-[#BE3455] bg-[#BE3455] text-white dark:border-rose-500 dark:bg-rose-600'
                    : hasFlow
                      ? 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
                      : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    isToday ? 'text-rose-100' : 'text-stone-500 dark:text-zinc-400'
                  }`}
                >
                  {weekday}
                </span>
                <span className="mt-0.5 text-sm font-semibold tabular-nums">{dayNum}</span>
                <span className="mt-1 h-1.5 w-1.5 rounded-full">
                  {(hasFlow || hasSyms) && (
                    <span
                      className={`block h-1.5 w-1.5 rounded-full ${
                        isToday
                          ? 'bg-white'
                          : hasFlow
                            ? 'bg-[#BE3455] dark:bg-rose-400'
                            : 'bg-indigo-500 dark:bg-indigo-400'
                      }`}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Today's summary row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3.5 text-xs dark:border-zinc-800">
          {todayLog ? (
            <div className="text-stone-600 dark:text-zinc-300">
              <span className="font-semibold text-stone-900 dark:text-zinc-100">Today: </span>
              <span>
                Flow: {todayLog.flow}
                {todayLog.symptoms.length > 0
                  ? ` · Symptoms: ${todayLog.symptoms.join(', ')}`
                  : ''}
                {todayLog.mood ? ` · Mood: ${todayLog.mood}` : ''}
              </span>
            </div>
          ) : (
            <span className="text-stone-500 dark:text-zinc-400">
              No symptoms or flow logged for today yet. Tap any day above to record.
            </span>
          )}
        </div>
      </section>

      {/* Logged Cycle History */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Recorded Menstrual Cycles
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Your Average Cycle Days updates automatically as you log more cycles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenLogModal(todayISO, 'period')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-200 whitespace-nowrap dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Log Cycle</span>
          </button>
        </div>

        {sortedCyclesDesc.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center dark:border-zinc-800">
            <p className="text-sm font-medium text-stone-700 dark:text-zinc-300">
              No menstrual cycles logged yet
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              Tap &ldquo;Period Started Today&rdquo; or &ldquo;Add Past Period&rdquo; to calibrate predictions to your own cycle history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-zinc-800">
            {sortedCyclesDesc.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 tabular-nums">
                    {formatShortDate(c.startDate)}
                    {c.endDate ? ` – ${formatShortDate(c.endDate)}` : ' (Ongoing)'}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                    {c.periodLength} day period
                    {c.cycleLength ? ` · ${c.cycleLength} day cycle` : ' · Current cycle'}
                    {c.notes ? ` · ${c.notes}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLogModal(c.startDate, 'period', c)}
                  aria-label={`Edit cycle starting ${c.startDate}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

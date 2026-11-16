import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit3, Sparkles, Droplets } from 'lucide-react';
import { CycleForecast, CycleRecord, DailyLog } from '../types/cycle';
import {
  formatDateISO,
  formatLongDate,
  getDayCalendarStatus,
  getTodayISO,
} from '../utils/cycleCalculator';

interface CalendarViewProps {
  cycles: CycleRecord[];
  logs: Record<string, DailyLog>;
  forecast: CycleForecast;
  onOpenLogModal: (dateISO: string, tab?: 'daily' | 'period') => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  cycles,
  logs,
  forecast,
  onOpenLogModal,
}) => {
  const todayISO = getTodayISO();
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ iso: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ iso: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: formatDateISO(new Date(viewYear, viewMonth, d)),
        dayNum: d,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, dayNum: null });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayISO);
  };

  const selectedStatus = getDayCalendarStatus(selectedDate, cycles, logs, forecast);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50">
            Personalized Cycle Calendar
          </h1>
          <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
            Tap any date to inspect predictions or log period flow, symptoms, and notes.
          </p>
        </div>
        <button
          type="button"
          onClick={jumpToToday}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 self-start sm:self-auto dark:border-zinc-800 dark:bg-[#17151C] dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Jump to Today
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid */}
        <section className="lg:col-span-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-stone-900 dark:text-zinc-50">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Previous month"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-1.5 text-[11px] font-semibold text-stone-500 dark:text-zinc-400"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.iso || cell.dayNum === null) {
                return <div key={`empty_${idx}`} className="min-h-[48px] sm:min-h-[60px]" />;
              }

              const status = getDayCalendarStatus(cell.iso, cycles, logs, forecast);
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === todayISO;

              let cellStyle =
                'border-transparent bg-stone-50/70 text-stone-800 hover:bg-stone-100 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-800';

              if (status.isLoggedPeriod) {
                cellStyle =
                  'border-[#BE3455] bg-[#BE3455] text-white hover:bg-[#a62a48] dark:border-rose-600 dark:bg-rose-600 dark:text-white';
              } else if (status.isPredictedPeriod) {
                cellStyle =
                  'border-dashed border-rose-400 bg-rose-50/70 text-rose-900 hover:bg-rose-100/70 dark:border-rose-600/80 dark:bg-rose-950/30 dark:text-rose-200';
              } else if (status.isOvulation) {
                cellStyle =
                  'border-teal-600 bg-teal-600 text-white hover:bg-teal-700 dark:border-teal-500 dark:bg-teal-600';
              } else if (status.isFertile) {
                cellStyle =
                  'border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100/70 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200';
              }

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso!)}
                  className={`relative flex min-h-[48px] sm:min-h-[60px] flex-col items-center justify-between rounded-xl border p-1.5 transition-all ${cellStyle} ${
                    isSelected
                      ? 'ring-2 ring-stone-900 ring-offset-1 dark:ring-white dark:ring-offset-[#17151C]'
                      : ''
                  }`}
                >
                  <span
                    className={`text-xs sm:text-sm font-semibold tabular-nums ${
                      isToday && !status.isLoggedPeriod && !status.isOvulation
                        ? 'underline decoration-2 underline-offset-2'
                        : ''
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Status indicator row (accessibility paired with shapes/symbols) */}
                  <div className="flex items-center gap-1 h-3">
                    {status.isOvulation && (
                      <span className="text-[10px] leading-none font-bold" title="Ovulation">
                        ★
                      </span>
                    )}
                    {status.hasLog && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          status.isLoggedPeriod || status.isOvulation
                            ? 'bg-white'
                            : 'bg-indigo-600 dark:bg-indigo-400'
                        }`}
                        title="Health notes logged"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explicit Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-stone-100 pt-4 text-xs text-stone-600 dark:border-zinc-800 dark:text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#BE3455]" aria-hidden="true" />
              Logged Period
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-dashed border-rose-500 bg-rose-50 dark:bg-rose-950/40" aria-hidden="true" />
              Predicted Period
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-teal-400 bg-teal-50 dark:bg-teal-950/40" aria-hidden="true" />
              Fertile Window
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-teal-600 text-[9px] text-white" aria-hidden="true">
                ★
              </span>
              Ovulation Peak
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" aria-hidden="true" />
              Symptom / Note
            </span>
          </div>
        </section>

        {/* Selected Date Inspector */}
        <aside className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17151C]">
          <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
            Selected Date
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-stone-900 dark:text-zinc-50">
            {formatLongDate(selectedDate)}
          </h3>

          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4 text-sm dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              {selectedStatus.isLoggedPeriod || selectedStatus.isPredictedPeriod ? (
                <Droplets className="h-4 w-4 shrink-0 text-[#BE3455] dark:text-rose-400" />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              )}
              <span className="font-medium text-stone-800 dark:text-zinc-200">
                {selectedStatus.isLoggedPeriod
                  ? 'Logged Menstrual Day'
                  : selectedStatus.isPredictedPeriod
                    ? 'Forecasted Period Day'
                    : selectedStatus.isOvulation
                      ? 'Estimated Ovulation Peak'
                      : selectedStatus.isPeakFertile
                        ? 'High / Peak Fertility Day'
                        : selectedStatus.isFertile
                          ? 'Fertile Window Day'
                          : 'Standard Cycle Day'}
              </span>
            </div>

            {selectedStatus.log ? (
              <div className="space-y-2 rounded-xl bg-stone-50 p-3.5 text-xs text-stone-700 dark:bg-zinc-900 dark:text-zinc-300">
                <p>
                  <strong className="font-semibold">Flow:</strong> {selectedStatus.log.flow}
                </p>
                {selectedStatus.log.symptoms.length > 0 && (
                  <p>
                    <strong className="font-semibold">Symptoms:</strong>{' '}
                    {selectedStatus.log.symptoms.join(', ')}
                  </p>
                )}
                {selectedStatus.log.mood && (
                  <p>
                    <strong className="font-semibold">Mood:</strong> {selectedStatus.log.mood}
                  </p>
                )}
                {selectedStatus.log.cervicalMucus && (
                  <p>
                    <strong className="font-semibold">Cervical Fluid:</strong>{' '}
                    {selectedStatus.log.cervicalMucus}
                  </p>
                )}
                {typeof selectedStatus.log.bbtCelsius === 'number' && (
                  <p className="tabular-nums">
                    <strong className="font-semibold">Basal Temp:</strong>{' '}
                    {selectedStatus.log.bbtCelsius.toFixed(2)} °C
                  </p>
                )}
                {selectedStatus.log.notes && (
                  <p className="italic text-stone-600 dark:text-zinc-400">
                    &ldquo;{selectedStatus.log.notes}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                No symptoms, flow, or notes logged for this date yet.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onOpenLogModal(selectedDate, 'daily')}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#BE3455] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#a62a48] dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              <Edit3 className="h-4 w-4" />
              <span>{selectedStatus.log ? 'Edit Daily Log' : 'Log Symptoms / Flow'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenLogModal(selectedDate, 'period')}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>Start Period on This Date</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

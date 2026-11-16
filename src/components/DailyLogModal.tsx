import React, { useEffect, useState } from 'react';
import { Calendar, Check, Droplets, Trash2, X } from 'lucide-react';
import {
  CervicalMucusType,
  CycleRecord,
  DailyLog,
  FlowIntensity,
  MoodType,
  SymptomType,
} from '../types/cycle';
import {
  CERVICAL_MUCUS_OPTIONS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  diffDaysISO,
  formatLongDate,
  getTodayISO,
} from '../utils/cycleCalculator';

interface DailyLogModalProps {
  isOpen: boolean;
  initialDate: string;
  existingLog?: DailyLog;
  initialTab?: 'daily' | 'period';
  editingCycle?: CycleRecord | null;
  onClose: () => void;
  onSaveDailyLog: (log: DailyLog) => void;
  onSaveCycleRecord: (cycle: CycleRecord) => void;
  onDeleteCycleRecord?: (cycleId: string) => void;
}

const FLOW_OPTIONS: Array<{ value: FlowIntensity; label: string; desc: string }> = [
  { value: 'none', label: 'None', desc: 'No bleeding' },
  { value: 'spotting', label: 'Spotting', desc: 'Very light' },
  { value: 'light', label: 'Light', desc: 'Minimal flow' },
  { value: 'medium', label: 'Medium', desc: 'Regular flow' },
  { value: 'heavy', label: 'Heavy', desc: 'Strong flow' },
];

export const DailyLogModal: React.FC<DailyLogModalProps> = ({
  isOpen,
  initialDate,
  existingLog,
  initialTab = 'daily',
  editingCycle = null,
  onClose,
  onSaveDailyLog,
  onSaveCycleRecord,
  onDeleteCycleRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'period'>(initialTab);
  const [date, setDate] = useState(initialDate || getTodayISO());
  const [flow, setFlow] = useState<FlowIntensity>('none');
  const [symptoms, setSymptoms] = useState<SymptomType[]>([]);
  const [mood, setMood] = useState<MoodType | undefined>(undefined);
  const [cervicalMucus, setCervicalMucus] = useState<CervicalMucusType | undefined>(undefined);
  const [bbtInput, setBbtInput] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Period range logging state
  const [periodStart, setPeriodStart] = useState(initialDate || getTodayISO());
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodNotes, setPeriodNotes] = useState('');
  const [periodError, setPeriodError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(editingCycle ? 'period' : initialTab);
    setDate(initialDate || getTodayISO());

    if (existingLog) {
      setFlow(existingLog.flow || 'none');
      setSymptoms(existingLog.symptoms || []);
      setMood(existingLog.mood);
      setCervicalMucus(existingLog.cervicalMucus);
      setBbtInput(
        typeof existingLog.bbtCelsius === 'number' ? String(existingLog.bbtCelsius) : ''
      );
      setNotes(existingLog.notes || '');
    } else {
      setFlow('none');
      setSymptoms([]);
      setMood(undefined);
      setCervicalMucus(undefined);
      setBbtInput('');
      setNotes('');
    }

    if (editingCycle) {
      setPeriodStart(editingCycle.startDate);
      setPeriodEnd(editingCycle.endDate || '');
      setPeriodNotes(editingCycle.notes || '');
    } else {
      setPeriodStart(initialDate || getTodayISO());
      setPeriodEnd('');
      setPeriodNotes('');
    }
    setPeriodError('');
  }, [isOpen, initialDate, existingLog, initialTab, editingCycle]);

  if (!isOpen) return null;

  const toggleSymptom = (sym: SymptomType) => {
    setSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleDailySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBbt = bbtInput.trim() ? Number(bbtInput) : undefined;
    onSaveDailyLog({
      date,
      flow,
      symptoms,
      mood,
      cervicalMucus,
      bbtCelsius:
        typeof parsedBbt === 'number' && !Number.isNaN(parsedBbt) && parsedBbt >= 34 && parsedBbt <= 41
          ? Math.round(parsedBbt * 100) / 100
          : undefined,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handlePeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart) {
      setPeriodError('Please select a period start date.');
      return;
    }
    if (periodEnd && periodEnd < periodStart) {
      setPeriodError('End date cannot be earlier than start date.');
      return;
    }
    const computedLen = periodEnd
      ? Math.max(1, diffDaysISO(periodStart, periodEnd) + 1)
      : editingCycle?.periodLength || 5;

    if (computedLen > 21) {
      setPeriodError('Period duration cannot exceed 21 days in a single cycle entry.');
      return;
    }

    onSaveCycleRecord({
      id: editingCycle?.id || `cycle_${periodStart}_${Date.now()}`,
      startDate: periodStart,
      endDate: periodEnd || '',
      periodLength: computedLen,
      notes: periodNotes.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-modal-title"
    >
      <div className="flex max-h-[90vh] w-full sm:max-w-lg flex-col rounded-t-3xl sm:rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#17151C]">
        {/* Mobile grab handle */}
        <div className="pt-3 sm:hidden">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-stone-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="log-modal-title"
              className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-50"
            >
              {editingCycle ? 'Edit Menstrual Cycle' : 'Log Health & Cycle'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              {activeTab === 'daily' ? formatLongDate(date) : 'Record period start and end dates'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        {!editingCycle && (
          <div className="px-5 pt-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'daily'
                    ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Daily Symptoms &amp; Flow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('period')}
                className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'period'
                    ? 'bg-white text-stone-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Period Dates Range
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        {activeTab === 'daily' ? (
          <form onSubmit={handleDailySubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Date Picker */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Log Date
                </label>
                <div className="relative mt-1.5">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                  />
                </div>
              </div>

              {/* Flow Intensity */}
              <div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-[#BE3455] dark:text-rose-400" />
                  <span className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
                    Menstrual Flow
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {FLOW_OPTIONS.map((opt) => {
                    const selected = flow === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFlow(opt.value)}
                        className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition-colors ${
                          selected
                            ? 'border-[#BE3455] bg-rose-50 text-[#BE3455] dark:border-rose-500 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <span className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Symptoms
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SYMPTOM_OPTIONS.map((sym) => {
                    const active = symptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'border-stone-900 bg-stone-900 text-white dark:border-rose-400 dark:bg-rose-500/20 dark:text-rose-200'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        <span>{sym}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mood */}
              <div>
                <span className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Mood
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MOOD_OPTIONS.map((m) => {
                    const active = mood === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(active ? undefined : m)}
                        className={`min-h-[42px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          active
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-200'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cervical Mucus & BBT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                    Cervical Fluid (Fertility)
                  </label>
                  <select
                    value={cervicalMucus || ''}
                    onChange={(e) =>
                      setCervicalMucus(
                        e.target.value ? (e.target.value as CervicalMucusType) : undefined
                      )
                    }
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Not tracked</option>
                    {CERVICAL_MUCUS_OPTIONS.map((cm) => (
                      <option key={cm} value={cm}>
                        {cm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                    Basal Body Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="34"
                    max="41"
                    placeholder="e.g. 36.65"
                    value={bbtInput}
                    onChange={(e) => setBbtInput(e.target.value)}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sleep, stress, medications, or energy observations..."
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="border-t border-stone-200 p-4 pb-safe dark:border-zinc-800">
              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-[#BE3455] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a62a48] active:scale-[0.99] dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                Save Daily Entry
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePeriodSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {periodError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  {periodError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Period Start Date (Cycle Day 1)
                </label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Period End Date (Optional if ongoing)
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  min={periodStart}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 tabular-nums"
                />
                <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                  Logging past periods improves your Average Cycle Days and fertility forecast accuracy.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Cycle Notes
                </label>
                <textarea
                  rows={2}
                  value={periodNotes}
                  onChange={(e) => setPeriodNotes(e.target.value)}
                  placeholder="Optional cycle summary..."
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-900 focus:border-[#BE3455] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-stone-200 p-4 pb-safe dark:border-zinc-800">
              {editingCycle && onDeleteCycleRecord && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCycleRecord(editingCycle.id);
                    onClose();
                  }}
                  className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              )}
              <button
                type="submit"
                className="flex-1 min-h-[48px] rounded-xl bg-[#BE3455] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a62a48] active:scale-[0.99] dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                {editingCycle ? 'Update Period Record' : 'Save Period Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

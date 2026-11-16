import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, Thermometer } from 'lucide-react';
import {
  CycleForecast,
  CyclePhase,
  CycleRecord,
  DailyLog,
  HormonePoint,
} from '../types/cycle';
import {
  diffDaysISO,
  formatShortDate,
  generateHormoneCurve,
  normalizeCycles,
} from '../utils/cycleCalculator';

interface InsightsViewProps {
  cycles: CycleRecord[];
  logs: Record<string, DailyLog>;
  forecast: CycleForecast;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(
      1
    )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  cycles,
  logs,
  forecast,
}) => {
  const hormonePoints = useMemo(
    () =>
      generateHormoneCurve(
        forecast.averageCycleLength,
        forecast.averagePeriodLength
      ),
    [forecast.averageCycleLength, forecast.averagePeriodLength]
  );

  const defaultDay = forecast.currentCycleDay
    ? Math.min(forecast.averageCycleLength, Math.max(1, forecast.currentCycleDay))
    : 1;

  const [inspectedDay, setInspectedDay] = useState<number>(defaultDay);
  const [visibleHormones, setVisibleHormones] = useState({
    estrogen: true,
    progesterone: true,
    lh: true,
    fsh: false,
  });

  const activePoint: HormonePoint =
    hormonePoints.find((p) => p.day === inspectedDay) || hormonePoints[0];

  const normalizedCycles = useMemo(() => normalizeCycles(cycles), [cycles]);

  // Compute symptom frequency and phase correlation from user logs
  const { symptomCounts, phaseSymptomMap, totalLoggedDays, bbtPoints } = useMemo(() => {
    const counts: Record<string, number> = {};
    const phaseMap: Record<CyclePhase, Record<string, number>> = {
      Menstrual: {},
      Follicular: {},
      Fertile: {},
      Luteal: {},
    };
    const bbtList: Array<{ date: string; temp: number }> = [];

    const sortedLogDates = Object.keys(logs).sort();
    sortedLogDates.forEach((date) => {
      const log = logs[date];
      if (!log) return;

      if (typeof log.bbtCelsius === 'number') {
        bbtList.push({ date, temp: log.bbtCelsius });
      }

      // Determine cycle phase for that historical log date
      let phase: CyclePhase = 'Follicular';
      const matchingCycle = [...normalizedCycles]
        .reverse()
        .find((c) => c.startDate <= date);

      if (matchingCycle) {
        const cDay = diffDaysISO(matchingCycle.startDate, date) + 1;
        const cLen = matchingCycle.cycleLength || forecast.averageCycleLength;
        const ovDay = Math.max(matchingCycle.periodLength + 2, cLen - 14);
        if (cDay >= 1 && cDay <= matchingCycle.periodLength) {
          phase = 'Menstrual';
        } else if (cDay >= ovDay - 5 && cDay <= ovDay + 1) {
          phase = 'Fertile';
        } else if (cDay > ovDay + 1) {
          phase = 'Luteal';
        }
      }

      log.symptoms.forEach((sym) => {
        counts[sym] = (counts[sym] || 0) + 1;
        phaseMap[phase][sym] = (phaseMap[phase][sym] || 0) + 1;
      });
    });

    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return {
      symptomCounts: ranked,
      phaseSymptomMap: phaseMap,
      totalLoggedDays: sortedLogDates.length,
      bbtPoints: bbtList.slice(-14),
    };
  }, [logs, normalizedCycles, forecast.averageCycleLength]);

  // SVG dimensions for Hormonal Trends chart
  const chartW = 720;
  const chartH = 240;
  const padL = 36;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const toX = (day: number) =>
    padL + ((day - 1) / Math.max(1, hormonePoints.length - 1)) * plotW;
  const toY = (val: number) => padT + (1 - val / 100) * plotH;

  const estrogenPath = buildSmoothPath(
    hormonePoints.map((p) => ({ x: toX(p.day), y: toY(p.estrogen) }))
  );
  const progesteronePath = buildSmoothPath(
    hormonePoints.map((p) => ({ x: toX(p.day), y: toY(p.progesterone) }))
  );
  const lhPath = buildSmoothPath(
    hormonePoints.map((p) => ({ x: toX(p.day), y: toY(p.lh) }))
  );
  const fshPath = buildSmoothPath(
    hormonePoints.map((p) => ({ x: toX(p.day), y: toY(p.fsh) }))
  );

  // Phase band coordinates
  const fertileDays = hormonePoints.filter((p) => p.phase === 'Fertile');
  const fertileXStart =
    fertileDays.length > 0 ? toX(fertileDays[0].day) : padL;
  const fertileXEnd =
    fertileDays.length > 0 ? toX(fertileDays[fertileDays.length - 1].day) : padL;

  const menstrualDays = hormonePoints.filter((p) => p.phase === 'Menstrual');
  const mensXEnd =
    menstrualDays.length > 0 ? toX(menstrualDays[menstrualDays.length - 1].day) : padL;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50">
          Hormonal Trends &amp; Health Patterns
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
          Estimated endocrine curves calibrated to your {forecast.averageCycleLength}-day cycle average, paired with historical symptom patterns.
        </p>
      </div>

      {/* 1. Hormonal Trends Chart */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-[#BE3455] dark:text-rose-400" />
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                Hormonal Rhythm Across Your Cycle
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                Scrub or tap days 1–{forecast.averageCycleLength} to inspect Estrogen, Progesterone, LH, and FSH trends
              </p>
            </div>
          </div>

          {/* Interactive Hormone Series Toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'estrogen', label: 'Estrogen', color: '#BE3455' },
                { key: 'progesterone', label: 'Progesterone', color: '#D97706' },
                { key: 'lh', label: 'LH Surge', color: '#0D9488' },
                { key: 'fsh', label: 'FSH', color: '#6366F1' },
              ] as const
            ).map((h) => {
              const active = visibleHormones[h.key];
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() =>
                    setVisibleHormones((prev) => ({
                      ...prev,
                      [h.key]: !prev[h.key],
                    }))
                  }
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-stone-300 bg-stone-100 text-stone-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'border-stone-200 bg-white text-stone-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? h.color : '#9ca3af' }}
                  />
                  <span>{h.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label="Hormonal trend curves across menstrual cycle days"
          >
            {/* Phase background bands */}
            <rect
              x={padL}
              y={padT}
              width={Math.max(0, mensXEnd - padL)}
              height={plotH}
              fill="#BE3455"
              opacity={0.07}
            />
            <rect
              x={fertileXStart}
              y={padT}
              width={Math.max(0, fertileXEnd - fertileXStart)}
              height={plotH}
              fill="#0D9488"
              opacity={0.09}
            />

            {/* Y-Axis gridlines */}
            {[25, 50, 75, 100].map((val) => {
              const y = toY(val);
              return (
                <g key={val}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 4"
                    className="text-stone-200 dark:text-zinc-800"
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-stone-400 dark:fill-zinc-500 text-[10px] font-mono-nums"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Curves */}
            {visibleHormones.fsh && (
              <path
                d={fshPath}
                fill="none"
                stroke="#6366F1"
                strokeWidth={2}
                strokeDasharray="5 3"
              />
            )}
            {visibleHormones.lh && (
              <path
                d={lhPath}
                fill="none"
                stroke="#0D9488"
                strokeWidth={2.5}
              />
            )}
            {visibleHormones.progesterone && (
              <path
                d={progesteronePath}
                fill="none"
                stroke="#D97706"
                strokeWidth={2.5}
              />
            )}
            {visibleHormones.estrogen && (
              <path
                d={estrogenPath}
                fill="none"
                stroke="#BE3455"
                strokeWidth={2.75}
              />
            )}

            {/* Inspected Day Vertical Line */}
            <line
              x1={toX(activePoint.day)}
              y1={padT}
              x2={toX(activePoint.day)}
              y2={chartH - padB}
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-stone-800 dark:text-zinc-200"
            />

            {/* Inspected Dots */}
            {visibleHormones.estrogen && (
              <circle
                cx={toX(activePoint.day)}
                cy={toY(activePoint.estrogen)}
                r={4.5}
                fill="#BE3455"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            )}
            {visibleHormones.progesterone && (
              <circle
                cx={toX(activePoint.day)}
                cy={toY(activePoint.progesterone)}
                r={4.5}
                fill="#D97706"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            )}
            {visibleHormones.lh && (
              <circle
                cx={toX(activePoint.day)}
                cy={toY(activePoint.lh)}
                r={4.5}
                fill="#0D9488"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            )}

            {/* X-Axis Day Ticks */}
            {hormonePoints
              .filter(
                (p) =>
                  p.day === 1 ||
                  p.day === hormonePoints.length ||
                  p.day % 5 === 0
              )
              .map((p) => (
                <text
                  key={p.day}
                  x={toX(p.day)}
                  y={chartH - 8}
                  textAnchor="middle"
                  className="fill-stone-500 dark:fill-zinc-400 text-[10px] font-mono-nums"
                >
                  D{p.day}
                </text>
              ))}

            {/* Invisible interactive column hit areas */}
            {hormonePoints.map((p) => {
              const colW = plotW / hormonePoints.length;
              return (
                <rect
                  key={p.day}
                  x={toX(p.day) - colW / 2}
                  y={padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setInspectedDay(p.day)}
                  onClick={() => setInspectedDay(p.day)}
                />
              );
            })}
          </svg>
        </div>

        {/* Touch-friendly Slider Scrubber + Live Readout */}
        <div className="mt-3 space-y-3 border-t border-stone-100 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <label
              htmlFor="hormone-day-slider"
              className="text-xs font-semibold text-stone-700 dark:text-zinc-300 whitespace-nowrap tabular-nums"
            >
              Inspect Day {activePoint.day}
            </label>
            <input
              id="hormone-day-slider"
              type="range"
              min={1}
              max={hormonePoints.length}
              value={activePoint.day}
              onChange={(e) => setInspectedDay(Number(e.target.value))}
              className="w-full accent-[#BE3455]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs tabular-nums">
            <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-stone-500 dark:text-zinc-400">Phase</span>
              <p className="mt-0.5 font-semibold text-stone-900 dark:text-zinc-100">
                {activePoint.phase}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-stone-500 dark:text-zinc-400">Estrogen (E2)</span>
              <p className="mt-0.5 font-semibold text-[#BE3455] dark:text-rose-400">
                {activePoint.estrogen}% rel.
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-stone-500 dark:text-zinc-400">Progesterone</span>
              <p className="mt-0.5 font-semibold text-amber-700 dark:text-amber-400">
                {activePoint.progesterone}% rel.
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-stone-500 dark:text-zinc-400">LH Level</span>
              <p className="mt-0.5 font-semibold text-teal-700 dark:text-teal-400">
                {activePoint.lh}% rel.
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-900">
              <span className="text-stone-500 dark:text-zinc-400">FSH Level</span>
              <p className="mt-0.5 font-semibold text-indigo-700 dark:text-indigo-400">
                {activePoint.fsh}% rel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Cycle Duration History & Symptom Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cycle & Period Length History */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-[#BE3455] dark:text-rose-400" />
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                Cycle &amp; Period Duration History
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                Average cycle: {forecast.averageCycleLength} days · Average flow: {forecast.averagePeriodLength} days
              </p>
            </div>
          </div>

          {normalizedCycles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
              Log at least 2 menstrual cycles to chart your historical cycle lengths.
            </div>
          ) : (
            <div className="space-y-3">
              {normalizedCycles.slice(-6).map((c) => {
                const cycleLen = c.cycleLength || forecast.averageCycleLength;
                const cyclePct = Math.min(100, (cycleLen / 45) * 100);
                const periodPct = Math.min(100, (c.periodLength / 45) * 100);
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="font-medium text-stone-800 dark:text-zinc-200">
                        {formatShortDate(c.startDate)}
                      </span>
                      <span className="text-stone-500 dark:text-zinc-400">
                        {c.periodLength}d bleeding ·{' '}
                        {c.cycleLength ? `${c.cycleLength}d cycle` : 'Ongoing cycle'}
                      </span>
                    </div>
                    <div className="relative h-5 w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-900">
                      {/* Total cycle bar */}
                      <div
                        className="h-full rounded-lg bg-stone-300 dark:bg-zinc-700 transition-all"
                        style={{ width: `${cyclePct}%` }}
                      />
                      {/* Bleeding portion overlay */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-l-lg bg-[#BE3455] dark:bg-rose-600 transition-all"
                        style={{ width: `${periodPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-4 pt-2 text-xs text-stone-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-[#BE3455] dark:bg-rose-600" />
                  Menstrual Days
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-stone-300 dark:bg-zinc-700" />
                  Total Cycle Days
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Monthly Symptom & Phase Patterns */}
        <section className="lg:col-span-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Monthly Symptom &amp; Health Patterns
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
              Across {totalLoggedDays} logged day{totalLoggedDays === 1 ? '' : 's'}
            </p>
          </div>

          {symptomCounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
              Log daily symptoms on the Calendar or Overview tab to uncover recurring monthly patterns.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {symptomCounts.slice(0, 6).map(([sym, count]) => {
                  const maxCount = symptomCounts[0][1];
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={sym} className="space-y-1">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="font-medium text-stone-800 dark:text-zinc-200">
                          {sym}
                        </span>
                        <span className="text-stone-500 dark:text-zinc-400">
                          {count} log{count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-900">
                        <div
                          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase Correlations */}
              <div className="border-t border-stone-100 pt-3.5 dark:border-zinc-800">
                <p className="mb-2 text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  Top Symptoms by Cycle Phase
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {(['Menstrual', 'Follicular', 'Fertile', 'Luteal'] as CyclePhase[]).map(
                    (phase) => {
                      const topInPhase = Object.entries(phaseSymptomMap[phase])
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([s]) => s);
                      return (
                        <div
                          key={phase}
                          className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-900"
                        >
                          <p className="font-semibold text-stone-900 dark:text-zinc-100">
                            {phase}
                          </p>
                          <p className="mt-0.5 text-stone-500 dark:text-zinc-400 truncate">
                            {topInPhase.length > 0 ? topInPhase.join(', ') : 'None logged'}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Optional Basal Body Temperature (BBT) Tracker Card if BBT logs exist */}
      {bbtPoints.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#17151C]">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                Recent Basal Body Temperature (BBT)
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                A sustained 0.2–0.5 °C thermal shift typically follows ovulation.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs tabular-nums">
            {bbtPoints.map((pt) => (
              <div
                key={pt.date}
                className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-stone-500 dark:text-zinc-400">
                  {formatShortDate(pt.date)}
                </span>
                <p className="mt-0.5 font-mono-nums font-semibold text-stone-900 dark:text-zinc-100">
                  {pt.temp.toFixed(2)} °C
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

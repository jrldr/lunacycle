import React from 'react';
import { CycleForecast } from '../types/cycle';

interface CycleRingProps {
  forecast: CycleForecast;
  onLogToday: () => void;
}

export const CycleRing: React.FC<CycleRingProps> = ({ forecast, onLogToday }) => {
  const totalDays = Math.max(21, forecast.averageCycleLength);
  const periodDays = Math.min(totalDays - 10, forecast.averagePeriodLength);
  const lutealDays = 14;
  const ovulationDay = Math.max(periodDays + 3, totalDays - lutealDays);
  const fertileStartDay = Math.max(periodDays + 1, ovulationDay - 5);
  const fertileEndDay = Math.min(totalDays, ovulationDay + 1);

  const currentDay = forecast.currentCycleDay
    ? ((forecast.currentCycleDay - 1) % totalDays) + 1
    : 1;

  const size = 264;
  const center = size / 2;
  const radius = 104;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  const dayToOffset = (day: number) => ((day - 1) / totalDays) * circumference;
  const spanLength = (startDay: number, endDay: number) => {
    const count = Math.max(1, endDay - startDay + 1);
    return (count / totalDays) * circumference;
  };

  // Marker position for current day
  const angleRad = (((currentDay - 0.5) / totalDays) * 360 - 90) * (Math.PI / 180);
  const markerX = center + radius * Math.cos(angleRad);
  const markerY = center + radius * Math.sin(angleRad);

  // Ovulation peak marker
  const ovAngleRad = (((ovulationDay - 0.5) / totalDays) * 360 - 90) * (Math.PI / 180);
  const ovX = center + radius * Math.cos(ovAngleRad);
  const ovY = center + radius * Math.sin(ovAngleRad);

  const phaseAccent =
    forecast.currentPhase === 'Menstrual'
      ? 'text-[#BE3455] dark:text-rose-400'
      : forecast.currentPhase === 'Fertile'
        ? 'text-teal-700 dark:text-teal-400'
        : forecast.currentPhase === 'Luteal'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-indigo-700 dark:text-indigo-400';

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          role="img"
          aria-label={`Cycle wheel showing day ${currentDay} of ${totalDays}, ${forecast.currentPhase} phase`}
        >
          {/* Base cycle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-stone-200/80 dark:text-zinc-800"
          />

          {/* Menstrual phase arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#BE3455"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(4, spanLength(1, periodDays) - 4)} ${circumference}`}
            strokeDashoffset={-dayToOffset(1)}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-300"
          />

          {/* Fertile window arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#0D9488"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(4, spanLength(fertileStartDay, fertileEndDay) - 4)} ${circumference}`}
            strokeDashoffset={-dayToOffset(fertileStartDay)}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-300"
          />

          {/* Ovulation day inner dot */}
          <circle
            cx={ovX}
            cy={ovY}
            r={4.5}
            fill="#FFFFFF"
            stroke="#0F766E"
            strokeWidth={2}
          />

          {/* Current cycle day needle / indicator */}
          <circle
            cx={markerX}
            cy={markerY}
            r={12}
            fill="#FFFFFF"
            stroke="#1A1618"
            strokeWidth={3}
            className="dark:fill-zinc-950 dark:stroke-white"
          />
          <circle
            cx={markerX}
            cy={markerY}
            r={4.5}
            fill="#BE3455"
            className="dark:fill-rose-400"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className={`text-xs font-semibold tracking-wide ${phaseAccent}`}>
            {forecast.currentPhase} Phase
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-4xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50 tabular-nums">
              {forecast.currentCycleDay ? `Day ${forecast.currentCycleDay}` : 'Ready'}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-600 dark:text-zinc-400 tabular-nums">
            {forecast.isPeriodToday
              ? 'Period logged / expected'
              : forecast.daysUntilNextPeriod === 0
                ? 'Period expected today'
                : forecast.daysUntilNextPeriod > 0
                  ? `${forecast.daysUntilNextPeriod} day${forecast.daysUntilNextPeriod === 1 ? '' : 's'} until period`
                  : `${Math.abs(forecast.daysUntilNextPeriod)}d past forecast`}
          </p>
          <button
            type="button"
            onClick={onLogToday}
            className="mt-3 min-h-[40px] rounded-xl bg-[#BE3455] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a62a48] active:scale-[0.98] dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            Log Today
          </button>
        </div>
      </div>

      {/* Compact inline legend (explicit text, no pills) */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-stone-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#BE3455]" aria-hidden="true" />
          Menstrual (D1–{periodDays})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0D9488]" aria-hidden="true" />
          Fertile (D{fertileStartDay}–{fertileEndDay})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-stone-900 bg-white dark:border-white dark:bg-zinc-900" aria-hidden="true" />
          Today
        </span>
      </div>
    </div>
  );
};

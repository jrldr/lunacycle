import {
  CycleForecast,
  CyclePhase,
  CycleRecord,
  DailyLog,
  HormonePoint,
  SymptomType,
  UserProfile,
} from '../types/cycle';

export const SYMPTOM_OPTIONS: SymptomType[] = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Breast Tenderness',
  'Mood Swings',
  'Acne',
  'Backache',
  'Cravings',
  'Nausea',
];

export const MOOD_OPTIONS = [
  'Calm',
  'Happy',
  'Energetic',
  'Sensitive',
  'Anxious',
  'Irritable',
] as const;

export const CERVICAL_MUCUS_OPTIONS = [
  'Dry',
  'Sticky',
  'Creamy',
  'Egg White',
  'Watery',
] as const;

export function getTodayISO(): string {
  const now = new Date();
  return formatDateISO(now);
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

export function diffDaysISO(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISO);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatShortDate(iso: string): string {
  if (!iso) return '—';
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLongDate(iso: string): string {
  if (!iso) return '—';
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calculateAge(birthdayISO: string): number | null {
  if (!birthdayISO) return null;
  const birth = parseISODate(birthdayISO);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age < 120 ? age : null;
}

export function calculateBMI(
  weightKg: number | '',
  heightCm: number | ''
): { value: number; label: string } | null {
  if (typeof weightKg !== 'number' || typeof heightCm !== 'number') return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  const rounded = Math.round(bmi * 10) / 10;
  let label = 'Normal range';
  if (rounded < 18.5) label = 'Underweight';
  else if (rounded >= 25 && rounded < 30) label = 'Overweight';
  else if (rounded >= 30) label = 'Obese';
  return { value: rounded, label };
}

/**
 * Rebuilds/normalizes cycle lengths from consecutive sorted cycle records
 * and ensures periodLength stays accurate.
 */
export function normalizeCycles(cycles: CycleRecord[]): CycleRecord[] {
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return sorted.map((cycle, index) => {
    const periodLen = cycle.endDate
      ? Math.max(1, diffDaysISO(cycle.startDate, cycle.endDate) + 1)
      : cycle.periodLength || 5;
    const nextCycle = sorted[index + 1];
    const computedCycleLength = nextCycle
      ? diffDaysISO(cycle.startDate, nextCycle.startDate)
      : cycle.cycleLength;
    return {
      ...cycle,
      periodLength: periodLen,
      cycleLength:
        computedCycleLength && computedCycleLength >= 15 && computedCycleLength <= 65
          ? computedCycleLength
          : undefined,
    };
  });
}

/**
 * Calculates comprehensive menstrual, fertility, and ovulation predictions
 * combining user's historical average cycle data with regular cycle baselines.
 */
export function calculateForecast(
  rawCycles: CycleRecord[],
  profile: UserProfile,
  todayISO: string = getTodayISO()
): CycleForecast {
  const cycles = normalizeCycles(rawCycles);
  const baselineCycle = Math.min(45, Math.max(20, profile.baselineCycleLength || 28));
  const baselinePeriod = Math.min(10, Math.max(2, profile.baselinePeriodLength || 5));

  const validLengths = cycles
    .map((c) => c.cycleLength)
    .filter((len): len is number => typeof len === 'number' && len >= 18 && len <= 50);

  const averageCycleLength =
    validLengths.length > 0
      ? Math.round(validLengths.reduce((acc, v) => acc + v, 0) / validLengths.length)
      : baselineCycle;

  const validPeriodLengths = cycles
    .map((c) => c.periodLength)
    .filter((len) => len >= 1 && len <= 12);

  const averagePeriodLength =
    validPeriodLengths.length > 0
      ? Math.round(
          validPeriodLengths.reduce((acc, v) => acc + v, 0) / validPeriodLengths.length
        )
      : baselinePeriod;

  let cycleVariationDays = 0;
  let cycleRegularityLabel = 'Establishing baseline';
  if (validLengths.length >= 2) {
    const min = Math.min(...validLengths);
    const max = Math.max(...validLengths);
    cycleVariationDays = max - min;
    if (cycleVariationDays <= 3) cycleRegularityLabel = 'Very regular';
    else if (cycleVariationDays <= 7) cycleRegularityLabel = 'Moderately regular';
    else cycleRegularityLabel = 'Variable rhythm';
  } else if (validLengths.length === 1) {
    cycleRegularityLabel = 'Tracking rhythm';
  }

  const latestCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;
  const anchorStart = latestCycle ? latestCycle.startDate : addDaysISO(todayISO, -10);

  // Determine the predicted next period start relative to today
  let nextPeriodStart = addDaysISO(anchorStart, averageCycleLength);
  while (diffDaysISO(todayISO, nextPeriodStart) < -averagePeriodLength) {
    nextPeriodStart = addDaysISO(nextPeriodStart, averageCycleLength);
  }
  const nextPeriodEnd = addDaysISO(nextPeriodStart, averagePeriodLength - 1);
  const daysUntilNextPeriod = diffDaysISO(todayISO, nextPeriodStart);

  // Luteal phase is consistently ~14 days prior to next menstruation
  const lutealDays = Math.min(16, Math.max(12, Math.round(averageCycleLength * 0.48) > 15 ? 14 : 14));
  const ovulationDate = addDaysISO(nextPeriodStart, -lutealDays);
  const fertileWindowStart = addDaysISO(ovulationDate, -5);
  const fertileWindowEnd = addDaysISO(ovulationDate, 1);
  const peakFertileStart = addDaysISO(ovulationDate, -2);
  const peakFertileEnd = ovulationDate;

  // Also check if today falls inside the current cycle's fertile window (if anchorStart is recent)
  const currentCycleDay = latestCycle
    ? diffDaysISO(latestCycle.startDate, todayISO) + 1
    : null;

  const isWithinPeriodRange =
    latestCycle &&
    todayISO >= latestCycle.startDate &&
    todayISO <= (latestCycle.endDate || addDaysISO(latestCycle.startDate, averagePeriodLength - 1));

  const isInFertileWindow =
    todayISO >= fertileWindowStart && todayISO <= fertileWindowEnd;
  const isPeakFertility =
    todayISO >= peakFertileStart && todayISO <= peakFertileEnd;
  const daysUntilFertileWindow = diffDaysISO(todayISO, fertileWindowStart);
  const isPeriodToday = Boolean(isWithinPeriodRange) || daysUntilNextPeriod === 0;
  const isPeriodSoon = !isPeriodToday && daysUntilNextPeriod > 0 && daysUntilNextPeriod <= 3;

  let currentPhase: CyclePhase = 'Follicular';
  let phaseDescription =
    'Estrogen begins rising gradually as your body prepares a new follicle.';

  if (isPeriodToday || (currentCycleDay !== null && currentCycleDay >= 1 && currentCycleDay <= averagePeriodLength)) {
    currentPhase = 'Menstrual';
    phaseDescription =
      'Progesterone and estrogen are at baseline levels as your uterine lining sheds.';
  } else if (isInFertileWindow) {
    currentPhase = 'Fertile';
    phaseDescription = isPeakFertility
      ? 'LH surge and peak estrogen trigger ovulation. Highest conception probability.'
      : 'Rising estrogen boosts cervical fluid and signals approaching ovulation.';
  } else if (
    (currentCycleDay !== null && currentCycleDay > averageCycleLength - lutealDays + 1) ||
    todayISO > fertileWindowEnd
  ) {
    currentPhase = 'Luteal';
    phaseDescription =
      'Progesterone peaks to support the uterine lining; energy may gradually soften.';
  }

  let fertilityLevel: 'Low' | 'High' | 'Peak' = 'Low';
  if (isPeakFertility) fertilityLevel = 'Peak';
  else if (isInFertileWindow) fertilityLevel = 'High';

  // Generate 3 upcoming forecasted cycles
  const futurePredictions = [0, 1, 2].map((idx) => {
    const pStart = addDaysISO(nextPeriodStart, idx * averageCycleLength);
    const pEnd = addDaysISO(pStart, averagePeriodLength - 1);
    const ov = addDaysISO(pStart, -lutealDays);
    return {
      cycleIndex: idx + 1,
      periodStart: pStart,
      periodEnd: pEnd,
      ovulationDate: ov,
      fertileStart: addDaysISO(ov, -5),
      fertileEnd: addDaysISO(ov, 1),
    };
  });

  return {
    averageCycleLength,
    averagePeriodLength,
    isUsingBaselineFallback: validLengths.length === 0,
    completedCyclesCount: validLengths.length,
    currentCycleStart: latestCycle ? latestCycle.startDate : null,
    currentCycleDay:
      currentCycleDay !== null && currentCycleDay > 0 ? currentCycleDay : null,
    currentPhase,
    phaseDescription,
    nextPeriodStart,
    nextPeriodEnd,
    daysUntilNextPeriod,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    peakFertileStart,
    peakFertileEnd,
    daysUntilFertileWindow,
    isInFertileWindow,
    isPeakFertility,
    isPeriodSoon,
    isPeriodToday,
    fertilityLevel,
    cycleRegularityLabel,
    cycleVariationDays,
    futurePredictions,
  };
}

/**
 * Generates normalized hormonal curves (0-100 scale) tailored to the user's
 * average cycle length and period duration.
 */
export function generateHormoneCurve(
  cycleLength: number,
  periodLength: number
): HormonePoint[] {
  const N = Math.max(21, Math.min(45, cycleLength));
  const ovulationDay = Math.max(periodLength + 3, N - 14);
  const points: HormonePoint[] = [];

  for (let day = 1; day <= N; day++) {
    // Estrogen (E2): primary peak just before ovulation (day ov-1.5), secondary luteal rise
    const ovPeakDist = (day - (ovulationDay - 1)) / 2.6;
    const lutealPeakDist = (day - (ovulationDay + 7)) / 4.2;
    const estrogen = Math.min(
      98,
      Math.max(
        10,
        14 + 78 * Math.exp(-ovPeakDist * ovPeakDist) + 38 * Math.exp(-lutealPeakDist * lutealPeakDist)
      )
    );

    // Progesterone (P4): low through follicular phase, rises sharply post-ovulation peaking at ov+7
    const progDist = (day - (ovulationDay + 7)) / 4.3;
    const progActive = day > ovulationDay - 1 ? 82 * Math.exp(-progDist * progDist) : 4;
    const progesterone = Math.min(95, Math.max(6, 7 + progActive));

    // Luteinizing Hormone (LH): sharp spike at ovulationDay - 0.5
    const lhDist = (day - ovulationDay) / 1.15;
    const lh = Math.min(99, Math.max(8, 10 + 86 * Math.exp(-lhDist * lhDist)));

    // Follicle-Stimulating Hormone (FSH): mild early follicular rise + small ovulation bump
    const fshEarly = 24 * Math.exp(-Math.pow((day - 4) / 3.5, 2));
    const fshOv = 42 * Math.exp(-Math.pow((day - ovulationDay) / 1.35, 2));
    const fsh = Math.min(85, Math.max(12, 16 + fshEarly + fshOv));

    let phase: CyclePhase = 'Follicular';
    if (day <= periodLength) phase = 'Menstrual';
    else if (day >= ovulationDay - 5 && day <= ovulationDay + 1) phase = 'Fertile';
    else if (day > ovulationDay + 1) phase = 'Luteal';

    points.push({
      day,
      estrogen: Math.round(estrogen),
      progesterone: Math.round(progesterone),
      lh: Math.round(lh),
      fsh: Math.round(fsh),
      phase,
    });
  }

  return points;
}

/**
 * Classifies any calendar date relative to historical cycles, daily logs, and forecast.
 */
export function getDayCalendarStatus(
  dateISO: string,
  cycles: CycleRecord[],
  logsMap: Record<string, DailyLog>,
  forecast: CycleForecast
): {
  isLoggedPeriod: boolean;
  isPredictedPeriod: boolean;
  isFertile: boolean;
  isPeakFertile: boolean;
  isOvulation: boolean;
  hasLog: boolean;
  log?: DailyLog;
} {
  const log = logsMap[dateISO];
  const hasBleedingInLog = log && log.flow !== 'none';

  const isInsideCycle = cycles.some((c) => {
    const end = c.endDate || addDaysISO(c.startDate, forecast.averagePeriodLength - 1);
    return dateISO >= c.startDate && dateISO <= end;
  });

  const isLoggedPeriod = Boolean(hasBleedingInLog || isInsideCycle);

  let isPredictedPeriod = false;
  let isFertile = false;
  let isPeakFertile = false;
  let isOvulation = false;

  if (!isLoggedPeriod) {
    for (const pred of forecast.futurePredictions) {
      if (dateISO >= pred.periodStart && dateISO <= pred.periodEnd) {
        isPredictedPeriod = true;
      }
      if (dateISO >= pred.fertileStart && dateISO <= pred.fertileEnd) {
        isFertile = true;
      }
      if (dateISO === pred.ovulationDate) {
        isOvulation = true;
        isPeakFertile = true;
      } else if (
        dateISO >= addDaysISO(pred.ovulationDate, -2) &&
        dateISO <= pred.ovulationDate
      ) {
        isPeakFertile = true;
      }
    }
  }

  const hasLog = Boolean(
    log &&
      (log.flow !== 'none' ||
        log.symptoms.length > 0 ||
        Boolean(log.mood) ||
        Boolean(log.cervicalMucus) ||
        typeof log.bbtCelsius === 'number' ||
        log.notes.trim().length > 0)
  );

  return {
    isLoggedPeriod,
    isPredictedPeriod,
    isFertile,
    isPeakFertile,
    isOvulation,
    hasLog,
    log,
  };
}

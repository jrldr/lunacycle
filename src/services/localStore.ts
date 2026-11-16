import { CycleRecord, DailyLog, UserProfile } from '../types/cycle';
import { addDaysISO, diffDaysISO, getTodayISO, normalizeCycles } from '../utils/cycleCalculator';

const KEYS = {
  PROFILE: 'lunacycle_profile_v1',
  CYCLES: 'lunacycle_cycles_v1',
  LOGS: 'lunacycle_logs_v1',
  PENDING_SYNC: 'lunacycle_pending_sync_v1',
  LAST_SYNCED: 'lunacycle_last_synced_v1',
  ONBOARDED: 'lunacycle_onboarded_v1',
};

const memoryStorage = new Map<string, string>();

export function safeGetStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

export function safeSetStorageItem(key: string, value: string): void {
  memoryStorage.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage access denied (e.g. sandboxed iframe); in-memory fallback retained
  }
}

export function createDefaultProfile(): UserProfile {
  return {
    name: '',
    birthday: '',
    weightKg: '',
    heightCm: '',
    weightUnit: 'kg',
    heightUnit: 'cm',
    baselineCycleLength: 28,
    baselinePeriodLength: 5,
    appsScriptUrl: '',
    notificationsEnabled: false,
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalState(): {
  profile: UserProfile;
  cycles: CycleRecord[];
  logs: Record<string, DailyLog>;
  pendingCount: number;
  lastSyncedAt?: string;
  hasOnboarded: boolean;
} {
  try {
    const rawProfile = safeGetStorageItem(KEYS.PROFILE);
    const rawCycles = safeGetStorageItem(KEYS.CYCLES);
    const rawLogs = safeGetStorageItem(KEYS.LOGS);
    const pendingCount = Number(safeGetStorageItem(KEYS.PENDING_SYNC) || '0');
    const lastSyncedAt = safeGetStorageItem(KEYS.LAST_SYNCED) || undefined;
    const hasOnboarded = safeGetStorageItem(KEYS.ONBOARDED) === 'true';

    const profile: UserProfile = rawProfile
      ? { ...createDefaultProfile(), ...JSON.parse(rawProfile) }
      : createDefaultProfile();

    const cycles: CycleRecord[] = rawCycles ? normalizeCycles(JSON.parse(rawCycles)) : [];
    const logs: Record<string, DailyLog> = rawLogs ? JSON.parse(rawLogs) : {};

    return {
      profile,
      cycles,
      logs,
      pendingCount,
      lastSyncedAt,
      hasOnboarded,
    };
  } catch {
    return {
      profile: createDefaultProfile(),
      cycles: [],
      logs: {},
      pendingCount: 0,
      hasOnboarded: false,
    };
  }
}

export function saveLocalProfile(profile: UserProfile) {
  safeSetStorageItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function saveLocalCycles(cycles: CycleRecord[]) {
  safeSetStorageItem(KEYS.CYCLES, JSON.stringify(normalizeCycles(cycles)));
}

export function saveLocalLogs(logs: Record<string, DailyLog>) {
  safeSetStorageItem(KEYS.LOGS, JSON.stringify(logs));
}

export function setPendingSyncCount(count: number) {
  safeSetStorageItem(KEYS.PENDING_SYNC, String(Math.max(0, count)));
}

export function setLastSyncedAt(iso: string) {
  safeSetStorageItem(KEYS.LAST_SYNCED, iso);
}

export function setHasOnboarded(value: boolean) {
  safeSetStorageItem(KEYS.ONBOARDED, value ? 'true' : 'false');
}

/**
 * Generates realistic multi-cycle sample data relative to today so users
 * can immediately explore historical trends, hormone curves, and forecasting
 * before logging their own cycles.
 */
export function generateSampleHistory(): {
  cycles: CycleRecord[];
  logs: Record<string, DailyLog>;
} {
  const today = getTodayISO();
  const cycleLengths = [29, 28, 30, 27];
  const periodLengths = [5, 5, 4, 5];

  // Anchor most recent cycle start ~11 days ago so user is right near/entering fertile window!
  const latestStart = addDaysISO(today, -11);
  const starts: string[] = [latestStart];
  let cursor = latestStart;
  for (let i = cycleLengths.length - 1; i >= 0; i--) {
    cursor = addDaysISO(cursor, -cycleLengths[i]);
    starts.unshift(cursor);
  }

  const cycles: CycleRecord[] = starts.map((start, idx) => {
    const pLen = periodLengths[idx % periodLengths.length];
    const end = addDaysISO(start, pLen - 1);
    return {
      id: `cycle_${start}`,
      startDate: start,
      endDate: end,
      periodLength: pLen,
      notes: idx === starts.length - 1 ? 'Current cycle' : '',
      updatedAt: new Date().toISOString(),
    };
  });

  const logs: Record<string, DailyLog> = {};
  cycles.forEach((c) => {
    for (let d = 0; d < c.periodLength; d++) {
      const date = addDaysISO(c.startDate, d);
      const flow = d === 0 ? 'medium' : d === 1 ? 'heavy' : d === 2 ? 'medium' : 'light';
      logs[date] = {
        date,
        flow,
        symptoms:
          d === 0
            ? ['Cramps', 'Fatigue']
            : d === 1
            ? ['Cramps', 'Backache', 'Bloating']
            : d === 2
            ? ['Fatigue']
            : [],
        mood: d <= 1 ? 'Sensitive' : 'Calm',
        cervicalMucus: 'Dry',
        notes: d === 0 ? 'Cycle Day 1 started' : '',
        updatedAt: new Date().toISOString(),
      };
    }

    // Add mid-cycle fertile & luteal logs for rich pattern charts
    const ovDay = addDaysISO(c.startDate, 14);
    if (ovDay <= today) {
      logs[ovDay] = {
        date: ovDay,
        flow: 'none',
        symptoms: [],
        mood: 'Energetic',
        cervicalMucus: 'Egg White',
        bbtCelsius: 36.7,
        notes: 'High energy & clear cervical fluid',
        updatedAt: new Date().toISOString(),
      };
    }

    const pmsDay = addDaysISO(c.startDate, 25);
    if (pmsDay <= today) {
      logs[pmsDay] = {
        date: pmsDay,
        flow: 'none',
        symptoms: ['Bloating', 'Breast Tenderness', 'Cravings'],
        mood: 'Sensitive',
        cervicalMucus: 'Sticky',
        bbtCelsius: 36.8,
        notes: 'Pre-period tenderness',
        updatedAt: new Date().toISOString(),
      };
    }
  });

  return {
    cycles: normalizeCycles(cycles),
    logs,
  };
}

/**
 * Merges individual bleeding daily logs into contiguous CycleRecord ranges
 * without overwriting non-overlapping historical cycles.
 */
export function mergeDailyBleedingIntoCycles(
  existingCycles: CycleRecord[],
  dateISO: string,
  hasBleeding: boolean
): CycleRecord[] {
  const sorted = normalizeCycles(existingCycles);

  if (!hasBleeding) {
    // If removing bleeding on a cycle startDate or endDate, adjust or keep clean
    return normalizeCycles(
      sorted.filter((c) => {
        if (c.startDate === dateISO && c.endDate === dateISO) return false;
        return true;
      })
    );
  }

  // Check if date already falls inside an existing cycle
  const alreadyCovered = sorted.some(
    (c) => dateISO >= c.startDate && dateISO <= (c.endDate || c.startDate)
  );
  if (alreadyCovered) return sorted;

  // Check if date extends an existing cycle within 2 days
  const extended = sorted.map((c) => {
    const end = c.endDate || c.startDate;
    const distAfterEnd = diffDaysISO(end, dateISO);
    const distBeforeStart = diffDaysISO(dateISO, c.startDate);
    if (distAfterEnd >= 1 && distAfterEnd <= 2) {
      return {
        ...c,
        endDate: dateISO,
        periodLength: diffDaysISO(c.startDate, dateISO) + 1,
        updatedAt: new Date().toISOString(),
      };
    }
    if (distBeforeStart >= 1 && distBeforeStart <= 2) {
      return {
        ...c,
        startDate: dateISO,
        periodLength: diffDaysISO(dateISO, end) + 1,
        updatedAt: new Date().toISOString(),
      };
    }
    return c;
  });

  const nowCovered = extended.some(
    (c) => dateISO >= c.startDate && dateISO <= (c.endDate || c.startDate)
  );
  if (nowCovered) {
    return normalizeCycles(extended);
  }

  // Otherwise start a new cycle record on dateISO
  const newCycle: CycleRecord = {
    id: `cycle_${dateISO}_${Date.now()}`,
    startDate: dateISO,
    endDate: dateISO,
    periodLength: 1,
    notes: '',
    updatedAt: new Date().toISOString(),
  };

  return normalizeCycles([...extended, newCycle]);
}

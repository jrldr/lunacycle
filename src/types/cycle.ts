export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type SymptomType =
  | 'Cramps'
  | 'Headache'
  | 'Bloating'
  | 'Fatigue'
  | 'Breast Tenderness'
  | 'Mood Swings'
  | 'Acne'
  | 'Backache'
  | 'Cravings'
  | 'Nausea';

export type MoodType =
  | 'Calm'
  | 'Happy'
  | 'Energetic'
  | 'Sensitive'
  | 'Anxious'
  | 'Irritable';

export type CervicalMucusType =
  | 'Dry'
  | 'Sticky'
  | 'Creamy'
  | 'Egg White'
  | 'Watery';

export type CyclePhase = 'Menstrual' | 'Follicular' | 'Fertile' | 'Luteal';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  name: string;
  birthday: string; // YYYY-MM-DD
  weightKg: number | '';
  heightCm: number | '';
  weightUnit: 'kg' | 'lbs';
  heightUnit: 'cm' | 'ft';
  baselineCycleLength: number; // default 28
  baselinePeriodLength: number; // default 5
  appsScriptUrl: string;
  notificationsEnabled: boolean;
  updatedAt: string;
}

export interface CycleRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (inclusive last day of bleeding, or empty if ongoing/estimated)
  cycleLength?: number; // computed from next cycle startDate or manual override
  periodLength: number; // number of bleeding days
  notes?: string;
  updatedAt: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD (unique key)
  flow: FlowIntensity;
  symptoms: SymptomType[];
  mood?: MoodType;
  cervicalMucus?: CervicalMucusType;
  bbtCelsius?: number; // Basal body temperature in °C
  notes: string;
  updatedAt: string;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt?: string;
  errorMessage?: string;
  pendingCount: number;
}

export interface CycleForecast {
  averageCycleLength: number;
  averagePeriodLength: number;
  isUsingBaselineFallback: boolean;
  completedCyclesCount: number;
  currentCycleStart: string | null;
  currentCycleDay: number | null;
  currentPhase: CyclePhase;
  phaseDescription: string;
  nextPeriodStart: string;
  nextPeriodEnd: string;
  daysUntilNextPeriod: number;
  ovulationDate: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  peakFertileStart: string;
  peakFertileEnd: string;
  daysUntilFertileWindow: number;
  isInFertileWindow: boolean;
  isPeakFertility: boolean;
  isPeriodSoon: boolean;
  isPeriodToday: boolean;
  fertilityLevel: 'Low' | 'High' | 'Peak';
  cycleRegularityLabel: string;
  cycleVariationDays: number;
  futurePredictions: Array<{
    cycleIndex: number;
    periodStart: string;
    periodEnd: string;
    ovulationDate: string;
    fertileStart: string;
    fertileEnd: string;
  }>;
}

export interface HormonePoint {
  day: number;
  estrogen: number; // 0-100 normalized
  progesterone: number; // 0-100 normalized
  lh: number; // 0-100 normalized
  fsh: number; // 0-100 normalized
  phase: CyclePhase;
}

import { CycleForecast, CyclePhase, CycleRecord, DailyLog, UserProfile } from '../types/cycle';
import { calculateAge, calculateBMI, formatShortDate } from './cycleCalculator';

export interface HormoneDefinition {
  id: 'estrogen' | 'progesterone' | 'lh' | 'fsh';
  name: string;
  shortName: string;
  color: string;
  roleSummary: string;
  peakTiming: string;
  bodyEffects: string;
}

export const HORMONE_DEFINITIONS: HormoneDefinition[] = [
  {
    id: 'estrogen',
    name: 'Estrogen (Estradiol / E2)',
    shortName: 'Estrogen',
    color: '#BE3455',
    roleSummary:
      'Rebuilds and thickens the uterine lining after menstruation and stimulates clear, fertile cervical fluid ahead of ovulation.',
    peakTiming: 'Peaks just before ovulation (~Day 12–14), with a smaller secondary rise mid-luteal.',
    bodyEffects:
      'Rising estrogen typically boosts mental clarity, skin glow, mood stability, and physical energy.',
  },
  {
    id: 'progesterone',
    name: 'Progesterone (P4)',
    shortName: 'Progesterone',
    color: '#D97706',
    roleSummary:
      'Released after ovulation to stabilize the uterine lining for potential implantation and regulate cycle rhythm.',
    peakTiming: 'Low before ovulation; rises sharply and peaks roughly 7 days after ovulation.',
    bodyEffects:
      'Raises basal body temperature (~0.3–0.5 °C), slows digestion (bloating), causes breast tenderness, and its late-cycle drop triggers PMS and bleeding.',
  },
  {
    id: 'lh',
    name: 'Luteinizing Hormone (LH)',
    shortName: 'LH Surge',
    color: '#0D9488',
    roleSummary:
      'Acts as the biological trigger that releases a mature egg from the ovary (ovulation).',
    peakTiming: 'A sharp 24–36 hour spike right before ovulation day.',
    bodyEffects:
      'Marks peak fertility; some people notice brief one-sided pelvic twinges (mittelschmerz) or heightened libido.',
  },
  {
    id: 'fsh',
    name: 'Follicle-Stimulating Hormone (FSH)',
    shortName: 'FSH',
    color: '#6366F1',
    roleSummary:
      'Signals the ovaries at the start of each cycle to recruit and mature ovarian follicles.',
    peakTiming: 'Mild rise during menstrual/early follicular days and a brief bump alongside the LH surge.',
    bodyEffects:
      'Works behind the scenes to initiate estrogen production and prepare the next ovulation cycle.',
  },
];

export interface CycleStageSymptomGuide {
  id: string;
  title: string;
  dayRangeLabel: string;
  phase: CyclePhase;
  commonSymptoms: string[];
  moodAndEnergy: string;
  whyItHappens: string;
}

export function getCycleStageGuides(
  cycleLength: number,
  periodLength: number
): CycleStageSymptomGuide[] {
  const N = Math.max(21, Math.min(45, cycleLength));
  const pLen = Math.min(N - 10, Math.max(2, periodLength));
  const ovDay = Math.max(pLen + 3, N - 14);
  const fertileStart = Math.max(pLen + 1, ovDay - 5);
  const fertileEnd = Math.min(N - 2, ovDay + 1);
  const lateLutealStart = Math.max(fertileEnd + 4, N - 4);

  return [
    {
      id: 'early-period',
      title: 'Early Menstruation',
      dayRangeLabel: `Days 1–${Math.min(2, pLen)}`,
      phase: 'Menstrual',
      commonSymptoms: ['Cramps', 'Lower backache', 'Fatigue', 'Heavier flow'],
      moodAndEnergy: 'Lower physical stamina; reflective or sensitive mood is common.',
      whyItHappens:
        'Estrogen and progesterone are at their lowest while prostaglandins contract the uterus to shed its lining.',
    },
    {
      id: 'late-period',
      title: 'Late Menstruation & Follicular Start',
      dayRangeLabel: `Days ${Math.min(3, pLen)}–${Math.max(pLen + 2, fertileStart - 1)}`,
      phase: 'Follicular',
      commonSymptoms: ['Lighter flow or spotting', 'Clearing skin', 'Mild headaches fading'],
      moodAndEnergy: 'Energy rebounds; focus, optimism, and motivation noticeably lift.',
      whyItHappens:
        'FSH recruits new follicles and estrogen begins climbing steadily from baseline.',
    },
    {
      id: 'fertile-ovulation',
      title: 'Fertile Window & Ovulation Peak',
      dayRangeLabel: `Days ${fertileStart}–${fertileEnd} (Peak ~Day ${ovDay})`,
      phase: 'Fertile',
      commonSymptoms: [
        'Egg-white / watery cervical fluid',
        'Brief pelvic twinge',
        'Heightened senses',
      ],
      moodAndEnergy: 'Peak sociability, confidence, libido, and verbal/mental sharpness.',
      whyItHappens:
        'Estrogen crests and triggers the sharp LH surge that releases the egg.',
    },
    {
      id: 'early-luteal',
      title: 'Early-to-Mid Luteal Phase',
      dayRangeLabel: `Days ${fertileEnd + 1}–${lateLutealStart - 1}`,
      phase: 'Luteal',
      commonSymptoms: ['Subtle basal temp rise (+0.3 °C)', 'Drier cervical fluid', 'Steady appetite'],
      moodAndEnergy: 'Calm, grounded, and steady; great for routine tasks before PMS begins.',
      whyItHappens:
        'Progesterone rises steadily after ovulation, gently warming body temperature.',
    },
    {
      id: 'late-luteal',
      title: 'Late Luteal / Premenstrual (PMS)',
      dayRangeLabel: `Days ${lateLutealStart}–${N}`,
      phase: 'Luteal',
      commonSymptoms: ['Bloating', 'Breast tenderness', 'Cravings', 'Acne', 'Sleep disruption'],
      moodAndEnergy:
        'Mood swings, irritability, tearfulness, or heightened emotional sensitivity.',
      whyItHappens:
        'Both progesterone and estrogen drop sharply if pregnancy did not occur, affecting serotonin.',
    },
  ];
}

export function getDaySpecificExpectations(
  day: number,
  cycleLength: number,
  periodLength: number
): {
  stageTitle: string;
  typicalSymptoms: string[];
  typicalMood: string;
  hormoneContext: string;
} {
  const N = Math.max(21, Math.min(45, cycleLength));
  const pLen = Math.min(N - 10, Math.max(2, periodLength));
  const ovDay = Math.max(pLen + 3, N - 14);

  if (day <= 2) {
    return {
      stageTitle: `Cycle Day ${day} · Early Menstruation`,
      typicalSymptoms: ['Uterine cramps', 'Lower backache', 'Fatigue', 'Moderate–heavy flow'],
      typicalMood: 'Quiet, low energy, or emotionally sensitive; rest and warmth help.',
      hormoneContext: 'Estrogen & progesterone are at baseline while prostaglandins peak.',
    };
  }
  if (day <= pLen) {
    return {
      stageTitle: `Cycle Day ${day} · Late Menstruation`,
      typicalSymptoms: ['Tapering flow', 'Easing cramps', 'Occasional mild fatigue'],
      typicalMood: 'Mood begins brightening as bleeding lightens and estrogen starts rising.',
      hormoneContext: 'FSH gently rises to prepare the next cycle; estrogen begins recovering.',
    };
  }
  if (day < ovDay - 5) {
    return {
      stageTitle: `Cycle Day ${day} · Follicular Phase`,
      typicalSymptoms: ['Minimal physical discomfort', 'Clearer skin', 'Light/creamy fluid'],
      typicalMood: 'Upbeat, focused, energetic, and resilient to stress.',
      hormoneContext: 'Climbing estrogen supports serotonin, energy, and mental clarity.',
    };
  }
  if (day >= ovDay - 5 && day < ovDay - 1) {
    return {
      stageTitle: `Cycle Day ${day} · Opening Fertile Window`,
      typicalSymptoms: ['Stretchy/clear cervical fluid', 'Mild breast fullness', 'High stamina'],
      typicalMood: 'Outgoing, motivated, and confident.',
      hormoneContext: 'Estrogen climbs rapidly toward its pre-ovulatory peak.',
    };
  }
  if (day >= ovDay - 1 && day <= ovDay + 1) {
    return {
      stageTitle: `Cycle Day ${day} · Ovulation Peak`,
      typicalSymptoms: ['Egg-white cervical fluid', 'Brief one-sided pelvic twinge', 'Peak energy'],
      typicalMood: 'Peak alertness, social drive, and heightened emotional warmth.',
      hormoneContext: 'LH surges sharply alongside peak estrogen to trigger egg release.',
    };
  }
  if (day <= N - 5) {
    return {
      stageTitle: `Cycle Day ${day} · Mid-Luteal Phase`,
      typicalSymptoms: ['Higher basal temp (+0.3 °C)', 'Mild bloating', 'Increased appetite'],
      typicalMood: 'Steady and calm early on, gradually shifting toward nesting or lower stamina.',
      hormoneContext: 'Progesterone peaks mid-luteal while estrogen holds a moderate plateau.',
    };
  }
  return {
    stageTitle: `Cycle Day ${day} · Premenstrual / Late Luteal`,
    typicalSymptoms: ['Bloating', 'Breast tenderness', 'Food cravings', 'Acne', 'Headaches'],
    typicalMood: 'Mood swings, irritability, anxiety, or heightened sensitivity are common.',
    hormoneContext: 'Dropping progesterone and estrogen trigger premenstrual shifts before Day 1.',
  };
}

export interface AIHealthSummary {
  overallSummary: string;
  cycleRegularityAssessment: string;
  symptomAndMoodPatterns: string;
  fertilityOutlook: string;
  actionableTips: string[];
  careNote: string;
  source: 'gemini' | 'offline-local';
  generatedAt: string;
}

export function buildLocalHealthSummary(
  profile: UserProfile,
  cycles: CycleRecord[],
  logs: Record<string, DailyLog>,
  forecast: CycleForecast
): AIHealthSummary {
  const age = calculateAge(profile.birthday);
  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const logEntries = Object.values(logs);

  const symCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};
  logEntries.forEach((l) => {
    l.symptoms.forEach((s) => {
      symCounts[s] = (symCounts[s] || 0) + 1;
    });
    if (l.mood) {
      moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1;
    }
  });

  const topSyms = Object.entries(symCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  const topMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => m);

  const inTypicalRange =
    forecast.averageCycleLength >= 21 && forecast.averageCycleLength <= 35;

  const overallSummary = `Based on ${cycles.length} logged cycle${
    cycles.length === 1 ? '' : 's'
  } and ${logEntries.length} daily check-in${
    logEntries.length === 1 ? '' : 's'
  }, your average cycle runs ${forecast.averageCycleLength} days with an average ${
    forecast.averagePeriodLength
  }-day menstruation window${
    age ? ` (age ${age}` + (bmi ? `, BMI ${bmi.value})` : ')') : ''
  }. You are currently in your ${forecast.currentPhase} phase, with your next period forecasted around ${formatShortDate(
    forecast.nextPeriodStart
  )}.`;

  const cycleRegularityAssessment = inTypicalRange
    ? `Your ${forecast.averageCycleLength}-day cycle average falls squarely within the typical adult 21–35 day range, and your regularity status is "${forecast.cycleRegularityLabel}".`
    : `Your ${forecast.averageCycleLength}-day cycle average sits outside the common 21–35 day window (${forecast.cycleRegularityLabel}). Continue logging Cycle Day 1 dates to confirm whether this is your personal baseline or a temporary shift.`;

  const symptomAndMoodPatterns =
    topSyms.length > 0 || topMoods.length > 0
      ? `Your most frequently logged physical symptoms are ${
          topSyms.length > 0 ? topSyms.join(', ') : 'minimal physical symptoms'
        }${
          topMoods.length > 0
            ? `, alongside ${topMoods.join(' and ')} mood patterns`
            : ''
        }. These align closely with normal prostaglandin activity during menstruation and late-luteal progesterone drops.`
      : 'You have minimal symptoms logged so far. Recording flow intensity, mood, and discomfort for 1–2 full cycles helps highlight how Estrogen and Progesterone shifts affect your energy.';

  const fertilityOutlook = `Your upcoming fertile window spans ${formatShortDate(
    forecast.fertileWindowStart
  )} – ${formatShortDate(forecast.fertileWindowEnd)}, with estimated ovulation peaking around ${formatShortDate(
    forecast.ovulationDate
  )}.`;

  const actionableTips = [
    `Log Cycle Day 1 consistently each month so your ${forecast.averageCycleLength}-day average refines your ovulation and period forecasts automatically.`,
    topSyms.includes('Cramps') || topSyms.includes('Backache')
      ? 'For menstrual cramps and backache, combine gentle heat therapy, magnesium-rich foods, and hydration in Days 1–3.'
      : 'Track cervical fluid and morning mood mid-cycle (around Days 10–16) to pinpoint your LH surge and peak energy days.',
    'Support late-luteal progesterone drops with steady complex carbohydrates, light movement, and consistent sleep during the final 5 days of your cycle.',
  ];

  const careNote =
    'This summary is educational and non-diagnostic. Consult a healthcare provider if cycles repeatedly fall below 21 days or exceed 35 days, bleeding lasts over 7–8 days, or pain interferes with daily life.';

  return {
    overallSummary,
    cycleRegularityAssessment,
    symptomAndMoodPatterns,
    fertilityOutlook,
    actionableTips,
    careNote,
    source: 'offline-local',
    generatedAt: new Date().toISOString(),
  };
}

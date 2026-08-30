/**
 * Phase 13 P0-2: First Launch Onboarding state.
 *
 * Stored in the settings KV table under one key - no schema change.
 * Old users (any existing progress/events before the feature shipped)
 * are auto-marked completed so they never see the flow.
 */
import { db } from "@/data/db";

export const ONBOARDING_KEY = "onboarding-completed";

export interface OnboardingProgress {
  completed: boolean;
  /** Highest finished step (1..3), kept so a refresh mid-flow can resume. */
  step: number;
}

const DEFAULT_PROGRESS: OnboardingProgress = { completed: false, step: 0 };

async function hasExistingLearningData(): Promise<boolean> {
  const [progressCount, eventCount] = await Promise.all([
    db.dayProgress.count(),
    db.learningEvents.count(),
  ]);
  return progressCount > 0 || eventCount > 0;
}

/**
 * Whether the first-launch flow should run. Legacy users (data exists but no
 * flag) are auto-marked and skipped, exactly once.
 */
export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    await db.open();
    const row = await db.settings.get(ONBOARDING_KEY);
    if (row?.value) return false;
    if (await hasExistingLearningData()) {
      await db.settings.put({
        key: ONBOARDING_KEY,
        value: { completed: true, step: 3 } satisfies OnboardingProgress,
      });
      return false;
    }
    return true;
  } catch {
    return false; // never block the app on onboarding logic
  }
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  try {
    const row = await db.settings.get(ONBOARDING_KEY);
    if (!row?.value) return { ...DEFAULT_PROGRESS };
    const value = row.value as Partial<OnboardingProgress>;
    return {
      completed: value.completed === true,
      step: typeof value.step === "number" ? value.step : 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveOnboardingStep(step: number): Promise<void> {
  await db.settings.put({
    key: ONBOARDING_KEY,
    value: { completed: false, step } satisfies OnboardingProgress,
  });
}

export async function completeOnboarding(): Promise<void> {
  await db.settings.put({
    key: ONBOARDING_KEY,
    value: { completed: true, step: 3 } satisfies OnboardingProgress,
  });
}

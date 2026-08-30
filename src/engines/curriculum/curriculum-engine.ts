/**
 * Curriculum Engine - structured learning path from zero English to
 * English-dominant immersion.
 *
 * Contract:
 * - Owns the ordered curriculum: units -> lessons -> exercises, with
 *   phonics-first foundations for absolute beginners.
 * - Chinese scaffold levels fade with measured ability (spec §7).
 * - Must expose enough structure for offline use; AI only enriches it later.
 *
 * PHASE 0: interface only - no implementation, no fake course data.
 */
import type { SkillKey } from "@/core/types";

export interface CurriculumUnit {
  id: string;
  titleZh: string;
  titleEn: string;
  /** Ordered skill focus of the unit. */
  skills: SkillKey[];
  prerequisiteUnitIds: string[];
}

export interface ICurriculumEngine {
  listUnits(): Promise<CurriculumUnit[]>;
  /** Next unit(s) the learner is ready for, given current knowledge state. */
  getNextUnits(): Promise<CurriculumUnit[]>;
  /**
   * Scaffold level recommended right now (auto mode) - drives how much
   * Chinese support the UI shows.
   */
  getRecommendedScaffold(): Promise<
    "chinese-dominant" | "chinese-supported" | "english-with-support" | "english-immersive"
  >;
}

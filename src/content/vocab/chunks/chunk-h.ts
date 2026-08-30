/**
 * Vocabulary chunk H (Phase 10) - loaded via dynamic import.
 * Contains: culture, society, work & language skills expansion (g115-g150).
 */
import { economicsTradeRows } from "@/content/vocab/groups/g115-economics-trade";
import { mediaJournalismRows } from "@/content/vocab/groups/g116-media-journalism";
import { literatureBooksRows } from "@/content/vocab/groups/g117-literature-books";
import { musicPerformanceRows } from "@/content/vocab/groups/g119-music-performance";
import { philosophyIdeasRows } from "@/content/vocab/groups/g121-philosophy-religion";
import { psychologyMindRows } from "@/content/vocab/groups/g123-psychology-mind";
import { academicResearchRows } from "@/content/vocab/groups/g124-academic-research";
import { businessStrategyRows } from "@/content/vocab/groups/g126-business-strategy";
import { marketingSalesRows } from "@/content/vocab/groups/g127-marketing-startup";
import { industryLogisticsRows } from "@/content/vocab/groups/g128-industry-logistics";
import { cityInfrastructureRows } from "@/content/vocab/groups/g130-city-infrastructure";
import { foodCuisineRows } from "@/content/vocab/groups/g131-food-cuisine";
import { sportsAdventureRows } from "@/content/vocab/groups/g132-sports-adventure";
import { fashionBeautyRows } from "@/content/vocab/groups/g134-fashion-beauty";
import { emotionsCharacterRows } from "@/content/vocab/groups/g135-emotions-character";
import { languageDiscourseRows } from "@/content/vocab/groups/g136-language-discourse";
import { travelAbroadRows } from "@/content/vocab/groups/g137-travel-abroad";
import { modernLifeRows } from "@/content/vocab/groups/g138-modern-life";
import { idiomsExpressionsRows } from "@/content/vocab/groups/g140-idioms-expressions";
import { techDigitalRows } from "@/content/vocab/groups/g141-tech-digital";
import { descriptivePrecisionRows } from "@/content/vocab/groups/g142-descriptive-precision";
import { verbsNuanceRows } from "@/content/vocab/groups/g144-verbs-nuance";
import { essentialsMixedRows } from "@/content/vocab/groups/g146-essentials-mixed";
import { hobbiesCraftsRows } from "@/content/vocab/groups/g148-hobbies-crafts";
import { socialSituationsRows } from "@/content/vocab/groups/g150-social-situations";
import type { VocabRow } from "@/content/vocab/types";

export const ROWS: readonly VocabRow[] = [
  ...economicsTradeRows,
  ...mediaJournalismRows,
  ...literatureBooksRows,
  ...musicPerformanceRows,
  ...philosophyIdeasRows,
  ...psychologyMindRows,
  ...academicResearchRows,
  ...businessStrategyRows,
  ...marketingSalesRows,
  ...industryLogisticsRows,
  ...cityInfrastructureRows,
  ...foodCuisineRows,
  ...sportsAdventureRows,
  ...fashionBeautyRows,
  ...emotionsCharacterRows,
  ...languageDiscourseRows,
  ...travelAbroadRows,
  ...modernLifeRows,
  ...idiomsExpressionsRows,
  ...techDigitalRows,
  ...descriptivePrecisionRows,
  ...verbsNuanceRows,
  ...essentialsMixedRows,
  ...hobbiesCraftsRows,
  ...socialSituationsRows,
];

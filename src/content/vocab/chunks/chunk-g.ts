/**
 * Vocabulary chunk G (Phase 10) - loaded via dynamic import.
 * Contains: science, nature, world knowledge & civics expansion (g100-g114).
 */
import { scienceLabRows } from "@/content/vocab/groups/g100-science-lab";
import { astronomySpaceRows } from "@/content/vocab/groups/g101-astronomy-space";
import { geographyTerrainRows } from "@/content/vocab/groups/g103-geography-terrain";
import { environmentClimateRows } from "@/content/vocab/groups/g104-environment-climate";
import { physicsEnergyRows } from "@/content/vocab/groups/g106-physics-energy";
import { chemistryMaterialsRows } from "@/content/vocab/groups/g107-chemistry-materials";
import { biologyGeneticsRows } from "@/content/vocab/groups/g108-biology-genetics";
import { mathConceptRows } from "@/content/vocab/groups/g109-math-concepts";
import { medicineTreatmentRows } from "@/content/vocab/groups/g110-medicine-treatment";
import { oceanMarineRows } from "@/content/vocab/groups/g111-ocean-marine";
import { historyCivilizationRows } from "@/content/vocab/groups/g112-history-civilizations";
import { governmentPoliticsRows } from "@/content/vocab/groups/g113-government-politics";
import { lawCrimeRows } from "@/content/vocab/groups/g114-law-crime";
import type { VocabRow } from "@/content/vocab/types";

export const ROWS: readonly VocabRow[] = [
  ...scienceLabRows,
  ...astronomySpaceRows,
  ...geographyTerrainRows,
  ...environmentClimateRows,
  ...physicsEnergyRows,
  ...chemistryMaterialsRows,
  ...biologyGeneticsRows,
  ...mathConceptRows,
  ...medicineTreatmentRows,
  ...oceanMarineRows,
  ...historyCivilizationRows,
  ...governmentPoliticsRows,
  ...lawCrimeRows,
];

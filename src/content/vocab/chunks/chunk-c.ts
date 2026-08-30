/**
 * Vocabulary chunk C (Phase 5) - loaded via dynamic import.
 * Contains: g25-g45.
 */
import { communicationRows } from "@/content/vocab/groups/g25-communication";
import { sportsHobbiesRows } from "@/content/vocab/groups/g26-sports-hobbies";
import { musicArtMediaRows } from "@/content/vocab/groups/g27-music-art-media";
import { timeAdverbsRows } from "@/content/vocab/groups/g28-time-adverbs";
import { prepositionsPlaceRows } from "@/content/vocab/groups/g29-prepositions-place";
import { kitchenCookingRows } from "@/content/vocab/groups/g30-kitchen-cooking";
import { eventsCelebrationsRows } from "@/content/vocab/groups/g31-events-celebrations";
import { opinionQualityRows } from "@/content/vocab/groups/g32-opinion-quality";
import { modalsAuxRows } from "@/content/vocab/groups/g33-modals-aux";
import { houseDetailRows } from "@/content/vocab/groups/g34-house-detail";
import { eatingOutRows } from "@/content/vocab/groups/g35-eating-out";
import { indefinitePronounRows } from "@/content/vocab/groups/g36-indefinite-pronouns";
import { routineHouseworkRows } from "@/content/vocab/groups/g37-routine-housework";
import { measureQualityRows } from "@/content/vocab/groups/g38-measure-quality";
import { placeGenericRows } from "@/content/vocab/groups/g39-place-generic";
import { verbsGeneral3Rows } from "@/content/vocab/groups/g40-verbs-general3";
import { feelingsStatesRows } from "@/content/vocab/groups/g41-feelings-states";
import { miscCommonRows } from "@/content/vocab/groups/g42-misc-common";
import { verbsSocial3Rows } from "@/content/vocab/groups/g43-verbs-social3";
import { bodyParts2Rows } from "@/content/vocab/groups/g44-body-parts2";
import { toolsObjectsRows } from "@/content/vocab/groups/g45-tools-objects";
import type { VocabRow } from "@/content/vocab/types";

export const ROWS: readonly VocabRow[] = [
  ...communicationRows,
  ...sportsHobbiesRows,
  ...musicArtMediaRows,
  ...timeAdverbsRows,
  ...prepositionsPlaceRows,
  ...kitchenCookingRows,
  ...eventsCelebrationsRows,
  ...opinionQualityRows,
  ...modalsAuxRows,
  ...houseDetailRows,
  ...eatingOutRows,
  ...indefinitePronounRows,
  ...routineHouseworkRows,
  ...measureQualityRows,
  ...placeGenericRows,
  ...verbsGeneral3Rows,
  ...feelingsStatesRows,
  ...miscCommonRows,
  ...verbsSocial3Rows,
  ...bodyParts2Rows,
  ...toolsObjectsRows,
];

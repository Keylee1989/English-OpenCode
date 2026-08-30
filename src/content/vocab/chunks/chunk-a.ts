/**
 * Vocabulary chunk A (Phase 5) - loaded via dynamic import.
 * Contains: original named groups + g01-g09.
 */
import { pronounsFunctionRows } from "@/content/vocab/groups/pronouns-function";
import { verbsCoreRows } from "@/content/vocab/groups/verbs-core";
import { numbersTimeRows } from "@/content/vocab/groups/numbers-time";
import { peopleJobsRows } from "@/content/vocab/groups/people-jobs";
import { foodDrinkRows } from "@/content/vocab/groups/food-drink";
import { homeObjectsRows } from "@/content/vocab/groups/home-objects";
import { adjectivesRows } from "@/content/vocab/groups/adjectives";
import { placesTravelRows } from "@/content/vocab/groups/places-travel";
import { bodyHealthRows } from "@/content/vocab/groups/body-health";
import { natureWeatherRows } from "@/content/vocab/groups/nature-weather";
import { verbsDaily2Rows } from "@/content/vocab/groups/g01-verbs-daily2";
import { verbsMindComm2Rows } from "@/content/vocab/groups/g02-verbs-mind-comm2";
import { adjectivesFeelRows } from "@/content/vocab/groups/g03-adjectives-feel";
import { adjectivesDesc2Rows } from "@/content/vocab/groups/g04-adjectives-desc2";
import { peopleRelations2Rows } from "@/content/vocab/groups/g05-people-relations2";
import { jobs2Rows } from "@/content/vocab/groups/g06-jobs2";
import { foodDrink2Rows } from "@/content/vocab/groups/g07-food-drink2";
import { fruitsVeg2Rows } from "@/content/vocab/groups/g08-fruits-veg2";
import { drinksCafeRows } from "@/content/vocab/groups/g09-drinks-cafe";
import type { VocabRow } from "@/content/vocab/types";

export const ROWS: readonly VocabRow[] = [
  ...pronounsFunctionRows,
  ...verbsCoreRows,
  ...numbersTimeRows,
  ...peopleJobsRows,
  ...foodDrinkRows,
  ...homeObjectsRows,
  ...adjectivesRows,
  ...placesTravelRows,
  ...bodyHealthRows,
  ...natureWeatherRows,
  ...verbsDaily2Rows,
  ...verbsMindComm2Rows,
  ...adjectivesFeelRows,
  ...adjectivesDesc2Rows,
  ...peopleRelations2Rows,
  ...jobs2Rows,
  ...foodDrink2Rows,
  ...fruitsVeg2Rows,
  ...drinksCafeRows,
];

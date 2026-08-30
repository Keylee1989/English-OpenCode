/**
 * Vocabulary chunk B (Phase 5) - loaded via dynamic import.
 * Contains: g10-g24.
 */
import { homeObjects2Rows } from "@/content/vocab/groups/g10-home-objects2";
import { schoolStudyRows } from "@/content/vocab/groups/g11-school-study";
import { clothesRows } from "@/content/vocab/groups/g12-clothes";
import { colorsShapes2Rows } from "@/content/vocab/groups/g13-colors-shapes2";
import { transportTravel2Rows } from "@/content/vocab/groups/g14-transport-travel2";
import { cityDirectionsRows } from "@/content/vocab/groups/g15-city-directions";
import { natureWeather2Rows } from "@/content/vocab/groups/g16-nature-weather2";
import { animals2Rows } from "@/content/vocab/groups/g17-animals2";
import { bodyActionsHealth2Rows } from "@/content/vocab/groups/g18-body-actions-health2";
import { abstractNouns1Rows } from "@/content/vocab/groups/g19-abstract-nouns1";
import { emotionsIdeasRows } from "@/content/vocab/groups/g20-emotions-ideas";
import { societyLawRows } from "@/content/vocab/groups/g21-society-law";
import { moneyShoppingRows } from "@/content/vocab/groups/g22-money-shopping";
import { workOffice2Rows } from "@/content/vocab/groups/g23-work-office2";
import { techInternetRows } from "@/content/vocab/groups/g24-tech-internet";
import type { VocabRow } from "@/content/vocab/types";

export const ROWS: readonly VocabRow[] = [
  ...homeObjects2Rows,
  ...schoolStudyRows,
  ...clothesRows,
  ...colorsShapes2Rows,
  ...transportTravel2Rows,
  ...cityDirectionsRows,
  ...natureWeather2Rows,
  ...animals2Rows,
  ...bodyActionsHealth2Rows,
  ...abstractNouns1Rows,
  ...emotionsIdeasRows,
  ...societyLawRows,
  ...moneyShoppingRows,
  ...workOffice2Rows,
  ...techInternetRows,
];

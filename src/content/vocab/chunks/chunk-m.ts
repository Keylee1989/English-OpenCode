import type { C2VocabRow } from "@/content/vocab/c2-types";
import { workplaceRows } from "@/content/vocab/groups/g175-workplace-communication";
import { leadershipRows } from "@/content/vocab/groups/g176-leadership";
import { negotiationRows } from "@/content/vocab/groups/g177-negotiation";
import { managementRows } from "@/content/vocab/groups/g178-management";
import { entrepreneurshipRows } from "@/content/vocab/groups/g179-entrepreneurship";
import { financeRows } from "@/content/vocab/groups/g180-finance";

/** Phase 16-A chunk M — professional English expansion. */
export const C2_ROWS_M: readonly C2VocabRow[] = [
  ...workplaceRows,
  ...leadershipRows,
  ...negotiationRows,
  ...managementRows,
  ...entrepreneurshipRows,
  ...financeRows,
];

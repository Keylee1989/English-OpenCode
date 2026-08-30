import type { C2VocabRow } from "@/content/vocab/c2-types";
import { academicWritingAdvancedRows } from "@/content/vocab/groups/g215-academic-writing-advanced";
import { businessCommunicationRows } from "@/content/vocab/groups/g216-business-communication";
import { scienceResearchRows } from "@/content/vocab/groups/g217-science-research";
import { technologyDigitalRows } from "@/content/vocab/groups/g218-technology-digital";

/** Phase 18 · chunk Q — Academic Writing, Business Communication, Science Research, Technology. */
export const C2_ROWS_Q: readonly C2VocabRow[] = [
  ...academicWritingAdvancedRows,
  ...businessCommunicationRows,
  ...scienceResearchRows,
  ...technologyDigitalRows,
];

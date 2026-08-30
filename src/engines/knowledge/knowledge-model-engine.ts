/**
 * Knowledge Model + Knowledge Graph.
 *
 * Knowledge Model: per-item state (which words/patterns/rules exist in the
 * learner's knowledge base and where each sits on the mastery ladder).
 *
 * Knowledge Graph: relations between items (roots, families, collocations,
 * prerequisite grammar), enabling targeted repair and transfer practice.
 *
 * PHASE 0: interfaces only - no implementation, no seeded content.
 */
import type { KnowledgeItem, MasteryStage } from "@/core/types";

export interface IKnowledgeModelEngine {
  /** Register content into the knowledge base (idempotent by id). */
  putItem(item: KnowledgeItem): Promise<void>;
  getItem(id: string): Promise<KnowledgeItem | null>;

  /** Query items relevant for study, filtered by stage window. */
  getItemsInStageRange(minStage: MasteryStage, maxStage: MasteryStage): Promise<KnowledgeItem[]>;
  countByStage(): Promise<Record<MasteryStage | "unseen", number>>;
}

export type KnowledgeRelation =
  | "root-of"
  | "same-family"
  | "collocates-with"
  | "prerequisite-for"
  | "commonly-confused"
  | "registers-similar";

export interface IKnowledgeGraphEngine {
  addRelation(fromItemId: string, relation: KnowledgeRelation, toItemId: string): Promise<void>;
  /** Neighbors useful for teaching (e.g. word family when introducing a root). */
  getRelated(itemId: string): Promise<Array<{ itemId: string; relation: KnowledgeRelation }>>;
  /** Items whose failure pattern suggests confusion with this item. */
  getConfusionSet(itemId: string): Promise<string[]>;
}

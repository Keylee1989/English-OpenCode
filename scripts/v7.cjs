const fs = require("fs");
const p = "src/data/db.ts";
let s = fs.readFileSync(p, "utf8");

// 1) SpeakingAttemptRow after RoleplayMeta close
const rpEnd = '  difficulty: "easy" | "normal" | "hard";\n}\n\n';
if (!s.includes(rpEnd)) { console.error("rp anchor missing"); process.exit(1); }
const insert = `/** Phase 6: one recorded speaking attempt linked to a roleplay conversation. */
export interface SpeakingAttemptRow {
  id: string;
  conversationId: string;
  /** The AI line the learner was responding to. */
  promptEn: string;
  audio: Blob;
  createdAt: number;
  /** Learner self-score 1..5. The system NEVER auto-scores pronunciation. */
  selfScore: number | null;
  note?: string;
}

`;
s = s.replace(rpEnd, rpEnd + insert);

// 2) EntityTable
s = s.replace(
  "  conversations!: EntityTable<ConversationRow, \"id\">;",
  "  conversations!: EntityTable<ConversationRow, \"id\">;\n  speakingAttempts!: EntityTable<SpeakingAttemptRow, \"id\">;"
);

// 3) version(7) — replace the v6 tail then append v7 block before closing constructor
const v6Tail = `      conversations: "id, updatedAt, type",
    });
  }`;
if (!s.includes(v6Tail)) { console.error("v6 tail missing"); process.exit(1); }
s = s.replace(v6Tail, `      conversations: "id, updatedAt, type, [type+updatedAt]",
      speakingAttempts: "id, conversationId, createdAt",
    });
    // v7 (Phase 6): compound pagination index + speaking attempts + assessment day index.
    this.version(7).stores({
      settings: "key",
      learningEvents: "id, occurredAt, skill, itemId",
      memoryStates: "itemId, dueAt, stage",
      errors: "id, occurredAt, category, skill",
      abilities: "skill",
      dailySessions: "dateISO, startedAt",
      dayProgress: "day, status",
      knowledgeItems: "id, kind",
      knowledgeEdges: "edgeKey, fromItemId, toItemId, relation",
      assessments: "id, completedAt, day",
      gamification: "id",
      conversations: "id, updatedAt, type, [type+updatedAt]",
      speakingAttempts: "id, conversationId, createdAt",
    });
  }`);

// 4) DATA_TABLE_NAMES
s = s.replace(
  '  "conversations",\n] as const;',
  '  "conversations",\n  "speakingAttempts",\n] as const;'
);

// 5) SCHEMA_VERSION bump (idempotent)
s = s.replace("export const SCHEMA_VERSION = 6;", "export const SCHEMA_VERSION = 7;");

fs.writeFileSync(p, s, "utf8");
console.log("db.ts upgraded to v7");

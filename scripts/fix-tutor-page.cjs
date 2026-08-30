const fs = require("fs");

// engine: add ok:true to outcome interface
{
  let e = fs.readFileSync("src/engines/tutor/roleplay-engine.ts", "utf8");
  e = e.replace(
    "export interface RoleplayTurnOutcome {\n  replyEn",
    "export interface RoleplayTurnOutcome {\n  ok: true;\n  replyEn",
  );
  fs.writeFileSync("src/engines/tutor/roleplay-engine.ts", e, "utf8");
}

// test: drop unused import
{
  let t = fs.readFileSync("src/engines/tutor/roleplay-engine.test.ts", "utf8");
  t = t.replace(/\n\s*parseRoleplayReply,/, "");
  fs.writeFileSync("src/engines/tutor/roleplay-engine.test.ts", t, "utf8");
}

// page: clean imports + remove trailing hack
{
  const p = "src/pages/AiTutorPage.tsx";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    'import { buildTutorSystemPrompt, formatContextForAi } from "@/engines/tutor/context-format";',
    'import { formatContextForAi } from "@/engines/tutor/context-format";',
  );
  s = s.replace(/\n  getConversation,\n/, "\n");
  s = s.replace(
    'import type { ConversationMessage, ConversationType, ConversationRow } from "@/data/db";',
    'import type { ConversationMessage, ConversationRow } from "@/data/db";',
  );
  const cut = s.indexOf("// silence unused import warning");
  if (cut !== -1) s = s.slice(0, cut).trimEnd() + "\n";
  fs.writeFileSync(p, s, "utf8");
}
console.log("cleaned");

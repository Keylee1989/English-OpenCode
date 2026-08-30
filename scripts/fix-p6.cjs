const fs = require("fs");

// 1) RoleplaySection: remove the now-duplicated local voice state (delegated to RoleplayRecorder)
{
  const p = "src/pages/AiTutorPage.tsx";
  let s = fs.readFileSync(p, "utf8");
  const dropBlock =
    "  // Phase 6 voice basics\n" +
    "  const [recording, setRecording] = useState(false);\n" +
    "  const [attemptId, setAttemptId] = useState<string | null>(null);\n" +
    "  const recRef = useRef<MediaRecorder | null>(null);\n" +
    "  const chunksRef = useRef<Blob[]>([]);\n" +
    "  const lastAiEn = useRef<string>(\"\");\n" +
    "  const canRecord = typeof navigator !== \"undefined\" && !!navigator.mediaDevices?.getUserMedia;\n";
  if (s.includes(dropBlock)) {
    s = s.split(dropBlock).join("");
    fs.writeFileSync(p, s, "utf8");
    console.log("removed duplicated voice state from RoleplaySection");
  } else {
    console.error("voice state block not found");
  }
}

// 2) pagination test typing + unused import
{
  const p = "src/ai/conversation-pagination.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    'import { createConversation, paginateConversations } from "@/ai/conversation-store";',
    'import { paginateConversations } from "@/ai/conversation-store";\nimport type { ConversationRow } from "@/data/db";'
  );
  s = s.replace(
    "    const rows = [];",
    "    const rows: ConversationRow[] = [];"
  );
  s = s.replace("        type: i % 2 === 0 ? \"tutor\" : \"roleplay\",", "        type: (i % 2 === 0 ? \"tutor\" : \"roleplay\") as ConversationRow[\"type\"],");
  fs.writeFileSync(p, s, "utf8");
}
console.log("done");

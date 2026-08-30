const fs = require("fs");

// 1) roleplay-engine: add ok:true at the two construction sites
{
  const p = "src/engines/tutor/roleplay-engine.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    /return \{\n(\s*)corrections,\n\s*replyEn: obj\.replyEn,/,
    "return {\n$1ok: true,\n$1corrections,\n$1replyEn: obj.replyEn,",
  );
  s = s.replace(
    /return \{\n(\s*)replyEn: parsed\.replyEn,\n(\s*)replyZh: parsed\.replyZh,\n(\s*)corrections: parsed\.corrections,\n(\s*)turn: nextTurn,\n\s*\};/,
    "return {\n$1ok: true,\n$1replyEn: parsed.replyEn,\n$2replyZh: parsed.replyZh,\n$3corrections: parsed.corrections,\n$4turn: nextTurn,\n  };",
  );
  fs.writeFileSync(p, s, "utf8");
}

// 2) days/index: drop unused part101 destructure
{
  const p = "src/content/days/index.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("const [part31, part51, part71, part91, part101] = await Promise.all([", "const [part31, part51, part71, part91] = await Promise.all([");
  s = s.replace('  import("@/content/pipeline/generated-days"),\n  import("@/content/pipeline/generated-days"),\n]);', '  import("@/content/pipeline/generated-days"),\n]);');
  fs.writeFileSync(p, s, "utf8");
}

// 3) conversation-store.test: use the vars
{
  const p = "src/ai/conversation-store.test.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("const a = await createConversation({ type: \"tutor\" });", "const a = await createConversation({ type: \"tutor\" });\n    void a;");
  fs.writeFileSync(p, s, "utf8");
}
console.log("batch fixed");

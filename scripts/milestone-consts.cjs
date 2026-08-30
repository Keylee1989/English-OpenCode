const fs = require("fs");

// 1) assessment-v0: export MILESTONE_DAYS
{
  const p = "src/engines/assessment/assessment-v0.ts";
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("MILESTONE_DAYS")) {
    s = s.replace(
      "export interface SkillScore {",
      "/** Milestone days that auto-trigger a formal assessment (Phase 6). */\nexport const MILESTONE_DAYS = [30, 60, 90] as const;\n\nexport interface SkillScore {",
    );
    fs.writeFileSync(p, s, "utf8");
    console.log("assessment-v0: MILESTONE_DAYS added");
  }
}

// 2) growth-report: import instead of local definition
{
  const p = "src/study/growth-report.ts";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(
    'export const MILESTONE_DAYS = [30, 60, 90] as const;',
    'import { MILESTONE_DAYS } from "@/engines/assessment/assessment-v0";\nexport { MILESTONE_DAYS };',
  );
  fs.writeFileSync(p, s, "utf8");
  console.log("growth-report re-exports MILESTONE_DAYS");
}
console.log("done");

const fs = require("fs");
const p = "src/content/pipeline/generated-days.ts";
let s = fs.readFileSync(p, "utf8");
s = s.replace(
  'import { generateDays } from "@/content/pipeline/generate-days";',
  'import { generateDays } from "@/content/pipeline/generate-days";\nimport type { CourseDayPlan } from "@/content/pipeline/generate-days";'
);
s = s.replace(/const byDay[\s\S]*?\n\n/, "");
s = s.replace(/interface CourseDayPlanLike \{\n  day: number;\n\}\n\n/, "");
s = s.replace(": readonly CourseDayPlanLike[]", ": readonly CourseDayPlan[]");
s = s.replace("new Map<number, CourseDayPlanLike>", "new Map<number, CourseDayPlan>");
s = s.replace("const plans = [", "const plans: readonly CourseDayPlan[] = [");
fs.writeFileSync(p, s, "utf8");
console.log(s.slice(0, 500));

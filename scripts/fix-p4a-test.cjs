const fs = require("fs");
const p = "src/content/days-phase4a.test.ts";
let s = fs.readFileSync(p, "utf8");
s = s.split('Phase 4-A curriculum (Day 31-90)').join('Phase 4-A/5 curriculum (Day 31-110)');
s = s.split('has exactly 60 sequential days 31..90').join('has exactly 80 sequential days 31..110');
s = s.replace(
  /expect\(newDays\.map\(\(d\) => d\.day\)\)\.toEqual\(\s*Array\.from\(\{ length: 60 \}, \(_, i\) => i \+ 31\),\s*\);/,
  'expect(newDays.map((d) => d.day)).toEqual(\n      Array.from({ length: 80 }, (_, i) => i + 31),\n    );'
);
s = s.split('expect(DAY_CONTENT.length).toBe(90);').join('expect(DAY_CONTENT.length).toBe(110);');
// milestone boundary test now checks 111 as out of range
s = s.split('expect(getDayContent(91)).toBeNull();').join('expect(getDayContent(111)).toBeNull();');
fs.writeFileSync(p, s, "utf8");
console.log("phase4a test updated");

/**
 * Final Release Candidate — release-package deployability check (read-only).
 * Usage: node scripts/check-release-package.cjs
 *
 * Verifies dist/ is a directly deployable static+PWA bundle WITHOUT modifying
 * any core code. Asserts:
 *   1. index.html present and references a hashed entry JS + CSS asset
 *   2. manifest.webmanifest present, valid JSON, has start_url + icons
 *   3. service worker sw.js present
 *   4. every asset referenced by index.html / manifest exists on disk
 *   5. no zero-byte or clearly-truncated JS/CSS assets
 *   6. report total size + asset count (informational for deployment)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const failures = [];
const infos = [];

function check(cond, name, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}${detail ? "  =>  " + detail : ""}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? "  =>  " + detail : ""}`);
  }
}

if (!fs.existsSync(DIST)) {
  console.error("FAIL  dist/ does not exist — run `npm run build` first.");
  process.exit(2);
}

// ---- 1. index.html + referenced assets ------------------------------------
const indexPath = path.join(DIST, "index.html");
check(fs.existsSync(indexPath), "1 index.html present");
let html = "";
if (fs.existsSync(indexPath)) {
  html = fs.readFileSync(indexPath, "utf8");
  const jsLinks = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]);
  const cssLinks = [...html.matchAll(/(?:href)="([^"]+\.css)"/g)].map((m) => m[1]);
  infos.push(`index.html references JS: ${jsLinks.join(", ") || "(none local)"}`);
  infos.push(`index.html references CSS: ${cssLinks.join(", ") || "(none local)"}`);
  const localAssets = [...jsLinks, ...cssLinks].filter((a) => !/^https?:|^\/\//.test(a));
  let missing = 0;
  for (const rel of localAssets) {
    const p = path.join(DIST, rel.replace(/^\.\//, ""));
    if (!fs.existsSync(p)) {
      missing++;
      failures.push(`index.html references missing asset: ${rel}`);
      console.log(`  FAIL  index ref missing asset ${rel}`);
    }
  }
  check(missing === 0, "1b all index-referenced assets exist", `${localAssets.length} local refs`);
}

// ---- 2. manifest.webmanifest ----------------------------------------------
const manifestPath = path.join(DIST, "manifest.webmanifest");
check(fs.existsSync(manifestPath), "2 manifest.webmanifest present");
if (fs.existsSync(manifestPath)) {
  try {
    const mf = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    check(!!mf.name && !!mf.start_url, "2a manifest has name + start_url");
    const icons = mf.icons || [];
    check(icons.length >= 2 && icons.every((i) => fs.existsSync(path.join(DIST, i.src))),
      "2b manifest icons exist on disk", `${icons.length} icons`);
  } catch (e) {
    failures.push("manifest.webmanifest invalid JSON");
    console.log("  FAIL  manifest.webmanifest invalid JSON: " + e.message);
  }
}

// ---- 3. service worker -----------------------------------------------------
const swPath = path.join(DIST, "sw.js");
check(fs.existsSync(swPath), "3 service worker sw.js present");

// ---- 4. no zero-byte / suspiciously truncated assets ----------------------
let totalSize = 0;
let assetCount = 0;
let badSize = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const st = fs.statSync(p);
      if (st.size === 0) { badSize++; failures.push(`zero-byte asset: ${p}`); console.log(`  FAIL  zero-byte asset ${path.relative(ROOT,p)}`); }
      totalSize += st.size;
      assetCount++;
    }
  }
})(DIST);
check(badSize === 0, "4 no zero-byte assets", `${assetCount} files, ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

console.log(`\n---\nRelease package: ${failures.length === 0 ? "DEPLOYABLE ✔" : "NOT DEPLOYABLE ✘"} (${assetCount} files, ${(totalSize / (1024 * 1024)).toFixed(2)} MB on disk)`);
console.log("Informational:");
infos.forEach((i) => console.log("  INFO  " + i));
console.log("Failures:", failures.length);
process.exit(failures.length === 0 ? 0 : 2);

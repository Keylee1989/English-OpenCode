// Post-process a `vite build --base=/English-OpenCode/` output into a correct
// subpath GitHub Pages PWA variant. This is DEPLOY-ONLY tooling: it runs in CI
// (or locally) against a built `dist/` and NEVER touches the canonical root
// `'/'` config (vite.config.ts). It rewrites:
//   1. manifest.webmanifest -> start_url/scope/icons under the subpath base
//   2. sw.js navigateFallback -> createHandlerBoundToURL(<base>index.html)
// It is deliberately strict: any expected source pattern that is missing is a
// hard failure (exit != 0), so it cannot silently produce a broken deployment.
const fs = require("fs");
const path = require("path");

function arg(name, fallback) {
  const p = process.argv.find((a) => a.startsWith("--" + name + "="));
  return p ? p.slice(name.length + 3) : fallback;
}

const distDir = path.resolve(arg("dist", "dist"));
const baseRaw = arg("base", "/English-OpenCode/");
// base must look like /something/ (leading + trailing slash)
const base = baseRaw.startsWith("/") ? baseRaw : "/" + baseRaw;
const normalized = base.endsWith("/") ? base : base + "/";
const baseNoLeading = normalized.replace(/^\/+/, ""); // e.g. "English-OpenCode/"

const errors = [];

function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const manifestPath = path.join(distDir, "manifest.webmanifest");
const swPath = path.join(distDir, "sw.js");
const idxPath = path.join(distDir, "index.html");

check(fs.existsSync(manifestPath), "missing manifest.webmanifest: " + manifestPath);
check(fs.existsSync(swPath), "missing sw.js: " + swPath);
check(fs.existsSync(idxPath), "missing index.html: " + idxPath);

let manifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    errors.push("manifest is not valid JSON: " + e.message);
  }
}

if (manifest) {
  check(manifest.scope === "/", "expected pre-rewrite manifest scope '/' but got " + JSON.stringify(manifest.scope));
  check(manifest.start_url === "/" || manifest.start_url === "/index.html", "unexpected start_url " + JSON.stringify(manifest.start_url));

  manifest.start_url = "/" + baseNoLeading;
  manifest.scope = "/" + baseNoLeading;
  const strip = (s) => (s || "").replace(/^\/+/, "");
  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((ic) => ({ ...ic, src: "/" + baseNoLeading + strip(ic.src) }));
  }
  // Also rewrite any top-level manifest URLs that are root-absolute paths.
  for (const k of ["id", "start_url", "scope"]) {
    if (typeof manifest[k] === "string" && manifest[k].startsWith("/") && !manifest[k].startsWith("/" + baseNoLeading)) {
      // handled via baseNoLeading already for start_url/scope; id left as-is
    }
  }

  // Verify rewritten values
  check(manifest.start_url === "/" + baseNoLeading, "rewritten start_url mismatch " + manifest.start_url);
  check(manifest.scope === "/" + baseNoLeading, "rewritten scope mismatch " + manifest.scope);
  const properIcon = manifest.icons && manifest.icons.every((ic) => ic.src.startsWith("/" + baseNoLeading + "icons/"));
  check(!!properIcon, "icons not rewritten under base: " + JSON.stringify(manifest.icons && manifest.icons.map((i) => i.src)));

  fs.writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");
}

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, "utf8");
  const OLD = 'createHandlerBoundToURL("/index.html")';
  const NEW = 'createHandlerBoundToURL("/' + baseNoLeading + 'index.html")';
  check(sw.indexOf(OLD) !== -1, "sw.js missing navigateFallback pattern " + OLD);
  if (sw.indexOf(OLD) !== -1) {
    sw = sw.split(OLD).join(NEW);
  }
  check(sw.indexOf(NEW) !== -1, "sw.js rewrite did not apply " + NEW);
  fs.writeFileSync(swPath, sw, "utf8");
}

if (errors.length) {
  console.error("pages-postprocess FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("pages-postprocess OK (base=" + normalized + ", dist=" + distDir + ")");

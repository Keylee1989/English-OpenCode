require("fake-indexeddb/auto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("esbuild");
(async () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "c-"));
  const e = path.join(t, "e.ts"), o = path.join(t, "b.mjs");
  fs.writeFileSync(e, 'export { lexicalCount } from "@/content/vocab";');
  await build({ entryPoints: [e], outfile: o, bundle: true, format: "esm", platform: "node", alias: { "@": path.join(process.cwd(), "src") }, logLevel: "silent" });
  let q = o.split(path.sep).join("/");
  if (!q.startsWith("/")) q = "/" + q;
  const m = await import("file://" + q);
  console.log("LEXICAL_COUNT=" + m.lexicalCount());
  fs.rmSync(t, { recursive: true, force: true });
})();

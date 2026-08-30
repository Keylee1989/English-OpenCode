import { mergeConfig } from "vitest/config";
import { defineConfig } from "vite";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./tests/setup.ts"],
      // Phase 13 P1-3: DB-heavy suites share fake-indexeddb module state;
      // serializing files removes the observed parallel-run flakiness.
      fileParallelism: false,
    },
  }),
);

// IndexedDB polyfill for Node test environment.
// The production app uses the browser's native IndexedDB (iOS Safari);
// this is test-only and must never be imported from app code.
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Required by @testing-library/react with React 19.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});

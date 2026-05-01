import "@testing-library/jest-dom/vitest";

// Recharts' ResponsiveContainer reads ResizeObserver at render time;
// jsdom doesn't ship one, so polyfill with a noop class for tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverPolyfill;
}

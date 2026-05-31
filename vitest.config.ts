import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "e2e/real-flow/helpers/**/*.test.{ts,tsx}",
    ],
    // These real-flow helper tests hit a live chain/backend (Anvil RPC, HTTP) and
    // belong to the E2E Real Flow workflow, not the unit lane — exclude them here
    // so `npm test` is hermetic (they fail without infra in CI).
    exclude: [
      "e2e/real-flow/helpers/__tests__/backend.test.ts",
      "e2e/real-flow/helpers/__tests__/chain.test.ts",
      "e2e/real-flow/helpers/__tests__/contracts.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

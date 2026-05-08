// e2e/real-flow/helpers/__tests__/backend.test.ts
import { test, expect } from "@playwright/test";
import { testApi } from "../backend";

test("reset endpoint returns success", async ({ request }) => {
  const result = await testApi.reset(request);
  expect(result.truncated).toBeGreaterThan(0);
});

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Hex } from "viem";
import { writeManifest, readManifest, type BootstrapManifest } from "../manifest";

test("writeManifest then readManifest round-trips", () => {
  const tmp = path.join(os.tmpdir(), `manifest-${Date.now()}.json`);
  const m: BootstrapManifest = {
    createdAt: new Date().toISOString(),
    chainId: 11155111,
    contracts: { VettedToken: "0x0000000000000000000000000000000000000001" } as never,
    guilds: [
      { id: "g1", name: "Engineering", onChainGuildId: "0xabc" as `0x${string}` },
    ],
    experts: [
      {
        id: "e1",
        address: "0x0000000000000000000000000000000000000002",
        privateKey: ("0x" + "1".repeat(64)) as Hex,
        guildId: "g1",
      },
    ],
  };
  writeManifest(m, tmp);
  expect(readManifest(tmp)).toEqual(m);
  fs.unlinkSync(tmp);
});

test("readManifest throws a clear error when the file is missing", () => {
  expect(() => readManifest("/nonexistent/manifest.json")).toThrow(/bootstrap/i);
});

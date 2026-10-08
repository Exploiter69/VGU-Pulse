import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

describe("community V2 repository invariants", () => {
  it("keeps the migration chain append-only through Gate 3", () => {
    const files = readdirSync("migrations").filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort();
    expect(files).toContain("0009_community_network.sql");
    expect(files).toContain("0010_gate1_hardening.sql");
    expect(files).toContain("0011_gate2_safety.sql");
    expect(files).toContain("0012_gate3_foundations.sql");
    expect(files).toContain("0013_gate3_qa.sql");
    expect(files.filter((name) => /^000[1-9]_/.test(name))).toHaveLength(9);
  });

  it("keeps production guards in CI and the behavior harness in the repository", () => {
    expect(readFileSync(".github/workflows/ci.yml", "utf8")).toContain("npx vitest run tests/behavior");
    expect(readFileSync("tests/behavior/vgu-pulse.test.ts", "utf8")).toContain("createTestHarness");
  });
});

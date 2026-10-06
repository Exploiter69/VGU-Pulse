import { describe, expect, it } from "vitest";
import { validateInitData } from "../src/telegram";

describe("validateInitData", () => {
  it("rejects empty input", async () => {
    await expect(validateInitData("", "token")).resolves.toBeNull();
  });

  it("rejects malformed input", async () => {
    await expect(
      validateInitData("auth_date=123&user=%7B%7D&hash=bad", "token"),
    ).resolves.toBeNull();
  });
});

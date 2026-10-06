import { describe, expect, it } from "vitest";
import { validateStudentPostInput, validateStudentReplyInput } from "../src/db";
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

describe("validateStudentReplyInput", () => {
  it("accepts bounded replies", () => {
    expect(validateStudentReplyInput({ body: "The library closes at 9 PM." })).toEqual({
      body: "The library closes at 9 PM.",
    });
  });

  it("rejects empty and oversized replies", () => {
    expect(validateStudentReplyInput({ body: " " })).toBeNull();
    expect(validateStudentReplyInput({ body: "x".repeat(1001) })).toBeNull();
  });
});

describe("validateStudentPostInput", () => {
  it("accepts bounded student posts", () => {
    expect(
      validateStudentPostInput({
        category: "question",
        title: "Library timing?",
        body: "Does anyone know today's closing time?",
      }),
    ).toEqual({
      category: "question",
      title: "Library timing?",
      body: "Does anyone know today's closing time?",
    });
  });

  it("rejects invalid category and oversized content", () => {
    expect(
      validateStudentPostInput({
        category: "official",
        title: "Question",
        body: "Hello",
      }),
    ).toBeNull();
    expect(
      validateStudentPostInput({
        category: "info",
        title: "x".repeat(121),
        body: "Hello",
      }),
    ).toBeNull();
  });
});

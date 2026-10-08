import { describe, expect, it } from "vitest";
import { validateStudentPostInput, validateStudentReplyInput, validateStudentProfileInput } from "../src/db";
import { validateInitData } from "../src/telegram";
import { parseResourceCaption } from "../src/index";

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

describe("validateStudentProfileInput", () => {
  it("accepts a bounded opt-in profile", () => {
    expect(validateStudentProfileInput({
      display_name: "Alok", program: "B.Tech", branch: "CSE",
      year: 2, bio: "Building with friends.", looking_for: "DSA study group",
    })?.looking_for).toBe("DSA study group");
  });
  it("rejects invalid year", () => {
    expect(validateStudentProfileInput({
      display_name: "Alok", program: "B.Tech CSE", branch: "CSE",
      year: 9, bio: "", looking_for: "study group",
    })).toBeNull();
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


describe("parseResourceCaption", () => {
  it("parses resource metadata separated by whitespace", () => {
    expect(parseResourceCaption("/resource type=PYQ subject=DBMS semester=5")).toEqual({
      type: "PYQ",
      subject: "DBMS",
      semester: "5",
    });
  });
});

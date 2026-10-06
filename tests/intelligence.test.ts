import { describe, expect, it } from "vitest";
import { searchKnowledge } from "../src/intelligence";

describe("Gate 5 student intelligence", () => {
  it("finds official exam information before unrelated content", () => {
    const results = searchKnowledge("exam form", [
      { title: "Library notice", summary: "Library update", primary_source_url: "https://vgu.ac.in/library" },
    ]);
    expect(results[0].title).toBe("Exam Form");
    expect(results[0].trust).toBe("official");
  });

  it("includes campus navigation for practical questions", () => {
    const results = searchKnowledge("medical");
    expect(results.some((item) => item.title === "Medical Aid Centre")).toBe(true);
    expect(results.find((item) => item.title === "Medical Aid Centre")?.trust).toBe("official");
  });

  it("keeps student reports explicitly non-official", () => {
    const results = searchKnowledge("library timing", [], [
      { title: "Library timing?", body: "Library was open late today." },
    ]);
    const item = results.find((result) => result.title === "Library timing?");
    expect(item?.trust).toBe("student-reported");
    expect(item?.kind).toBe("student");
  });

  it("does not invent a result for an unrelated query", () => {
    expect(searchKnowledge("quantum cafeteria unicorn", []).length).toBe(0);
  });
});

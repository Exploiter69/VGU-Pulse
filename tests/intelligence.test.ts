import { describe, expect, it } from "vitest";
import { analyzeAcademicQuery, searchKnowledge } from "../src/intelligence";

describe("Phase 11 academic intelligence", () => {
  it("routes backlog questions to the backlog form", () => {
    const analysis = analyzeAcademicQuery("where do I fill the backlog exam form?");
    expect(analysis.intent).toBe("backlog");
    const results = searchKnowledge("where do I fill the backlog exam form?");
    expect(results[0].title).toBe("Backlog Exam Form");
  });

  it("routes re-registration questions to the re-registration form", () => {
    const analysis = analyzeAcademicQuery("re registration form");
    expect(analysis.intent).toBe("re-registration");
    expect(searchKnowledge("re registration form")[0].title).toBe("Re-registration");
  });

  it("routes academic calendar questions explicitly", () => {
    expect(analyzeAcademicQuery("when is the academic calendar?").intent).toBe("academic-calendar");
  });

  it("routes private marks and attendance questions to ERP", () => {
    const analysis = analyzeAcademicQuery("where can I see my attendance and marks?");
    expect(analysis.intent).toBe("erp-private-data");
    expect(analysis.boundary).toContain("private ERP/Digicampus");
    expect(searchKnowledge("where can I see my attendance?")[0].title).toBe("Student ERP");
  });

  it("keeps exam form above unrelated official content", () => {
    const results = searchKnowledge("exam form", [
      { title: "Library notice", summary: "Library update", primary_source_url: "https://vgu.ac.in/library" },
    ]);
    expect(results[0].title).toBe("Exam Form");
    expect(results[0].trust).toBe("official");
  });

  it("finds academic facilities for practical academic questions", () => {
    const results = searchKnowledge("academic labs");
    expect(results.some((item) => item.title === "Academic facilities")).toBe(true);
  });

  it("keeps student reports explicitly non-official", () => {
    const results = searchKnowledge("library timing", [], [
      { title: "Library timing?", body: "Library was open late today." },
    ]);
    const item = results.find((result) => result.title === "Library timing?");
    expect(item?.trust).toBe("student-reported");
    expect(item?.kind).toBe("student");
  });

  it("finds official campus support services", () => {
    const results = searchKnowledge("student cell ERP grievance");
    expect(results[0].title).toBe("Student Cell");
    expect(results[0].trust).toBe("official");
  });

  it("finds the Controller of Examinations for result and transcript questions", () => {
    const results = searchKnowledge("examination results transcript");
    expect(results.some((item) => item.title === "Controller of Examinations")).toBe(true);
  });

  it("does not invent a result for an unrelated query", () => {
    expect(searchKnowledge("quantum cafeteria unicorn", []).length).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { knowledgeItems, STUDENT_FAQ, STUDENT_KNOWLEDGE } from "../src/student-knowledge";

describe("student knowledge coverage", () => {
  it("contains the core official student surfaces", () => {
    const titles = STUDENT_KNOWLEDGE.map((item) => item.title);
    expect(titles).toEqual(expect.arrayContaining([
      "VGU Academic Calendars",
      "VGU Scholarships",
      "VGU Training & Placement Cell",
      "VGU Student Clubs & Societies",
      "VGU Hostel Information",
      "VGU Tele Directory",
      "VGU Fees & Payment Information",
      "VGU Events",
      "VGU Academic Regulations & ABC",
      "VGU Controller of Examinations",
    ]));
  });

  it("contains explicit private-data boundaries", () => {
    const attendance = STUDENT_FAQ.find((item) => item.title.includes("attendance"));
    const timetable = STUDENT_FAQ.find((item) => item.title.includes("timetable"));
    expect(attendance?.summary).toContain("cannot access private attendance");
    expect(timetable?.summary).toContain("private");
  });

  it("keeps knowledge deterministic and bounded", () => {
    expect(knowledgeItems().length).toBeGreaterThan(25);
    expect(STUDENT_KNOWLEDGE.every((item) => item.url.includes("vgu.ac.in") || item.url.includes("tcsion.com") || item.url.includes("digialm.com"))).toBe(true);
    expect(knowledgeItems().every((item) => item.title && item.summary && /^https?:\/\//.test(item.url))).toBe(true);
  });
});

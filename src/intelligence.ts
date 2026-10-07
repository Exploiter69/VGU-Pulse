import { knowledgeItems } from "./student-knowledge";

export type IntelligenceItem = {
  kind: "official" | "tool" | "campus" | "student";
  title: string;
  summary: string;
  url?: string;
  trust: "official" | "student-reported";
  source?: string;
};

export type AcademicIntent =
  | "exam"
  | "academic-calendar"
  | "exam-form"
  | "backlog"
  | "re-registration"
  | "erp-private-data"
  | "academic-facilities"
  | "general";

export type AcademicAnalysis = {
  intent: AcademicIntent;
  label: string;
  boundary?: string;
};

type RawItem = Record<string, unknown>;

const TOOLKIT: IntelligenceItem[] = [
  ["Student ERP","Student gateway","https://tcsion.com/SelfServices"],
  ["Exam Form","Official exam form","https://g01.digialm.com/EForms/html/form53175/login.html"],
  ["Backlog Exam Form","Backlog exam form","https://g01.digialm.com/EForms/html/form62421/login.html"],
  ["Re-registration","Official re-registration form","https://www.digialm.com/EForms/html/form65798/login.html"],
  ["Hostels","Official hostel information","https://vgu.ac.in/campus-life/hostels"],
  ["Transport","Official transport facilities","https://vgu.ac.in/campus-facilities/transport-facilities"],
  ["Medical","Medical facilities and assistance","https://vgu.ac.in/campus-facilities/medical-facilities-and-services"],
  ["Academic facilities","Labs, resource centres and academic blocks","https://vgu.ac.in/campus-facilities/academic-facilities"],
  ["Student Handbook","Rules and student reference","https://www.vgu.ac.in/Student%20Handbook%202025%20.pdf"],
  ["Contact VGU","Official support contacts","https://vgu.ac.in/contact"],
].map(([title, summary, url]) => ({kind:"tool", title, summary, url, trust:"official", source:"VGU student gateway"}));

const CAMPUS: IntelligenceItem[] = [
  ["Academic Block","Academic administration and teaching spaces","https://vgu.ac.in/campus-facilities/academic-facilities"],
  ["Technology Block","Auditorium, KRC and mailroom","https://vgu.ac.in/campus-facilities/academic-facilities"],
  ["Administrative Block","Administrative services","https://vgu.ac.in/campus-facilities/academic-facilities"],
  ["Knowledge Resource Centres","VGU knowledge resource centres","https://vgu.ac.in/campus-facilities/academic-facilities"],
  ["Medical Aid Centre","Medical assistance in Students' Mess Complex","https://vgu.ac.in/campus-facilities/medical-facilities-and-services"],
  ["Transport","Campus transport facilities","https://vgu.ac.in/campus-facilities/transport-facilities"],
  ["Students' Mess","Mess facilities and services","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Campus Canteen","Campus canteen information","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Lost & Found","Lost and found locations","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Mailroom","Mailroom in the Technology Block","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Provision Store","Campus provision store","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Book & Stationery Shop","Books and stationery","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["ATM","Campus ATM information","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Hostels","Official hostel information","https://vgu.ac.in/campus-life/hostels"],
  ["Gymnasium","Campus gymnasium","https://vgu.ac.in/campus-facilities/general-facilities-and-services"],
  ["Student Handbook","Student rules and reference","https://www.vgu.ac.in/Student%20Handbook%202025%20.pdf"],
  ["Student Cell","Records, certificates, ERP support, scholarships and grievances","https://vgu.ac.in/centers-and-cells/student-cell"],
  ["Controller of Examinations","Exam timetables, examinations, results, grade cards and transcripts","https://vgu.ac.in/academic-leadership/controller-of-examination"],
  ["Anti-Ragging Support","Official anti-ragging contacts and support","https://www.vgu.ac.in/Student%20Handbook%202025%20.pdf"],
  ["VGU Main Contact","Main office, student helpline and general enquiries","https://vgu.ac.in/contact"],
  ["Computer Science & Engineering","Department of Computer Science and Engineering","https://vgu.ac.in/engineering"],
  ["Mechanical Engineering","Department of Mechanical Engineering","https://vgu.ac.in/engineering"],
  ["Civil Engineering","Department of Civil Engineering","https://vgu.ac.in/engineering"],
  ["Electrical Engineering","Department of Electrical Engineering","https://vgu.ac.in/engineering"],
  ["Faculty & Department Directory","Official faculty and department listing","https://vgu.ac.in/assets/documents/resources/handbook-brochures/StudentHandbook2025.pdf"],
].map(([title, summary, url]) => ({kind:"campus", title, summary, url, trust:"official", source:"VGU campus facilities"}));

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function termsMatch(query: string, terms: string[]): boolean {
  return terms.some((term) => query.includes(term));
}

export function analyzeAcademicQuery(query: string): AcademicAnalysis {
  const q = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (termsMatch(q, ["backlog", "back paper", "supplementary", "arrear"])) {
    return { intent: "backlog", label: "Backlog exams and forms" };
  }
  if (termsMatch(q, ["re registration", "reregistration", "re register", "semester registration"])) {
    return { intent: "re-registration", label: "Re-registration" };
  }
  if (termsMatch(q, ["exam form", "exam form", "examination form", "fill exam"])) {
    return { intent: "exam-form", label: "Exam forms" };
  }
  if (termsMatch(q, ["academic calendar", "semester calendar", "calendar", "academic schedule"])) {
    return { intent: "academic-calendar", label: "Academic calendar" };
  }
  if (termsMatch(q, ["attendance", "attendence", "internal marks", "internal mark", "my marks", "my result", "result", "cgpa", "sgpa", "my timetable", "my time table", "my schedule"])) {
    return {
      intent: "erp-private-data",
      label: "Private academic student data",
      boundary: "Pulse cannot access private ERP/Digicampus attendance, marks, results or personal timetable data. Open the official Student ERP instead.",
    };
  }
  if (termsMatch(q, ["exam", "exams", "examination", "end semester", "mid term", "midterm", "date sheet", "datesheet", "timetable"])) {
    return { intent: "exam", label: "Exams" };
  }
  if (termsMatch(q, ["academic block", "library", "krc", "lab", "labs", "academic facility"])) {
    return { intent: "academic-facilities", label: "Academic facilities" };
  }
  return { intent: "general", label: "General Pulse search" };
}

function officialItems(items: RawItem[]): IntelligenceItem[] {
  return items.map((item) => ({
    kind: "official",
    title: text(item.title) || "VGU information",
    summary: text(item.summary),
    url: text(item.primary_source_url) || undefined,
    trust: "official",
    source: "VGU-Signal",
  }));
}

function studentItems(items: RawItem[]): IntelligenceItem[] {
  return items.map((item) => ({
    kind: "student",
    title: text(item.title) || "Student post",
    summary: text(item.body),
    trust: "student-reported",
    source: "VGU Pulse student community",
  }));
}

function score(item: IntelligenceItem, query: string, analysis: AcademicAnalysis): number {
  const q = query.toLowerCase().trim();
  if (!q) return item.kind === "official" ? 20 : item.kind === "campus" ? 10 : 5;
  const title = item.title.toLowerCase();
  const summary = item.summary.toLowerCase();
  const haystack = [title, summary, item.source].join(" ").toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  let points = 0;

  for (const term of terms) {
    if (title.includes(term)) points += 8;
    if (summary.includes(term)) points += 4;
    if (haystack.includes(term)) points += 2;
  }
  if (haystack.includes(q)) points += 10;

  const intentBoosts: Record<AcademicIntent, string[]> = {
    exam: ["Exam", "Academic calendar", "Student Handbook"],
    "academic-calendar": ["Academic calendar", "calendar", "Exam"],
    "exam-form": ["Exam Form", "Exam"],
    backlog: ["Backlog Exam Form", "Exam Form"],
    "re-registration": ["Re-registration", "Exam Form"],
    "erp-private-data": ["Student ERP"],
    "academic-facilities": ["Academic facilities", "Academic Block", "Knowledge Resource Centres"],
    general: [],
  };

  if (intentBoosts[analysis.intent].some((term) => title.includes(term.toLowerCase()))) points += 30;
  if (analysis.intent === "erp-private-data" && item.title === "Student ERP") points += 50;
  return points;
}

export function searchKnowledge(
  query: string,
  official: RawItem[] = [],
  student: Array<RawItem | { title: string; body: string }> = [],
  limit = 20,
): IntelligenceItem[] {
  const normalized = query.trim().slice(0, 160);
  const analysis = analyzeAcademicQuery(normalized);
  const knowledge: IntelligenceItem[] = knowledgeItems().map((item) => ({
    kind: item.category === "campus" ? "campus" : "tool",
    title: item.title,
    summary: item.summary,
    url: item.url,
    trust: "official",
    source: "VGU official student knowledge",
  }));
  const items = [...officialItems(official), ...TOOLKIT, ...CAMPUS, ...knowledge, ...studentItems(student)];
  return items
    .map((item, index) => ({ item, score: score(item, normalized, analysis), index }))
    .filter(({score}) => !normalized || score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(Math.max(limit, 1), 20))
    .map(({item}) => item);
}

export const intelligenceCatalog = { toolkit: TOOLKIT, campus: CAMPUS };

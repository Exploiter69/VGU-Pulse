export type IntelligenceItem = {
  kind: "official" | "tool" | "campus" | "student";
  title: string;
  summary: string;
  url?: string;
  trust: "official" | "student-reported";
  source?: string;
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
].map(([title, summary, url]) => ({kind:"campus", title, summary, url, trust:"official", source:"VGU campus facilities"}));

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function score(item: IntelligenceItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return item.kind === "official" ? 20 : item.kind === "campus" ? 10 : 5;
  const haystack = [item.title, item.summary, item.source].join(" ").toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  let points = 0;
  for (const term of terms) {
    if (item.title.toLowerCase().includes(term)) points += 8;
    if (item.summary.toLowerCase().includes(term)) points += 4;
    if (haystack.includes(term)) points += 2;
  }
  if (haystack.includes(q)) points += 10;
  return points;
}

export function searchKnowledge(
  query: string,
  official: RawItem[] = [],
  student: RawItem[] = [],
  limit = 20,
): IntelligenceItem[] {
  const normalized = query.trim().slice(0, 160);
  const items = [...officialItems(official), ...TOOLKIT, ...CAMPUS, ...studentItems(student)];
  return items
    .map((item, index) => ({ item, score: score(item, normalized), index }))
    .filter(({score}) => !normalized || score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(Math.max(limit, 1), 20))
    .map(({item}) => item);
}

export const intelligenceCatalog = { toolkit: TOOLKIT, campus: CAMPUS };

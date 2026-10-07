export type StudentKnowledgeItem = {
  title: string;
  summary: string;
  url: string;
  keywords: string[];
  category: "academic" | "career" | "campus" | "student-life" | "privacy";
};

export const STUDENT_KNOWLEDGE: StudentKnowledgeItem[] = [
  {
    title: "VGU Student Handbook",
    summary: "Official student rules, welfare guidance, examination-cell information and university processes.",
    url: "https://www.vgu.ac.in/Student%20Handbook%202025%20.pdf",
    keywords: ["handbook", "rules", "student rules", "welfare", "examination cell", "grievance"],
    category: "academic",
  },
  {
    title: "VGU Academic Calendars",
    summary: "Official academic-calendar hub. Calendar coverage varies by student cohort and scheme, so check the applicable VGU calendar.",
    url: "https://vgu.ac.in/resources/handbook-brochures",
    keywords: ["academic calendar", "calendar", "semester", "holidays", "classes", "exam schedule"],
    category: "academic",
  },
  {
    title: "VGU Examination Rules",
    summary: "Official examination rules and procedures. Private marks, attendance and personal timetables remain inside the student portal.",
    url: "https://vgu.ac.in/resources/handbook-brochures",
    keywords: ["exam rules", "examination rules", "exam", "examination", "admit card", "results"],
    category: "academic",
  },
  {
    title: "Student ERP",
    summary: "Official student gateway for private academic information such as attendance, marks, results and personal timetable.",
    url: "https://tcsion.com/SelfServices",
    keywords: ["erp", "digicampus", "attendance", "marks", "result", "timetable", "private data"],
    category: "privacy",
  },
  {
    title: "VGU Scholarships",
    summary: "Official scholarship information and eligibility guidance. Always verify the current session's terms before relying on a percentage or deadline.",
    url: "https://vgu.ac.in/scholarship-vgu.php",
    keywords: ["scholarship", "fee waiver", "financial aid", "merit scholarship", "sports scholarship"],
    category: "student-life",
  },
  {
    title: "VGU Training & Placement Cell",
    summary: "Official placement and internship support, career guidance, training and employer engagement.",
    url: "https://ftp.vgu.ac.in/centers-and-cells/training-and-placement-cell",
    keywords: ["placement", "placements", "internship", "internships", "tpo", "career", "job", "training"],
    category: "career",
  },
  {
    title: "VGU Placement Overview",
    summary: "Official placement overview, recruiter information and career ecosystem pages.",
    url: "https://vgu.ac.in/placements/overview",
    keywords: ["placement", "recruiters", "career", "jobs", "placement cell"],
    category: "career",
  },
  {
    title: "VGU Student Clubs & Societies",
    summary: "Official student-club directory covering technical, cultural and social communities and how to join.",
    url: "https://vgu.ac.in/campus-life/clubs",
    keywords: ["club", "clubs", "society", "societies", "events", "student activities", "join club"],
    category: "student-life",
  },
  {
    title: "VGU Hostel Information",
    summary: "Official hostel facilities, services and accommodation information.",
    url: "https://vgu.ac.in/campus-life/hostels",
    keywords: ["hostel", "hostels", "mess", "accommodation", "warden", "zolo", "laundry"],
    category: "student-life",
  },
  {
    title: "VGU Tele Directory",
    summary: "Official university contact directory for academic, welfare, hostel, transport, library and administrative contacts.",
    url: "https://www.vgu.ac.in/assets/Tele%20Directory.pdf",
    keywords: ["contact", "phone", "tele directory", "coe", "student welfare", "transport", "hostel", "library"],
    category: "campus",
  },
  {
    title: "VGU Student Welfare",
    summary: "Student welfare, counselling, extracurricular activity, grievance and discipline support described in the official handbook.",
    url: "https://www.vgu.ac.in/Student%20Handbook%202025%20.pdf",
    keywords: ["student welfare", "counselling", "counseling", "grievance", "discipline", "support"],
    category: "student-life",
  },
  {
    title: "VGU Main Contact",
    summary: "Official university contact and general student-support entry point.",
    url: "https://vgu.ac.in/contact",
    keywords: ["contact vgu", "contact", "helpline", "support", "university contact"],
    category: "campus",
  },
];

export const STUDENT_FAQ: StudentKnowledgeItem[] = [
  {
    title: "Where do I check my attendance?",
    summary: "Pulse cannot access private attendance. Open the official Student ERP and use your authenticated academic portal.",
    url: "https://tcsion.com/SelfServices",
    keywords: ["attendance", "attendence", "my attendance", "attendance percentage"],
    category: "privacy",
  },
  {
    title: "Where do I check my marks or result?",
    summary: "Pulse does not fetch private marks or personal results. Use the official Student ERP or the university's authenticated academic workflow.",
    url: "https://tcsion.com/SelfServices",
    keywords: ["marks", "mark", "result", "results", "grades", "grade card"],
    category: "privacy",
  },
  {
    title: "Where do I check my timetable?",
    summary: "Personal timetable data is private and is not fetched by Pulse. Check the official Student ERP/Digicampus workflow.",
    url: "https://tcsion.com/SelfServices",
    keywords: ["timetable", "time table", "schedule", "class schedule"],
    category: "privacy",
  },
  {
    title: "Where do I fill the exam form?",
    summary: "Use the official VGU exam-form portal linked from the Student Toolkit.",
    url: "https://g01.digialm.com/EForms/html/form53175/login.html",
    keywords: ["exam form", "examination form", "fill exam form", "exam registration"],
    category: "academic",
  },
  {
    title: "Where do I fill the backlog exam form?",
    summary: "Use the official VGU backlog exam-form portal.",
    url: "https://g01.digialm.com/EForms/html/form62421/login.html",
    keywords: ["backlog", "back paper", "supplementary", "arrear", "backlog form"],
    category: "academic",
  },
  {
    title: "Where do I complete re-registration?",
    summary: "Use the official VGU re-registration form portal.",
    url: "https://www.digialm.com/EForms/html/form65798/login.html",
    keywords: ["re registration", "reregistration", "re-register", "semester registration"],
    category: "academic",
  },
  {
    title: "Where can I find VGU academic calendars?",
    summary: "VGU publishes academic calendars through its official handbook/brochure hub. Use the calendar applicable to your cohort and scheme.",
    url: "https://vgu.ac.in/resources/handbook-brochures",
    keywords: ["academic calendar", "calendar", "semester calendar", "holiday calendar"],
    category: "academic",
  },
  {
    title: "Where can I find exam rules?",
    summary: "VGU publishes examination rules through its official handbook/brochure hub. Pulse can surface the official source but does not replace the rules.",
    url: "https://vgu.ac.in/resources/handbook-brochures",
    keywords: ["exam rules", "examination rules", "rules for exam", "exam policy"],
    category: "academic",
  },
  {
    title: "How do I find placements and internships?",
    summary: "The official Training & Placement Cell supports placement drives, internships, career guidance and employability training.",
    url: "https://ftp.vgu.ac.in/centers-and-cells/training-and-placement-cell",
    keywords: ["placement", "placements", "internship", "internships", "tpo", "career"],
    category: "career",
  },
  {
    title: "How do I find a student club?",
    summary: "VGU publishes its student clubs and societies directory, including technical, cultural and social communities and joining guidance.",
    url: "https://vgu.ac.in/campus-life/clubs",
    keywords: ["club", "clubs", "society", "student club", "join club"],
    category: "student-life",
  },
  {
    title: "Where can I find hostel information?",
    summary: "Use VGU's official hostel page for accommodation, facilities and hostel-service information.",
    url: "https://vgu.ac.in/campus-life/hostels",
    keywords: ["hostel", "hostels", "accommodation", "mess", "warden"],
    category: "student-life",
  },
  {
    title: "Who can I contact for student welfare?",
    summary: "The Student Welfare Cell handles student welfare, counselling, extracurricular activities, discipline and grievance support. Use the official handbook/contact directory for current details.",
    url: "https://www.vgu.ac.in/Student%20Handbook%202025%20.pdf",
    keywords: ["student welfare", "welfare", "counselling", "counseling", "grievance", "student support"],
    category: "student-life",
  },
  {
    title: "Where can I find official VGU contacts?",
    summary: "Use the official VGU Tele Directory for published university contacts.",
    url: "https://www.vgu.ac.in/assets/Tele%20Directory.pdf",
    keywords: ["tele directory", "telephone", "phone number", "contact number", "vgu contact"],
    category: "campus",
  },
];

export function knowledgeItems(): StudentKnowledgeItem[] {
  return [...STUDENT_KNOWLEDGE, ...STUDENT_FAQ];
}

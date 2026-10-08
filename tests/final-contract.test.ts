import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const indexSource = readFileSync("src/index.ts", "utf8");
const notificationSource = readFileSync("src/notifications.ts", "utf8");
const webSource = readFileSync("web/index.html", "utf8");
const communityWebSource = readFileSync("web/community-v2.js", "utf8");
const wranglerSource = readFileSync("wrangler.jsonc", "utf8");

describe("final Student OS production contract", () => {
  it("has the attention APIs and scheduled sweep", () => {
    expect(indexSource).toContain('/api/me/notifications');
    expect(indexSource).toContain('/api/me/notifications/read');
    expect(indexSource).toContain('/api/community/insights');
    expect(indexSource).toContain('async scheduled');
    expect(notificationSource).toContain("LIMIT 18");
    expect(notificationSource).toContain('DELETE FROM student_notifications');
    expect(indexSource).toContain('dependencies: { database: dbOk, signal: signalOk }');
  });

  it("has the zero-cost cron schedule", () => {
    expect(wranglerSource).toContain('"crons": ["*/15 * * * *"]');
    expect(wranglerSource).not.toMatch(/redis|kafka|celery|r2/i);
  });

  it("keeps Telegram Mini App safety invariants", () => {
    expect(webSource).toContain('themeChanged');
    expect(webSource).toContain('viewportChanged');
    expect(webSource).toContain('HapticFeedback');
    expect(webSource).toContain('BackButton');
    expect(webSource).toContain('MainButton');
    expect(webSource).toContain('requestFullscreen');
    expect(webSource).toContain('safeAreaChanged');
    expect(webSource).toContain('contentSafeAreaChanged');
    expect(webSource).toContain('navigationStack');
    expect(webSource).not.toMatch(/\bconfirm\s*\(/);
  });


  it("keeps Campus Pulse voting wired to the authenticated poll API", () => {
    expect(webSource).toContain("async function vote(optionId)");
    expect(webSource).toContain('fetch("/api/polls/vote"');
    expect(webSource).toContain('"x-telegram-init-data":initData');
    expect(webSource).toContain("poll_id:Number(poll.id)");
    expect(webSource).toContain("option_id:Number(optionId)");
    expect(webSource).toContain('status.textContent="Participation features are ready."');
  });

  it("keeps the campus renderer isolated from the academic planner", () => {
    const start = webSource.indexOf("function renderCampusGuide()");
    const end = webSource.indexOf("function renderAcademicSummary()", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const campusRenderer = webSource.slice(start, end);
    expect(campusRenderer).toContain("card.append(cat,title,body)");
    expect(campusRenderer).not.toContain("academicItems()");
    expect(campusRenderer).not.toContain("renderAcademic()");
    expect(campusRenderer).not.toContain("renderPersonalAcademicPlan()");
    expect(campusRenderer).not.toContain("row.append");
  });

  it("keeps campus discovery controls wired", () => {
    expect(webSource).toContain('id="campus-search"');
    expect(webSource).toContain('data-campus-category="all"');
    expect(webSource).toContain('data-campus-category="Academics"');
    expect(webSource).toContain('data-campus-category="Health"');
    expect(webSource).toContain('renderCampusGuide();');
    expect(webSource).toContain('button.setAttribute("aria-pressed","true")');
  });

  it("keeps removed legacy student-post UI out of the main app", () => {
    expect(webSource).not.toContain("studentPosts");
    expect(webSource).not.toContain("postForm");
    expect(webSource).not.toContain("postFilter");
    expect(webSource).not.toContain("submitPost");
    expect(webSource).not.toContain("loadStudentPosts");
    expect(webSource).not.toContain("renderStudentPosts");
  });

  it("keeps the main Student OS flows defined and reachable", () => {
    for (const name of ["loadProfiles","loadProfile","loadBlockedPeople","renderAcademic","renderAcademicSummary","hydrateAcademicPlan"]) {
      expect(webSource).toContain("function " + name);
    }
    expect(webSource).not.toContain("function renderStudentPosts");
    expect(webSource).not.toContain("function loadStudentPosts");
    expect(webSource).toContain('querySelectorAll(".stat")');
    expect(webSource).toContain('id="community-insights"');
    expect(webSource).toContain('id="att-mode"');
    expect(webSource).toContain('id="header-notification-badge"');
    expect(webSource).toContain('window.__pulseShare=sharePulse');
    expect(webSource).toContain('/api/share-link?target=');
  });

  it("keeps Telegram sharing, deep links, theme and security headers wired", () => {
    expect(indexSource).toContain('/api/share-link');
    expect(indexSource).toContain('https://api.telegram.org/bot');
    expect(communityWebSource).toContain('start_param');
    expect(webSource).toContain('CloudStorage');
    expect(webSource).toContain('--tg-content-safe-bottom');
    expect(webSource).toContain('pulse-activity-item');
    expect(webSource).toContain('data-activity-id');
    expect(webSource).toContain('__pulseCommunityOpenItem?.');
    expect(communityWebSource).toContain('data-reply-id');
    const headers = readFileSync("web/_headers", "utf8");
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).not.toContain("X-Frame-Options: DENY");
    expect(headers).not.toContain("frame-ancestors 'none'");
  });

  it("keeps private academic data out of the public client contract", () => {
    expect(webSource).toContain("private ERP/Digicampus");
    expect(webSource).toContain("student-reported");
  });
});


describe("personal contribution compatibility", () => {
  it("routes legacy personal contributions through the Community compatibility endpoint", async () => {
    const community = readFileSync("src/community-v2.ts", "utf8");
    const web = readFileSync("web/community-v2.js", "utf8");
    const index = readFileSync("web/index.html", "utf8");
    expect(community).toContain("/api/community-v2/legacy-item");
    expect(web).toContain('source==="legacy"');
    expect(index).toContain("button.dataset.activitySource=");
    expect(index).toContain("item.dataset.activitySource||\"v2\"");
  });
});

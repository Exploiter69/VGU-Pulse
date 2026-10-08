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

  it("keeps the Community runtime bundle cache-busted with its interaction contracts", () => {
    expect(webSource).toMatch(/community-v2\.js\?v=20261008-5/);
    expect(communityWebSource).toContain("const originalPostBodies=new Map()");
    expect(communityWebSource).toContain("originalPostBodies.set(String(item.id),String(item.body??\"\")");
    expect(communityWebSource).toContain("const original=originalPostBodies.get(String(id))");
    expect(communityWebSource).toContain("replyData.reply?.id||replyData.id");
    expect(communityWebSource).toContain("encodeURIComponent(id)");
    expect(communityWebSource).toContain(".cv2-grid>.cv2-field:first-child{grid-column:1/-1}");
  });

  it("keeps Community Phase 1 For You and action-first UX wired", () => {
    const community = readFileSync("src/community-v2.ts", "utf8");
    expect(community).toContain('sort === "for_you"');
    expect(community).toContain('rows.length < Math.min(6, limit)');
    expect(community).toContain('if (forYou && !p)');
    expect(community).toContain('set("community","campus")');
    expect(community).toContain("author_badge");
    expect(communityWebSource).toContain('data-sort="for_you"');
    expect(communityWebSource).toContain('data-sort="trending"');
    expect(communityWebSource).toContain('data-kind="confession"');
    expect(communityWebSource).toContain('data-kind="exam"');
    expect(communityWebSource).toContain('id="cv2-intent-more"');
    expect(communityWebSource).toContain('data-intent="discussion"');
    expect(communityWebSource).toContain('data-intent="question"');
    expect(communityWebSource).toContain('data-intent="confession"');
    expect(communityWebSource).toContain('data-intent="campus"');
    expect(communityWebSource).toContain('data-intent="exam"');
    expect(communityWebSource).toContain('data-intent="senior"');
    expect(communityWebSource).toContain('data-intent="notes"');
    expect(communityWebSource).toContain('data-action="answer"');
    expect(communityWebSource).toContain('Accepted answer');
    expect(communityWebSource).toContain('cv2-solved');
    expect(communityWebSource).toContain('/api/v4/mess-rating');
    expect(communityWebSource).toContain('/api/v4/events');
    expect(communityWebSource).toContain('/api/v4/campus-question');
    expect(communityWebSource).toContain('HapticFeedback');
    expect(communityWebSource).toContain('min-height:44px');
    expect(communityWebSource).toContain('localStorage.getItem("cv2:pulse:"');
  });

  it("keeps Phase 2 Telegram growth contracts bounded and exact", () => {
    expect(indexSource).toContain("DEEP_LINK_RE");
    expect(indexSource).toContain("post:\\d+");
    expect(indexSource).toContain("event:\\d+");
    expect(indexSource).toContain("community:[a-z0-9_-]{1,60}");
    expect(indexSource).toContain("botUsernamePromise");
    expect(indexSource).toContain("expiresAt:Date.now()+6*60*60*1000");
    expect(indexSource).toContain("callback_query");
    expect(indexSource).toContain("vote:\\d+:\\d+");
    expect(indexSource).toContain("rsvp:\\d+");
    expect(indexSource).toContain("remind:\\d+");
    expect(indexSource).toContain("share:card");
    expect(indexSource).toContain("telegram_channel_cards");
    expect(indexSource).toContain("telegram_channel_candidates");
    expect(indexSource).toContain("Today's campus poll");
    expect(indexSource).toContain("Student-reported discussion — not an official VGU announcement.");
    const migration=readFileSync("migrations/0021_telegram_growth_engine.sql","utf8");
    expect(migration).toContain("telegram_channel_cards");
    expect(migration).toContain("telegram_channel_candidates");
    expect(migration).toContain("COUNT(*)>=5");
    expect(migration).toContain("+24 hours");
    expect(communityWebSource).toContain("window.__pulseCommunityOpenCommunity");
    expect(communityWebSource).toContain("startapp");
    expect(communityWebSource).toContain("post:\\d+");
    expect(webSource).toContain("window.__pulseResolveStartApp");
    expect(webSource).toContain("data-poll-id");
    expect(webSource).toContain("data-event-id");
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

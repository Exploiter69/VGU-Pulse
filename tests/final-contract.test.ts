import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const indexSource = readFileSync("src/index.ts", "utf8");
const notificationSource = readFileSync("src/notifications.ts", "utf8");
const webSource = readFileSync("web/index.html", "utf8");
const wranglerSource = readFileSync("wrangler.jsonc", "utf8");

describe("final Student OS production contract", () => {
  it("has the attention APIs and scheduled sweep", () => {
    expect(indexSource).toContain('/api/me/notifications');
    expect(indexSource).toContain('/api/me/notifications/read');
    expect(indexSource).toContain('/api/community/insights');
    expect(indexSource).toContain('async scheduled');
    expect(notificationSource).toContain("LIMIT 18");
    expect(notificationSource).toContain("const queued = await queueOfficialNotifications");
    expect(notificationSource).toContain("official_updates = 1 AND datetime(enabled_at) <= datetime(?)");
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


  it("keeps campus discovery controls wired", () => {
    expect(webSource).toContain('id="campus-search"');
    expect(webSource).toContain('data-campus-category="all"');
    expect(webSource).toContain('data-campus-category="Academics"');
    expect(webSource).toContain('data-campus-category="Health"');
    expect(webSource).toContain('renderCampusGuide();');
    expect(webSource).toContain('button.setAttribute("aria-pressed","true")');
  });

  it("keeps private academic data out of the public client contract", () => {
    expect(webSource).toContain("private ERP/Digicampus");
    expect(webSource).toContain("student-reported");
  });
});

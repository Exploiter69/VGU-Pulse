import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("community V2 contract", () => {
  it("has the complete student-community data model", () => {
    const sql = readFileSync("migrations/0009_community_network.sql", "utf8");
    for (const name of [
      "community_items","community_replies","community_votes","community_follows",
      "community_saves","community_reports","community_poll_options","community_poll_votes",
      "community_reputation","community_reputation_events","community_badges",
    ]) expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${name}`);
    expect(sql).toContain("community_activity");
    expect(sql).toContain("personalized_alerts");
  });

  it("exposes every V2 community capability through one authenticated module", () => {
    const source = readFileSync("src/community-v2.ts", "utf8");
    for (const path of [
      "/api/community-v2/feed","/api/community-v2/reputation","/api/community-v2/replies",
      "/api/community-v2/poll","/api/community-v2/communities","/api/community-v2/search",
      "/api/community-v2/items","/api/community-v2/polls","/api/community-v2/replies",
      "/api/community-v2/vote","/api/community-v2/poll-vote","/api/community-v2/follow",
      "/api/community-v2/save","/api/community-v2/report","/api/community-v2/preferences",
    ]) expect(source).toContain(path);
    for (const kind of [
      "discussion","confession","campus","exam","senior","utility","listing","lost_found",
      "notes","pyq","teammate","ride","roommate","teacher","elective","opportunity",
    ]) expect(source).toContain(`"${kind}"`);
  });

  it("ships the student-facing V2 interface and Ask bridge", () => {
    const source = readFileSync("web/community-v2.js", "utf8");
    for (const text of [
      "Trending","Confessions","Campus help","Exam survival","Senior → junior",
      "Notes / resources","PYQ / exam material","Project teammate","Lost & found",
      "Ride sharing","Room / roommate","Student exchange","Filter","Post",
      "Ask students","Related discussions",
    ]) expect(source).toContain(text);
  });

  it("keeps notifications and personal controls in the primary Me surface", () => {
    const source = readFileSync("web/index.html", "utf8");
    for (const text of ["VGU updates","Post replies","Mark all read","Study plan","People","Student tools"]) {
      expect(source).toContain(text);
    }
  });


  it("keeps ownership, deletion, toggle and blocking contracts wired", () => {
    const backend = readFileSync("src/community-v2.ts", "utf8");
    const web = readFileSync("web/community-v2.js", "utf8");
    expect(backend).toContain('request.method==="DELETE" && url.pathname==="/api/community-v2/items"');
    expect(backend).toContain('request.method==="DELETE" && url.pathname==="/api/community-v2/replies"');
    expect(backend).toContain('item.telegram_user_id!==String(user.id)');
    expect(backend).toContain('blocked_telegram_user_id=i.telegram_user_id');
    expect(backend).toContain('cannot_report_own_item');
    expect(backend).toContain('cannot_report_own_reply');
    expect(web).toContain('data-action="delete"');
    expect(web).toContain('/api/community-v2/items?item_id=');
    expect(web).toContain('/api/community-v2/replies?reply_id=');
    expect(web).toContain('following?"?item_id="');
    expect(web).toContain('saved?"?item_id="');
    expect(web).toContain('data-reply-delete');
  });

  it("keeps critical community controls explicitly wired", () => {
    const source = readFileSync("web/community-v2.js", "utf8");
    expect(source).toContain('id="cv2-compose-close" type="button"');
    expect(source).toContain('$("#cv2-compose-close").onclick');
    expect(source).toContain('<input id="cv2-kind" type="hidden" value="discussion">');
    expect(source).not.toContain('<select id="cv2-kind">');
    expect(source).toContain('if(dialog?.showModal)dialog.showModal()');
  });

  it("never exposes Telegram identity for anonymous content", () => {
    const source = readFileSync("src/community-v2.ts", "utf8");
    expect(source).toContain('const { telegram_user_id: _private, ...publicRow } = row');
    expect(source).toContain('"Anonymous student"');
  });
});

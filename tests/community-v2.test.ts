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
      "Trending","Confessions","Campus pulse","Exam survival","Senior → junior advice",
      "Notes / resources","PYQ / exam material","Project teammate","Lost & found",
      "Ride sharing","Room / roommate","Student exchange","Filter","Post",
      "Ask students","Related discussions",
    ]) expect(source).toContain(text);
  });

  it("keeps notifications and personal controls in the primary Me surface", () => {
    const source = readFileSync("web/index.html", "utf8");
    for (const text of ["VGU updates","Post replies","Mark all read","Academic planner","People profile","Student tools"]) {
      expect(source).toContain(text);
    }
  });

  it("never exposes Telegram identity for anonymous content", () => {
    const source = readFileSync("src/community-v2.ts", "utf8");
    expect(source).toContain('const { telegram_user_id: _private, ...publicRow } = row');
    expect(source).toContain('"Anonymous student"');
  });
});

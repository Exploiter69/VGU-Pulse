import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";

const BOT_TOKEN = "gate-0-test-token";

async function signInitData(
  botToken: string,
  user: Record<string, unknown>,
  authDate = Math.floor(Date.now() / 1000),
): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "gate-0",
    user: JSON.stringify(user),
  });
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const secret = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(botToken),
  );
  const dataKey = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const hash = await crypto.subtle.sign(
    "HMAC",
    dataKey,
    encoder.encode(dataCheckString),
  );
  params.set(
    "hash",
    [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  );
  return params.toString();
}

const server = createTestHarness({
  workers: [
    {
      configPath: "./wrangler.jsonc",
      secrets: { BOT_TOKEN },
      bindingOverrides: { SIGNAL_SERVICE: "signal-mock" },
    },
    {
      config: {
        name: "signal-mock",
        main: "tests/behavior/signal-mock.ts",
        compatibility_date: "2026-10-01",
      },
    },
  ],

  it("enforces the content safety policy without rejecting self-harm support requests", async () => {
    const initData = await signInitData(BOT_TOKEN, { id: 1001, first_name: "Viewer" });
    const post = async (title:string, body:string) => worker.fetch("https://example.test/api/community-v2/items", {
      method:"POST",
      headers:{"content-type":"application/json","x-telegram-init-data":initData},
      body:JSON.stringify({kind:"discussion",title,body}),
    });
    expect((await post("Threat test","i will kill you")).status).toBe(422);
    const support = await post("Need help","I am thinking about suicide and need support");
    expect(support.status).toBe(201);
    await expect(support.json()).resolves.toMatchObject({ok:true,item:{support:true}});
    const benign = await post("Benign test","Can someone explain the library timings?");
    expect(benign.status).toBe(201);
  });

  it("deduplicates reply reports and exposes anonymous blocks without identity", async () => {
    const viewer = await signInitData(BOT_TOKEN,{id:1001,first_name:"Viewer"});
    const env = (await worker.getEnv()) as {DB:D1Database};
    await env.DB.prepare("UPDATE community_items SET anonymous=1 WHERE id=1").run();
    const block = await worker.fetch("https://example.test/api/community-v2/block",{
      method:"POST",headers:{"content-type":"application/json","x-telegram-init-data":viewer},
      body:JSON.stringify({item_id:1}),
    });
    expect(block.status).toBe(200);
    const blocks=await worker.fetch("https://example.test/api/student-profile/blocks",{headers:{"x-telegram-init-data":viewer}});
    expect(blocks.status).toBe(200);
    const blockPayload=await blocks.json();
    expect(blockPayload.profiles[0]).toMatchObject({display_name:"Anonymous author (from post #1)"});
    expect(blockPayload.profiles[0].public_id).toBeNull();

    const report=async()=>worker.fetch("https://example.test/api/community-v2/report-reply",{
      method:"POST",headers:{"content-type":"application/json","x-telegram-init-data":viewer},
      body:JSON.stringify({reply_id:1}),
    });
    expect((await report()).status).toBe(200);
    expect((await report()).status).toBe(200);
    expect((await report()).status).toBe(200);
    const row=await env.DB.prepare("SELECT report_count FROM community_replies WHERE id=1").first<{report_count:number}>();
    expect(Number(row?.report_count)).toBe(1);
  });

  it("strictly merges notification preferences", async () => {
    const viewer=await signInitData(BOT_TOKEN,{id:1001,first_name:"Viewer"});
    const set=async(body:Record<string,unknown>)=>worker.fetch("https://example.test/api/community-v2/preferences",{
      method:"POST",headers:{"content-type":"application/json","x-telegram-init-data":viewer},body:JSON.stringify(body),
    });
    expect((await set({community_activity:true})).status).toBe(200);
    const invalid=await set({community_activity:"false"});
    expect(invalid.status).toBe(400);
    const current=await worker.fetch("https://example.test/api/community-v2/preferences",{headers:{"x-telegram-init-data":viewer}});
    await expect(current.json()).resolves.toMatchObject({preferences:{community_activity:true,personalized_alerts:false}});
  });

});

const worker = server.getWorker("vgu-pulse");

describe("VGU-Pulse real D1 behavior harness", () => {
  beforeAll(async () => {
    await server.listen();
  });

  beforeEach(async () => {
    await server.reset();
    await worker.applyD1Migrations("DB");
    const env = (await worker.getEnv()) as { DB: D1Database };

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)",
      ).bind("1001", "Viewer"),
      env.DB.prepare(
        "INSERT INTO users (telegram_user_id, first_name) VALUES (?, ?)",
      ).bind("2002", "Author"),
      env.DB.prepare(
        "INSERT INTO student_profiles (public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind("viewer-1001", "1001", "Viewer Student", "B.Tech", "CSE", 2, "", ""),
      env.DB.prepare(
        "INSERT INTO student_profiles (public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind("author-2002", "2002", "Author Student", "B.Tech", "CSE", 2, "", ""),
      env.DB.prepare(
        "INSERT INTO community_items (telegram_user_id, kind, title, body, community_slug, status) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind("2002", "discussion", "Replies bind test", "test item", "campus", "published"),
      env.DB.prepare(
        "INSERT INTO community_replies (item_id, telegram_user_id, body, anonymous, status) VALUES (?, ?, ?, ?, ?)",
      ).bind(1, "2002", "hello from author", 0, "published"),
      env.DB.prepare(
        "INSERT INTO community_replies (item_id, telegram_user_id, body, anonymous, status) VALUES (?, ?, ?, ?, ?)",
      ).bind(1, "1001", "hello from viewer", 0, "published"),
    ]);
  });

  afterAll(async () => {
    await server.close();
  });

  it("applies every migration to a fresh D1 database", async () => {
    const env = await worker.getEnv();
    const migrationState = await env.DB.prepare(
      "SELECT name FROM d1_migrations ORDER BY id",
    ).all() as D1Result<{ name: string }>;

    expect(migrationState.results?.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "0001_initial.sql",
        "0009_community_network.sql",
        "0010_gate1_hardening.sql",
      ]),
    );

    const table = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='community_items'",
    ).first() as { name?: string } | null;

    expect(table?.name).toBe("community_items");
  });

  it("returns the published replies for the requested item and viewer", async () => {
    const initData = await signInitData(BOT_TOKEN, {
      id: 1001,
      first_name: "Viewer",
    });

    const response = await worker.fetch(
      "https://example.test/api/community-v2/replies?item_id=1",
      { headers: { "x-telegram-init-data": initData } },
    );

    const payload = await response.json();
    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      replies: [
        { id: 1, author: "Author Student", mine: 0 },
        { id: 2, author: "Viewer Student", mine: 1 },
      ],
    });

    const env = (await worker.getEnv()) as { DB: D1Database };
    await env.DB.prepare("UPDATE community_items SET status='hidden' WHERE id=1").run();

    const hiddenResponse = await worker.fetch(
      "https://example.test/api/community-v2/replies?item_id=1",
      { headers: { "x-telegram-init-data": initData } },
    );
    expect(hiddenResponse.status).toBe(404);
    await expect(hiddenResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "item_not_found",
    });
  });
});

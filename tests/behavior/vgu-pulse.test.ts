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

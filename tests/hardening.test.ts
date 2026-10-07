import { describe, expect, it } from "vitest";
import { validateInitData } from "../src/telegram";
import handler from "../src/index";

async function signInitData(
  botToken: string,
  user: Record<string, unknown>,
  authDate: number,
): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AA-test",
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
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(botToken));
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
  const hash = await crypto.subtle.sign("HMAC", dataKey, encoder.encode(dataCheckString));
  const hex = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  params.set("hash", hex);
  return params.toString();
}

const env = {
  BOT_TOKEN: "test-token",
  APP_NAME: "VGU Pulse",
  DB: {} as D1Database,
  SIGNAL_SERVICE: {} as Fetcher,
};

describe("Phase 15 production hardening", () => {
  it("accepts a correctly signed current Telegram session", async () => {
    const initData = await signInitData(
      env.BOT_TOKEN,
      { id: 12345, first_name: "Alok", username: "alok" },
      Math.floor(Date.now() / 1000),
    );
    await expect(validateInitData(initData, env.BOT_TOKEN)).resolves.toMatchObject({
      user: { id: 12345, first_name: "Alok", username: "alok" },
    });
  });

  it("rejects stale Telegram sessions", async () => {
    const initData = await signInitData(
      env.BOT_TOKEN,
      { id: 12345 },
      Math.floor(Date.now() / 1000) - 86_401,
    );
    await expect(validateInitData(initData, env.BOT_TOKEN)).resolves.toBeNull();
  });

  it("rejects sessions dated too far in the future", async () => {
    const initData = await signInitData(
      env.BOT_TOKEN,
      { id: 12345 },
      Math.floor(Date.now() / 1000) + 61,
    );
    await expect(validateInitData(initData, env.BOT_TOKEN)).resolves.toBeNull();
  });

  it("rejects malformed Telegram user fields", async () => {
    const initData = await signInitData(
      env.BOT_TOKEN,
      { id: 12345, first_name: 99 },
      Math.floor(Date.now() / 1000),
    );
    await expect(validateInitData(initData, env.BOT_TOKEN)).resolves.toBeNull();
  });

  it("does not throw on malformed auth JSON", async () => {
    const response = await handler.fetch(
      new Request("https://example.test/api/auth/telegram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      env,
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("fails closed when the Telegram webhook secret is missing", async () => {
    const response = await handler.fetch(
      new Request("https://example.test/telegram/webhook", {
        method: "POST",
        body: JSON.stringify({ message: { chat: { id: 1 }, text: "/start" } }),
      }),
      { ...env, TELEGRAM_WEBHOOK_SECRET: undefined },
    );
    expect(response.status).toBe(403);
  });

  it("returns a bad-request response instead of throwing on malformed webhook JSON", async () => {
    const response = await handler.fetch(
      new Request("https://example.test/telegram/webhook", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "secret" },
        body: "{",
      }),
      { ...env, TELEGRAM_WEBHOOK_SECRET: "secret" },
    );
    expect(response.status).toBe(400);
  });
});

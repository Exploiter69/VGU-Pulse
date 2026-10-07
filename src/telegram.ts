export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type ValidatedInit = {
  user: TelegramUser;
  auth_date: number;
};

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): Promise<ValidatedInit | null> {
  if (!initData || initData.length > 8192 || !botToken || botToken.length > 512) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!hash || !authDateRaw || !userRaw) return null;

  const authDate = Number(authDateRaw);
  if (!Number.isInteger(authDate) || authDate <= 0) return null;
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > maxAgeSeconds || age < -60) return null;

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

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

  const calculated = await crypto.subtle.sign(
    "HMAC",
    dataKey,
    encoder.encode(dataCheckString),
  );

  const calculatedHex = hex(calculated);
  if (!/^[0-9a-f]{64}$/.test(hash) || calculatedHex.length !== hash.length) return null;
  let mismatch = 0;
  for (let i = 0; i < calculatedHex.length; i += 1) {
    mismatch |= calculatedHex.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  let user: TelegramUser;
  try {
    const parsed: unknown = JSON.parse(userRaw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.id !== "number" || !Number.isSafeInteger(value.id)) return null;
    if (value.username !== undefined && typeof value.username !== "string") return null;
    if (value.first_name !== undefined && typeof value.first_name !== "string") return null;
    if (value.last_name !== undefined && typeof value.last_name !== "string") return null;
    if (typeof value.username === "string" && value.username.length > 64) return null;
    if (typeof value.first_name === "string" && value.first_name.length > 128) return null;
    if (typeof value.last_name === "string" && value.last_name.length > 128) return null;
    user = {
      id: value.id,
      ...(typeof value.username === "string" ? { username: value.username } : {}),
      ...(typeof value.first_name === "string" ? { first_name: value.first_name } : {}),
      ...(typeof value.last_name === "string" ? { last_name: value.last_name } : {}),
    };
  } catch {
    return null;
  }

  return { user, auth_date: authDate };
}

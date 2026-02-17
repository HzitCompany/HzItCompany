import { query } from "./db.js";
import { sha256Hex } from "./tokenHash.js";

export async function createOtpSession(input: { userId: number; token: string; expiresAt: Date }) {
  const tokenHash = sha256Hex(input.token);

  await query(
    "insert into sessions (user_id, token_hash, expires_at) values ($1,$2,$3)",
    [input.userId, tokenHash, input.expiresAt.toISOString()]
  );

  return { tokenHash };
}

export async function isOtpSessionActive(token: string) {
  const tokenHash = sha256Hex(token);

  const rows = await query<{ id: number }>(
    "select id from sessions where token_hash = $1 and revoked_at is null and expires_at > now() limit 1",
    [tokenHash]
  );

  return rows.length > 0;
}

export async function revokeOtpSession(token: string) {
  const tokenHash = sha256Hex(token);

  await query("update sessions set revoked_at = now() where token_hash = $1 and revoked_at is null", [tokenHash]);
}

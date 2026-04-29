/**
 * Tests Vitest sur la signature HMAC + nonce + anti-rejouage.
 * Le code crypto est ré-implémenté ici pour pouvoir le tester sans Deno runtime.
 *
 * Lancer : pnpm test (depuis racine monorepo)
 */
import { describe, it, expect } from "vitest";
import { createHmac, randomBytes } from "node:crypto";

const SECRET = "test-secret-x".repeat(8);

interface QrPayload {
  v: 1;
  vid: string;
  eid: string;
  exp: number;
  iat: number;
  n: string;
}

function base64UrlEncode(input: string | Uint8Array): string {
  const buf = typeof input === "string" ? Buffer.from(input) : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlDecode(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString();
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function makeToken(payload: QrPayload, secret: string): string {
  const json = JSON.stringify(payload);
  const b64 = base64UrlEncode(json);
  const sig = sign(b64, secret);
  return `${b64}.${sig}`;
}

function verify(token: string, secret: string): { ok: boolean; payload?: QrPayload; reason?: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const expected = sign(parts[0]!, secret);
  if (parts[1] !== expected) return { ok: false, reason: "bad_signature" };
  let payload: QrPayload;
  try {
    payload = JSON.parse(base64UrlDecode(parts[0]!));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
  if (payload.v !== 1) return { ok: false, reason: "version" };
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

describe("QR HMAC sign/verify", () => {
  it("verifies a valid token", () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: QrPayload = {
      v: 1,
      vid: "11111111-1111-1111-1111-111111111111",
      eid: "22222222-2222-2222-2222-222222222222",
      iat: now,
      exp: now + 600,
      n: randomBytes(16).toString("hex"),
    };
    const token = makeToken(payload, SECRET);
    const { ok, payload: out } = verify(token, SECRET);
    expect(ok).toBe(true);
    expect(out?.vid).toBe(payload.vid);
    expect(out?.eid).toBe(payload.eid);
  });

  it("rejects a token with wrong secret", () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: QrPayload = {
      v: 1,
      vid: "x",
      eid: "y",
      iat: now,
      exp: now + 600,
      n: "abc",
    };
    const token = makeToken(payload, SECRET);
    const { ok, reason } = verify(token, "OTHER_SECRET");
    expect(ok).toBe(false);
    expect(reason).toBe("bad_signature");
  });

  it("rejects a tampered payload", () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: QrPayload = {
      v: 1,
      vid: "alice",
      eid: "ev",
      iat: now,
      exp: now + 600,
      n: "z",
    };
    const token = makeToken(payload, SECRET);
    // Change le payload mais garde la signature
    const evil = JSON.stringify({ ...payload, vid: "bob" });
    const evilB64 = base64UrlEncode(evil);
    const tamperedToken = `${evilB64}.${token.split(".")[1]}`;
    const { ok, reason } = verify(tamperedToken, SECRET);
    expect(ok).toBe(false);
    expect(reason).toBe("bad_signature");
  });

  it("rejects an expired token", () => {
    const now = Math.floor(Date.now() / 1000);
    const payload: QrPayload = {
      v: 1,
      vid: "x",
      eid: "y",
      iat: now - 3600,
      exp: now - 60,
      n: "n",
    };
    const token = makeToken(payload, SECRET);
    const { ok, reason } = verify(token, SECRET);
    expect(ok).toBe(false);
    expect(reason).toBe("expired");
  });

  it("rejects a malformed token", () => {
    expect(verify("plop", SECRET).ok).toBe(false);
    expect(verify("plop.x.y", SECRET).ok).toBe(false);
    expect(verify("", SECRET).ok).toBe(false);
  });

  it("rejects bad version", () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      v: 99 as any,
      vid: "x",
      eid: "y",
      iat: now,
      exp: now + 600,
      n: "n",
    } as QrPayload;
    const token = makeToken(payload, SECRET);
    const { ok, reason } = verify(token, SECRET);
    expect(ok).toBe(false);
    expect(reason).toBe("version");
  });

  it("uniqueness — same payload generates different tokens via nonce", () => {
    const now = Math.floor(Date.now() / 1000);
    const base = { v: 1 as const, vid: "x", eid: "y", iat: now, exp: now + 600 };
    const t1 = makeToken({ ...base, n: randomBytes(16).toString("hex") }, SECRET);
    const t2 = makeToken({ ...base, n: randomBytes(16).toString("hex") }, SECRET);
    expect(t1).not.toBe(t2);
  });
});

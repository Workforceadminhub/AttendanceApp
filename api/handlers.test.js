// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_lib/supabase.js", () => ({
  supabaseConfigured: vi.fn(() => true),
  insertRows: vi.fn().mockResolvedValue([]),
  insertRowsIdempotent: vi.fn().mockResolvedValue([]),
  selectRows: vi.fn().mockResolvedValue([]),
  updateRows: vi.fn().mockResolvedValue([]),
  callRpc: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_lib/auth.js", async (importOriginal) => ({
  ...(await importOriginal()),
  authorize: vi.fn().mockResolvedValue({ ok: false, status: 401, reason: "no token" }),
  authorizeSuperAdmin: vi.fn().mockResolvedValue({ ok: false, status: 401, reason: "no token" }),
}));

import { authorize, authorizeSuperAdmin } from "./_lib/auth.js";
import { insertRowsIdempotent, selectRows } from "./_lib/supabase.js";
import { checkSendQuota, allowAction } from "./_lib/quota.js";
import emailWebhook, { verifySvixSignature } from "./email-webhook.js";
import smsWebhook from "./sms-webhook.js";
import sendBulkEmail from "./send-bulk-email.js";
import sendBulkSms from "./send-bulk-sms.js";
import uploadEmailImage from "./upload-email-image.js";

function call(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
        return this;
      },
    };
    Promise.resolve(handler({ headers: {}, query: {}, ...req }, res)).catch(reject);
  });
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe("sms-webhook", () => {
  beforeEach(() => {
    process.env.SMS_WEBHOOK_SECRET = "sms-secret";
  });

  it("rejects other methods", async () => {
    expect((await call(smsWebhook, { method: "PUT" })).status).toBe(405);
  });

  it("refuses to run without a configured secret", async () => {
    delete process.env.SMS_WEBHOOK_SECRET;
    expect((await call(smsWebhook, { method: "POST", body: {} })).status).toBe(500);
  });

  it("rejects a missing or wrong secret", async () => {
    expect((await call(smsWebhook, { method: "POST", body: {} })).status).toBe(401);
    expect(
      (await call(smsWebhook, { method: "POST", query: { token: "nope" }, body: {} })).status
    ).toBe(401);
    expect(insertRowsIdempotent).not.toHaveBeenCalled();
  });

  it("stores an authenticated event idempotently", async () => {
    const result = await call(smsWebhook, {
      method: "POST",
      headers: { "x-webhook-secret": "sms-secret" },
      body: { status: "delivered", phone_number: "+2348000000000", sms_uid: "uid-1" },
    });
    expect(result.status).toBe(200);
    expect(insertRowsIdempotent).toHaveBeenCalledWith(
      "sms_events",
      [expect.objectContaining({ status: "delivered", sms_uid: "uid-1" })],
      "sms_uid,status"
    );
  });

  it("caps the batch size", async () => {
    const result = await call(smsWebhook, {
      method: "POST",
      query: { token: "sms-secret" },
      body: Array.from({ length: 101 }, (_, i) => ({ sms_uid: String(i) })),
    });
    expect(result.status).toBe(413);
  });

  it("asks the provider to retry when storage fails", async () => {
    insertRowsIdempotent.mockRejectedValueOnce(new Error("db down"));
    const result = await call(smsWebhook, {
      method: "POST",
      query: { token: "sms-secret" },
      body: { sms_uid: "uid-2", status: "sent" },
    });
    expect(result.status).toBe(500);
  });
});

describe("email-webhook", () => {
  const secretBytes = Buffer.from("resend-signing-key");
  const secret = `whsec_${secretBytes.toString("base64")}`;
  const sign = (id, timestamp, rawBody) =>
    `v1,${createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest("base64")}`;

  it("accepts a valid Svix signature and rejects tampering and replays", () => {
    const now = Date.now();
    const timestamp = String(Math.floor(now / 1000));
    const rawBody = JSON.stringify({ type: "email.delivered" });
    const signature = sign("msg_1", timestamp, rawBody);
    const base = { secret, id: "msg_1", timestamp, signature, rawBody, now };

    expect(verifySvixSignature(base)).toBe(true);
    expect(verifySvixSignature({ ...base, rawBody: `${rawBody} ` })).toBe(false);
    expect(verifySvixSignature({ ...base, id: "msg_2" })).toBe(false);
    expect(verifySvixSignature({ ...base, now: now + 6 * 60 * 1000 })).toBe(false);
    expect(verifySvixSignature({ ...base, secret: undefined })).toBe(false);
  });

  it("rejects an unsigned request without the shared secret", async () => {
    process.env.EMAIL_WEBHOOK_SECRET = "email-secret";
    process.env.RESEND_WEBHOOK_SECRET = secret;
    const result = await call(emailWebhook, { method: "POST", body: "{}" });
    expect(result.status).toBe(401);
    expect(insertRowsIdempotent).not.toHaveBeenCalled();
  });

  it("rejects a forged Svix signature", async () => {
    process.env.RESEND_WEBHOOK_SECRET = secret;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const result = await call(emailWebhook, {
      method: "POST",
      headers: { "svix-id": "msg_1", "svix-timestamp": timestamp, "svix-signature": "v1,AAAA" },
      body: "{}",
    });
    expect(result.status).toBe(401);
  });

  it("accepts a correctly signed Resend event", async () => {
    process.env.RESEND_WEBHOOK_SECRET = secret;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify({ type: "email.delivered", data: { email_id: "e1", to: ["a@example.com"] } });
    const result = await call(emailWebhook, {
      method: "POST",
      headers: {
        "svix-id": "msg_1",
        "svix-timestamp": timestamp,
        "svix-signature": sign("msg_1", timestamp, rawBody),
      },
      body: rawBody,
    });
    expect(result.status).toBe(200);
  });

  it("refuses to run with no secret configured", async () => {
    delete process.env.EMAIL_WEBHOOK_SECRET;
    delete process.env.RESEND_WEBHOOK_SECRET;
    expect((await call(emailWebhook, { method: "POST", body: "{}" })).status).toBe(500);
  });
});

describe("send endpoints reject unauthenticated callers", () => {
  it("send-bulk-email", async () => {
    process.env.EMAIL_FROM = "Team <team@example.com>";
    expect((await call(sendBulkEmail, { method: "GET" })).status).toBe(405);
    const result = await call(sendBulkEmail, { method: "POST", body: { subject: "Hi" } });
    expect(result.status).toBe(401);
    expect(authorize).toHaveBeenCalled();
  });

  it("send-bulk-email refuses raw html from an authorised sender", async () => {
    process.env.EMAIL_FROM = "Team <team@example.com>";
    authorize.mockResolvedValueOnce({ ok: true, code: "ADMIN1" });
    const result = await call(sendBulkEmail, {
      method: "POST",
      body: { subject: "Hi", html: "<script>alert(1)</script>", recipients: ["a@example.com"] },
    });
    expect(result.status).toBe(400);
  });

  it("send-bulk-sms", async () => {
    expect((await call(sendBulkSms, { method: "GET" })).status).toBe(405);
    const result = await call(sendBulkSms, { method: "POST", body: { message: "Hi" } });
    expect(result.status).toBe(401);
    expect(authorizeSuperAdmin).toHaveBeenCalled();
  });

  it("upload-email-image", async () => {
    Object.assign(process.env, {
      AWS_S3_BUCKET: "bucket",
      S3_ACCESS_KEY_ID: "test",
      S3_SECRET_ACCESS_KEY: "test",
    });
    expect((await call(uploadEmailImage, { method: "GET" })).status).toBe(405);
    const result = await call(uploadEmailImage, { method: "POST", body: {} });
    expect(result.status).toBe(401);
    expect(authorize).toHaveBeenCalled();
  });
});

describe("quota", () => {
  const columns = { actorColumn: "sent_by", unitsColumn: "recipient_count" };
  const limits = { maxSends: 2, maxUnits: 100 };

  it("allows a send that fits the hourly window", async () => {
    selectRows.mockResolvedValueOnce([{ recipient_count: 40 }]);
    expect(await checkSendQuota("email_sends", columns, "ADMIN1", 50, limits)).toEqual({ ok: true });
  });

  it("blocks when the send count or recipient total is exhausted", async () => {
    selectRows.mockResolvedValueOnce([{ recipient_count: 1 }, { recipient_count: 1 }]);
    expect((await checkSendQuota("email_sends", columns, "ADMIN1", 1, limits)).ok).toBe(false);

    selectRows.mockResolvedValueOnce([{ recipient_count: 90 }]);
    const result = await checkSendQuota("email_sends", columns, "ADMIN1", 20, limits);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("10 left");
  });

  it("fails closed for paid sends and open for free actions when the store is down", async () => {
    selectRows.mockRejectedValueOnce(new Error("db down"));
    await expect(checkSendQuota("email_sends", columns, "ADMIN1", 1, limits)).rejects.toThrow();

    selectRows.mockRejectedValueOnce(new Error("db down"));
    expect(await allowAction("upload-email-image", "ADMIN1", 5)).toBe(true);
  });

  it("stops a free action at its hourly cap", async () => {
    selectRows.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    expect(await allowAction("upload-email-image", "ADMIN1", 2)).toBe(false);
  });
});

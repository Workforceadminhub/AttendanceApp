#!/usr/bin/env node

/**
 * Locally authenticate a real account for the UX audit browser.
 *
 * The password/pass ID is never printed or written to disk. On success, this
 * script saves only the short-lived API sessions and the minimum user fields the
 * client needs in .ux-audit/<role>.json (mode 0600). Those files are gitignored
 * and should be deleted immediately after the audit browser consumes them.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = resolve(ROOT, ".ux-audit");
const ROLE_NAMES = ["church-admin", "super-admin", "hod"];
const API_URL_KEYS = ["REACT_APP_BASE_URL", "VITE_BASE_URL"];
const SESSION_USER_KEYS = [
  "code", "department", "route", "permissionLevel", "assignedDepartments",
  "permissions", "team", "role", "firstname", "firstName", "lastname",
  "lastName", "fullname", "name", "email", "id", "sub", "workerId",
  "worker_id", "username",
];

function printUsage() {
  console.log(`Usage: node scripts/prepare-ux-audit-login.mjs [--base-url <url>]

Prompts locally for all three audit personas:
  • Church Admin — email and password
  • Super Admin — email and password
  • HOD — pass ID

It writes one gitignored browser session per successful role to
.ux-audit/church-admin.json, .ux-audit/super-admin.json, and .ux-audit/hod.json.
Passwords and pass IDs are never printed or saved.`);
}

function getFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function getApiBaseUrl() {
  const override = getFlag("--base-url");
  if (override) return override.replace(/\/$/, "");

  for (const key of API_URL_KEYS) {
    if (process.env[key]) return process.env[key].replace(/\/$/, "");
  }

  for (const file of [".env.local", ".env"]) {
    try {
      const contents = await readFile(resolve(ROOT, file), "utf8");
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*(REACT_APP_BASE_URL|VITE_BASE_URL)\s*=\s*(.+?)\s*$/);
        if (match) return match[2].replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  throw new Error("No API base URL found. Add it to .env.local or pass --base-url.");
}

function askSecret(prompt) {
  if (!input.isTTY) {
    throw new Error("A TTY is required so the credential can be entered without echoing it.");
  }

  output.write(prompt);
  return new Promise((resolveSecret, rejectSecret) => {
    let value = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          output.write("\n");
          resolveSecret(value);
        } else if (char === "\u0003") {
          cleanup();
          output.write("\n");
          rejectSecret(new Error("Cancelled."));
        } else if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          value += char;
        }
      }
    };

    const cleanup = () => {
      input.removeListener("data", onData);
      input.setRawMode(false);
      input.pause();
    };

    input.on("data", onData);
  });
}

function pickSessionUser(rawUser = {}, extras = {}) {
  const user = {};
  for (const key of SESSION_USER_KEYS) {
    const value = rawUser[key];
    if (value !== undefined && value !== null && value !== "") user[key] = value;
  }
  if (extras.permissionLevel) user.permissionLevel = extras.permissionLevel;
  if (Array.isArray(extras.assignedDepartments) && extras.assignedDepartments.length > 0) {
    user.assignedDepartments = extras.assignedDepartments;
  }
  return user;
}

async function requestSession(baseUrl, mode, identity, secret) {
  const isEmail = mode === "email";
  const response = await fetch(
    `${baseUrl}${isEmail ? "/api/hub/auth/signin" : "/auth/signin"}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isEmail ? { email: identity, password: secret } : { password: secret }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.accessToken) {
    throw new Error(data?.message || data?.error || "Sign-in failed. Check the credential and try again.");
  }
  if (data.mustResetPassword) {
    throw new Error("This account must reset its password before the audit can begin.");
  }
  return data;
}

function getTokenExpiry(accessToken) {
  try {
    const [, payload] = String(accessToken).split(".");
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(exp) ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

async function verifySession(baseUrl, accessToken) {
  const expiry = getTokenExpiry(accessToken);
  if (expiry && expiry.getTime() < Date.now() + 2 * 60 * 1000) {
    throw new Error("The sign-in response contained an expired or near-expiry access token.");
  }

  const response = await fetch(`${baseUrl}/api/departments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`The new session could not access protected data (HTTP ${response.status}).`);
  }
  return expiry;
}

async function saveSession(data, role, mode) {
  const rawUser = data.user ?? {};
  const authUser = pickSessionUser(rawUser, {
    permissionLevel: data.permissionLevel ?? rawUser.permissionLevel,
    assignedDepartments: data.assignedDepartments ?? rawUser.assignedDepartments ?? [],
  });
  const session = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: "prepare-ux-audit-login",
    role,
    mode,
    accessToken: data.accessToken,
    authUser,
  };

  const outputPath = resolve(OUTPUT_DIR, `${role}.json`);
  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
  await rm(outputPath, { force: true });
  const tempPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(session)}\n`, { mode: 0o600 });
  await chmod(tempPath, 0o600);
  await rename(tempPath, outputPath);
  await chmod(outputPath, 0o600);
}

async function clearSessions() {
  await Promise.all(
    ROLE_NAMES.map((role) => rm(resolve(OUTPUT_DIR, `${role}.json`), { force: true }))
  );
}

async function askEmailIdentities() {
  const rl = createInterface({ input, output });
  try {
    const churchAdminEmail = (await rl.question("Church Admin email: ")).trim();
    const superAdminEmail = (await rl.question("Super Admin email: ")).trim();
    if (!churchAdminEmail || !superAdminEmail) {
      throw new Error("Church Admin and Super Admin email addresses are both required.");
    }
    return { churchAdminEmail, superAdminEmail };
  } finally {
    // Release readline before raw input so no secret can be echoed.
    rl.close();
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const baseUrl = await getApiBaseUrl();
  const { churchAdminEmail, superAdminEmail } = await askEmailIdentities();
  const churchAdminPassword = await askSecret("Church Admin password (hidden): ");
  const superAdminPassword = await askSecret("Super Admin password (hidden): ");
  const hodPassId = await askSecret("HOD Pass ID (hidden): ");
  if (![churchAdminPassword, superAdminPassword, hodPassId].every((value) => value.trim())) {
    throw new Error("All three credentials are required.");
  }

  const credentials = [
    { role: "church-admin", mode: "email", identity: churchAdminEmail, secret: churchAdminPassword },
    { role: "super-admin", mode: "email", identity: superAdminEmail, secret: superAdminPassword },
    { role: "hod", mode: "pass-id", identity: "", secret: hodPassId },
  ];

  await clearSessions();
  try {
    for (const credential of credentials) {
      const data = await requestSession(
        baseUrl,
        credential.mode,
        credential.identity,
        credential.secret
      );
      const expiry = await verifySession(baseUrl, data.accessToken);
      await saveSession(data, credential.role, credential.mode);
      const expiryLabel = expiry ? ` (expires ${expiry.toLocaleTimeString()})` : "";
      console.log(`${credential.role} session prepared${expiryLabel}.`);
    }
  } catch (error) {
    await clearSessions();
    throw error;
  }

  console.log("All three role sessions are ready. Tell Codex ‘ready’ to begin the role-based audit.");
}

main().catch((error) => {
  console.error(`Could not prepare UX audit login: ${error.message}`);
  process.exitCode = 1;
});

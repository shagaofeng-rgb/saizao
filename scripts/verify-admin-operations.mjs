// Exercises the production build against isolated database and STARTTLS fixtures.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHmac, scryptSync } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSecureContext, TLSSocket } from "node:tls";
import { setTimeout as delay } from "node:timers/promises";

const secret = "isolated-admin-operations-verification-secret";
const mailbox = "operations@example.test";
const smtpPassword = "isolated-smtp-password";
const temporary = "Fixture-Temporary!1234";
const replacement = "Fixture-Replacement!9876";
const roles = ["super_admin", "admin", "sales", "content_editor", "viewer", "forced"];
const accounts = Object.fromEntries(roles.map((role, i) => [role, {
  account_id: '11111111-1111-4111-8111-11111111111' + i,
  username: role + "@example.test", email: role + "@example.test", display_name: role,
  is_active: true, session_version: 1, role: role === "forced" ? "admin" : role, force_password_reset: role === "forced",
}]));
const forced = accounts.forced;
forced.password_salt = "isolated-fixture-salt";
forced.password_hash = scryptSync(temporary, forced.password_salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("base64url");
const id = "22222222-2222-4222-8222-222222222222";
const deliveries = [], leadStates = [];
let raceGuard = false;

const database = createHttpServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const body = raw ? JSON.parse(raw) : {};
  const url = new URL(req.url, "http://fixture");
  const path = url.pathname.split("/").at(-1);
  const respond = (value) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(value)); };
  if (path === "admin_get_session_account") return respond(Object.values(accounts).filter(a => a.account_id === body.p_account_id));
  if (path === "admin_get_account") return respond(Object.values(accounts).filter(a => a.username === body.p_login));
  if (path === "admin_update_password") {
    assert.equal(body.p_account_id, forced.account_id);
    Object.assign(forced, { password_hash: body.p_password_hash, password_salt: body.p_password_salt, session_version: 2, force_password_reset: false });
    return respond({ updated: true, session_version: 2 });
  }
  if (path === "check_request_limit") return respond({ allowed: true });
  if (path === "admin_create_password_reset") return respond({ account_id: accounts.admin.account_id, username: "fixture-admin", email: mailbox });
  if (path === "submit_lead") return respond({ stored: true, id });
  if (path === "record_lead_notification") { leadStates.push(body.p_status); return respond({ updated: true }); }
  if (path === "admin_dashboard") return respond({ metrics: { visitors: 0, sessions: 0, pageViews: 0, leads: 0 }, countries: [], sources: [], pages: [] });
  if (["admin_list_visitors", "admin_list_leads", "admin_content_issues"].includes(path)) return respond({ items: [], total: 0 });
  if (path === "articles" && url.searchParams.has("id")) {
    if (req.method === "GET") return respond([{ id, status: "draft" }]);
    if (req.method === "PATCH") { raceGuard = url.searchParams.get("status") === "eq.draft"; return respond(raceGuard ? [] : [{ id }]); }
  }
  res.setHeader("Content-Range", "*/0");
  return respond([]);
});

const temp = mkdtempSync(join(tmpdir(), "saizao-smtp-fixture-"));
const key = join(temp, "key.pem"), cert = join(temp, "cert.pem");
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost", "-keyout", key, "-out", cert], { stdio: "ignore" });
const secureContext = createSecureContext({ key: readFileSync(key), cert: readFileSync(cert) });
const smtp = createTcpServer(socket => {
  const attach = (stream, encrypted) => {
    let buffer = "", message = null, authenticated = false;
    const write = (line) => stream.write(line + "\r\n");
    const read = (data) => {
      buffer += data.toString();
      let pos;
      while ((pos = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, pos); buffer = buffer.slice(pos + 2);
        if (message) {
          if (line === ".") { deliveries.push(message.join("\r\n")); message = null; write("250 Queued"); }
          else message.push(line);
        } else if (/^EHLO /i.test(line)) {
          write(encrypted ? "250-localhost\r\n250 AUTH PLAIN" : "250-localhost\r\n250 STARTTLS");
        } else if (line === "STARTTLS" && !encrypted) {
          stream.off("data", read);
          stream.write("220 Ready for TLS\r\n", () => attach(new TLSSocket(socket, { isServer: true, secureContext }), true));
          return;
        } else if (/^AUTH PLAIN /i.test(line)) {
          authenticated = encrypted && Buffer.from(line.split(" ").at(-1), "base64").toString() === "\0" + mailbox + "\0" + smtpPassword;
          write(authenticated ? "235 Authenticated" : "535 Authentication failed");
        } else if (/^(MAIL FROM:|RCPT TO:)/i.test(line)) write(authenticated ? "250 OK" : "530 Authenticate");
        else if (line === "DATA" && authenticated) { message = []; write("354 End with dot"); }
        else if (line === "QUIT") { write("221 Goodbye"); stream.end(); }
        else write("502 Unavailable");
      }
    };
    stream.on("data", read);
    stream.on("error", () => {});
  };
  attach(socket, false);
  socket.write("220 localhost test fixture\r\n");
});
function cookie(account, version = account.session_version) {
  const payload = Buffer.from(JSON.stringify({ accountId: account.account_id, username: account.username, version, issuedAt: Math.floor(Date.now() / 1000) })).toString("base64url");
  return "sz_admin_session=" + payload + "." + createHmac("sha256", secret).update(payload).digest("hex");
}
async function listen(server) { server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port; }
const [dbPort, smtpPort] = await Promise.all([listen(database), listen(smtp)]);
// Reserve the HTTP application port using a server we can close before spawning Next.
const appReservation = createHttpServer();
const chosenPort = await listen(appReservation);
await new Promise(done => appReservation.close(done));
const origin = "http://127.0.0.1:" + chosenPort, requestOrigin = "http://localhost:" + chosenPort;
const app = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(chosenPort)], {
  env: { ...process.env, NODE_ENV: "production", ADMIN_SESSION_SECRET: secret, SUPABASE_URL: "http://127.0.0.1:" + dbPort, SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    GOOGLE_SERVICE_ACCOUNT_JSON: "", GOOGLE_ANALYTICS_PROPERTY_ID: "", SECURITY_FINGERPRINT_SECRET: secret,
    ADMIN_PUBLIC_URL: "https://fixture.example.test", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtpPort), SMTP_USER: mailbox, SMTP_PASSWORD: smtpPassword,
    RESEND_API_KEY: "", ENQUIRY_NOTIFICATION_TO: mailbox, ENQUIRY_NOTIFICATION_FROM: mailbox, NODE_EXTRA_CA_CERTS: cert },
  stdio: ["ignore", "pipe", "pipe"],
});
let appOutput = "";
for (const stream of [app.stdout, app.stderr]) stream.on("data", chunk => { appOutput += chunk; });
function request(path, auth, method = "GET", body, redirect = "manual") {
  const headers = { Origin: requestOrigin, ...(auth ? { Cookie: auth } : {}) };
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(origin + path, { method, headers, redirect, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
}
const common = ["overview", "visitors", "inquiries", "content/products", "content/articles", "categories", "media", "seo", "google"];
const managersOnly = ["staff", "audit", "sync", "retail/shipping"];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await request("/admin/login")).ok) { ready = true; break; } } catch {}
    if (app.exitCode !== null) break;
    await delay(120);
  }
  assert.ok(ready, "Next fixture did not start: " + appOutput);
  let assertions = 0;
  for (const role of ["anonymous", ...roles]) {
    const auth = accounts[role] ? cookie(accounts[role]) : "";
    const manager = ["admin", "super_admin"].includes(role);
    const business = !["anonymous", "forced"].includes(role);
    const allowOrders = manager || role === "sales";
    const tests = [...common.map(p => [p, business]), ...managersOnly.map(p => [p, manager]), ["retail/orders", allowOrders]];
    for (const [path, allowed] of tests) {
      const response = await request("/api/admin/" + path, auth);
      assert.ok(allowed ? response.status === 200 : [401, 403].includes(response.status), role + " " + path + ": " + response.status);
      assertions++;
    }
  }
  const view = cookie(accounts.viewer), editor = cookie(accounts.content_editor), sales = cookie(accounts.sales), admin = cookie(accounts.admin);
  for (const [path, method] of [["content/products", "POST"], ["categories", "POST"], ["media", "DELETE"], ["inquiries/" + id, "PATCH"], ["staff", "POST"]]) {
    assert.ok([401, 403].includes((await request("/api/admin/" + path, view, method, {})).status), "viewer mutation blocked: " + path);
  }
  assert.equal((await request("/api/admin/inquiries/export", sales)).status, 403);
  assert.equal((await request("/api/admin/inquiries/" + id, sales, "PATCH", { assignedTo: id })).status, 403);
  assert.ok([401, 403].includes((await request("/api/admin/retail/orders/" + id, sales, "PATCH", {})).status));
  assert.equal((await request("/api/admin/content/articles", editor, "PATCH", { id, status: "archived" })).status, 409);
  assert.ok(raceGuard, "writes must require the status checked during authorization");
  const old = cookie(forced);
  // Next sends a meta refresh when a redirect occurs after streaming has begun.
  let passwordPath = "/admin", passwordHtml = "";
  for (let hop = 0; hop < 3; hop++) {
    const page = await request(passwordPath, old);
    passwordHtml = await page.text();
    const location = page.headers.get("location") ?? passwordHtml.match(/<meta\b[^>]*\bcontent="\d+;url=(\/admin\/[^" ]+)"/i)?.[1];
    if (!location) break;
    passwordPath = new URL(location, origin).pathname;
  }
  assert.equal(passwordPath, "/admin/change-password");
  assert.match(passwordHtml, /设置新密码/);
  assert.doesNotMatch(passwordHtml, /aria-label="后台导航"/);
  const changed = await request("/api/admin/change-password", old, "POST", { currentPassword: temporary, newPassword: replacement });
  assert.equal(changed.status, 200);
  assert.equal((await request("/api/admin/overview", old)).status, 401);
  const fresh = changed.headers.get("set-cookie")?.split(";")[0];
  assert.equal((await request("/api/admin/overview", fresh)).status, 200);
  assert.equal((await request("/api/admin/mail-check", view, "POST")).status, 403);
  const checked = await request("/api/admin/mail-check", admin, "POST");
  assert.equal(checked.status, 200);
  assert.equal((await checked.json()).state, "ready", "SMTP check must authenticate via STARTTLS");
  assert.equal(deliveries.length, 0, "connection check must not transmit email");
  const form = new FormData();
  for (const [k, v] of Object.entries({ name: "Fixture buyer", company: "Fixture company", email: "buyer@example.test", brief: "A complete fixture enquiry for local SMTP verification", privacyAccepted: "yes" })) form.set(k, v);
  assert.equal((await request("/api/request-a-quote", "", "POST", form)).status, 200);
  for (let i = 0; i < 60 && !leadStates.length; i++) await delay(100);
  assert.deepEqual(leadStates, ["sent"]);
  assert.match(deliveries[0], /Fixture company/);
  assert.equal((await request("/api/admin/forgot-password", "", "POST", { login: mailbox })).status, 200);
  assert.equal(deliveries.length, 2);
  assert.match(deliveries[1].replace(/=\r\n/g, ""), /\/admin\/reset-password/);
  console.log(assertions + " authorization checks passed. First login password enforcement, edit conflict, SMTP handshake, enquiry delivery, and password recovery passed.");
} finally {
  app.kill("SIGTERM");
  smtp.close();
  database.close();
  rmSync(temp, { recursive: true, force: true });
}

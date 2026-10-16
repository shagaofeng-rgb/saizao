// Exercise the built API against an isolated local upstream. No production data is written.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

const accountId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";
const secret = "isolated-product-upload-verification-only-secret";
const writes = [];
let appOutput = "";
const upstream = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const body = raw ? JSON.parse(raw) : null;
  const url = new URL(request.url, "http://local.test");
  response.setHeader("Content-Type", "application/json");
  if (url.pathname === "/rest/v1/rpc/admin_get_session_account") return response.end(JSON.stringify([{ is_active: true, session_version: 1, role: "admin", email: "verification@example.test", display_name: "Local verification", force_password_reset: false }]));
  if (request.method === "GET" && url.pathname === "/rest/v1/content_categories") return response.end(JSON.stringify([{ id: categoryId }]));
  if (request.method === "POST" && url.pathname === "/rest/v1/products") {
    if (body.slug === "duplicate-product") { response.statusCode = 409; return response.end(JSON.stringify({ message: "unique constraint" })); }
    writes.push(body); return response.end(JSON.stringify([{ id: productId, ...body }]));
  }
  if (url.pathname === "/rest/v1/rpc/admin_log_audit") return response.end("{}");
  response.statusCode = 500; response.end(JSON.stringify({ message: `Unexpected upstream path ${url.pathname}` }));
});
upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
const portReservation = createServer(); portReservation.listen(0, "127.0.0.1"); await once(portReservation, "listening");
const appPort = portReservation.address().port; await new Promise((resolve) => portReservation.close(resolve));
const upstreamPort = upstream.address().port;
const app = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
  env: { ...process.env, NODE_ENV: "production", ADMIN_SESSION_SECRET: secret, SUPABASE_URL: `http://127.0.0.1:${upstreamPort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${upstreamPort}`, SUPABASE_SERVICE_ROLE_KEY: "local-verification-only" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (const stream of [app.stdout, app.stderr]) stream.on("data", (chunk) => { appOutput += chunk; });
const origin = `http://127.0.0.1:${appPort}`;
// NextRequest normalizes loopback IP URLs to localhost.
const requestOrigin = `http://localhost:${appPort}`;
const payload = Buffer.from(JSON.stringify({ accountId, username: "verification@example.test", version: 1, issuedAt: Math.floor(Date.now() / 1000) })).toString("base64url");
const cookie = `sz_admin_session=${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
const image = (file) => `https://pohsefmowgthjskmbkyg.supabase.co/storage/v1/object/public/website-media/verification/${file}.webp`;
const draft = { title: "Local verification draft", slug: "local-verification-draft", categoryId, summary: "Summary", content: "Product description", coverUrl: image("cover"), heroUrl: image("hero"), gallery: [{ url: image("detail"), alt: "Detail image" }], status: "draft" };
async function post(body, options = {}) {
  return fetch(`${origin}/api/admin/content/products`, { method: "POST", headers: { "Content-Type": "application/json", Origin: requestOrigin, Cookie: cookie, ...options.headers }, body: options.raw ?? JSON.stringify(body) });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${origin}/admin/login`)).ok) { ready = true; break; } } catch {}
    if (app.exitCode !== null) throw new Error(`App exited before startup: ${appOutput}`);
    await delay(150);
  }
  assert.ok(ready, `App did not start: ${appOutput}`);
  assert.equal((await post(draft, { headers: { Cookie: "" } })).status, 401, "anonymous creation must be refused");
  assert.equal((await post(draft, { headers: { Origin: "https://other.example.test" } })).status, 400, "cross-origin creation must be refused");
  assert.equal((await post(null)).status, 400, "null payload must not crash");
  const publication = await post({ ...draft, status: "published" });
  assert.equal(publication.status, 403, `new products must pass the detail publication checks: ${await publication.text()}`);
  assert.equal((await post({ ...draft, heroUrl: "https://other.example.test/image.jpg" })).status, 400, "unsupported media hosts must be refused");
  assert.equal((await post({ ...draft, gallery: Array.from({ length: 13 }, () => draft.gallery[0]) })).status, 400, "oversized galleries must be refused");
  assert.equal(writes.length, 0, "failed requests must not create products");
  const response = await post(draft); assert.equal(response.status, 200);
  const saved = await response.json(); assert.equal(saved.data.id, productId);
  assert.equal(writes.length, 1); assert.equal(writes[0].category_id, categoryId);
  assert.equal(writes[0].cover_url, draft.coverUrl); assert.equal(writes[0].hero_url, draft.heroUrl);
  assert.deepEqual(writes[0].gallery, draft.gallery); assert.equal(writes[0].status, "draft");
  assert.equal(writes[0].retail_enabled, false); assert.equal(writes[0].created_by, accountId);
  assert.equal((await post({ ...draft, slug: "duplicate-product" })).status, 400);
  assert.equal(writes.length, 1, "duplicate slugs must not create a second product");
  console.log("Product creation API verified: authentication, validation, media persistence, draft status and duplicate handling. Production data was not touched.");
} finally {
  if (app.exitCode === null) { const stopped = once(app, "exit"); app.kill("SIGTERM"); await stopped; }
  await new Promise((resolve) => upstream.close(resolve));
}

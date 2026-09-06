const DAY = 86400000;
const reply = (data, status = 200) => Response.json(data, { status });

async function readPayload(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  if (Number(request.headers.get("content-length")) > 8192) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0, chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); } catch { return null; }
}
function publicMessage(row) {
  return { id: row.id, name: row.name, body: row.body, createdAt: row.created_at };
}
async function route(request, env) {
  const url = new URL(request.url);
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim());
  const origin = request.headers.get("origin");
  if (origin && !allowed.includes(origin)) return reply({ error: "此来源不允许访问留言服务。" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (url.pathname !== "/messages") return reply({ error: "未找到此接口。" }, 404);
  if (!env.DB) return reply({ error: "留言服务尚未配置完成。" }, 503);
  if (request.method === "GET") {
    const raw = url.searchParams.get("before");
    const before = raw === null ? Number.MAX_SAFE_INTEGER : Number(raw);
    if (!Number.isSafeInteger(before) || before < 1) return reply({ error: "无效页码。" }, 400);
    const { results } = await env.DB.prepare("SELECT id, name, body, created_at FROM messages WHERE hidden = 0 AND id < ? ORDER BY id DESC LIMIT 21").bind(before).all();
    const rows = results.slice(0, 20);
    return reply({ messages: rows.map(publicMessage), nextBefore: results.length > 20 ? rows.at(-1).id : null });
  }
  if (request.method !== "POST") return reply({ error: "不支持此操作。" }, 405);
  // Browsers must explicitly opt in to this JSON request via a permitted origin.
  if (!origin || !allowed.includes(origin)) return reply({ error: "请从网站留言板提交。" }, 403);
  if (!env.IP_HASH_SALT || !request.headers.get("cf-connecting-ip")) return reply({ error: "留言服务尚未配置完成。" }, 503);
  const input = await readPayload(request);
  if (!input || typeof input !== "object" || typeof input.body !== "string" || typeof input.name !== "string" || input.website) return reply({ error: "请检查留言内容。" }, 400);
  const name = input.name.trim() || "一位访客", body = input.body.trim();
  if (name.length > 30 || body.length < 2 || body.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name + body)) return reply({ error: "昵称最多 30 字，留言需为 2—1000 字。" }, 400);
  if (typeof input.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) return reply({ error: "请刷新页面后重试。" }, 400);
  const encoded = new TextEncoder().encode(`${env.IP_HASH_SALT}:${request.headers.get("cf-connecting-ip")}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const visitor = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // Retry-safe: a timeout after a successful write must not create a duplicate.
  const previous = await env.DB.prepare("SELECT id, name, body, created_at, visitor_hash FROM messages WHERE request_id = ?").bind(input.requestId).first();
  if (previous) {
    if (previous.visitor_hash !== visitor || previous.name !== name || previous.body !== body) return reply({ error: "提交内容已变化，请重新打开留言板后重试。" }, 409);
    return reply({ message: publicMessage(previous) });
  }
  const now = Date.now();
  // One atomic INSERT ... SELECT keeps concurrent requests inside the rate limit.
  const result = await env.DB.prepare(`INSERT INTO messages (request_id, name, body, created_at, visitor_hash)
    SELECT ?, ?, ?, ?, ? WHERE
    (SELECT COUNT(*) FROM messages WHERE visitor_hash = ? AND created_at > ?) = 0 AND
    (SELECT COUNT(*) FROM messages WHERE visitor_hash = ? AND created_at > ?) < 10
    ON CONFLICT(request_id) DO NOTHING`)
    .bind(input.requestId, name, body, now, visitor, visitor, now - 60000, visitor, now - DAY).run();
  const saved = await env.DB.prepare("SELECT id, name, body, created_at, visitor_hash FROM messages WHERE request_id = ?").bind(input.requestId).first();
  if (saved && saved.visitor_hash === visitor && saved.name === name && saved.body === body) return reply({ message: publicMessage(saved) }, result.meta.changes ? 201 : 200);
  return reply({ error: "请稍候再留言：每分钟 1 条，每 24 小时最多 10 条。" }, 429);
}

export default {
  async fetch(request, env) {
    let response;
    try { response = await route(request, env); }
    catch { response = reply({ error: "留言服务暂时不可用，请稍后重试。" }, 503); }
    const headers = new Headers(response.headers);
    const origin = request.headers.get("origin");
    if (origin && (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin");
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event, env) {
    // Keep public messages, but unlink the anti-spam network marker after 24–48 h.
    await env.DB.prepare("UPDATE messages SET visitor_hash = NULL WHERE created_at < ? AND visitor_hash IS NOT NULL").bind(Date.now() - DAY).run();
  }
};

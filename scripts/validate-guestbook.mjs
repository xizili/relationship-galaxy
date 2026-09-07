// Real SQLite, no account, network, public messages or browser permissions required.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../guestbook/worker.js";
import pagesWorker from "../guestbook/pages/public/_worker.js";
import { initGuestbook } from "../src/guestbook.js";

const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("../guestbook/migrations/0001_messages.sql", import.meta.url), "utf8"));
const DB = { prepare(sql) {
  return { bind(...args) {
    const query = db.prepare(sql);
    return {
      async first() { return query.get(...args) ?? null; },
      async all() { return { results: query.all(...args) }; },
      async run() { return { meta: { changes: Number(query.run(...args).changes) } }; }
    };
  } };
} };
const origin = "https://xizili.github.io";
const env = { DB, ALLOWED_ORIGINS: origin, IP_HASH_SALT: "test-only-not-a-production-secret" };
const headers = { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" };
const request = (method = "GET", body, extra = {}, path = "/messages") => new Request(`https://example.invalid${path}`, { method, headers: { ...headers, ...extra }, ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }) });
const input = { name: "访客 <script>", body: "测试：关系图很好，<img src=x onerror=alert(1)> 作为纯文字保留。", website: "", requestId: crypto.randomUUID() };
let res = await worker.fetch(request(), env);
assert.deepEqual((await res.json()).messages, []);
res = await worker.fetch(request("OPTIONS"), env); assert.equal(res.status, 204); assert.equal(res.headers.get("access-control-allow-origin"), origin);
res = await worker.fetch(request("POST", input, { Origin: "https://other.invalid" }), env); assert.equal(res.status, 403); assert.equal(res.headers.get("access-control-allow-origin"), null);
assert.equal((await worker.fetch(request("POST", "{bad json"), env)).status, 400);
assert.equal((await worker.fetch(request("POST", { ...input, body: "x".repeat(9000) }), env)).status, 400);
assert.equal((await worker.fetch(request("POST", { ...input, website: "spam" }), env)).status, 400);
assert.equal((await worker.fetch(request("POST", { ...input, body: "😀" }), env)).status, 400, "单个 emoji 不满足两字下限，不应导致数据库异常");
assert.equal((await worker.fetch(request("POST", input), { ...env, IP_HASH_SALT: "" })).status, 503);
res = await worker.fetch(request("POST", input), env); assert.equal(res.status, 201);
const saved = (await res.json()).message;
assert.equal(saved.body, input.body); assert.equal(saved.name, input.name); assert.ok(!("visitor_hash" in saved));
assert.equal((await worker.fetch(request("POST", input), env)).status, 200, "超时重试不重复保存");
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM messages").get().count, 1);
assert.equal((await worker.fetch(request("POST", { ...input, requestId: crypto.randomUUID() }), env)).status, 429);
assert.equal((await worker.fetch(request("POST", { ...input, body: "修改内容" }), env)).status, 409);
assert.equal((await worker.fetch(request("POST", { ...input, requestId: crypto.randomUUID() }, { "CF-Connecting-IP": "192.0.2.2" }), env)).status, 201, "不同访客共享同一留言板");
res = await worker.fetch(request(), env); const entries = (await res.json()).messages; assert.equal(entries.length, 2);
assert.ok(!JSON.stringify(entries).includes("visitor_hash"));
const raw = db.prepare("SELECT * FROM messages LIMIT 1").get();
assert.match(raw.visitor_hash, /^[a-f0-9]{64}$/); assert.ok(!raw.visitor_hash.includes("192.0.2.1"));
db.prepare("UPDATE messages SET hidden=1 WHERE id=?").run(saved.id);
const hiddenRetry = await (await worker.fetch(request("POST", input), env)).json();
assert.equal(hiddenRetry.visible, false, "被隐藏的旧留言重试不应声称仍然公开");
assert.equal((await (await worker.fetch(request(), env)).json()).messages.length, 1);
db.prepare("UPDATE messages SET created_at=?").run(Date.now() - 3 * 86400000);
await worker.scheduled({}, env);
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM messages WHERE visitor_hash IS NOT NULL").get().count, 0);
res = await worker.fetch(request("POST", input), env);
assert.equal(res.status, 409);
assert.match((await res.json()).error, /先复制留言文字，再刷新/);
for (let i = 0; i < 25; i += 1) db.prepare("INSERT INTO messages (request_id, name, body, created_at) VALUES (?, ?, ?, ?)").run(crypto.randomUUID(), "分页访客", "第 " + i + " 条", Date.now());
res = await worker.fetch(request(), env); const first = await res.json(); assert.equal(first.messages.length, 20); assert.ok(first.nextBefore);
res = await worker.fetch(request("GET", undefined, {}, `/messages?before=${first.nextBefore}`), env); const second = await res.json();
assert.equal(second.messages.length, 6); assert.equal(second.nextBefore, null);
assert.ok(second.messages.every((b) => !first.messages.some((a) => a.id === b.id)));
assert.equal((await worker.fetch(request("GET", undefined, {}, "/messages?before=abc"), env)).status, 400);
assert.equal((await worker.fetch(request("DELETE"), env)).status, 405, "匿名访客不得删帖");
const pagesList = await pagesWorker.fetch(request(), env);
assert.equal(pagesList.status, 200);
assert.deepEqual(await pagesList.json(), await (await worker.fetch(request(), env)).json(), "Pages 入口必须使用同一数据库和业务逻辑");
assert.equal((await pagesWorker.fetch(request("OPTIONS"), env)).status, 204);
assert.equal((await pagesWorker.fetch(request("POST", input, { Origin: "https://other.invalid" }), env)).status, 403);
assert.equal(pagesWorker.scheduled, undefined, "Pages 只提供 HTTP，定时清理由原 Worker 执行");
const source = readFileSync(new URL("../src/guestbook.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /innerHTML|localStorage|sessionStorage/, "留言不得注入 HTML 或伪装为浏览器本地共享存储");
assert.match(source, /body\.textContent = message\.body/);
assert.match(source, /尚未开放/);
assert.match(readFileSync(new URL("../index.html", import.meta.url), "utf8"), /mailto:neuroplus@126.com/);

// Exercise the real dialog module with a small DOM stand-in and the actual worker.
class Element {
  constructor() { this.listeners = {}; this.children = []; this.disabled = true; this.values = { name: "", body: "", website: "" }; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  fire(type) { return this.listeners[type]?.({ preventDefault() {} }); }
  append(...children) { this.children.push(...children); }
  replaceChildren() { this.children = []; }
  showModal() { this.open = true; } close() { this.open = false; }
  reportValidity() { return true; }
  reset() { this.values = { name: "", body: "", website: "" }; }
}
const dom = () => {
  const elements = new Map();
  return { querySelector(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement() { return new Element(); } };
};
const settle = async () => { for (let i = 0; i < 8; i += 1) await new Promise(setImmediate); };
let root = dom(), calls = 0;
initGuestbook({ root, baseUrl: "/relationship-galaxy/", fetcher: async () => { calls += 1; return Response.json({ apiUrl: "" }); } });
root.querySelector("#guestbookToggle").fire("click"); await settle();
assert.equal(root.querySelector("#guestbookDialog").open, true);
assert.equal(root.querySelector("#guestbookFields").disabled, true);
assert.match(root.querySelector("#guestbookStatus").textContent, /尚未开放/);
assert.equal(calls, 1, "无后台时只读设置，不伪造成功或发出提交");
root.querySelector("#guestbookClose").fire("click"); assert.equal(root.querySelector("#guestbookDialog").open, false);
root = dom();
const realFormData = globalThis.FormData;
globalThis.FormData = class { constructor(form) { this.values = { ...form.values }; } get(name) { return this.values[name] ?? ""; } };
let losePostResponse = true;
try {
  initGuestbook({ root, baseUrl: "/relationship-galaxy/", fetcher: async (url, options = {}) => {
    if (url.endsWith("guestbook-config.json")) return Response.json({ apiUrl: "https://example.invalid" });
    const response = await worker.fetch(new Request(url, { ...options, headers: { ...headers, ...options.headers, "CF-Connecting-IP": "192.0.2.42" } }), env);
    if (options.method === "POST" && losePostResponse) { losePostResponse = false; throw new Error("连接中断，请重试。"); }
    return response;
  } });
  root.querySelector("#guestbookToggle").fire("click"); await settle();
  assert.equal(root.querySelector("#guestbookFields").disabled, false);
  assert.equal(root.querySelector("#guestbookMessages").children.length, 20);
  assert.equal(root.querySelector("#guestbookMore").hidden, false);
  await root.querySelector("#guestbookMore").fire("click");
  assert.equal(root.querySelector("#guestbookMessages").children.length, 26);
  const form = root.querySelector("#guestbookForm");
  form.values = { name: "界面访客", body: "<script>只是文字</script>", website: "" }; form.fire("input");
  await form.fire("submit");
  assert.match(root.querySelector("#guestbookStatus").textContent, /连接中断/);
  assert.equal(form.values.body, "<script>只是文字</script>", "失败时保留草稿");
  await form.fire("submit");
  assert.match(root.querySelector("#guestbookStatus").textContent, /已发表/);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM messages WHERE name='界面访客'").get().count, 1);
  assert.equal(root.querySelector("#guestbookMessages").children[0].children[1].textContent, "<script>只是文字</script>");
  form.values = { name: "界面访客", body: "过于频繁的第二条", website: "" }; form.fire("input");
  await form.fire("submit");
  assert.match(root.querySelector("#guestbookStatus").textContent, /请稍候/);
  assert.equal(form.values.body, "过于频繁的第二条");
} finally { globalThis.FormData = realFormData; }
db.close();
console.log("留言后台测试通过：SQLite 持久化路径、跨访客读取、输入校验、限流、幂等、分页、隐藏留言、隐私清理和跨域检查。");

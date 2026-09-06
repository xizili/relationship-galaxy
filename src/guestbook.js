// Only the public API address lives here. Messages are never stored in a visitor's browser.
export function initGuestbook({ root = document, fetcher = fetch, baseUrl = import.meta.env.BASE_URL } = {}) {
  const dialog = root.querySelector("#guestbookDialog");
  const form = root.querySelector("#guestbookForm");
  const fields = root.querySelector("#guestbookFields");
  const status = root.querySelector("#guestbookStatus");
  const list = root.querySelector("#guestbookMessages");
  const more = root.querySelector("#guestbookMore");
  const retry = root.querySelector("#guestbookRetry");
  let endpoint = "", before = null, busy = false, initialized = false;
  let requestId = crypto.randomUUID();
  const say = (message) => { status.textContent = message; };

  async function request(path, options = {}) {
    const response = await fetcher(`${endpoint}${path}`, { ...options, signal: AbortSignal.timeout(12000), credentials: "omit" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "留言服务暂时不可用，请稍后重试。");
    return payload;
  }
  function appendMessages(messages) {
    for (const message of messages) {
      const article = root.createElement("article");
      const heading = root.createElement("header");
      const name = root.createElement("strong");
      const date = root.createElement("time");
      const body = root.createElement("p");
      name.textContent = message.name;
      date.dateTime = new Date(message.createdAt).toISOString();
      date.textContent = new Date(message.createdAt).toLocaleDateString("zh-CN");
      body.textContent = message.body;
      heading.append(name, date); article.append(heading, body); list.append(article);
    }
  }
  async function loadMessages(append = false) {
    const data = await request(`/messages${append && before ? `?before=${before}` : ""}`);
    if (!append) list.replaceChildren();
    appendMessages(data.messages);
    before = data.nextBefore;
    more.hidden = !before;
    say(data.messages.length || append ? "留言对所有访客公开。" : "还没有留言，欢迎写下第一条。 ");
  }
  async function connect() {
    if (busy) return;
    busy = true; retry.hidden = true; fields.disabled = true;
    say("正在连接留言板…");
    try {
      const response = await fetcher(`${baseUrl}guestbook-config.json`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("无法读取留言板设置，请稍后重试。");
      const config = await response.json();
      if (!config.apiUrl) {
        say("公开留言板尚未开放，正在准备留言存储服务。现在可通过下方邮箱私信。");
        return;
      }
      const url = new URL(config.apiUrl);
      if (url.protocol !== "https:" && !(["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol === "http:")) throw new Error("留言服务地址设置有误。");
      endpoint = url.href.replace(/\/$/, "");
      await loadMessages();
      fields.disabled = false; initialized = true;
    } catch (error) {
      say(error.name === "TimeoutError" ? "连接超时，请重试，或使用下方邮箱私信。" : "留言板暂时无法连接，请重试，或使用下方邮箱私信。");
      retry.hidden = false;
    } finally { busy = false; }
  }
  root.querySelector("#guestbookToggle").addEventListener("click", () => {
    if (!dialog.open) dialog.showModal();
    if (!initialized) void connect();
  });
  root.querySelector("#guestbookClose").addEventListener("click", () => dialog.close());
  form.addEventListener("input", () => { requestId = crypto.randomUUID(); });
  retry.addEventListener("click", () => void connect());
  more.addEventListener("click", async () => {
    if (busy) return;
    busy = true; more.disabled = true;
    try { await loadMessages(true); } catch { say("较早的留言加载失败，请再试一次。"); }
    finally { busy = false; more.disabled = false; }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!initialized || busy || !form.reportValidity()) return;
    const data = new FormData(form);
    busy = true; fields.disabled = true; say("正在发表…");
    try {
      await request("/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), body: data.get("body"), website: data.get("website"), requestId })
      });
      form.reset(); requestId = crypto.randomUUID();
      try { await loadMessages(); say("留言已发表，所有访客都可以看到。"); }
      catch { say("留言已发表，但列表刷新失败。请重新连接查看，无需重复提交。"); retry.hidden = false; }
    } catch (error) { say(error.message || "发表失败，文字已保留，请稍后重试。"); }
    finally { busy = false; fields.disabled = false; }
  });
}

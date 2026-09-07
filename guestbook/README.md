# 公开留言板

网页仍托管在 GitHub Pages。留言通过 Cloudflare Pages Functions 写入 D1 数据库，所有访客共享，无需登录。

- 主站：https://xizili.github.io/relationship-galaxy/
- 生产 API：https://relationship-galaxy-guestbook.pages.dev（列表及提交路径 `/messages`）
- 数据库：`relationship-galaxy-guestbook`，绑定名称 `DB`。
- 原 Worker 只保留每日清理任务，`workers_dev` 与 `preview_urls` 均关闭，不再提供第二个 HTTP 入口。

2026-09-07 已通过真实 HTTP 检查：匿名发表、独立请求读取、重复提交不重复入库、限流、跨域预检、错误来源拒绝、禁止匿名删除，以及管理员隐藏。实际访问测试通过不代表所有地区和网络均保证可达。

## 部署与后续维护

1. 将 `wrangler.jsonc.example` 和 `pages/wrangler.jsonc.example` 分别复制为同目录的 `wrangler.jsonc`，填入同一数据库的真实 ID。这两个本地配置已被 Git 忽略；凭据和安全密钥不得写入源码或前端。
2. 初次配置时，在项目根目录运行 `wrangler d1 migrations apply relationship-galaxy-guestbook --remote --config guestbook/wrangler.jsonc`。已应用的迁移不可改写；以后增加新迁移。
3. 在项目根目录运行 `wrangler deploy --config guestbook/wrangler.jsonc`，发布清理任务。保持 HTTP 入口关闭。该任务每天 03:00 UTC（北京时间 11:00）清理超过 24 小时的网络标记。
4. 初次配置时，创建生产分支为 `main` 的 Pages 项目 `relationship-galaxy-guestbook`。进入 `guestbook/pages`，使用 `wrangler pages secret put IP_HASH_SALT --project-name relationship-galaxy-guestbook` 设置至少 32 字节的随机密钥，仅保存于后台。应先设置密钥再部署；不要在每次更新时更换密钥。
5. 在 `guestbook/pages` 运行 `wrangler pages deploy public --project-name relationship-galaxy-guestbook --branch main`。保留默认打包，不能加 `--no-bundle`；适配入口会导入同一份 `guestbook/worker.js`，不复制业务逻辑。输出目录只包含公开部署文件，不包含配置或凭据。
6. 将真实、稳定的生产地址填入 `public/guestbook-config.json` 的 `apiUrl`（不加 `/messages`），构建并发布 GitHub Pages。先验证匿名读写和隐藏功能，再开放前端入口；测试完成后只清理明确标记的测试留言。

Pages 的密钥和数据库绑定在部署时生效，调整后需要重新部署。Pages 不执行定时任务，因此不能删除原 Worker 的清理任务。若将来需要两个同时运行的 HTTP 入口，必须使用相同的 salt，以免限流和重试标记不一致。

本地运行 `npm run check:guestbook` 可检查真实 SQLite 查询和界面状态，不会向公开服务发帖。生产仅允许 `https://xizili.github.io` 来源；不要把 `*` 或本地预览地址加入生产允许列表。

## 管理留言

在 Cloudflare 的「D1 数据库」中打开 `relationship-galaxy-guestbook` 的控制台：

1. 查询 `SELECT id, name, body, created_at, hidden FROM messages ORDER BY id DESC LIMIT 100;`，核对要处理的具体留言。
2. 使用 `UPDATE messages SET hidden = 1 WHERE id = 具体数字;` 隐藏该条留言；将值设回 `0` 可恢复。不要直接拼接访客文字到 SQL。
3. 前台没有管理员密钥或匿名删除接口。若需暂停收帖，应清空 Pages 配置中的 `ALLOWED_ORIGINS` 并重新部署；仅清空前端 `apiUrl` 不会关闭后台接口。

## 隐私和安全边界

- 前端仅以纯文字显示昵称和正文，不解释 HTML。留言公开，不收邮箱，请勿发表私人联系方式。
- 服务端使用参数化 SQL，限制每次载荷和留言长度；每个网络标记每分钟最多 1 条、每 24 小时最多 10 条。提交 ID 防止网络重试造成重复发帖。共享出口网络的访客也会共享限流额度。
- 网络地址仅用于生成加盐 SHA-256 标记，数据库不存原始 IP。每日任务清理旧标记，实际保留 24–48 小时，公开留言不随之删除。Cloudflare 作为网络服务提供商仍处理连接信息。
- 防刷措施属于轻量防护，不能完全阻止机器人攻击。发现垃圾留言可隐藏或暂停收帖，再决定是否增加验证码或审核。
- 私信仍通过访客自己的邮件应用发送至 `neuroplus@126.com`，不经过公开留言服务。
- 未启用付费计划。免费额度和限制以 Cloudflare 当前账户说明为准。

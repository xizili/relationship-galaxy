# 公开留言后台（待站主账户授权后启用）

网页仍托管在 GitHub Pages；这个独立 Cloudflare Worker + D1 数据库保存所有访客共享的留言。访客无需账户。当前没有部署后台，`public/guestbook-config.json` 中地址故意留空；前端会明确显示尚未开放，邮箱私信不受影响。

## 首次部署

1. 站主登录自己的 Cloudflare 账户。使用 Wrangler 创建 D1 数据库 `relationship-galaxy-guestbook`。无需迁移网页或购买域名。
2. 将 `wrangler.jsonc.example` 另存为同目录的 `wrangler.jsonc`，填写真实的 `database_id`。不得把账户凭据写到前端或仓库。
3. 使用 `wrangler d1 migrations apply relationship-galaxy-guestbook --remote --config guestbook/wrangler.jsonc` 应用迁移，然后设置 `wrangler secret put IP_HASH_SALT --config guestbook/wrangler.jsonc`（随机生成至少 32 字节，仅保存在后台秘密设置）。
4. `wrangler deploy --config guestbook/wrangler.jsonc` 发布 Worker。将获得的真实 HTTPS 地址填入 `public/guestbook-config.json` 的 `apiUrl`，重新发布 GitHub Pages。
5. 实测两台设备共享留言、发布后刷新仍在、限流和删帖。发布真实测试留言须得到站主许可，测试后清理。

本地开发可在单独的本地配置里允许 `http://127.0.0.1:5180`，并为模拟请求设置 `CF-Connecting-IP`。生产只允许网站来源；不要把 `*` 加到允许列表。

## 管理与安全边界

- 在 Cloudflare 的 D1 数据库控制台查询 `SELECT id, name, body, created_at, hidden FROM messages ORDER BY id DESC LIMIT 100;`。
- 核对具体 id 后，可使用带参数的管理工具，或在控制台执行 `UPDATE messages SET hidden = 1 WHERE id = 具体数字;` 隐藏该条留言；设回 0 可恢复。不要直接拼接访客文字到 SQL。前台没有管理员密钥或匿名删除接口。
- 前端仅以纯文字显示昵称和正文，不解释 HTML。服务端参数化 SQL、限制载荷、限制每个网络标记每分钟 1 条／每天 10 条，保留提交 ID 防止网络重试重复发帖。
- 网络地址只用于生成加盐 SHA-256 标记，不存原始 IP。每日定时任务删除超过 24 小时的标记（实际保留 24–48 小时）。Cloudflare 作为网络服务提供商仍处理连接信息。
- 这是轻量防刷，不是对抗大型机器人攻击的完整方案。遭遇垃圾留言时，可先关闭前端 API 地址，并在后台加验证码或审核流程。
- 留言公开、不收邮箱；邮箱私信通过访客自己的邮件应用发至 `neuroplus@126.com`，不经过留言服务。
- 免费额度及限制以 Cloudflare 当前账户说明为准；未授权不启用付费计划。

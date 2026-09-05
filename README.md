# 关系的银河原型

基于 Three.js 的人物关系网站。当前版直接转录 XMind content.json：72 位人物、1 个星形主题、85 条关系、8 个独立网络（含 2 个孤点）。一个无标题且没有关系的空占位节点不展示。

默认进入远望、持续旋转的银河模式，侧栏默认收起。只有旋转按钮改变自动旋转开关；望远镜始终执行“回到银河远望并打开全览介绍”，不保持按下状态。支持关系拓扑、时间轴、人物聚焦、完整注释、搜索与领域筛选。

## 运行

```bash
pnpm install
pnpm dev
```

本地地址：

```text
http://127.0.0.1:5173/
```

## GitHub Pages

推送到 `xizili/relationship-galaxy` 的 `main` 分支后，GitHub Actions 会自动构建并发布到：

```text
https://xizili.github.io/relationship-galaxy/
```

## 主要文件

- `src/xmind-source.json`：规范化的原始节点、关系、端点与继承合并后的箭头；原文不可静默改写。
- `src/xmind-enrichment.js`：规范姓名、缺失年代、简短介绍及补充资料来源。
- `src/data.js`：旧人物展示资料与新 XMind 数据的合并、关系短标签和分类。关系 ID 与 XMind 保持一致。
- `src/xmind-portraits.json`、`src/portraits.js`：头像来源、许可、署名。Marom 与 Ogden 因尚未确认许可使用字母占位。
- `public/xmind-map.md`：可阅读、核对的全部节点与关系原文，由 `pnpm export:xmind` 生成。
- `src/main.js`：3D 场景、交互、搜索和人物卡逻辑。
- `src/styles.css`：桌面与移动端界面样式。
- `public/assets/freud-map-preview.webp`：本轮关系校正所依据的新版原始图谱预览。

## 扩充数据

修改源图后更新 `src/xmind-source.json`，按稳定的 XMind ID 核对，不用数组位置猜测关系。新增人物需要在 enrichment 中补展示资料。所有 `detached` 节点都是自由主题，不能按父子存储关系连接到弗洛伊德。没有关系文字的边保持空原文，界面明确注明未注释。

图上 `label` 是网站短标签；`fullText` 必须逐字等于源关系标题。卡片展示原端点次序，避免“前者／后者”在反向箭头中产生歧义。关系记录忠实转录不等同于逐条史实考证。

银河按出生年的排名设置椭球半径（含公元前年份），领域决定角向聚类；聚焦时一度邻居等距分散。主题没有出生年，不伪造年代。

验证：`pnpm check` 检查源文、方向、端点、孤点、分量、布局以及后台模拟交互；`pnpm build` 构建。交互检查不使用浏览器、屏幕或鼠标权限，不替代真实设备上的视觉验收。

# 关系的银河原型

一个基于 Three.js 的 3D 人物关系网原型。当前版本从弗洛伊德 XMind/PDF 图谱里整理出一批核心人物与关系，支持旋转浏览、人物聚焦、关系高亮、搜索、流派筛选和原始图谱预览。

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

- `src/data.js`：人物节点与关系线数据。
- `src/main.js`：3D 场景、交互、搜索和人物卡逻辑。
- `src/styles.css`：桌面与移动端界面样式。
- `public/assets/freud-map-preview.webp`：本轮关系校正所依据的新版原始图谱预览。

## 扩充数据

继续补人物时，在 `src/data.js` 的 `nodes` 里新增人物，在 `links` 里新增关系即可。节点坐标使用 `x/y/z` 控制 3D 空间位置；关系类型使用 `relationTypes` 中已有类型，或新增一个类型并指定颜色。每条关系的 `label` 用作图上的简短文字，`fullText` 用于人物卡片保留原图完整注释。

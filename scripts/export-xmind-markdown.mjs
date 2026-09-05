import { writeFileSync } from "node:fs";
import source from "../src/xmind-source.json" with { type: "json" };
import { nodes, links } from "../src/data.js";

const nodeMap = new Map(nodes.map((node) => [node.id, node]));
const lines = [
  "# 关系的银河 · XMind 文字对照", "",
  "72 位人物、1 个主题、85 条关系。排除 1 个无标题、无关系的空占位节点。", "",
  "原图的节点和关系文字原样保留，箭头合并 XMind 默认样式与关系自身样式后读取。此文件是源图转录，不代表已逐条完成史实考证；规范姓名、领域分类和简短介绍为网页整理。", "",
  "## 人物与主题", ""
];
for (const node of nodes) {
  lines.push(`### ${node.kind === "topic" ? "★ " : ""}${node.cn} · ${node.name}`, "", `网页 ID：${node.id}；XMind ID：${node.sourceId}`, "", `**年代：** ${node.years}`, "", `**简短介绍：** ${node.summary}`, "", "**XMind 节点原文：**", "", ...node.sourceText.split("\n").map((line) => `> ${line}`), "");
  if (node.biographySources?.length) lines.push("补充资料：" + node.biographySources.map((item) => `[${item.label}](${item.url})`).join("、"), "");
}
lines.push("## 全部关系", "", "端点顺序保留原文件次序；← 表示箭头指向左端，↔ 表示双向，— 表示无向。未注释关系不补造文字。", "");
links.forEach((link, index) => {
  lines.push(`### ${index + 1}. ${nodeMap.get(link.originalSource).cn} ${link.originalDirection} ${nodeMap.get(link.originalTarget).cn}`, "", `XMind 关系 ID：${link.id}`, "", `图上短标签：${link.label}`, "", "原文：", "", ...(link.fullText ? link.fullText.split("\n").map((line) => `> ${line}`) : ["（原图有连线，未标注文字。）"]), "");
});
writeFileSync(new URL("../public/xmind-map.md", import.meta.url), lines.join("\n"));
console.log(`已导出 ${source.topics.length} 个源节点的对照及 ${links.length} 条原文关系。`);

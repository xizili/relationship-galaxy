import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { groups, links, nodes, relationTypes } from "../src/data.js";
import { portraits } from "../src/portraits.js";

const errors = [];
const warnings = [];
const nodeIds = new Set();
const degrees = new Map(nodes.map((node) => [node.id, 0]));

for (const node of nodes) {
  if (!node.id) errors.push("发现缺少 id 的人物");
  if (nodeIds.has(node.id)) errors.push(`人物 id 重复：${node.id}`);
  nodeIds.add(node.id);
  if (!groups[node.group]) errors.push(`${node.id} 使用了未知领域：${node.group}`);
  if (!node.tags?.length) errors.push(`${node.id} 缺少跨领域/流派标签`);
  if (![node.x, node.y, node.z, node.size].every(Number.isFinite)) {
    errors.push(`${node.id} 的空间坐标或节点大小无效`);
  }
  if (node.kind === "person" && !Number.isFinite(node.birthYear)) {
    warnings.push(`${node.id} 的年份格式需人工核查：${node.years}`);
  }

  const portrait = portraits[node.id];
  if (!portrait) {
    if (node.kind === "person" && !node.portraitUnavailableReason) errors.push(`${node.id} 缺少人物头像资料或明确的占位原因`);
  } else {
    if (!existsSync(resolve("public", portrait.file))) {
      errors.push(`${node.id} 的人物头像文件不存在：${portrait.file}`);
    }
    if (!portrait.sourcePageUrl?.startsWith("https://")) {
      errors.push(`${node.id} 的人物头像缺少 HTTPS 来源页`);
    }
    if (!portrait.creator?.trim()) errors.push(`${node.id} 的人物头像缺少作者或来源机构`);
    if (!portrait.license?.trim()) errors.push(`${node.id} 的人物头像缺少许可说明`);
    if (portrait.licenseUrl && !portrait.licenseUrl.startsWith("https://")) {
      errors.push(`${node.id} 的人物头像许可链接不是 HTTPS`);
    }
  }
}

for (const portraitId of Object.keys(portraits)) {
  if (!nodeIds.has(portraitId)) errors.push(`头像资料对应了未知人物：${portraitId}`);
}

const linkKeys = new Set();
for (const [index, link] of links.entries()) {
  if (!nodeIds.has(link.source)) errors.push(`关系 ${index} 的起点不存在：${link.source}`);
  if (!nodeIds.has(link.target)) errors.push(`关系 ${index} 的终点不存在：${link.target}`);
  if (!relationTypes[link.type]) errors.push(`关系 ${index} 使用了未知类型：${link.type}`);
  if (!link.label?.trim()) errors.push(`关系 ${index} 缺少连线文字`);
  if (link.sourceAnnotated && !link.fullText?.trim()) errors.push(`关系 ${index} 缺少人物卡片中的完整原图文字`);
  if (link.source === link.target) warnings.push(`关系 ${index} 是自连接：${link.source}`);

  const endpoints = link.directed ? `${link.source}>${link.target}` : [link.source, link.target].sort().join("~");
  const key = `${endpoints}:${link.type}`;
  if (linkKeys.has(key)) warnings.push(`可能重复的关系：${key}`);
  linkKeys.add(key);

  degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
  degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
}

const source = JSON.parse(readFileSync(new URL("../src/xmind-source.json", import.meta.url), "utf8"));
const visibleSourceTopics = source.topics.filter((topic) => topic.kind !== "empty");
assert.equal(nodes.length, visibleSourceTopics.length, "所有有效 XMind 节点均须展示");
assert.equal(links.length, source.relationships.length, "不能漏掉或增造 XMind 关系");
const sourceKeys = new Map(source.topics.map((topic) => [topic.id, topic.key]));
const exportedNodes = new Map(nodes.map((node) => [node.sourceId, node]));
const exportedLinks = new Map(links.map((link) => [link.id, link]));
for (const topic of visibleSourceTopics) {
  assert.equal(exportedNodes.get(topic.id)?.sourceText, topic.title, `节点原文变更：${topic.id}`);
}
for (const relation of source.relationships) {
  const link = exportedLinks.get(relation.id);
  assert.equal(link.fullText, relation.title, `关系原文变更：${relation.id}`);
  assert.equal(link.originalSource, sourceKeys.get(relation.end1Id));
  assert.equal(link.originalTarget, sourceKeys.get(relation.end2Id));
  const start = !relation.arrowStart.endsWith(".none");
  const end = !relation.arrowEnd.endsWith(".none");
  assert.equal(link.bidirectional, start && end);
  assert.equal(link.directed, start !== end);
  assert.equal(link.source, sourceKeys.get(start && !end ? relation.end2Id : relation.end1Id));
  assert.equal(link.target, sourceKeys.get(start && !end ? relation.end1Id : relation.end2Id));
}
assert.equal(nodes.filter((node) => node.kind === "person").length, 72);
assert.equal(nodes.filter((node) => node.kind === "topic").length, 1);
assert.equal(links.length, 85);
const isolated = [...degrees.entries()].filter(([, degree]) => degree === 0).map(([id]) => id).sort();
assert.deepEqual(isolated, ["mcculloch", "smith"], "保留源图孤立人物");
assert.equal(links.filter((link) => link.source === "cybernetics" || link.target === "cybernetics").length, 4);
const pending = new Set(nodes.map((node) => node.id));
const componentSizes = [];
while (pending.size) {
  const stack = [pending.values().next().value];
  let size = 0;
  while (stack.length) {
    const id = stack.pop();
    if (!pending.delete(id)) continue;
    size++;
    links.forEach((link) => { if (link.source === id) stack.push(link.target); if (link.target === id) stack.push(link.source); });
  }
  componentSizes.push(size);
}
assert.deepEqual(componentSizes.sort((a, b) => b - a), [46, 9, 7, 5, 2, 2, 1, 1]);

console.log(`数据概览：72 位人物、1 个主题，${links.length} 条关系、${componentSizes.length} 个独立网络（含孤点）。`);
warnings.forEach((warning) => console.warn(`提醒：${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(`错误：${error}`));
  process.exitCode = 1;
} else {
  console.log("数据结构检查通过。所有关系端点与分类均有效。");
}

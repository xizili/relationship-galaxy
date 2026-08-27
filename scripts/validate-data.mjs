import { groups, links, nodes, relationTypes } from "../src/data.js";

const errors = [];
const warnings = [];
const nodeIds = new Set();
const degrees = new Map(nodes.map((node) => [node.id, 0]));

for (const node of nodes) {
  if (!node.id) errors.push("发现缺少 id 的人物");
  if (nodeIds.has(node.id)) errors.push(`人物 id 重复：${node.id}`);
  nodeIds.add(node.id);
  if (!groups[node.group]) errors.push(`${node.id} 使用了未知流派：${node.group}`);
  if (![node.x, node.y, node.z, node.size].every(Number.isFinite)) {
    errors.push(`${node.id} 的空间坐标或节点大小无效`);
  }
  if (!/^\d{4}-(?:\d{4})?$/.test(node.years)) {
    warnings.push(`${node.id} 的年份格式需人工核查：${node.years}`);
  }
}

const linkKeys = new Set();
for (const [index, link] of links.entries()) {
  if (!nodeIds.has(link.source)) errors.push(`关系 ${index} 的起点不存在：${link.source}`);
  if (!nodeIds.has(link.target)) errors.push(`关系 ${index} 的终点不存在：${link.target}`);
  if (!relationTypes[link.type]) errors.push(`关系 ${index} 使用了未知类型：${link.type}`);
  if (!link.label?.trim()) errors.push(`关系 ${index} 缺少连线文字`);
  if (!link.note?.trim()) warnings.push(`关系 ${index} 缺少详情说明`);
  if (link.source === link.target) warnings.push(`关系 ${index} 是自连接：${link.source}`);

  const endpoints = link.directed ? `${link.source}>${link.target}` : [link.source, link.target].sort().join("~");
  const key = `${endpoints}:${link.type}`;
  if (linkKeys.has(key)) warnings.push(`可能重复的关系：${key}`);
  linkKeys.add(key);

  degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
  degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
}

const isolated = [...degrees.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
if (isolated.length) warnings.push(`尚无连线的人物：${isolated.join("、")}`);

console.log(`数据概览：${nodes.length} 位人物，${links.length} 条关系，${Object.keys(groups).length} 个流派，${Object.keys(relationTypes).length} 类关系。`);
warnings.forEach((warning) => console.warn(`提醒：${warning}`));

if (errors.length) {
  errors.forEach((error) => console.error(`错误：${error}`));
  process.exitCode = 1;
} else {
  console.log("数据结构检查通过。所有关系端点与分类均有效。");
}

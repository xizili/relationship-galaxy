import * as THREE from "three";
import { links, nodes } from "../src/data.js";
import {
  birthYear,
  buildFocusLayout,
  buildGalaxyLayout,
  neighborDistances
} from "../src/galaxy-layout.js";

const galaxyScale = new THREE.Vector3(1.18, 0.84, 1.03);
const first = buildGalaxyLayout(nodes, links, galaxyScale);
const second = buildGalaxyLayout(nodes, links, galaxyScale);
const ordered = nodes.filter((node) => node.kind === "person").sort((a, b) => birthYear(a) - birthYear(b));
const errors = [];

function ellipsoidRadius(position) {
  return new THREE.Vector3(
    position.x / galaxyScale.x,
    position.y / galaxyScale.y,
    position.z / galaxyScale.z
  ).length();
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

if (first.size !== nodes.length) errors.push(`布局节点数错误：${first.size}/${nodes.length}`);

for (let index = 1; index < ordered.length; index += 1) {
  const previous = ellipsoidRadius(first.get(ordered[index - 1].id));
  const current = ellipsoidRadius(first.get(ordered[index].id));
  if (current + 1e-6 < previous) {
    errors.push(`年代半径顺序错误：${ordered[index - 1].id} → ${ordered[index].id}`);
  }
}

nodes.forEach((node) => {
  const position = first.get(node.id);
  if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) {
    errors.push(`布局坐标无效：${node.id}`);
  } else if (position.distanceTo(second.get(node.id)) > 1e-9) {
    errors.push(`布局不具确定性：${node.id}`);
  }
});

const withinGroupDistances = [];
const crossGroupDistances = [];
for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
    const a = nodes[firstIndex];
    const b = nodes[secondIndex];
    const distance = first.get(a.id).distanceTo(first.get(b.id));
    (a.group === b.group ? withinGroupDistances : crossGroupDistances).push(distance);
  }
}
if (mean(withinGroupDistances) >= mean(crossGroupDistances)) {
  errors.push("领域聚类无效：同领域人物并未整体更接近");
}

for (const node of nodes) {
  const focused = buildFocusLayout(nodes, links, first, node.id);
  const distances = neighborDistances(links, focused, node.id);
  if (distances.length < 2) continue;
  const spread = Math.max(...distances) - Math.min(...distances);
  if (spread > 1e-6) errors.push(`一度邻居未等距：${node.id}（误差 ${spread}）`);

  const neighbors = [...new Set(links.flatMap((link) => {
    if (link.source === node.id) return [link.target];
    if (link.target === node.id) return [link.source];
    return [];
  }))];
  for (let firstIndex = 0; firstIndex < neighbors.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < neighbors.length; secondIndex += 1) {
      const separation = focused.get(neighbors[firstIndex]).distanceTo(focused.get(neighbors[secondIndex]));
      if (separation < 24) errors.push(`聚焦邻居过度重叠：${node.id}`);
    }
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`错误：${error}`));
  process.exitCode = 1;
} else {
  console.log("银河布局检查通过：年代半径单调、领域聚类有效、布局可复现、一度邻居等距且分散。");
}

import assert from "node:assert/strict";
import { createRelationTour, relationPulse } from "../src/relation-tour.js";
import { nodes, links, NODE_RADIUS } from "../src/data.js";
import { groups, classificationFor } from "../src/taxonomy.js";
import { starVertices } from "../src/node-shapes.js";

assert.deepEqual([...new Set(nodes.map((node) => node.size))], [NODE_RADIUS]);
assert.equal(Object.keys(groups).length, 10);
for (const id of ["schwind", "mahler", "leibovitz", "lennon", "ono"]) assert.equal(classificationFor(id).group, "arts");
for (const id of ["connes", "einstein", "feigenbaum"]) assert.equal(classificationFor(id).group, "mathematics_physics");
for (const id of ["kahneman", "treisman", "piaget", "koffka", "wertheimer", "lewin", "erikson"]) assert.equal(classificationFor(id).group, "psychology");
for (const id of ["mead", "benedict", "levi", "drucker", "smith", "malthus", "mcculloch"]) assert.equal(classificationFor(id).group, "social_sciences");
assert.ok(classificationFor("jung").tags.includes("分析心理学"));
assert.ok(classificationFor("maslow").tags.includes("人本主义心理学"));
assert.ok(classificationFor("mead").tags.includes("控制论"));
for (const radius of [1, 9, 10]) {
  const points = starVertices(radius);
  for (const axis of [0, 1]) {
    assert.ok(Math.abs(Math.max(...points.map((point) => point[axis])) - radius) < 1e-9);
    assert.ok(Math.abs(Math.min(...points.map((point) => point[axis])) + radius) < 1e-9);
  }
}
const single = links.find((link) => link.directed);
const pair = links.find((link) => link.bidirectional);
const plain = links.find((link) => !link.directed && !link.bidirectional);
const beginning = relationPulse(single, 500);
const end = relationPulse(single, 2650);
assert.ok(beginning.sourceGlow > 0.9 && beginning.targetGlow === 0);
assert.ok(end.targetGlow > 0.9 && end.sourceGlow === 0);
assert.ok(beginning.progress < end.progress);
for (const link of [pair, plain]) {
  for (let elapsed = 0; elapsed <= 3200; elapsed += 100) {
    const pulse = relationPulse(link, elapsed);
    assert.equal(pulse.directed, false);
    assert.equal(pulse.sourceGlow, pulse.targetGlow, "双向与无向必须同时点亮两端");
  }
}
for (const link of links) {
  for (let elapsed = 0; elapsed <= 3200; elapsed += 80) {
    const pulse = relationPulse(link, elapsed);
    for (const key of ["sourceGlow", "targetGlow", "progress", "gain"]) assert.ok(pulse[key] >= 0 && pulse[key] <= 1);
  }
  assert.equal(relationPulse(link, 0).gain, 0);
  assert.equal(relationPulse(link, 3200).gain, 0);
}
const tour = createRelationTour({ random: () => 0 });
assert.equal(tour.step(0, [1, 2]), null);
assert.equal(tour.step(1799, [1, 2]), null);
assert.equal(tour.step(1800, [1, 2]).index, 1);
assert.equal(tour.step(2000, [1, 2]).elapsedMs, 200);
assert.equal(tour.step(5000, [1, 2]), null);
assert.equal(tour.step(6800, [1, 2]).index, 2, "不能连续重复同一关系");
assert.equal(tour.step(7000, [1, 2], false), null, "聚焦/隐藏/悬停时应停止轮播");
assert.equal(tour.step(8799, [1, 2]), null);
assert.ok(tour.step(8800, [1, 2]));
assert.equal(tour.step(8801, [42]), null, "筛选后清除不适用关系");
assert.equal(tour.step(10601, [42]).index, 42);
assert.equal(tour.step(10602, []), null);
console.log("统一大小与关系巡游检查通过：全部节点同径、单向先后点亮、双向/无向同步、间隔随机抽取、无连边筛选及暂停恢复。");

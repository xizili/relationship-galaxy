import assert from "node:assert/strict";
import { nodes, links } from "../src/data.js";
import { createMapLayout, mapComponents } from "../src/map-layout.js";

const snapshot = JSON.stringify({ nodes, links });
const { adjacency, components } = mapComponents(nodes, links);
assert.deepEqual(components.map((ids) => ids.length), [46, 9, 7, 5, 2, 2, 1, 1]);
const layout = createMapLayout(nodes, links);
for (const [screen, width, height] of [[1440, 1370, 604], [1280, 1210, 510], [1000, 930, 548], [390, 320, 434], [320, 250, 340]]) {
  const footprints = new Map(nodes.map((node) => {
    const degree = adjacency.get(node.id).size;
    const visible = screen > 1240 || degree > (screen <= 440 ? 8 : screen <= 760 ? 4 : 3);
    const width = Math.min(144, Math.max(52, node.cn.length * 13 + 12));
    return [node.id, visible ? { left: -width / 2 - 4, right: width / 2 + 4, top: -14, bottom: 34 } : { left: -13, right: 13, top: -13, bottom: 13 }];
  }));
  const options = { x: 24, y: 190, width, height, footprints };
  const { positions, islands } = layout(options);
  assert.equal(positions.size, 73);
  assert.deepEqual(positions, layout(options).positions, "布局与重置必须可复现");
  for (const [id, p] of positions) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    const island = islands.find((box) => box.ids.includes(id));
    assert.ok(p.x >= island.x && p.x <= island.x + island.width && p.y >= island.y && p.y <= island.y + island.height, `${screen}: ${id} 脱离自己的岛屿`);
  }
  for (let i = 0; i < islands.length; i++) for (let j = i + 1; j < islands.length; j++) {
    const a = islands[i], b = islands[j];
    assert.ok(a.x + a.width + 17 <= b.x || b.x + b.width + 17 <= a.x || a.y + a.height + 17 <= b.y || b.y + b.height + 17 <= a.y, "不同网络必须有留白");
  }
  const entries = [...positions];
  let minimum = Infinity;
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i][1], b = entries[j][1];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    minimum = Math.min(minimum, distance);
    assert.ok(distance >= 18, `${screen}: ${entries[i][0]} / ${entries[j][0]} 节点重叠 (${distance})`);
  }
  console.log(`地图 ${screen}px：73 节点、8 岛屿；最近节点间距 ${minimum.toFixed(1)}px。`);
}
assert.equal(JSON.stringify({ nodes, links }), snapshot, "布局不得改变人物与关系原数据");

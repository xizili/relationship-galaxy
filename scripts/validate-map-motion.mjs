// Background-only regression checks: no browser or desktop access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nodes, links, groups, relationTypes } from "../src/data.js";
import { initTopology } from "../src/topology.js";
import { createZoomSpring } from "../src/nebula-motion.js";

class SvgElement {
  constructor(tag = "div") {
    this.tag = tag; this.children = []; this.dataset = {}; this.attributes = new Map();
    this.listeners = new Map(); this.style = {}; this.captureCount = 0;
    this.clientWidth = 1440; this.clientHeight = 900;
    this.classes = new Set();
    this.classList = {
      contains: (name) => this.classes.has(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
  }
  set innerHTML(_html) { this.children = []; }
  setAttribute(key, value) {
    this.attributes.set(key, String(value));
    if (key === "class") this.classes = new Set(String(value).split(" "));
    if (key.startsWith("data-")) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(key) { return this.attributes.get(key); }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  appendChild(child) { this.children.push(child); child.parent = this; }
  closest(selector) {
    if (selector === "[data-node-id]" && this.dataset.nodeId) return this;
    return this.parent?.closest(selector) ?? null;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  fire(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener({
      target: this, clientX: 500, clientY: 400, pointerId: 1,
      stopPropagation() {}, preventDefault() {}, ...event
    });
  }
  setPointerCapture() { this.captureCount += 1; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 1440, height: 900, bottom: 900 }; }
}

const svg = new SvgElement("svg");
const panel = new SvgElement(); panel.classes.add("is-collapsed");
const bar = { getBoundingClientRect: () => ({ bottom: 72 }) };
const findAll = (root, predicate) => root.children.flatMap((child) => [...(predicate(child) ? [child] : []), ...findAll(child, predicate)]);
let now = 1000;
let frames = [];
const originalGlobals = Object.fromEntries(["document", "window", "performance", "ResizeObserver", "requestAnimationFrame", "cancelAnimationFrame"].map((key) => [key, globalThis[key]]));
Object.assign(globalThis, {
  document: { createElementNS: (_ns, tag) => new SvgElement(tag), querySelector: (selector) => ({ "#topologyGraph": svg, "#detailPanel": panel, ".topbar": bar })[selector] ?? null },
  window: { innerWidth: 1440, innerHeight: 900 }, performance: { now: () => now },
  ResizeObserver: class { observe() {} disconnect() {} },
  requestAnimationFrame: (callback) => { frames.push(callback); return frames.length; }, cancelAnimationFrame() {}
});

const selected = [];
const selectedLinks = [];
let overviews = 0;
const map = initTopology({ nodes, links, groups, relationTypes, onFocusNode: (id) => selected.push(id), onFocusLink: (id) => selectedLinks.push(id), onOverview: () => { overviews += 1; } });
const nodeElements = () => findAll(svg, (e) => Boolean(e.dataset.nodeId));
assert.equal(nodeElements().length, 73);
for (const node of nodeElements()) {
  const hit = node.children.find((e) => e.tag === "circle" || e.tag === "polygon");
  const captures = svg.captureCount;
  svg.fire("pointerdown", { target: hit });
  svg.fire("pointermove", { target: hit, clientX: 502, clientY: 401 });
  svg.fire("pointerup", { target: hit });
  assert.equal(svg.captureCount, captures, `轻触不得被根 SVG 捕获：${node.dataset.nodeId}`);
  node.fire("click");
  assert.equal(selected.at(-1), node.dataset.nodeId);
}
assert.equal(selected.length, 73);
assert.equal(overviews, 0);

const dragged = nodeElements()[0];
const beforeDrag = dragged.getAttribute("transform");
svg.fire("pointerdown", { target: dragged });
svg.fire("pointermove", { target: dragged, clientX: 530, clientY: 420 });
assert.ok(svg.captureCount > 0);
assert.notEqual(dragged.getAttribute("transform"), beforeDrag);
svg.fire("pointerup");
svg.fire("click");
dragged.fire("click");
assert.equal(selected.length, 73, "拖动后不得打开错误人物卡");
assert.equal(overviews, 0, "拖动后不得误触全览");
now += 500;
svg.fire("click");
assert.equal(overviews, 1);

const edge = findAll(svg, (e) => e.classes.has("topology-edge-hit"))[0];
svg.fire("pointerdown", { target: edge });
svg.fire("pointerup", { target: edge });
edge.fire("click");
assert.equal(selectedLinks.length, 1);

map.update({ selectedLinkIndex: 0, selectedNodeId: null, depthMode: "1", overviewMode: false });
assert.deepEqual(nodeElements().filter((e) => !e.classes.has("is-dimmed")).map((e) => e.dataset.nodeId).sort(), [links[0].source, links[0].target].sort());
map.centerNode("freud");
map.resize({ preserveTransform: false });
for (const callback of frames) callback(now + 1000);
frames = [];
const viewport = findAll(svg, (e) => e.classes.has("topology-viewport"))[0];
assert.equal(viewport.getAttribute("transform"), "translate(0 0) scale(1)");
assert.equal(nodeElements()[0].getAttribute("transform"), beforeDrag);
const beforePanel = nodeElements().map((e) => e.getAttribute("transform"));
panel.classes.delete("is-collapsed");
panel.getBoundingClientRect = () => ({ top: 510, left: 12, width: 1416, height: 300, bottom: 810 });
map.resize({ preserveTransform: true });
assert.deepEqual(nodeElements().map((e) => e.getAttribute("transform")), beforePanel, "打开底部侧栏不得重排或压缩关系网");
map.centerNode("arendt");
for (const callback of frames) callback(now + 2000);
frames = [];
const currentTransform = findAll(svg, (e) => e.classes.has("topology-viewport"))[0].getAttribute("transform");
const values = currentTransform.match(/-?\d+(?:\.\d+)?/g).map(Number);
const arendt = nodeElements().find((e) => e.dataset.nodeId === "arendt").getAttribute("transform").match(/-?\d+(?:\.\d+)?/g).map(Number);
const focusedY = values[1] + arendt[1] * values[2];
assert.ok(focusedY > 110 && focusedY < 510, "焦点应处于工具栏与侧栏之间");
panel.classes.add("is-collapsed");
map.resize({ preserveTransform: false });
map.update({ selectedNodeId: "freud", selectedLinkIndex: null, overviewMode: false, depthMode: "1", contextNodeId: null });
const connected = new Set(["freud", ...links.filter((l) => l.source === "freud" || l.target === "freud").map((l) => l.source === "freud" ? l.target : l.source)]);
for (const node of nodeElements()) assert.equal(node.classes.has("is-dimmed"), !connected.has(node.dataset.nodeId));
const parse = (e) => e.getAttribute("transform").match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
const rectangle = (x, y, width, height, degrees = 0) => {
  const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: x + a * width / 2 * c - b * height / 2 * s, y: y + a * width / 2 * s + b * height / 2 * c }));
};
function apart(a, b) {
  return [a, b].some((poly) => poly.some((point, i) => {
    const next = poly[(i + 1) % poly.length], axis = { x: point.y - next.y, y: next.x - point.x };
    const project = (p) => p.x * axis.x + p.y * axis.y;
    const pa = a.map(project), pb = b.map(project);
    return Math.max(...pa) <= Math.min(...pb) + 1e-7 || Math.max(...pb) <= Math.min(...pa) + 1e-7;
  }));
}
function verifyLabelClearance() {
  const names = [];
  const obstacles = nodeElements().filter((e) => !e.classes.has("is-focus-background") && !e.classes.has("is-hidden")).flatMap((element) => {
    const [x, y] = parse(element);
    const card = element.children.find((e) => e.classes.has("topology-node-card"));
    const [dx, dy] = parse(card), width = Number(card.children[0].getAttribute("width"));
    const radius = 9 * (element.classes.has("is-selected") ? 1.38 : 1);
    const name = rectangle(x + dx, y + dy + 24, width, 22);
    names.push(name);
    return [rectangle(x, y, radius * 2 + 4, radius * 2 + 4), name];
  });
  const labels = findAll(svg, (e) => e.classes.has("topology-edge-label") && e.classes.has("is-visible") && !e.classes.has("is-occluded") && !e.classes.has("is-hidden"));
  for (const label of labels) {
    const [x, y, angle = 0] = parse(label), width = Number(label.children[0].getAttribute("width"));
    const box = rectangle(x, y, width, 28, angle);
    assert.ok(obstacles.every((o) => apart(box, o)), `关系 ${label.dataset.linkIndex} 标签不得遮盖可见人名、节点或已有关系标签`);
    obstacles.push(box);
  }
  for (const path of findAll(svg, (e) => e.classes.has("topology-edge") && e.classes.has("is-highlighted"))) {
    const [sx, sy, cx, cy, ex, ey] = path.getAttribute("d").match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
    for (let sample = 0; sample <= 180; sample += 1) {
      const t = sample / 180, x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey;
      assert.ok(names.every((name) => apart(rectangle(x, y, 1, 1), name)), `${nodeElements().find((e) => e.classes.has("is-selected"))?.dataset.nodeId}: 人名不得压住聚焦关系 ${path.dataset.linkIndex}, sample ${sample}`);
    }
  }
}
verifyLabelClearance();
svg.fire("wheel", { deltaY: -220 });
verifyLabelClearance();
svg.fire("wheel", { deltaY: 800 });
verifyLabelClearance();
map.update({ selectedNodeId: null, contextNodeId: "freud", overviewMode: true, depthMode: "all" }, { fit: true });
for (const callback of frames) callback(now + 3000);
frames = [];
assert.equal(viewport.getAttribute("transform"), "translate(0 0) scale(1)");
for (const node of nodeElements()) {
  assert.equal(node.classes.has("is-context-muted"), !connected.has(node.dataset.nodeId));
  assert.equal(node.classes.has("is-selected"), false);
  assert.equal(node.classes.has("is-dimmed"), false, "回全图后不用聚焦时的低亮度");
}
map.update({ contextNodeId: null });
assert.ok(nodeElements().every((n) => !n.classes.has("is-context-muted") && !n.classes.has("is-dimmed")));

// Exercise every relation in a desktop sidebar and a narrow phone bottom sheet.
// The panel deliberately reports an offscreen position during its transition.
function finishAnimation() {
  const pending = frames; frames = []; now += 1000;
  for (const callback of pending) callback(now);
  assert.equal(frames.length, 0);
}
const edgeElements = () => findAll(svg, (e) => e.classes.has("topology-edge"));
const edgeHits = () => findAll(svg, (e) => e.classes.has("topology-edge-hit"));
const edgeLabels = () => findAll(svg, (e) => e.classes.has("topology-edge-label"));
const overviewSnapshot = nodeElements().map((e) => e.getAttribute("transform"));
for (const person of nodes) {
  map.update({ selectedNodeId: person.id, selectedLinkIndex: null, contextNodeId: null,
    contextLinkIndex: null, overviewMode: false, depthMode: "1", activeGroup: "all" }, { center: true });
  finishAnimation();
  const incident = links.flatMap((link, index) => link.source === person.id || link.target === person.id ? [index] : []);
  const displayed = edgeLabels().filter((e) => e.classes.has("is-visible") && !e.classes.has("is-hidden") && !e.classes.has("is-occluded"));
  assert.deepEqual(displayed.map((e) => Number(e.dataset.linkIndex)).sort((a, b) => a - b), incident, `${person.id} 的所有直接关系必须有简略标签`);
  assert.ok(displayed.every((e) => Array.from(e.children[1].textContent).length <= 11));
  verifyLabelClearance();
  const centerElement = nodeElements().find((e) => e.classes.has("is-selected")), [centerX, centerY] = parse(centerElement);
  const neighborAngles = nodeElements().filter((e) => e.classes.has("is-neighbor")).map((e) => {
    const [x, y] = parse(e); return Math.atan2(y - centerY, x - centerX);
  }).sort((a, b) => a - b);
  if (neighborAngles.length >= 3) {
    const gaps = neighborAngles.map((angle, i) => neighborAngles[(i + 1) % neighborAngles.length] + (i === neighborAngles.length - 1 ? 2 * Math.PI : 0) - angle);
    assert.ok(Math.min(...gaps) >= Math.min(Math.PI * 0.42, Math.PI * 1.58 / (neighborAngles.length - 1)) - 1e-8, "密集直连关系须有明确的角度间隔");
  }
  for (const hit of edgeHits()) {
    const allowed = incident.includes(Number(hit.dataset.linkIndex));
    assert.equal(hit.classes.has("is-inactive"), !allowed);
    assert.equal(hit.getAttribute("tabindex"), allowed ? "0" : "-1");
    assert.equal(hit.getAttribute("aria-disabled"), String(!allowed));
    const previousCount = selectedLinks.length;
    hit.fire("click"); hit.fire("keydown", { key: "Enter" }); hit.fire("keydown", { key: " " });
    assert.equal(selectedLinks.length - previousCount, allowed ? 3 : 0, "背景线不得响应点击或键盘");
  }
  if (incident.length) {
    const label = displayed[0], previousCount = selectedLinks.length;
    label.fire("click");
    assert.equal(selectedLinks.length, previousCount + 1, "关系文字本身也是点击目标");
    const beforeRelation = nodeElements().map((e) => e.getAttribute("transform"));
    map.update({ selectedNodeId: null, selectedLinkIndex: incident[0] }, { center: true }); finishAnimation();
    assert.deepEqual(nodeElements().map((e) => e.getAttribute("transform")), beforeRelation, "人物转入其关系时保持局部位置");
    assert.equal(edgeHits().filter((e) => !e.classes.has("is-inactive")).length, 1);
  }
  map.update({ selectedNodeId: null, selectedLinkIndex: null, contextNodeId: person.id, overviewMode: true, depthMode: "all" }, { fit: true });
  finishAnimation();
  assert.deepEqual(nodeElements().map((e) => e.getAttribute("transform")), overviewSnapshot, "关闭后恢复全图坐标，连续探索不得累计变形");
  assert.ok(edgeHits().every((e) => !e.classes.has("is-inactive") && e.getAttribute("tabindex") === "0"));
  assert.ok(nodeElements().every((e) => parse(e.children.find((child) => child.classes.has("topology-node-card"))).every((v) => v === 0)));
}
// Even “all depths” keeps unrelated edge input disabled during person focus.
map.update({ selectedNodeId: "freud", selectedLinkIndex: null, contextNodeId: null, overviewMode: false, depthMode: "all" });
assert.equal(edgeHits().filter((e) => !e.classes.has("is-inactive")).length, 15);
const radial = nodeElements().map((e) => e.getAttribute("transform"));
map.resize({ preserveTransform: true });
assert.deepEqual(nodeElements().map((e) => e.getAttribute("transform")), radial, "侧栏重测尺寸不得还原聚焦展开");
map.update({ selectedNodeId: null, overviewMode: true, depthMode: "all" }, { fit: true }); finishAnimation();
const stylesheet = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
assert.match(stylesheet, /\.topology-edge\s*\{[^}]*pointer-events:\s*none/);
assert.match(stylesheet, /\.topology-edge-hit\.is-inactive\s*\{\s*pointer-events:\s*none/);
assert.match(stylesheet, /\.topology-edge-hit\s*\{[^}]*vector-effect:\s*non-scaling-stroke/);
for (const config of [
  { width: 1440, height: 900, panelWidth: 384, panelHeight: 780, topbarBottom: 72, frameRight: 992, frameBottom: 822 },
  { width: 390, height: 844, panelWidth: 366, panelHeight: 290, topbarBottom: 210, frameRight: 366, frameBottom: 464 }
]) {
  const { width, height, panelWidth, panelHeight, topbarBottom, frameRight, frameBottom } = config;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });
  bar.getBoundingClientRect = () => ({ bottom: topbarBottom });
  panel.getBoundingClientRect = () => ({ left: width + 100, top: height + 100, width: panelWidth, height: panelHeight, right: width + 100 + panelWidth, bottom: height + 100 + panelHeight });
  panel.classes.delete("is-collapsed");
  map.resize({ preserveTransform: false });
  map.update({ selectedNodeId: "freud", selectedLinkIndex: null, contextNodeId: null, contextLinkIndex: null, overviewMode: false, depthMode: "1" }, { center: true });
  finishAnimation(); verifyLabelClearance();
  assert.equal(edgeLabels().filter((e) => e.classes.has("is-visible") && !e.classes.has("is-occluded")).length, 15);
  const focusedBeforeResize = nodeElements().map((e) => e.getAttribute("transform"));
  map.resize({ preserveTransform: true });
  assert.deepEqual(nodeElements().map((e) => e.getAttribute("transform")), focusedBeforeResize);
  const neighbor = nodeElements().filter((e) => e.classes.has("is-neighbor")).sort((a, b) => parse(b)[0] - parse(a)[0])[0];
  const initial = parse(neighbor), scaleBeforeDrag = parse(viewport)[2];
  svg.fire("pointerdown", { target: neighbor });
  svg.fire("pointermove", { target: neighbor, clientX: 509, clientY: 400 });
  svg.fire("pointerup", { target: neighbor });
  assert.ok(Math.abs(parse(neighbor)[0] - initial[0] - 9 / scaleBeforeDrag) < 1e-8, "展开后的邻居拖动不得跳回全图边界");
  now += 500;
  map.update({ selectedNodeId: null, selectedLinkIndex: null, overviewMode: true, depthMode: "all" }, { fit: true }); finishAnimation();
  let enlarged = 0;
  for (let index = 0; index < links.length; index += 1) {
    const link = links[index], endpoints = new Set([link.source, link.target]);
    map.update({ selectedNodeId: null, selectedLinkIndex: index, contextNodeId: null, contextLinkIndex: null,
      activeGroup: "all", overviewMode: false, depthMode: "1" }, { center: true });
    finishAnimation();
    const [tx, ty, scale] = parse(viewport);
    assert.ok([tx, ty, scale].every(Number.isFinite) && scale > 0 && scale <= 2.4);
    if (scale > 1) enlarged += 1;
    for (const node of nodeElements()) {
      assert.equal(node.classes.has("is-link-endpoint"), endpoints.has(node.dataset.nodeId));
      if (!endpoints.has(node.dataset.nodeId)) continue;
      assert.equal(node.classes.has("is-dimmed"), false);
      assert.equal(node.classes.has("is-selected"), false, "关系聚焦不改变端点基础大小");
      const [x, y] = parse(node);
      const cardWidth = Number(node.children.find((e) => e.classes.has("topology-node-card")).children[0].getAttribute("width"));
      const [nameX, nameY] = parse(node.children.find((e) => e.classes.has("topology-node-card")));
      assert.ok(tx + (x + nameX - cardWidth / 2) * scale >= 24 - 1e-6);
      assert.ok(tx + (x + nameX + cardWidth / 2) * scale <= frameRight + 1e-6, "取景须包括外移后的人名");
      assert.ok(ty + (y + nameY + 13) * scale >= topbarBottom + 30 - 1e-6);
      assert.ok(ty + (y + nameY + 35) * scale <= frameBottom + 1e-6);
      assert.ok(tx + (x - cardWidth / 2 - 4) * scale >= 24 - 1e-6, `${width}px 关系 ${index} 起端不应裁切`);
      assert.ok(tx + (x + cardWidth / 2 + 4) * scale <= frameRight + 1e-6, `${width}px 关系 ${index} 不应藏在侧栏后`);
      assert.ok(ty + (y - 14) * scale >= topbarBottom + 30 - 1e-6, `${width}px 关系 ${index} 不应藏在工具栏后`);
      assert.ok(ty + (y + 34) * scale <= frameBottom + 1e-6, `${width}px 关系 ${index} 人名不应藏在底部卡片后`);
    }
    if (index === 0) {
      const centered = viewport.getAttribute("transform");
      svg.fire("wheel", { deltaY: -100 });
      assert.notEqual(viewport.getAttribute("transform"), centered);
      map.update({}, { center: true }); finishAnimation();
      const recentered = parse(viewport);
      assert.ok(recentered.every((value, i) => Math.abs(value - [tx, ty, scale][i]) < 1e-8), "再次点击同条关系应重新取景");
    }
    map.update({ selectedLinkIndex: null, contextLinkIndex: index, overviewMode: true, depthMode: "all" }, { fit: true });
    finishAnimation();
    assert.equal(viewport.getAttribute("transform"), "translate(0 0) scale(1)");
    for (const node of nodeElements()) {
      assert.equal(node.classes.has("is-context-muted"), !endpoints.has(node.dataset.nodeId));
      assert.equal(node.classes.has("is-dimmed"), false, "关闭关系卡后无关节点恢复中等亮度");
      assert.equal(node.classes.has("is-link-endpoint"), false);
    }
    for (const path of edgeElements()) {
      assert.equal(path.classes.has("is-context-muted"), Number(path.dataset.linkIndex) !== index);
      assert.equal(path.classes.has("is-selected"), false);
    }
  }
  assert.ok(enlarged > 0, "局部关系应放大，长关系优先保证双端可见");
}
map.update({ contextLinkIndex: null });
assert.ok(nodeElements().every((n) => !n.classes.has("is-context-muted")));
map.destroy();

// Opposite-direction parallel edges need separate curves AND caption lanes.
panel.classes.add("is-collapsed");
svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1440, height: 900, right: 1440, bottom: 900 });
bar.getBoundingClientRect = () => ({ bottom: 72 });
const parallelLinks = [
  { ...links[0], source: "freud", target: "fromm", label: "同一对人物的第一条关系" },
  { ...links[0], source: "fromm", target: "freud", label: "同一对人物的第二条关系" }
];
const parallelMap = initTopology({ nodes: nodes.filter((n) => ["freud", "fromm"].includes(n.id)), links: parallelLinks, groups, relationTypes });
parallelMap.update({ selectedNodeId: "freud", overviewMode: false, depthMode: "1" });
assert.equal(edgeLabels().filter((e) => e.classes.has("is-visible") && !e.classes.has("is-occluded")).length, 2);
assert.notEqual(edgeElements()[0].getAttribute("d"), edgeElements()[1].getAttribute("d"));
verifyLabelClearance();
parallelMap.destroy();
Object.assign(globalThis, originalGlobals);

// Zoom remains smooth, bounded and stable at different frame rates.
const finalDistances = [];
for (const fps of [20, 30, 60, 120]) {
  const spring = createZoomSpring();
  spring.impulse(1000, 120, 140, 5200);
  let last = 1000;
  const first = spring.step(1 / fps);
  assert.ok(first > 1000 && first < 1000 * Math.exp(0.12));
  for (let frame = 0; frame < fps * 5; frame += 1) {
    const value = spring.step(1 / fps);
    if (value !== null) last = value;
    assert.ok(Number.isFinite(last) && last >= 140 && last <= 5200);
  }
  finalDistances.push(last);
  assert.ok(Math.abs(last - 1000 * Math.exp(0.12)) < 0.01);
  spring.impulse(last, -100000, 140, 5200);
  spring.cancel();
  assert.equal(spring.step(0.016), null);
  for (let i = 0; i < 100; i += 1) spring.impulse(150, -1000, 140, 5200);
  assert.ok(Math.abs(spring.step(0.016, true) - 140) < 1e-8);
}
assert.ok(Math.max(...finalDistances) - Math.min(...finalDistances) < 0.01);
console.log("地图与惯性回归通过：73 人物全直连标签、角度展开、人名与连线分离、背景线禁点、85 关系双端取景/关闭返回、并行关系、拖动与弹簧边界。");

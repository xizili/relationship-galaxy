// Background-only regression checks: no browser or desktop access.
import assert from "node:assert/strict";
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
map.destroy();
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
console.log("地图与惯性回归通过：73 节点点击、拖动不误选、关系聚焦、重置中断旧动画、20–120 FPS 弹簧与边界。");

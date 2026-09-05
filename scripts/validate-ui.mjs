// Background-only interaction tests: no browser, desktop, screen, mouse or network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as RealThree from "three";
import { groups, links, nodes, relationTypes, sourceSummary } from "../src/data.js";
import { portraits } from "../src/portraits.js";
import * as layout from "../src/galaxy-layout.js";
import { starVertices } from "../src/node-shapes.js";
import * as tour from "../src/relation-tour.js";

class Element {
  constructor() {
    this.dataset = {}; this.style = { setProperty() {} }; this.attributes = new Map();
    this.listeners = new Map(); this.innerHTML = ""; this.value = ""; this.hidden = false;
    this.clientWidth = 1440; this.clientHeight = 900;
    const classes = new Set();
    this.classList = { add: (...names) => names.forEach((name) => classes.add(name)), remove: (...names) => names.forEach((name) => classes.delete(name)), contains: (name) => classes.has(name), toggle: (name, force) => { const enabled = force ?? !classes.has(name); enabled ? classes.add(name) : classes.delete(name); return enabled; } };
  }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  removeAttribute(key) { this.attributes.delete(key); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  appendChild() {}
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  fire(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener({ currentTarget: this, target: this, ...event }); }
  querySelectorAll() { return []; }
  querySelector(selector) { return element(selector); }
  insertAdjacentHTML(_where, html) { this.innerHTML += html; }
  getBoundingClientRect() { return { width: 1440, height: 900, left: 0, top: 0 }; }
  focus() {} blur() {}
}
const elements = new Map();
const element = (selector) => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); };
const doc = { querySelector: element, querySelectorAll: () => [], createElement: () => new Element() };
const windowStub = new Element();
Object.assign(windowStub, { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), dispatchEvent() {} });
class Renderer { constructor() { this.domElement = new Element(); } setPixelRatio() {} setSize() {} render() {} }
class LabelObject extends RealThree.Object3D { constructor(element) { super(); this.element = element; } }
class Controls { constructor() { this.target = new RealThree.Vector3(); } update(delta) { this.lastDelta = delta; } }
const secondaryView = () => ({ update() {}, resize() {}, positionPopover() {} });
const context = vm.createContext({
  console, performance: { now: () => 0 }, document: doc, window: windowStub,
  requestAnimationFrame: () => 1, Event: class {}, CSS: { escape: (s) => s },
  THREE: { ...RealThree, WebGLRenderer: Renderer }, OrbitControls: Controls,
  CSS2DObject: LabelObject, CSS2DRenderer: Renderer, createIcons() {},
  MapIcon: {}, Orbit: {}, RotateCcw: {}, Search: {}, Telescope: {}, X: {},
  groups, links, nodes, relationTypes, sourceSummary, portraits,
  portraitAssetUrl: (id) => portraits[id] ? `/portraits/${id}.webp` : "",
  ...layout, ...tour, starVertices, initTopology: secondaryView, initTimeline: secondaryView
});
let source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
source = source.replace(/^import[\s\S]*?;\n/gm, "");
source += `\nglobalThis.testApi = { focusNode, setActiveView, enterOverview, renderLinkDetail, renderSearchResults, animate, nodeRecords, linkRecords, controls, camera, getState: () => ({ activeView, overviewMode, detailPanelOpen, selectedNodeId, cameraGoal, targetGoal }) };`;
vm.runInContext(source, context);
const api = context.testApi;
assert.equal(api.getState().activeView, "galaxy");
assert.equal(api.getState().overviewMode, true);
assert.equal(api.getState().detailPanelOpen, false);
assert.equal(api.controls.autoRotate, true);
assert.equal(api.nodeRecords.size, 73);
assert.equal(api.linkRecords.length, 85);
assert.equal(api.nodeRecords.get("cybernetics").mesh.geometry.type, "ExtrudeGeometry");
assert.equal(api.nodeRecords.get("freud").mesh.geometry.type, "SphereGeometry");
for (const record of api.nodeRecords.values()) {
  record.mesh.geometry.computeBoundingBox();
  const bounds = record.mesh.geometry.boundingBox.getSize(new RealThree.Vector3());
  assert.ok(Math.abs(bounds.x - 20) < 1e-4 && Math.abs(bounds.y - 20) < 1e-4, `基础直径不一致：${record.node.id}`);
}
assert.equal(api.linkRecords.reduce((sum, record) => sum + record.arrows.length, 0), 100);
assert.ok([...api.nodeRecords.values()].every((record) => record.node.size === 10));
assert.ok([...api.nodeRecords.values()].every((record) => record.mesh.scale.x === 1));
assert.ok([...api.nodeRecords.values()].every((record) => record.label.classList.contains("is-overview")));
api.animate(1900);
assert.equal(api.linkRecords.filter((record) => record.pulseMesh.visible).length, 1);
api.animate(2500);
assert.ok([...api.nodeRecords.values()].some((record) => record.label.classList.contains("is-storylit")));

for (const node of nodes) {
  api.focusNode(node.id);
  assert.equal(api.controls.autoRotate, true, `聚焦不得停止旋转：${node.id}`);
  assert.equal(api.getState().detailPanelOpen, true);
  assert.ok(element("#detailPanelContent").innerHTML.includes(node.cn));
  assert.ok(element("#detailPanelContent").innerHTML.includes("XMind 节点原文"));
  assert.ok(api.nodeRecords.get(node.id).mesh.scale.x > 1);
  assert.ok([...api.nodeRecords.values()].filter((record) => record.node.id !== node.id).every((record) => record.mesh.scale.x === 1));
  assert.ok(api.linkRecords.every((record) => !record.pulseMesh.visible));
}
api.focusNode("freud");
element("#closeDetailPanel").fire("click");
assert.equal(api.getState().detailPanelOpen, false);
assert.equal(api.getState().selectedNodeId, "freud");
assert.equal(api.controls.autoRotate, true);
api.setActiveView("timeline");
element("#overviewToggle").fire("click");
assert.equal(api.getState().activeView, "galaxy");
assert.equal(api.getState().overviewMode, true);
assert.equal(api.getState().detailPanelOpen, true);
assert.equal(api.getState().selectedNodeId, null);
assert.equal(element("#overviewToggle").getAttribute("aria-pressed"), null);
assert.equal(element("#overviewToggle").classList.contains("active"), false);
element("#overviewToggle").fire("click");
assert.equal(api.getState().detailPanelOpen, true, "望远镜不应反向关闭侧栏");

element("#orbitToggle").fire("click");
assert.equal(api.controls.autoRotate, false);
assert.equal(element("#orbitToggle").getAttribute("aria-pressed"), "false");
api.focusNode("freud"); api.enterOverview();
element("#resetView").fire("click");
api.setActiveView("topology"); element("#overviewToggle").fire("click");
assert.equal(api.controls.autoRotate, false, "用户关闭后，其他操作不得重新开启旋转");
element("#orbitToggle").fire("click");
assert.equal(api.controls.autoRotate, true);

api.focusNode("kafka");
api.setActiveView("timeline"); api.animate(5000); api.setActiveView("galaxy"); api.animate(7000);
assert.equal(api.getState().cameraGoal, null);
assert.ok(api.controls.target.distanceTo(layout.buildGalaxyLayout(nodes, links, new RealThree.Vector3(1.18, 0.84, 1.03)).get("kafka")) < 1e-9, "跨视图返回后的相机过渡必须落到目标");
const plain = links.findIndex((link) => !link.directed && !link.bidirectional);
api.renderLinkDetail(plain);
assert.ok(element("#detailPanelContent").innerHTML.includes("无向连线"));
api.renderSearchResults("宴会");
assert.ok(element("#searchResults").innerHTML.includes(" — "));
api.focusNode("kafka");
assert.ok(element("#detailPanelContent").innerHTML.includes("没有人既能有真正的精神生活，又能同时保持身心绝对健康"));

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /id="app" data-active-view="galaxy"/);
assert.match(html, /id="orbitToggle"[^>]*aria-pressed="true"/);
assert.doesNotMatch(html.match(/id="overviewToggle"[\s\S]*?>/)[0], /aria-pressed/);
assert.ok(html.indexOf('id="closeDetailPanel"') < html.indexOf('id="detailPanelContent"'));

// Test the real timeline renderer separately, including its undated topic area.
globalThis.document = doc;
const { initTimeline } = await import("../src/timeline.js");
const timelineRoot = new Element();
initTimeline({ root: timelineRoot, nodes, links, groups, onFocusNode() {} });
assert.equal((timelineRoot.innerHTML.match(/data-node-id=/g) ?? []).length, 73);
assert.ok(timelineRoot.innerHTML.includes('data-kind="topic" data-node-id="cybernetics"'));
assert.ok(timelineRoot.innerHTML.includes("前384"));
assert.ok(timelineRoot.innerHTML.includes("前369"));
assert.ok(timelineRoot.innerHTML.includes("© Peter Potrowl"));
assert.ok(!timelineRoot.innerHTML.includes('src=""'));
delete globalThis.document;
console.log("后台交互测试通过：73 节点、85 连线及双向箭头、默认银河旋转、72 人物卡与主题卡、关闭按钮、望远镜、持续旋转、跨视图聚焦与原文。");

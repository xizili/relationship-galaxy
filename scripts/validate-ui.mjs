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
import { createZoomSpring } from "../src/nebula-motion.js";
import { soundtrack } from "../src/soundtrack.js";
import { createGoldDust } from "../src/gold-dust.js";

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
  scrollTo({ top }) { this.scrollTop = top; }
  showModal() { this.open = true; }
}
const elements = new Map();
const element = (selector) => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); };
const doc = { querySelector: element, querySelectorAll: () => [], createElement: () => new Element() };
const windowStub = new Element();
Object.assign(windowStub, { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), dispatchEvent() {} });
class Renderer { constructor() { this.domElement = new Element(); } setPixelRatio() {} setSize() {} render() {} }
class LabelObject extends RealThree.Object3D { constructor(element) { super(); this.element = element; } }
class Controls { constructor() { this.target = new RealThree.Vector3(); } update(delta) { this.lastDelta = delta; } addEventListener() {} }
const secondaryView = () => ({ update() {}, resize() {}, positionPopover() {} });
const context = vm.createContext({
  console, performance: { now: () => 0 }, document: doc, window: windowStub,
  requestAnimationFrame: () => 1, Event: class {}, CSS: { escape: (s) => s },
  THREE: { ...RealThree, WebGLRenderer: Renderer }, OrbitControls: Controls,
  CSS2DObject: LabelObject, CSS2DRenderer: Renderer, createIcons() {},
  MapIcon: {}, Orbit: {}, RotateCcw: {}, Search: {}, Telescope: {}, X: {},
  groups, links, nodes, relationTypes, sourceSummary, portraits,
  portraitAssetUrl: (id) => portraits[id] ? `/portraits/${id}.webp` : "",
  ...layout, ...tour, starVertices, createZoomSpring, initTopology: secondaryView, initTimeline: secondaryView,
  soundtrack, createGoldDust, initSoundtrack: () => ({})
});
let source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
source = source.replace(/^import[\s\S]*?;\n/gm, "");
source += `\nglobalThis.testApi = { focusNode, setActiveView, enterOverview, renderLinkDetail, renderSearchResults, animate, nodeRecords, linkRecords, controls, camera, goldDust, getState: () => ({ activeView, overviewMode, detailPanelOpen, selectedNodeId, selectedLinkIndex, mapContextNodeId, activeGroup, depthMode, cameraGoal, targetGoal }) };`;
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
assert.equal(api.linkRecords.reduce((sum, record) => sum + record.synapses.length, 0), 100);
for (const record of api.linkRecords) {
  assert.equal(record.synapses.length, record.link.bidirectional ? 2 : record.link.directed ? 1 : 0);
  for (const terminal of record.synapses) {
    assert.equal(terminal.geometry.type, "SphereGeometry");
    assert.equal(terminal.material.color.getHex(), 0xd9e1ec);
    assert.ok(terminal.userData.t === 0 || terminal.userData.t === 1);
    assert.ok(terminal.position.distanceTo(record.curve.getPoint(terminal.userData.t)) < 1e-8);
  }
}
assert.equal(element(".depth-control").hidden, true);
assert.equal(element("#resetView").hidden, true);
assert.equal(element("#galaxyHint").hidden, false);
assert.ok([...api.nodeRecords.values()].every((record) => record.node.size === 10));
assert.ok([...api.nodeRecords.values()].every((record) => record.mesh.scale.x === 1));
assert.ok([...api.nodeRecords.values()].every((record) => record.label.classList.contains("is-overview")));
api.animate(1900);
assert.equal(api.linkRecords.filter((record) => record.pulseMesh.visible).length, 1);
api.animate(2500);
assert.ok([...api.nodeRecords.values()].some((record) => record.label.classList.contains("is-storylit")));
const touring = api.linkRecords.find((record) => record.pulseMesh.visible);
const sampled = tour.relationPulse(touring.link, 600);
for (const [id, gain] of [[touring.link.source, sampled.sourceGlow], [touring.link.target, sampled.targetGlow]]) {
  const node = api.nodeRecords.get(id);
  assert.ok(Math.abs(node.material.emissiveIntensity - node.baseEmissiveIntensity - gain * 0.72) < 1e-9);
  assert.ok(Math.abs(node.glowMaterial.opacity - node.baseGlowOpacity - gain * 0.26) < 1e-9);
  assert.equal(node.mesh.scale.x, 1, "发光不应改变节点大小");
}

for (const node of nodes) {
  api.focusNode(node.id);
  assert.equal(api.controls.autoRotate, true, `聚焦不得停止旋转：${node.id}`);
  assert.equal(api.getState().detailPanelOpen, true);
  assert.ok(element("#detailPanelContent").innerHTML.includes(node.cn));
  assert.ok(element("#detailPanelContent").innerHTML.includes("XMind 节点原文"));
  assert.ok(api.nodeRecords.get(node.id).mesh.scale.x > 1);
  assert.ok([...api.nodeRecords.values()].filter((record) => record.node.id !== node.id).every((record) => record.mesh.scale.x === 1));
  assert.ok(api.linkRecords.every((record) => !record.pulseMesh.visible));
  for (const id of [touring.link.source, touring.link.target]) {
    const previous = api.nodeRecords.get(id);
    assert.equal(previous.material.emissiveIntensity, previous.baseEmissiveIntensity, "聚焦打断巡游时恢复当前高亮，而非旧亮度");
    assert.equal(previous.glowMaterial.opacity, previous.baseGlowOpacity);
  }
  assert.equal(element(".depth-control").hidden, false);
  assert.equal(element("#galaxyHint").hidden, true);
  assert.ok(!element("#detailPanelContent").innerHTML.includes("<figcaption"));
}
element("#imageCreditsToggle").fire("click");
assert.equal(element("#imageCredits").open, true);
assert.ok(element("#imageCreditsContent").innerHTML.includes("© Peter Potrowl"));
assert.ok(element("#imageCreditsContent").innerHTML.includes("creativecommons.org"));

// Node selection uses the same sidebar in every mode, including all map nodes.
api.setActiveView("topology");
for (const node of nodes) {
  api.focusNode(node.id, { camera: false });
  assert.equal(api.getState().selectedNodeId, node.id);
  assert.equal(api.getState().detailPanelOpen, true);
  assert.ok(element("#detailPanelContent").innerHTML.includes(`<h2>${node.cn}</h2>`));
}
for (const view of ["topology", "timeline"]) {
  api.setActiveView(view);
  api.focusNode("freud", { camera: false });
  element("#timelineView").scrollTop = 600;
  element("#resetView").fire("click");
  assert.equal(api.getState().activeView, view);
  assert.equal(api.getState().selectedNodeId, null);
  assert.equal(api.getState().detailPanelOpen, false);
  assert.equal(api.getState().activeGroup, "all");
  assert.equal(element(".depth-control").hidden, true);
  assert.equal(element("#resetView").hidden, false);
  if (view === "timeline") assert.equal(element("#timelineView").scrollTop, 0);
}
api.setActiveView("topology");
api.focusNode("freud", { camera: false });
element("#closeDetailPanel").fire("click");
assert.equal(api.getState().selectedNodeId, null);
assert.equal(api.getState().mapContextNodeId, "freud");
assert.equal(api.getState().overviewMode, true);
assert.equal(api.getState().detailPanelOpen, false);
assert.equal(element(".depth-control").hidden, true);
assert.ok([...api.nodeRecords.values()].every((r) => r.mesh.scale.x === 1));
api.focusNode("jung", { camera: false });
assert.equal(api.getState().mapContextNodeId, null);
element("#closeDetailPanel").fire("click");
element("#resetView").fire("click");
assert.equal(api.getState().mapContextNodeId, null, "重置须恢复所有节点高亮");
api.setActiveView("galaxy");
for (let index = 0; index < links.length; index += 1) {
  api.renderLinkDetail(index);
  const activeIds = [...api.nodeRecords].filter(([, r]) => r.material.opacity === 1).map(([id]) => id).sort();
  assert.deepEqual(activeIds, [links[index].source, links[index].target].sort());
  assert.equal(element(".depth-control").hidden, false);
  assert.ok(api.getState().cameraGoal && api.getState().targetGoal);
}
api.enterOverview();
assert.equal(element(".depth-control").hidden, true);
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
const timeline = initTimeline({ root: timelineRoot, nodes, links, groups, onFocusNode() {} });
assert.equal((timelineRoot.innerHTML.match(/data-node-id=/g) ?? []).length, 73);
assert.ok(timelineRoot.innerHTML.includes('data-kind="topic" data-node-id="cybernetics"'));
assert.ok(timelineRoot.innerHTML.includes("前384"));
assert.ok(timelineRoot.innerHTML.includes("前369"));
assert.ok(!timelineRoot.innerHTML.includes("timeline-portrait-credit"));
assert.ok(!timelineRoot.innerHTML.includes('src=""'));
// Parse the actual emitted card attributes, then exercise the filter update.
const cards = [...timelineRoot.innerHTML.matchAll(/<button\b([\s\S]*?)>/g)].map(([, attributes]) => {
  const card = new Element();
  for (const [, key, value] of attributes.matchAll(/data-(node-id|group|kind)="([^"]+)"/g)) {
    card.dataset[key === "node-id" ? "nodeId" : key] = value;
  }
  return card;
});
const decade = (card) => Math.floor(layout.birthYear(nodes.find((n) => n.id === card.dataset.nodeId)) / 10);
const sections = [...new Set(cards.filter((c) => c.dataset.kind !== "topic").map(decade))].map((year) => {
  const section = new Element();
  section.querySelectorAll = () => cards.filter((c) => c.dataset.kind !== "topic" && decade(c) === year && !c.hidden);
  return section;
});
const topicSection = new Element();
timelineRoot.querySelector = () => topicSection;
timelineRoot.querySelectorAll = (selector) => selector === ".timeline-card" ? cards : selector === ".timeline-decade" ? sections : cards.filter((c) => c.dataset.kind === "topic" && !c.hidden);
for (const group of ["all", ...Object.keys(groups)]) {
  timeline.update({ activeGroup: group, selectedNodeId: "freud" });
  const expected = nodes.filter((n) => group === "all" || n.group === group);
  assert.deepEqual(cards.filter((c) => !c.hidden).map((c) => c.dataset.nodeId).sort(), expected.map((n) => n.id).sort());
  assert.equal(element("#timelineVisibleCount").textContent, String(expected.filter((n) => n.kind === "person").length));
  assert.equal(topicSection.hidden, !expected.some((n) => n.kind === "topic"));
}
delete globalThis.document;
assert.ok(!html.includes('id="topologyPopover"'));
assert.ok(html.includes(">地图模式</button>"));
assert.ok(!html.includes("策展布局"));
api.enterOverview();
api.animate(30001);
assert.equal(element("#galaxyHint").hidden, true);
api.focusNode("freud"); api.enterOverview();
assert.equal(element("#galaxyHint").hidden, true, "提示到期后不能因返回全览而重新出现");
assert.ok(!html.includes("<iframe"), "音乐不依赖第三方播放器");
assert.ok(html.includes('id="backgroundMusic"'));
assert.ok(element("#musicCreditsContent").innerHTML.includes(soundtrack.licenseUrl));
for (const node of nodes.filter((node) => node.kind !== "topic")) assert.ok(portraits[node.id], `${node.id} 缺少头像`);
for (const id of ["marom", "ogden"]) {
  assert.ok(element("#imageCreditsContent").innerHTML.includes(portraits[id].sourcePageUrl));
  assert.equal(portraits[id].license, "未核实开放转载许可");
}
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
console.log("后台交互测试通过：73 节点、85 连线、100 银色突触、全节点侧栏、关系双端聚焦、视图重置、深度栏与图片署名集中展示。");

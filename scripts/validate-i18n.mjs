import assert from "node:assert/strict";
import { nodes, links, groups, relationTypes } from "../src/data.js";
import { portraits } from "../src/portraits.js";
import people from "../src/locales/people.en.json" with { type: "json" };
import relations from "../src/locales/relations.en.json" with { type: "json" };
import { LANGUAGE_KEY, readLanguage, getLanguage, setLanguage, onLanguageChange, t, nodeName, nodeInfo, linkLabel, linkFullText, localizeElement } from "../src/i18n.js";

const original = JSON.stringify({ nodes, links });
assert.deepEqual(Object.keys(people).sort(), nodes.map((node) => node.id).sort());
assert.deepEqual(Object.keys(relations).sort(), links.map((link) => link.id).sort());
assert.equal(readLanguage({ getItem: () => "en" }), "en");
assert.equal(readLanguage({ getItem: () => "invalid" }), "zh");
assert.equal(readLanguage({ getItem() { throw new Error("blocked storage"); } }), "zh");
let notifications = 0;
const unsubscribe = onLanguageChange(() => notifications++);
setLanguage("en"); setLanguage("en"); setLanguage("fr");
assert.equal(notifications, 1);
assert.equal(getLanguage(), "en");
const english = (value) => assert.doesNotMatch(value, /\p{Script=Han}/u, value);
for (const node of nodes) {
  assert.equal(nodeName(node), node.name);
  for (const field of ["role", "summary"]) {
    assert.ok(nodeInfo(node, field).length > 0); english(nodeInfo(node, field));
  }
  assert.equal(nodeInfo(node, "works").length, node.works.length);
  nodeInfo(node, "works").forEach(english);
  [...node.tags, node.years, ...(node.biographySources ?? []).map((s) => s.label)].map(t).forEach(english);
}
for (const link of links) {
  assert.ok(linkLabel(link)); assert.ok(linkFullText(link));
  english(linkLabel(link)); english(linkFullText(link));
  if (link.sourceAnnotated) assert.ok(relations[link.id].fullText);
}
Object.values(groups).map((g) => t(g.label)).forEach(english);
Object.values(relationTypes).map((r) => t(r.label)).forEach(english);
Object.values(portraits).flatMap((p) => [p.creator, p.sourceLabel, p.modifications, p.imageNote, p.rightsNote].filter(Boolean)).map(t).forEach(english);
assert.equal(t("72 位 + 1 个主题"), "72 people + 1 topic");
assert.equal(t("85 条关系"), "85 connections");
assert.equal(t("约前369—前286"), "c. 369–286 BCE");

// A small actual-node-shaped tree exercises reversible static translation.
const text = (value) => ({ nodeType: 3, nodeValue: value });
const element = (tag, children = [], attrs = {}) => ({
  nodeType: 1, tagName: tag, childNodes: children, attrs,
  getAttribute(key) { return this.attrs[key] ?? null; },
  setAttribute(key, value) { this.attrs[key] = value; },
  hasAttribute(key) { return key in this.attrs; }
});
const title = text("关系的银河");
const selection = element("OPTION", [text("中文")], { "data-i18n-skip": "" });
const input = element("INPUT", [], { placeholder: "搜索人物、关系、领域、流派", "aria-label": "界面语言" });
input.value = "Freud 弗洛伊德";
const draft = text("原稿：关系的银河");
const textarea = element("TEXTAREA", [draft], { placeholder: "请勿留下邮箱、电话号码等私人信息。" });
const source = text(nodes[0].sourceText);
const visitor = text("关系的银河 很棒 <script>");
const tree = element("MAIN", [title, selection, input, textarea,
  element("P", [source], { "data-i18n-skip": "" }),
  element("DIV", [visitor], { "data-i18n-skip": "" })]);
for (let cycle = 0; cycle < 3; cycle++) {
  setLanguage("en"); localizeElement(tree);
  assert.equal(title.nodeValue, "Relationship Galaxy");
  assert.equal(input.attrs["aria-label"], "Interface language");
  english(input.attrs.placeholder); english(textarea.attrs.placeholder);
  assert.equal(selection.childNodes[0].nodeValue, "中文");
  assert.equal(input.value, "Freud 弗洛伊德");
  assert.equal(source.nodeValue, nodes[0].sourceText);
  assert.equal(visitor.nodeValue, "关系的银河 很棒 <script>");
  assert.equal(draft.nodeValue, "原稿：关系的银河");
  setLanguage("zh"); localizeElement(tree);
  assert.equal(title.nodeValue, "关系的银河");
  assert.equal(input.attrs.placeholder, "搜索人物、关系、领域、流派");
  assert.equal(textarea.attrs.placeholder, "请勿留下邮箱、电话号码等私人信息。");
}
assert.equal(JSON.stringify({ nodes, links }), original, "Translations must never rewrite the original dataset");
unsubscribe();
// Verify the preference survives a fresh module initialization, including blocked writes.
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const saved = new Map();
Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value) } });
setLanguage("en"); assert.equal(saved.get(LANGUAGE_KEY), "en");
const reloaded = await import("../src/i18n.js?reload-test");
assert.equal(reloaded.getLanguage(), "en");
Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Private mode blocks storage"); } });
assert.doesNotThrow(() => setLanguage("zh"));
for (const [key, descriptor] of [["window", previousWindow], ["localStorage", previousStorage]]) {
  if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
}
console.log("语言检查通过：73 节点、85 关系、领域与署名完整翻译；双向切换、持久化、禁用存储、原文与访客草稿保护。");

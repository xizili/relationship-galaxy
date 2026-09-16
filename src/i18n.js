import people from "./locales/people.en.json" with { type: "json" };
import relations from "./locales/relations.en.json" with { type: "json" };
import messages from "./locales/ui.en.json" with { type: "json" };

export const LANGUAGE_KEY = "relationship-galaxy-language";
export function readLanguage(storage) {
  try { return storage?.getItem(LANGUAGE_KEY) === "en" ? "en" : "zh"; }
  catch { return "zh"; }
}
let language = "zh";
try { if (typeof window !== "undefined") language = readLanguage(globalThis.localStorage); } catch { /* Storage may be disabled. */ }
const listeners = new Set();
export const getLanguage = () => language;
export const locale = () => language === "en" ? "en-US" : "zh-CN";
export function onLanguageChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function setLanguage(value) {
  if (!["zh", "en"].includes(value) || value === language) return;
  language = value;
  try { if (typeof window !== "undefined") globalThis.localStorage?.setItem(LANGUAGE_KEY, value); } catch { /* Preference is optional. */ }
  for (const listener of listeners) listener(value);
}

// Only UI-owned text is translated. Original sources and visitor messages are excluded.
const phraseKeys = Object.keys(messages).filter((key) => /\p{Script=Han}/u.test(key)).sort((a, b) => b.length - a.length);
const phrasePattern = new RegExp(phraseKeys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gu");
export function t(value) {
  const text = String(value ?? "");
  if (language !== "en") return text;
  if (messages[text] !== undefined) return messages[text];
  return text
    .replace(/(\d+) 位人物与 (\d+) 个主题，包含独立的小网络。由 XMind 节点与显式关系直接整理。/g,
      "$1 people and $2 topic, including separate small networks. Compiled directly from XMind nodes and explicit relationships.")
    .replace(/(\d+) (?:个人物|位人物|位)(?=\s|$|[，。·+])/g, "$1 people")
    .replace(/(\d+) 个主题/g, "$1 topic")
    .replace(/(\d+) 条主题关系/g, "$1 topic connections")
    .replace(/(\d+) 条关系/g, "$1 connections")
    .replace(/(\d+) 个领域/g, "$1 fields")
    .replace(/(\d+) 类关系/g, "$1 relation types")
    .replace(/(\d+) 度关系/g, "$1-hop connections")
    .replace(/^(\d+) [个类]$/, "$1")
    .replace(/约前(\d+)—前(\d+)/g, "c. $1–$2 BCE")
    .replace(/前(\d+)—前(\d+)/g, "$1–$2 BCE")
    .replace(/前(\d+)/g, "$1 BCE")
    .replace(phrasePattern, (phrase) => messages[phrase]);
}

export const nodeName = (node) => language === "en" ? node.name : node.cn;
export const otherName = (node) => language === "en" ? node.cn : node.name;
export function nodeInfo(node, field) { return language === "en" ? people[node.id]?.[field] ?? node[field] : node[field]; }
export function linkLabel(link) { return language === "en" ? relations[link.id]?.shortLabel ?? t(link.label) : link.label; }
export function linkFullText(link) {
  if (link.sourceAnnotated === false) return t("原图有此连线，未标注关系文字。");
  return language === "en" ? relations[link.id]?.fullText ?? link.fullText : link.fullText;
}
export function compactLabel(text, chineseLimit = 28, englishLimit = 58) {
  const limit = language === "en" ? englishLimit : chineseLimit;
  if (text.length <= limit) return text;
  const head = text.slice(0, limit - 1);
  return `${language === "en" ? head.replace(/\s+\S*$/, "") : head}…`;
}

const originals = new WeakMap();
function translatedProperty(owner, key, value) {
  const fields = originals.get(owner) ?? new Map();
  const previous = fields.get(key);
  // Dynamic content may have been replaced since the last translation.
  const source = previous && previous.output === value ? previous.source : value;
  const output = t(source);
  fields.set(key, { source, output }); originals.set(owner, fields);
  return output;
}
export function localizeElement(root) {
  if (!root) return;
  const visit = (element) => {
    if (element.nodeType === 3) {
      element.nodeValue = translatedProperty(element, "text", element.nodeValue);
      return;
    }
    if (element.nodeType !== 1 && element.nodeType !== 9) return;
    if (element.hasAttribute?.("data-i18n-skip") || ["SCRIPT", "STYLE", "TEXTAREA"].includes(element.tagName)) {
      // Textarea value is a visitor draft; its placeholder is still UI text.
      if (element.tagName === "TEXTAREA") {
        for (const key of ["placeholder", "aria-label"]) {
          const value = element.getAttribute(key);
          if (value) element.setAttribute(key, translatedProperty(element, key, value));
        }
      }
      return;
    }
    for (const key of ["title", "aria-label", "placeholder", "alt", ...(element.tagName === "META" ? ["content"] : [])]) {
      const value = element.getAttribute?.(key);
      if (value) element.setAttribute(key, translatedProperty(element, key, value));
    }
    for (const child of element.childNodes ?? []) visit(child);
  };
  visit(root);
}
export function setLocalizedHtml(element, html) {
  element.innerHTML = html;
  localizeElement(element);
}
export function localizeDocument(doc = document) {
  localizeElement(doc);
  doc.documentElement?.setAttribute("lang", locale());
  const select = doc.querySelector("#languageSelect");
  if (select) select.value = language;
  const mail = doc.querySelector('.guestbook-private a[href^="mailto:"]');
  if (mail) mail.href = `mailto:neuroplus@126.com?subject=${encodeURIComponent(language === "en" ? "Relationship Galaxy · Private message" : "关系的银河 · 私信")}`;
}

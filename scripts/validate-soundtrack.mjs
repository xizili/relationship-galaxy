import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initSoundtrack, soundtrack } from "../src/soundtrack.js";

function fixture(playImplementation = () => Promise.resolve()) {
  const elements = new Map();
  const gestures = new Map();
  const doc = {
    addEventListener(type, listener) { gestures.set(type, listener); },
    removeEventListener(type, listener) { if (gestures.get(type) === listener) gestures.delete(type); },
    querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      dataset: {}, attributes: {}, listeners: {}, calls: 0, paused: true,
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(key, value) { this.listeners[key] = value; },
      contains(target) { return target === this || target?.parent === this; },
      play() { this.calls++; this.paused = false; return playImplementation(); },
      pause() { this.paused = true; this.listeners.pause?.(); }
    });
    return elements.get(selector);
  } };
  const api = initSoundtrack(doc);
  const toggle = elements.get("#musicToggle");
  return {
    api, audio: elements.get("#backgroundMusic"), toggle, label: elements.get("#musicState"), gestures,
    gesture(type = "click", options = {}) {
      const event = { type, isTrusted: true, target: {}, ...options };
      gestures.get(type)?.(event);
      if (type === "click" && toggle.contains(event.target)) toggle.listeners.click(event);
    }
  };
}
const loaded = fixture();
await loaded.api.ready;
assert.equal(loaded.audio.calls, 1, "进入时应尝试自动播放");
assert.equal(loaded.toggle.dataset.state, "playing");
assert.equal(loaded.audio.volume, 0.3);
assert.equal(loaded.audio.loop, true);
assert.equal(loaded.audio.autoplay, true);
assert.equal(loaded.gestures.size, 0, "播放成功后应卸载全局重试监听");
assert.ok(loaded.audio.src.endsWith(soundtrack.file));
loaded.toggle.listeners.click();
assert.equal(loaded.audio.paused, true);
assert.equal(loaded.audio.autoplay, false, "手动关闭也必须停用原生自动播放");
assert.equal(loaded.toggle.attributes["aria-pressed"], "false");
loaded.toggle.listeners.click();
await Promise.resolve();
assert.equal(loaded.toggle.dataset.state, "playing");
loaded.audio.pause();
assert.equal(loaded.toggle.dataset.state, "paused", "系统暂停必须同步到控件");

let denied = true;
const blocked = fixture(() => denied ? Promise.reject(Object.assign(new Error("Gesture needed"), { name: "NotAllowedError" })) : Promise.resolve());
await blocked.api.ready;
assert.equal(blocked.toggle.dataset.state, "blocked");
assert.equal(blocked.label.textContent, "待播放 · 关闭");
assert.equal(blocked.toggle.attributes["aria-pressed"], "true", "拦截后仍保留默认开启的意愿，但不伪称已经播放");
blocked.gesture("click", { isTrusted: false });
blocked.gesture("keydown", { key: "Escape" });
blocked.gesture("keydown", { key: "Control" });
blocked.gesture("keydown", { key: "r", ctrlKey: true });
blocked.gesture("keydown", { key: "Enter", repeat: true });
assert.equal(blocked.audio.calls, 1, "合成事件、快捷键和重复按键不能触发重试");
denied = false;
blocked.gesture();
assert.equal(blocked.audio.calls, 2, "必须在真实点击处理器中同步调用播放");
await Promise.resolve();
assert.equal(blocked.toggle.dataset.state, "playing");
assert.equal(blocked.gestures.size, 0);

let repeatedAttempts = 0;
const repeatedlyBlocked = fixture(() => ++repeatedAttempts < 3 ? Promise.reject(Object.assign(new Error(), { name: "NotAllowedError" })) : Promise.resolve());
await repeatedlyBlocked.api.ready;
repeatedlyBlocked.gesture();
await Promise.resolve();
assert.equal(repeatedlyBlocked.toggle.dataset.state, "blocked");
repeatedlyBlocked.gesture();
await Promise.resolve();
assert.equal(repeatedlyBlocked.toggle.dataset.state, "playing", "再次被拦截后仍可在后续可信交互中播放");

for (const type of ["touchend", "keydown"]) {
  let attempts = 0;
  const touchOrKeyboard = fixture(() => ++attempts === 1 ? Promise.reject(Object.assign(new Error(), { name: "NotAllowedError" })) : Promise.resolve());
  await touchOrKeyboard.api.ready;
  touchOrKeyboard.gesture(type, { key: "Enter" });
  assert.equal(touchOrKeyboard.audio.calls, 2);
  touchOrKeyboard.gesture("click"); // Touch compatibility click must not double-play.
  await Promise.resolve();
  assert.equal(touchOrKeyboard.audio.calls, 2);
  assert.equal(touchOrKeyboard.toggle.dataset.state, "playing");
}

let permitOff = false;
const offWhileBlocked = fixture(() => permitOff ? Promise.resolve() : Promise.reject(Object.assign(new Error(), { name: "NotAllowedError" })));
await offWhileBlocked.api.ready;
const buttonChild = { parent: offWhileBlocked.toggle };
offWhileBlocked.gesture("touchend", { target: buttonChild });
offWhileBlocked.gesture("keydown", { target: offWhileBlocked.toggle, key: "Enter" });
assert.equal(offWhileBlocked.audio.calls, 1, "音乐按钮及子元素不能触发全局开启");
offWhileBlocked.gesture("click", { target: buttonChild });
assert.equal(offWhileBlocked.toggle.dataset.state, "paused");
assert.equal(offWhileBlocked.gestures.size, 0);
assert.equal(offWhileBlocked.audio.autoplay, false);
permitOff = true;
for (const type of ["click", "touchend", "keydown"]) offWhileBlocked.gesture(type, { key: "Enter" });
assert.equal(offWhileBlocked.audio.calls, 1, "关闭后浏览页面不能再自动打开音乐");
offWhileBlocked.gesture("click", { target: offWhileBlocked.toggle });
await Promise.resolve();
assert.equal(offWhileBlocked.toggle.dataset.state, "playing", "关闭之后仍可手动重新开启");

let denyOld;
let raceCalls = 0;
const gestureDuringLoad = fixture(() => ++raceCalls === 1 ? new Promise((_resolve, reject) => { denyOld = reject; }) : Promise.resolve());
gestureDuringLoad.gesture();
await Promise.resolve();
assert.equal(gestureDuringLoad.toggle.dataset.state, "playing", "初次播放尚未返回时的交互也不能丢失");
denyOld(Object.assign(new Error(), { name: "NotAllowedError" }));
await gestureDuringLoad.api.ready;
assert.equal(gestureDuringLoad.toggle.dataset.state, "playing", "旧的拒绝结果不能覆盖已开始的播放");
assert.equal(gestureDuringLoad.gestures.size, 0);

let finish;
const pending = fixture(() => new Promise((resolve) => { finish = resolve; }));
pending.toggle.listeners.click();
finish();
await pending.api.ready;
assert.equal(pending.audio.paused, true, "加载中关闭后，异步完成不能重新播放");
assert.equal(pending.toggle.dataset.state, "paused");
pending.gesture();
assert.equal(pending.audio.calls, 1);
const failure = fixture(() => Promise.reject(new Error("Audio error")));
await failure.api.ready;
assert.equal(failure.toggle.dataset.state, "error");
assert.equal(failure.label.textContent, "重试音乐");
failure.gesture();
assert.equal(failure.audio.calls, 1, "真实资源错误不应在普通页面操作时反复重试");
const queued = fixture();
await queued.api.ready;
queued.audio.pause = function () { this.paused = true; };
queued.api.close();
const restarted = queued.api.play();
queued.audio.listeners.pause(); // Delayed event from the previous close.
await restarted;
assert.equal(queued.toggle.dataset.state, "playing");
assert.equal(queued.audio.paused, false, "旧的异步 pause 事件不能关闭新的播放请求");
const file = readFileSync(new URL(`../public/${soundtrack.file}`, import.meta.url));
assert.equal(createHash("sha1").update(file).digest("hex"), soundtrack.sha1, "录音必须与来源原文件完全一致");
assert.equal(file.length, 7487656);
assert.equal(soundtrack.license, "CC BY 3.0");
const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(markup, /<audio id="backgroundMusic" autoplay preload="auto" loop>/);
console.log("配乐检查通过：默认自动开启、可信点击/触摸/键盘接续、关闭后不重启、异步竞态、原文件和署名许可。");

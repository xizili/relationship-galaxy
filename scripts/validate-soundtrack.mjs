import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initSoundtrack, soundtrack } from "../src/soundtrack.js";

function fixture(playImplementation = () => Promise.resolve()) {
  const elements = new Map();
  const doc = { querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      dataset: {}, attributes: {}, listeners: {}, calls: 0, paused: true,
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(key, value) { this.listeners[key] = value; },
      play() { this.calls++; this.paused = false; return playImplementation(); },
      pause() { this.paused = true; this.listeners.pause?.(); }
    });
    return elements.get(selector);
  } };
  const api = initSoundtrack(doc);
  return { api, audio: elements.get("#backgroundMusic"), toggle: elements.get("#musicToggle"), label: elements.get("#musicState") };
}
const loaded = fixture();
await loaded.api.ready;
assert.equal(loaded.audio.calls, 1, "进入时应尝试自动播放");
assert.equal(loaded.toggle.dataset.state, "playing");
assert.equal(loaded.audio.volume, 0.3);
assert.equal(loaded.audio.loop, true);
assert.ok(loaded.audio.src.endsWith(soundtrack.file));
loaded.toggle.listeners.click();
assert.equal(loaded.audio.paused, true);
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
assert.equal(blocked.label.textContent, "开启音乐");
denied = false;
blocked.toggle.listeners.click();
await Promise.resolve();
assert.equal(blocked.toggle.dataset.state, "playing");

let finish;
const pending = fixture(() => new Promise((resolve) => { finish = resolve; }));
pending.toggle.listeners.click();
finish();
await pending.api.ready;
assert.equal(pending.audio.paused, true, "加载中关闭后，异步完成不能重新播放");
assert.equal(pending.toggle.dataset.state, "paused");
const failure = fixture(() => Promise.reject(new Error("Audio error")));
await failure.api.ready;
assert.equal(failure.toggle.dataset.state, "error");
assert.equal(failure.label.textContent, "重试音乐");
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
console.log("配乐检查通过：原文件校验、署名许可、自动播放、拦截提示、手动开关及异步竞态。");

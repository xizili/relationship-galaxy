// The composition and this particular recording have separate rights.
export const soundtrack = Object.freeze({
  title: "Gymnopédie No. 1 · D 大调第1号《裸体舞曲》",
  composer: "Erik Satie",
  artist: "Kevin MacLeod (incompetech.com)",
  file: "audio/gymnopedie-no1-kevin-macleod.mp3",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1_(ISRC_USUAN1100787).mp3",
  license: "CC BY 3.0",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  quality: "MP3 · 320 kbps · 44.1 kHz · 立体声",
  sha1: "a875a337f165f8dbfe3600ba3076b9d186f3c523"
});

export function initSoundtrack(doc = document) {
  const toggle = doc.querySelector("#musicToggle");
  const label = doc.querySelector("#musicState");
  const audio = doc.querySelector("#backgroundMusic");
  let wanted = false;
  let generation = 0;
  let awaitingGesture = false;
  const gestureEvents = ["click", "touchend", "keydown"];
  audio.src = `${import.meta.env?.BASE_URL ?? "/"}${soundtrack.file}`;
  audio.loop = true;
  audio.volume = 0.3;
  function waitForGesture(enabled) {
    if (awaitingGesture === enabled) return;
    awaitingGesture = enabled;
    for (const type of gestureEvents) {
      if (enabled) doc.addEventListener(type, resumeOnGesture, { capture: true, passive: true });
      else doc.removeEventListener(type, resumeOnGesture, true);
    }
  }
  function resumeOnGesture(event) {
    if (!wanted || !awaitingGesture || !event.isTrusted || toggle.contains(event.target)) return;
    if (event.type === "keydown" && (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ["Escape", "Control", "Meta", "Alt", "Shift"].includes(event.key))) return;
    // Call play synchronously inside the real gesture, not from a timer/promise.
    // The music button is excluded so its close action cannot also start audio.
    void play();
  }
  function display(state) {
    const labels = { playing: "关闭音乐", loading: "关闭音乐", paused: "开启音乐", blocked: "待播放 · 关闭", error: "重试音乐" };
    label.textContent = labels[state];
    toggle.dataset.state = state;
    toggle.setAttribute("aria-pressed", String(wanted));
    toggle.setAttribute("aria-label", `${state === "blocked" ? "关闭音乐（等待首次交互后播放）" : labels[state]} · 萨蒂《第1号裸体舞曲》`);
    toggle.title = state === "blocked" ? "配乐默认开启，点击页面后尝试播放；点击此按钮可关闭配乐" : `${labels[state]} · ${soundtrack.title}`;
  }
  function close() {
    wanted = false;
    generation += 1;
    waitForGesture(false);
    audio.autoplay = false;
    audio.pause();
    display("paused");
  }
  async function play({ initial = false } = {}) {
    wanted = true;
    audio.autoplay = true;
    waitForGesture(initial);
    const request = ++generation;
    display("loading");
    try {
      await audio.play();
      // A late play promise must never undo an explicit off action.
      if (!wanted) { audio.pause(); return; }
      if (request === generation) { waitForGesture(false); display("playing"); }
    } catch (error) {
      if (request !== generation) return;
      if (error?.name === "NotAllowedError") {
        // Keep the default-on intent; the browser still decides when sound is allowed.
        waitForGesture(true);
        display("blocked");
      } else {
        wanted = false;
        audio.autoplay = false;
        waitForGesture(false);
        display("error");
      }
    }
  }
  toggle.addEventListener("click", () => { if (wanted) close(); else void play(); });
  audio.addEventListener("playing", () => {
    if (!wanted) audio.pause();
    else { waitForGesture(false); display("playing"); }
  });
  audio.addEventListener("pause", () => {
    if (wanted && audio.paused) close();
  });
  audio.addEventListener("error", () => { close(); display("error"); });
  // Start on every visit. If blocked, retry on a real interaction until switched off.
  const ready = play({ initial: true });
  return { close, play, ready };
}

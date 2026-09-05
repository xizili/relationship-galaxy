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
  audio.src = `${import.meta.env?.BASE_URL ?? "/"}${soundtrack.file}`;
  audio.loop = true;
  audio.volume = 0.3;
  function display(state) {
    const labels = { playing: "关闭音乐", loading: "关闭音乐", paused: "开启音乐", blocked: "开启音乐", error: "重试音乐" };
    label.textContent = labels[state];
    toggle.dataset.state = state;
    toggle.setAttribute("aria-pressed", String(state === "playing" || state === "loading"));
    toggle.setAttribute("aria-label", `${labels[state]} · 萨蒂《第1号裸体舞曲》`);
    toggle.title = state === "blocked" ? "浏览器需要你点击后才能播放音乐" : `${labels[state]} · ${soundtrack.title}`;
  }
  function close() {
    wanted = false;
    generation += 1;
    audio.pause();
    display("paused");
  }
  async function play() {
    wanted = true;
    const request = ++generation;
    display("loading");
    try {
      await audio.play();
      // A late play promise must never undo an explicit off action.
      if (!wanted) { audio.pause(); return; }
      if (request === generation) display("playing");
    } catch (error) {
      if (request !== generation) return;
      wanted = false;
      display(error?.name === "NotAllowedError" ? "blocked" : "error");
    }
  }
  toggle.addEventListener("click", () => { if (wanted) close(); else void play(); });
  audio.addEventListener("playing", () => { if (!wanted) audio.pause(); else display("playing"); });
  audio.addEventListener("pause", () => {
    if (wanted && audio.paused) { wanted = false; generation += 1; display("paused"); }
  });
  audio.addEventListener("error", () => { wanted = false; generation += 1; display("error"); });
  // Attempt once on entry. Never turn another, unrelated click into consent.
  const ready = play();
  return { close, play, ready };
}

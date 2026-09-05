// Official player only: no copied audio, no autoplay, no request before consent.
export const soundtrack = {
  title: "Damascus",
  artist: "Oskar Schuster",
  officialUrl: "https://oskarschuster.bandcamp.com/track/damascus",
  videoUrl: "https://www.youtube.com/watch?v=jdu_IQ6usq4",
  embedUrl: "https://www.youtube-nocookie.com/embed/jdu_IQ6usq4?autoplay=0&playsinline=1"
};

export function initSoundtrack(doc = document) {
  const toggle = doc.querySelector("#musicToggle");
  const panel = doc.querySelector("#musicPanel");
  const slot = doc.querySelector("#musicPlayer");
  const load = doc.querySelector("#loadMusic");
  const closeButton = doc.querySelector("#closeMusic");
  function close() {
    slot.innerHTML = ""; // Removing the visible player also stops its playback.
    load.hidden = false;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener("click", () => {
    if (!panel.hidden) return close();
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    closeButton.focus({ preventScroll: true });
  });
  closeButton.addEventListener("click", close);
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  load.addEventListener("click", () => {
    if (panel.hidden || load.hidden) return;
    slot.innerHTML = `<iframe title="Oskar Schuster — Damascus 官方播放器" src="${soundtrack.embedUrl}"
      width="480" height="270" referrerpolicy="strict-origin-when-cross-origin"
      allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    load.hidden = true;
  });
  return { close };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function birthYear(node) {
  const match = String(node.years ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function decadeFor(node) {
  return Math.floor(birthYear(node) / 10) * 10;
}

function buildDegreeMap(nodes, links) {
  const map = new Map(nodes.map((node) => [node.id, 0]));
  links.forEach((link) => {
    map.set(link.source, (map.get(link.source) ?? 0) + 1);
    map.set(link.target, (map.get(link.target) ?? 0) + 1);
  });
  return map;
}

function decadeLabel(decade) {
  return `${decade}s`;
}

export function initTimeline({ root, nodes, links, groups, onFocusNode }) {
  const visibleCount = document.querySelector("#timelineVisibleCount");
  const degreeMap = buildDegreeMap(nodes, links);
  const sortedNodes = [...nodes].sort((a, b) => birthYear(a) - birthYear(b) || a.cn.localeCompare(b.cn, "zh-CN"));
  const decades = new Map();

  sortedNodes.forEach((node) => {
    const decade = decadeFor(node);
    if (!decades.has(decade)) decades.set(decade, []);
    decades.get(decade).push(node);
  });

  root.innerHTML = [...decades.entries()]
    .map(
      ([decade, decadeNodes]) => `
        <section class="timeline-decade" data-decade="${decade}">
          <header class="timeline-decade-head">
            <span>${decadeLabel(decade)}</span>
            <small>${decadeNodes.length} 位人物</small>
          </header>
          <div class="timeline-decade-rail" aria-hidden="true"><i></i></div>
          <div class="timeline-card-grid">
            ${decadeNodes
              .map((node) => {
                const group = groups[node.group];
                return `
                  <button
                    type="button"
                    class="timeline-card"
                    data-node-id="${node.id}"
                    data-group="${node.group}"
                    style="--card-color:${group.css}"
                    aria-label="查看${escapeHtml(node.cn)}，${escapeHtml(node.years)}"
                  >
                    <span class="timeline-card-year">${birthYear(node)}</span>
                    <span class="timeline-card-school"><i></i>${escapeHtml(group.label)}</span>
                    <strong>${escapeHtml(node.cn)}</strong>
                    <em>${escapeHtml(node.name)}</em>
                    <span class="timeline-card-role">${escapeHtml(node.role)}</span>
                    <span class="timeline-card-meta">${escapeHtml(node.years)} · ${degreeMap.get(node.id) ?? 0} 条关系</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </section>
      `
    )
    .join("");

  root.addEventListener("click", (event) => {
    const card = event.target.closest("[data-node-id]");
    if (!card) return;
    onFocusNode(card.dataset.nodeId);
  });

  function update(state = {}, options = {}) {
    const { activeGroup = "all", selectedNodeId = null } = state;
    let count = 0;

    root.querySelectorAll(".timeline-card").forEach((card) => {
      const visible = activeGroup === "all" || card.dataset.group === activeGroup;
      const selected = card.dataset.nodeId === selectedNodeId;
      card.hidden = !visible;
      card.classList.toggle("is-selected", selected);
      if (visible) count += 1;
    });

    root.querySelectorAll(".timeline-decade").forEach((section) => {
      const visibleCards = section.querySelectorAll(".timeline-card:not([hidden])");
      section.hidden = visibleCards.length === 0;
      section.querySelector(".timeline-decade-head small").textContent = `${visibleCards.length} 位人物`;
    });

    if (visibleCount) visibleCount.textContent = String(count);

    if (options.center && selectedNodeId) {
      requestAnimationFrame(() => {
        root
          .querySelector(`[data-node-id="${CSS.escape(selectedNodeId)}"]`)
          ?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      });
    }
  }

  return { update };
}

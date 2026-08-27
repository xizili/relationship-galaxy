const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, String(value));
    }
  });
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function colorFromNumber(value) {
  return `#${Number(value ?? 0xffffff).toString(16).padStart(6, "0")}`;
}

function birthYear(node) {
  const match = String(node.years ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 1900;
}

function pairKey(link) {
  return [link.source, link.target].sort().join("::");
}

function linkPath(start, end, bend) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const control = {
    x: (start.x + end.x) / 2 + normalX * bend,
    y: (start.y + end.y) / 2 + normalY * bend
  };
  return {
    d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    midpoint: {
      x: (start.x + 2 * control.x + end.x) / 4,
      y: (start.y + 2 * control.y + end.y) / 4
    }
  };
}

export function initTopology({
  nodes,
  links,
  groups,
  relationTypes,
  onFocusNode,
  onFocusLink,
  onOverview
}) {
  const svg = document.querySelector("#topologyGraph");
  if (!svg) return null;

  svg.innerHTML = "";
  svg.setAttribute("role", "application");
  svg.setAttribute("aria-label", "人物关系拓扑图，可缩放、拖动并选择人物或关系");

  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  links.forEach((link) => {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
  });

  const bundles = new Map();
  const linkEntries = links.map((link, index) => {
    const key = pairKey(link);
    const list = bundles.get(key) ?? [];
    list.push(index);
    bundles.set(key, list);
    return { link, index, key, bundleIndex: list.length - 1 };
  });
  linkEntries.forEach((entry) => {
    entry.bundleCount = bundles.get(entry.key)?.length ?? 1;
  });

  const defs = svgElement("defs");
  Object.entries(relationTypes).forEach(([type, meta]) => {
    const marker = svgElement("marker", {
      id: `topology-arrow-${type}`,
      viewBox: "0 -4 8 8",
      refX: 7,
      refY: 0,
      markerWidth: 6,
      markerHeight: 6,
      orient: "auto"
    });
    marker.appendChild(
      svgElement("path", {
        d: "M0,-4L8,0L0,4Z",
        fill: colorFromNumber(meta.color)
      })
    );
    defs.appendChild(marker);
  });
  svg.appendChild(defs);

  const viewport = svgElement("g", { class: "topology-viewport" });
  const edgeLayer = svgElement("g", { class: "topology-edges" });
  const labelLayer = svgElement("g", { class: "topology-edge-labels" });
  const nodeLayer = svgElement("g", { class: "topology-nodes" });
  viewport.append(edgeLayer, labelLayer, nodeLayer);
  svg.appendChild(viewport);

  let dimensions = { width: 1, height: 1, usableWidth: 1 };
  let positions = new Map();
  let transform = { x: 0, y: 0, k: 1 };
  let state = {
    activeGroup: "all",
    depthMode: "all",
    overviewMode: true,
    selectedNodeId: null,
    selectedLinkIndex: null
  };
  let pointerAction = null;
  let lastDragAt = 0;

  const nodeRecords = new Map();
  const edgeRecords = [];

  function relationColor(type) {
    return colorFromNumber(relationTypes[type]?.color);
  }

  function nodeRadius(node) {
    const base = clamp((node.size ?? 9) * 0.72, 6.5, 13);
    return node.id === "freud" ? 15 : base;
  }

  function computeLayout() {
    const rect = svg.getBoundingClientRect();
    const width = Math.max(320, rect.width || svg.clientWidth || window.innerWidth);
    const height = Math.max(420, rect.height || svg.clientHeight || window.innerHeight);
    const sidePanel = width >= 980 ? 408 : 22;
    const usableWidth = Math.max(300, width - sidePanel);
    dimensions = { width, height, usableWidth };
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const xs = nodes.map((node) => Number(node.x) || 0);
    const ys = nodes.map((node) => Number(node.y) || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const padX = width < 720 ? 54 : 92;
    const padY = width < 720 ? 104 : 132;
    const availableX = Math.max(200, usableWidth - padX * 2);
    const availableY = Math.max(240, height - padY - 94);

    positions = new Map(
      nodes.map((node, index) => {
        const fallbackAngle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
        const rawX = Number.isFinite(Number(node.x)) ? Number(node.x) : Math.cos(fallbackAngle) * 200;
        const rawY = Number.isFinite(Number(node.y)) ? Number(node.y) : Math.sin(fallbackAngle) * 200;
        return [
          node.id,
          {
            x: padX + ((rawX - minX) / spanX) * availableX,
            y: padY + ((rawY - minY) / spanY) * availableY
          }
        ];
      })
    );

    // Deterministic collision pass keeps the curated map recognizable while
    // preventing the worst label and node overlaps.
    for (let iteration = 0; iteration < 72; iteration += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const pa = positions.get(a.id);
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const pb = positions.get(b.id);
          let dx = pb.x - pa.x;
          let dy = pb.y - pa.y;
          let distance = Math.hypot(dx, dy);
          const minimum = width < 720 ? 38 : 48;
          if (distance >= minimum) continue;
          if (distance < 0.01) {
            dx = ((i + j) % 2 ? 1 : -1) * 0.1;
            dy = ((i * 3 + j) % 2 ? 1 : -1) * 0.1;
            distance = Math.hypot(dx, dy);
          }
          const shift = (minimum - distance) * 0.52;
          const nx = dx / distance;
          const ny = dy / distance;
          pa.x -= nx * shift;
          pa.y -= ny * shift;
          pb.x += nx * shift;
          pb.y += ny * shift;
        }
      }

      positions.forEach((point) => {
        point.x = clamp(point.x, 34, usableWidth - 34);
        point.y = clamp(point.y, 86, height - 74);
      });
    }

    const freud = positions.get("freud");
    if (freud) {
      freud.x = usableWidth * 0.48;
      freud.y = height * 0.48;
    }
  }

  function buildEdges() {
    edgeLayer.innerHTML = "";
    labelLayer.innerHTML = "";
    edgeRecords.length = 0;

    linkEntries.forEach((entry) => {
      const { link, index, bundleCount, bundleIndex } = entry;
      const color = relationColor(link.type);
      const bundleOffset = (bundleIndex - (bundleCount - 1) / 2) * 19;
      const seededBend = ((index * 17) % 5 - 2) * 3.5;
      const bend = bundleOffset + seededBend;

      const visiblePath = svgElement("path", {
        class: "topology-edge",
        "data-link-index": index,
        stroke: color,
        "stroke-dasharray": link.type === "conflict" ? "7 5" : null,
        "marker-end": link.directed ? `url(#topology-arrow-${link.type})` : null
      });
      const hitPath = svgElement("path", {
        class: "topology-edge-hit",
        "data-link-index": index,
        tabindex: 0,
        role: "button",
        "aria-label": `${link.label}`
      });
      hitPath.addEventListener("click", (event) => {
        event.stopPropagation();
        onFocusLink?.(index);
      });
      hitPath.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFocusLink?.(index);
        }
      });

      const label = String(link.label ?? relationTypes[link.type]?.label ?? "关系");
      const displayLabel = label.length > 24 ? `${label.slice(0, 23)}…` : label;
      const labelWidth = clamp(displayLabel.length * 11 + 24, 72, 248);
      const labelGroup = svgElement("g", {
        class: "topology-edge-label",
        "data-link-index": index,
        style: `--relation-color:${color}`
      });
      labelGroup.appendChild(
        svgElement("rect", {
          x: -labelWidth / 2,
          y: -14,
          width: labelWidth,
          height: 28,
          rx: 14
        })
      );
      const labelText = svgElement("text", { x: 0, y: 4, "text-anchor": "middle" });
      labelText.textContent = displayLabel;
      labelGroup.appendChild(labelText);

      edgeLayer.append(visiblePath, hitPath);
      labelLayer.appendChild(labelGroup);
      edgeRecords.push({ entry, visiblePath, hitPath, labelGroup, bend });
    });
  }

  function buildNodes() {
    nodeLayer.innerHTML = "";
    nodeRecords.clear();

    nodes.forEach((node) => {
      const radius = nodeRadius(node);
      const groupColor = groups[node.group]?.css ?? "#777066";
      const labelWidth = clamp(node.cn.length * 13 + 22, 72, 146);
      const record = svgElement("g", {
        class: `topology-node${(degree.get(node.id) ?? 0) <= 1 ? " is-minor" : ""}`,
        "data-node-id": node.id,
        tabindex: 0,
        role: "button",
        "aria-label": `${node.cn}，${node.role}`,
        style: `--node-color:${groupColor}`
      });
      record.appendChild(
        svgElement("circle", { class: "topology-node-hit", r: radius + 11 })
      );
      record.appendChild(
        svgElement("circle", { class: "topology-node-halo", r: radius + 6 })
      );
      record.appendChild(
        svgElement("circle", { class: "topology-node-core", r: radius })
      );

      const card = svgElement("g", { class: "topology-node-card" });
      card.appendChild(
        svgElement("rect", {
          x: radius + 8,
          y: -21,
          width: labelWidth,
          height: 42,
          rx: 6
        })
      );
      const name = svgElement("text", {
        class: "topology-node-name",
        x: radius + 16,
        y: -4
      });
      name.textContent = node.cn;
      const role = svgElement("text", {
        class: "topology-node-role",
        x: radius + 16,
        y: 13
      });
      const compactRole = node.role.length > 15 ? `${node.role.slice(0, 14)}…` : node.role;
      role.textContent = compactRole;
      card.append(name, role);
      record.appendChild(card);

      record.addEventListener("click", (event) => {
        event.stopPropagation();
        if (performance.now() - lastDragAt < 220) return;
        onFocusNode?.(node.id);
      });
      record.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFocusNode?.(node.id);
        }
      });

      nodeLayer.appendChild(record);
      nodeRecords.set(node.id, { element: record, node, radius });
    });
  }

  function geometryForRecord(record) {
    const source = positions.get(record.entry.link.source);
    const target = positions.get(record.entry.link.target);
    return linkPath(source, target, record.bend);
  }

  function renderGeometry() {
    nodeRecords.forEach((record, id) => {
      const point = positions.get(id);
      record.element.setAttribute("transform", `translate(${point.x} ${point.y})`);
    });
    edgeRecords.forEach((record) => {
      const geometry = geometryForRecord(record);
      record.visiblePath.setAttribute("d", geometry.d);
      record.hitPath.setAttribute("d", geometry.d);
      record.labelGroup.setAttribute(
        "transform",
        `translate(${geometry.midpoint.x} ${geometry.midpoint.y})`
      );
    });
  }

  function depthSet(startId) {
    if (!startId || state.depthMode === "all") {
      return new Set(nodes.map((node) => node.id));
    }
    const maxDepth = state.depthMode === "2" ? 2 : 1;
    const visited = new Set([startId]);
    let frontier = new Set([startId]);
    for (let step = 0; step < maxDepth; step += 1) {
      const next = new Set();
      frontier.forEach((id) => {
        adjacency.get(id)?.forEach((neighbor) => {
          if (!visited.has(neighbor)) next.add(neighbor);
        });
      });
      next.forEach((id) => visited.add(id));
      frontier = next;
    }
    return visited;
  }

  function updateVisualState() {
    const inDepth = depthSet(state.selectedNodeId);
    const selectedNeighbors = state.selectedNodeId
      ? adjacency.get(state.selectedNodeId) ?? new Set()
      : new Set();

    nodeRecords.forEach((record, id) => {
      const groupVisible = state.activeGroup === "all" || record.node.group === state.activeGroup || id === state.selectedNodeId;
      const depthVisible = inDepth.has(id);
      record.element.classList.toggle("is-hidden", !groupVisible);
      record.element.classList.toggle("is-dimmed", Boolean(state.selectedNodeId) && !depthVisible);
      record.element.classList.toggle("is-selected", id === state.selectedNodeId);
      record.element.classList.toggle("is-neighbor", selectedNeighbors.has(id));
    });

    edgeRecords.forEach((record) => {
      const { link, index } = record.entry;
      const sourceNode = nodes.find((node) => node.id === link.source);
      const targetNode = nodes.find((node) => node.id === link.target);
      const groupVisible =
        state.activeGroup === "all" ||
        sourceNode?.group === state.activeGroup ||
        targetNode?.group === state.activeGroup ||
        index === state.selectedLinkIndex;
      const endpointsInDepth = inDepth.has(link.source) && inDepth.has(link.target);
      const connected = Boolean(state.selectedNodeId) && (link.source === state.selectedNodeId || link.target === state.selectedNodeId);
      const selected = index === state.selectedLinkIndex;
      const hidden = !groupVisible;
      const dimmed = Boolean(state.selectedNodeId) && !endpointsInDepth;
      record.visiblePath.classList.toggle("is-hidden", hidden);
      record.hitPath.classList.toggle("is-hidden", hidden);
      record.visiblePath.classList.toggle("is-dimmed", dimmed);
      record.visiblePath.classList.toggle("is-highlighted", connected || selected);
      record.visiblePath.classList.toggle("is-selected", selected);
      record.labelGroup.classList.toggle("is-visible", connected || selected);
      record.labelGroup.classList.toggle("is-hidden", hidden);
    });
  }

  function applyTransform() {
    viewport.setAttribute("transform", `translate(${transform.x} ${transform.y}) scale(${transform.k})`);
    svg.classList.toggle("is-far", transform.k < 0.7);
    svg.classList.toggle("is-near", transform.k > 1.35);
  }

  function animateTransform(target, duration = 360) {
    const start = { ...transform };
    const startedAt = performance.now();
    function step(now) {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      transform = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
        k: start.k + (target.k - start.k) * eased
      };
      applyTransform();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fit({ animate = true } = {}) {
    const target = { x: 0, y: 0, k: 1 };
    if (animate) animateTransform(target);
    else {
      transform = target;
      applyTransform();
    }
  }

  function centerNode(nodeId) {
    const point = positions.get(nodeId);
    if (!point) return;
    const targetScale = Math.max(1.08, transform.k);
    const targetX = dimensions.usableWidth * 0.47 - point.x * targetScale;
    const targetY = dimensions.height * 0.48 - point.y * targetScale;
    animateTransform({ x: targetX, y: targetY, k: targetScale }, 420);
  }

  function clientToGraph(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top - transform.y) / transform.k
    };
  }

  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const nextScale = clamp(transform.k * Math.exp(-event.deltaY * 0.0012), 0.35, 3);
      const graphX = (pointerX - transform.x) / transform.k;
      const graphY = (pointerY - transform.y) / transform.k;
      transform = {
        x: pointerX - graphX * nextScale,
        y: pointerY - graphY * nextScale,
        k: nextScale
      };
      applyTransform();
    },
    { passive: false }
  );

  svg.addEventListener("pointerdown", (event) => {
    const nodeElement = event.target.closest?.("[data-node-id]");
    svg.setPointerCapture?.(event.pointerId);
    if (nodeElement) {
      const nodeId = nodeElement.dataset.nodeId;
      const graphPoint = clientToGraph(event.clientX, event.clientY);
      const point = positions.get(nodeId);
      pointerAction = {
        type: "node",
        nodeId,
        offsetX: graphPoint.x - point.x,
        offsetY: graphPoint.y - point.y,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      return;
    }
    pointerAction = {
      type: "pan",
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
      moved: false
    };
  });

  svg.addEventListener("pointermove", (event) => {
    if (!pointerAction) return;
    const distance = Math.hypot(event.clientX - pointerAction.startX, event.clientY - pointerAction.startY);
    if (distance > 3) pointerAction.moved = true;
    if (pointerAction.type === "pan") {
      transform.x = pointerAction.originX + event.clientX - pointerAction.startX;
      transform.y = pointerAction.originY + event.clientY - pointerAction.startY;
      applyTransform();
      return;
    }
    const graphPoint = clientToGraph(event.clientX, event.clientY);
    const point = positions.get(pointerAction.nodeId);
    point.x = graphPoint.x - pointerAction.offsetX;
    point.y = graphPoint.y - pointerAction.offsetY;
    renderGeometry();
  });

  function endPointerAction() {
    if (pointerAction?.moved) lastDragAt = performance.now();
    pointerAction = null;
  }
  svg.addEventListener("pointerup", endPointerAction);
  svg.addEventListener("pointercancel", endPointerAction);
  svg.addEventListener("click", (event) => {
    if (event.target === svg && performance.now() - lastDragAt > 220) {
      onOverview?.();
    }
  });

  function resize({ preserveTransform = true } = {}) {
    const previous = { ...transform };
    computeLayout();
    buildEdges();
    buildNodes();
    renderGeometry();
    updateVisualState();
    if (preserveTransform) transform = previous;
    else transform = { x: 0, y: 0, k: 1 };
    applyTransform();
  }

  const resizeObserver = new ResizeObserver(() => {
    if (svg.clientWidth < 100 || svg.clientHeight < 100) return;
    resize({ preserveTransform: false });
  });
  resizeObserver.observe(svg);

  resize({ preserveTransform: false });

  return {
    update(nextState = {}, options = {}) {
      const previousNodeId = state.selectedNodeId;
      state = { ...state, ...nextState };
      updateVisualState();
      if (options.center && state.selectedNodeId && state.selectedNodeId !== previousNodeId) {
        centerNode(state.selectedNodeId);
      }
      if (state.overviewMode && options.fit) fit();
    },
    fit,
    centerNode,
    resize,
    destroy() {
      resizeObserver.disconnect();
    }
  };
}

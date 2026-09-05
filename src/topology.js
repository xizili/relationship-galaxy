import { starPoints } from "./node-shapes.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_RADIUS = 9;

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

function clampRange(value, min, max) {
  if (max < min) return (min + max) / 2;
  return clamp(value, min, max);
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
  svg.setAttribute("aria-label", "人物关系地图，可缩放、拖动并选择人物或关系");

  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  const nodeIndexById = new Map(nodes.map((node, index) => [node.id, index]));
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
      orient: "auto-start-reverse"
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

  let dimensions = {
    width: 1,
    height: 1,
    usableWidth: 1,
    topInset: 86,
    bottomInset: 78
  };
  let positions = new Map();
  let nodeLayouts = new Map();
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
  let transformAnimation = 0;

  const nodeRecords = new Map();
  const edgeRecords = [];

  function relationColor(type) {
    return colorFromNumber(relationTypes[type]?.color);
  }

  function compactRoleText(node) {
    return node.role.length > 11 ? `${node.role.slice(0, 10)}…` : node.role;
  }

  function shouldPersistLabel(node, width) {
    const nodeDegree = degree.get(node.id) ?? 0;
    if (width <= 760) return nodeDegree > 4;
    if (width <= 1240) return nodeDegree > 3;
    return true;
  }

  function nodeLabelLayout(node, index, { includeCard = true } = {}) {
    const radius = NODE_RADIUS;
    const roleText = compactRoleText(node);
    const labelWidth = clamp(
      Math.max(node.cn.length * 12, roleText.length * 9) + 20,
      68,
      132
    );
    const rawX = Number(node.x) || 0;
    const labelSide = rawX < -12 || (Math.abs(rawX) <= 12 && index % 2 === 1) ? -1 : 1;
    const cardX = labelSide > 0 ? radius + 8 : -radius - 8 - labelWidth;
    const markerFootprint = {
      left: -radius - 4,
      right: radius + 4,
      top: -radius - 4,
      bottom: radius + 4
    };

    return {
      radius,
      labelWidth,
      cardX,
      textX: cardX + 10,
      roleText,
      footprint: includeCard
        ? {
            left: Math.min(markerFootprint.left, cardX - 4),
            right: Math.max(markerFootprint.right, cardX + labelWidth + 4),
            top: -20,
            bottom: 20
          }
        : markerFootprint
    };
  }

  function computeLayout() {
    const rect = svg.getBoundingClientRect();
    const width = Math.max(320, rect.width || svg.clientWidth || window.innerWidth);
    const height = Math.max(420, rect.height || svg.clientHeight || window.innerHeight);
    const topbarRect = document.querySelector(".topbar")?.getBoundingClientRect();
    const captionRect = document.querySelector(".topology-caption")?.getBoundingClientRect();
    const panel = document.querySelector("#detailPanel");
    const panelRect = panel?.getBoundingClientRect();
    const panelOpen = Boolean(panel && panelRect && !panel.classList.contains("is-collapsed"));

    let rightInset = 22;
    let bottomInset = 78;
    if (panelOpen) {
      const panelIsBottomSheet = panelRect.width >= width * 0.72;
      if (panelIsBottomSheet) {
        bottomInset = Math.max(bottomInset, height - (panelRect.top - rect.top) + 18);
      } else {
        rightInset = Math.max(rightInset, width - (panelRect.left - rect.left) + 18);
      }
    }

    const overlayBottom = Math.max(
      68,
      topbarRect ? topbarRect.bottom - rect.top : 0,
      captionRect ? captionRect.bottom - rect.top : 0
    );
    const topInset = clamp(overlayBottom + 18, 86, height - 170);
    const usableWidth = Math.max(300, width - rightInset);
    dimensions = { width, height, usableWidth, topInset, bottomInset };
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const xs = nodes.map((node) => Number(node.x) || 0);
    const ys = nodes.map((node) => Number(node.y) || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const padX = width < 720 ? 42 : 76;
    const startY = topInset + 24;
    const endY = Math.max(startY + 96, height - bottomInset - 24);
    const availableX = Math.max(120, usableWidth - padX * 2);
    const availableY = Math.max(80, endY - startY);

    positions = new Map(
      nodes.map((node, index) => {
        const fallbackAngle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
        const rawX = Number.isFinite(Number(node.x)) ? Number(node.x) : Math.cos(fallbackAngle) * 200;
        const rawY = Number.isFinite(Number(node.y)) ? Number(node.y) : Math.sin(fallbackAngle) * 200;
        return [
          node.id,
          {
            x: padX + ((rawX - minX) / spanX) * availableX,
            y: startY + ((rawY - minY) / spanY) * availableY
          }
        ];
      })
    );

    const anchors = new Map(
      [...positions].map(([id, point]) => [id, { x: point.x, y: point.y }])
    );
    nodeLayouts = new Map(
      nodes.map((node, index) => [
        node.id,
        nodeLabelLayout(node, index, { includeCard: shouldPersistLabel(node, width) })
      ])
    );

    // Deterministic collision pass keeps the curated map recognizable while
    // giving both node markers and name cards room to read as a loose constellation.
    for (let iteration = 0; iteration < 150; iteration += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const pa = positions.get(a.id);
        const boxA = nodeLayouts.get(a.id).footprint;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const pb = positions.get(b.id);
          const boxB = nodeLayouts.get(b.id).footprint;
          let dx = pb.x - pa.x;
          let dy = pb.y - pa.y;
          let distance = Math.hypot(dx, dy);
          const radiusAllowance = NODE_RADIUS * 2 * 0.24;
          const minimum = width < 720 ? 48 : 68 + radiusAllowance;
          if (distance < minimum) {
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

          const overlapX =
            Math.min(pa.x + boxA.right, pb.x + boxB.right) -
            Math.max(pa.x + boxA.left, pb.x + boxB.left);
          const overlapY =
            Math.min(pa.y + boxA.bottom, pb.y + boxB.bottom) -
            Math.max(pa.y + boxA.top, pb.y + boxB.top);

          if (overlapX > 0 && overlapY > 0) {
            const separationPadding = 9;
            if (overlapX < overlapY * 1.45) {
              const direction = pb.x >= pa.x ? 1 : -1;
              const boxShift = (overlapX + separationPadding) * 0.52;
              pa.x -= direction * boxShift;
              pb.x += direction * boxShift;
            } else {
              const direction = pb.y >= pa.y ? 1 : -1;
              const boxShift = (overlapY + separationPadding) * 0.52;
              pa.y -= direction * boxShift;
              pb.y += direction * boxShift;
            }
          }
        }
      }

      positions.forEach((point, id) => {
        const anchor = anchors.get(id);
        const footprint = nodeLayouts.get(id).footprint;
        point.x += (anchor.x - point.x) * 0.0025;
        point.y += (anchor.y - point.y) * 0.0025;
        point.x = clampRange(
          point.x,
          18 - footprint.left,
          usableWidth - 18 - footprint.right
        );
        point.y = clampRange(
          point.y,
          topInset + 12 - footprint.top,
          height - bottomInset - 12 - footprint.bottom
        );
      });
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
        "stroke-dasharray": link.projected ? "3 7" : link.type === "conflict" ? "7 5" : null,
        "marker-end": link.directed || link.bidirectional ? `url(#topology-arrow-${link.type})` : null,
        "marker-start": link.bidirectional ? `url(#topology-arrow-${link.type})` : null
      });
      const hitPath = svgElement("path", {
        class: "topology-edge-hit",
        "data-link-index": index,
        tabindex: 0,
        role: "button",
        "aria-label": `${link.fullText || link.label}`
      });
      hitPath.addEventListener("click", (event) => {
        event.stopPropagation();
        if (performance.now() - lastDragAt < 220) return;
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

    nodes.forEach((node, index) => {
      const labelLayout = nodeLabelLayout(node, index);
      const { radius, labelWidth, cardX, textX, roleText } = labelLayout;
      const groupColor = groups[node.group]?.css ?? "#777066";
      const persistentLabel = shouldPersistLabel(node, dimensions.width);
      const nodeDegree = degree.get(node.id) ?? 0;
      const record = svgElement("g", {
        class: `topology-node${nodeDegree <= 3 ? " is-minor" : ""}${
          persistentLabel ? "" : " is-label-hidden"
        }`,
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
        node.kind === "topic"
          ? svgElement("polygon", { class: "topology-node-halo", points: starPoints(radius + 6) })
          : svgElement("circle", { class: "topology-node-halo", r: radius + 6 })
      );
      record.appendChild(
        node.kind === "topic"
          ? svgElement("polygon", { class: "topology-node-core", points: starPoints(radius) })
          : svgElement("circle", { class: "topology-node-core", r: radius })
      );
      const accessibleTitle = svgElement("title");
      accessibleTitle.textContent = `${node.cn}：${node.role}`;
      record.appendChild(accessibleTitle);

      const card = svgElement("g", { class: "topology-node-card" });
      card.appendChild(
        svgElement("rect", {
          x: cardX,
          y: -16,
          width: labelWidth,
          height: 32,
          rx: 6
        })
      );
      const name = svgElement("text", {
        class: "topology-node-name",
        x: textX,
        y: -2
      });
      name.textContent = node.cn;
      const role = svgElement("text", {
        class: "topology-node-role",
        x: textX,
        y: 12
      });
      role.textContent = roleText;
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
    positionPopover();
  }

  function depthSet(startId) {
    const focusedLink = !startId && state.selectedLinkIndex !== null ? links[state.selectedLinkIndex] : null;
    if ((!startId && !focusedLink) || state.depthMode === "all") {
      return new Set(nodes.map((node) => node.id));
    }
    const maxDepth = (state.depthMode === "2" ? 2 : 1) - (focusedLink ? 1 : 0);
    const roots = focusedLink ? [focusedLink.source, focusedLink.target] : [startId];
    const visited = new Set(roots);
    let frontier = new Set(roots);
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
    const selectedLink = state.selectedLinkIndex !== null ? links[state.selectedLinkIndex] : null;
    const focused = Boolean(state.selectedNodeId || selectedLink);
    const selectedNeighbors = state.selectedNodeId
      ? adjacency.get(state.selectedNodeId) ?? new Set()
      : new Set();

    nodeRecords.forEach((record, id) => {
      const groupVisible = state.activeGroup === "all" || record.node.group === state.activeGroup || id === state.selectedNodeId || id === selectedLink?.source || id === selectedLink?.target;
      const depthVisible = inDepth.has(id);
      record.element.classList.toggle("is-hidden", !groupVisible);
      record.element.classList.toggle("is-dimmed", focused && !depthVisible);
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
      const dimmed = focused && !endpointsInDepth;
      record.visiblePath.classList.toggle("is-hidden", hidden);
      record.hitPath.classList.toggle("is-hidden", hidden);
      record.visiblePath.classList.toggle("is-dimmed", dimmed);
      record.visiblePath.classList.toggle("is-highlighted", connected || selected);
      record.visiblePath.classList.toggle("is-selected", selected);
      record.labelGroup.classList.toggle("is-visible", connected || selected);
      record.labelGroup.classList.toggle("is-hidden", hidden);
    });
  }

  function positionPopover(nodeId = state.selectedNodeId) {
    const popover = document.querySelector("#topologyPopover");
    const point = nodeId ? positions.get(nodeId) : null;
    if (!popover || popover.hidden || !point) return;

    const screenX = transform.x + point.x * transform.k;
    const screenY = transform.y + point.y * transform.k;
    const cardWidth = popover.offsetWidth || 324;
    const cardHeight = popover.offsetHeight || 260;
    const graphRight = Math.min(dimensions.width - 12, dimensions.usableWidth - 12);
    const preferredRight = screenX + 24;
    const preferredLeft = screenX - cardWidth - 24;
    const desiredLeft = preferredRight + cardWidth <= graphRight
      ? preferredRight
      : preferredLeft;
    const minLeft = 12;
    const maxLeft = Math.max(minLeft, graphRight - cardWidth);
    const minTop = Math.max(12, dimensions.topInset + 6);
    const maxTop = Math.max(
      minTop,
      dimensions.height - dimensions.bottomInset - cardHeight - 12
    );

    popover.style.left = `${clampRange(desiredLeft, minLeft, maxLeft)}px`;
    popover.style.top = `${clampRange(
      screenY - Math.min(72, cardHeight * 0.28),
      minTop,
      maxTop
    )}px`;
  }

  function applyTransform() {
    viewport.setAttribute("transform", `translate(${transform.x} ${transform.y}) scale(${transform.k})`);
    svg.classList.toggle("is-far", transform.k < 0.7);
    svg.classList.toggle("is-near", transform.k > 1.35);
    positionPopover();
  }

  function animateTransform(target, duration = 360) {
    const animation = ++transformAnimation;
    const start = { ...transform };
    const startedAt = performance.now();
    function step(now) {
      if (animation !== transformAnimation) return;
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
      transformAnimation += 1;
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
    transformAnimation += 1;
    const nodeElement = event.target.closest?.("[data-node-id]");
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
    if (!pointerAction.moved && distance > 5) {
      pointerAction.moved = true;
      // Capturing only an actual drag preserves native node/edge click targets.
      svg.setPointerCapture?.(event.pointerId);
    }
    if (!pointerAction.moved) return;
    if (pointerAction.type === "pan") {
      transform.x = pointerAction.originX + event.clientX - pointerAction.startX;
      transform.y = pointerAction.originY + event.clientY - pointerAction.startY;
      applyTransform();
      return;
    }
    const graphPoint = clientToGraph(event.clientX, event.clientY);
    const point = positions.get(pointerAction.nodeId);
    const node = nodes[nodeIndexById.get(pointerAction.nodeId)];
    const layout = nodeLabelLayout(node, nodeIndexById.get(pointerAction.nodeId));
    point.x = clampRange(
      graphPoint.x - pointerAction.offsetX,
      18 - layout.footprint.left,
      dimensions.usableWidth - 18 - layout.footprint.right
    );
    point.y = clampRange(
      graphPoint.y - pointerAction.offsetY,
      dimensions.topInset + 12 - layout.footprint.top,
      dimensions.height - dimensions.bottomInset - 12 - layout.footprint.bottom
    );
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
    if (!preserveTransform) transformAnimation += 1;
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

  let resizeFrame = null;
  const resizeObserver = new ResizeObserver(() => {
    if (svg.clientWidth < 100 || svg.clientHeight < 100 || resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      resize({ preserveTransform: true });
    });
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
      positionPopover();
    },
    fit,
    centerNode,
    positionPopover,
    resize,
    destroy() {
      resizeObserver.disconnect();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
    }
  };
}

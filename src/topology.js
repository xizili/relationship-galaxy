import { starPoints } from "./node-shapes.js";
import { createMapLayout } from "./map-layout.js";
import { placeRelationLabel, relationLabelBox } from "./relation-tour.js";

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
    control,
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
  Object.entries({ neutral: "#999891", active: "#65574b" }).forEach(([type, color]) => {
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
        fill: color
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
    selectedLinkIndex: null,
    contextNodeId: null,
    contextLinkIndex: null
  };
  let pointerAction = null;
  let lastDragAt = 0;
  let transformAnimation = 0;
  let revealedNodeId = null;

  const nodeRecords = new Map();
  const edgeRecords = [];
  const layoutIslands = createMapLayout(nodes, links);

  function relationColor(type) {
    return colorFromNumber(relationTypes[type]?.color);
  }

  function compactRoleText(node) {
    return node.role.length > 11 ? `${node.role.slice(0, 10)}…` : node.role;
  }

  function shouldPersistLabel(node, width) {
    const nodeDegree = degree.get(node.id) ?? 0;
    if (width <= 440) return nodeDegree > 8;
    if (width <= 760) return nodeDegree > 4;
    if (width <= 1240) return nodeDegree > 3;
    return true;
  }

  function nodeLabelLayout(node, index, { includeCard = true } = {}) {
    const radius = NODE_RADIUS;
    const roleText = compactRoleText(node);
    const labelWidth = clamp(
      node.cn.length * 13 + 12,
      52,
      144
    );
    const cardX = -labelWidth / 2;
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
      textX: 0,
      roleText,
      footprint: includeCard
        ? {
            left: Math.min(markerFootprint.left, cardX - 4),
            right: Math.max(markerFootprint.right, cardX + labelWidth + 4),
            top: -14,
            bottom: 34
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

    nodeLayouts = new Map(
      nodes.map((node, index) => [
        node.id,
        nodeLabelLayout(node, index, { includeCard: shouldPersistLabel(node, width) })
      ])
    );

    positions = layoutIslands({
      x: 24, y: topInset + 12,
      // Keep the world stable when a sidebar opens. Only the camera's visible
      // area changes; do not squash 73 people into the remaining phone strip.
      width: width - 70,
      height: Math.max(260, height - 78 - topInset - 24),
      footprints: new Map([...nodeLayouts].map(([id, layout]) => [id, layout.footprint]))
    }).positions;
  }

  function buildEdges() {
    edgeLayer.innerHTML = "";
    labelLayer.innerHTML = "";
    edgeRecords.length = 0;

    linkEntries.forEach((entry) => {
      const { link, index, bundleCount, bundleIndex } = entry;
      const color = "#999891";
      const bundleOffset = (bundleIndex - (bundleCount - 1) / 2) * 19;
      const seededBend = ((index * 17) % 5 - 2) * 3.5;
      const bend = bundleOffset + seededBend;

      const visiblePath = svgElement("path", {
        class: "topology-edge",
        "data-link-index": index,
        stroke: color,
        "stroke-dasharray": link.projected ? "3 7" : link.type === "conflict" ? "7 5" : null,
        "marker-end": link.directed || link.bidirectional ? "url(#topology-arrow-neutral)" : null,
        "marker-start": link.bidirectional ? "url(#topology-arrow-neutral)" : null
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
      const labelWidth = clamp(displayLabel.length * 12 + 24, 72, 312);
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
      edgeRecords.push({ entry, visiblePath, hitPath, labelGroup, labelText, labelWidth, bend });
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
          y: 13,
          width: labelWidth,
          height: 22,
          rx: 6
        })
      );
      const name = svgElement("text", {
        class: "topology-node-name",
        x: textX,
        y: 27,
        "text-anchor": "middle"
      });
      name.textContent = node.cn;
      card.append(name);
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
      for (const event of ["mouseenter", "focus"]) record.addEventListener(event, () => { revealedNodeId = node.id; placeMapLabels(); });
      for (const event of ["mouseleave", "blur"]) record.addEventListener(event, () => { if (revealedNodeId === node.id) revealedNodeId = null; placeMapLabels(); });

      nodeLayer.appendChild(record);
      nodeRecords.set(node.id, { element: record, node, radius, name, labelWidth });
    });
  }

  function geometryForRecord(record) {
    const source = positions.get(record.entry.link.source);
    const target = positions.get(record.entry.link.target);
    const dx = target.x - source.x, dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const trim = Math.min(NODE_RADIUS + 4, length * 0.2);
    return linkPath(
      { x: source.x + dx / length * trim, y: source.y + dy / length * trim },
      { x: target.x - dx / length * trim, y: target.y - dy / length * trim },
      record.bend
    );
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
    placeMapLabels();
    positionPopover();
  }

  function placeMapLabels() {
    const active = edgeRecords.filter((r) => r.labelGroup.classList.contains("is-visible") && !r.labelGroup.classList.contains("is-hidden"));
    if (!active.length) return;
    const k = transform.k;
    const screen = (p) => ({ x: transform.x + p.x * k, y: transform.y + p.y * k });
    const obstacles = [], names = new Map();
    nodeRecords.forEach((r, id) => {
      if (r.element.classList.contains("is-hidden")) return;
      const p = screen(positions.get(id));
      const radius = NODE_RADIUS * k * (id === state.selectedNodeId ? 1.38 : 1);
      obstacles.push(relationLabelBox(p, radius * 2 + 4, radius * 2 + 4));
      const hiddenAtDistance = k < 0.7 && r.element.classList.contains("is-minor");
      const visible = (!r.element.classList.contains("is-label-hidden") && !hiddenAtDistance)
        || r.element.classList.contains("is-link-endpoint") || id === state.selectedNodeId || id === revealedNodeId;
      if (!visible) return;
      const measured = r.name.getComputedTextLength?.();
      const width = (measured > 0 ? measured + 8 : r.labelWidth) * k;
      const center = { x: p.x, y: p.y + 23 * k };
      const box = relationLabelBox(center, width, 20 * k);
      obstacles.push(box); names.set(id, center);
    });
    const svgRect = svg.getBoundingClientRect();
    for (const selector of [".topbar", ".topology-caption", "#detailPanel"]) {
      const element = document.querySelector(selector);
      if (!element || element.classList?.contains("is-collapsed")) continue;
      const rect = element.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      obstacles.push({ left: rect.left - svgRect.left, right: rect.right - svgRect.left, top: rect.top - svgRect.top, bottom: rect.bottom - svgRect.top });
    }
    active.sort((a, b) => Number(b.entry.index === state.selectedLinkIndex) - Number(a.entry.index === state.selectedLinkIndex));
    for (const record of active) {
      const { link } = record.entry;
      const center = screen(geometryForRecord(record).midpoint);
      const start = names.get(link.source) ?? screen(positions.get(link.source));
      const end = names.get(link.target) ?? screen(positions.get(link.target));
      const measured = record.labelText.getComputedTextLength?.();
      const width = (measured > 0 ? measured + 24 : record.labelWidth) * k;
      const height = 28 * k;
      const rect = record.labelGroup.children[0];
      rect.setAttribute("width", width / k); rect.setAttribute("x", -width / k / 2);
      const offset = placeRelationLabel({ center, start, end, width, height, obstacles, viewport: dimensions });
      record.labelGroup.classList.toggle("is-occluded", !offset);
      if (!offset) continue;
      const anchor = { x: center.x + offset.x, y: center.y + offset.y };
      record.labelGroup.setAttribute("transform", `translate(${(anchor.x - transform.x) / k} ${(anchor.y - transform.y) / k})`);
      obstacles.push(relationLabelBox(anchor, width, height));
    }
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
    const contextLink = !focused && state.contextLinkIndex !== null ? links[state.contextLinkIndex] : null;
    const context = focused ? null : state.contextNodeId
      ? new Set([state.contextNodeId, ...(adjacency.get(state.contextNodeId) ?? [])])
      : contextLink ? new Set([contextLink.source, contextLink.target]) : null;
    const selectedNeighbors = state.selectedNodeId
      ? adjacency.get(state.selectedNodeId) ?? new Set()
      : new Set();

    nodeRecords.forEach((record, id) => {
      const groupVisible = state.activeGroup === "all" || record.node.group === state.activeGroup || id === state.selectedNodeId || id === selectedLink?.source || id === selectedLink?.target;
      const depthVisible = inDepth.has(id);
      record.element.classList.toggle("is-hidden", !groupVisible);
      record.element.classList.toggle("is-dimmed", focused && !depthVisible);
      record.element.classList.toggle("is-context-muted", Boolean(context && !context.has(id)));
      record.element.classList.toggle("is-selected", id === state.selectedNodeId);
      record.element.classList.toggle("is-link-endpoint", id === selectedLink?.source || id === selectedLink?.target);
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
      const contextRelated = contextLink ? index === state.contextLinkIndex
        : link.source === state.contextNodeId || link.target === state.contextNodeId;
      record.visiblePath.classList.toggle("is-context-muted", Boolean(context && !contextRelated));
      record.visiblePath.classList.toggle("is-highlighted", connected || selected);
      record.visiblePath.classList.toggle("is-selected", selected);
      const marker = `url(#topology-arrow-${connected || selected ? "active" : "neutral"})`;
      if (link.directed || link.bidirectional) record.visiblePath.setAttribute("marker-end", marker);
      if (link.bidirectional) record.visiblePath.setAttribute("marker-start", marker);
      record.labelGroup.classList.toggle("is-visible", connected || selected);
      record.labelGroup.classList.toggle("is-hidden", hidden);
    });
    placeMapLabels();
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
    placeMapLabels();
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
    const panel = document.querySelector("#detailPanel");
    const panelRect = panel?.getBoundingClientRect();
    const open = panel && !panel.classList.contains("is-collapsed");
    const bottomSheet = open && panelRect?.width >= dimensions.width * 0.72;
    const visibleWidth = open && !bottomSheet ? Math.max(240, dimensions.width - panelRect.width - 40) : dimensions.width;
    const visibleBottom = bottomSheet ? dimensions.height - panelRect.height - 90 : dimensions.height - 78;
    const centerY = (dimensions.topInset + Math.max(dimensions.topInset + 40, visibleBottom)) / 2;
    const targetX = visibleWidth * 0.5 - point.x * targetScale;
    const targetY = centerY - point.y * targetScale;
    animateTransform({ x: targetX, y: targetY, k: targetScale }, 420);
  }

  function centerLink(linkIndex) {
    const record = edgeRecords[linkIndex];
    if (!record) return;
    const { link } = record.entry;
    const boxes = [link.source, link.target].map((id) => {
      const point = positions.get(id);
      const node = nodeRecords.get(id);
      const footprint = nodeLabelLayout(node.node, nodeIndexById.get(id)).footprint;
      const measured = node.name.getComputedTextLength?.();
      const halfName = measured > 0 ? measured / 2 + 8 : 0;
      return { left: point.x + Math.min(footprint.left, -halfName),
        right: point.x + Math.max(footprint.right, halfName),
        top: point.y + footprint.top, bottom: point.y + footprint.bottom };
    });
    const { control, midpoint } = geometryForRecord(record);
    // Include the curved line's control hull and space for its short label.
    boxes.push(relationLabelBox(control, 16, 16), relationLabelBox(midpoint, record.labelWidth, 64));
    const bounds = {
      left: Math.min(...boxes.map((b) => b.left)) - 12,
      right: Math.max(...boxes.map((b) => b.right)) + 12,
      top: Math.min(...boxes.map((b) => b.top)) - 12,
      bottom: Math.max(...boxes.map((b) => b.bottom)) + 12
    };
    const panel = document.querySelector("#detailPanel");
    const panelRect = panel?.getBoundingClientRect();
    const open = panel && !panel.classList.contains("is-collapsed");
    const bottomSheet = open && panelRect?.width >= dimensions.width * 0.72;
    // Width/height remain stable during the sidebar's opening translation.
    // Its animated left/top would incorrectly frame the graph behind the card.
    const visibleWidth = open && !bottomSheet ? Math.max(240, dimensions.width - panelRect.width - 40) : dimensions.width;
    const visibleBottom = bottomSheet ? dimensions.height - panelRect.height - 90 : dimensions.height - 78;
    const frame = { left: 24, right: visibleWidth - 24, top: dimensions.topInset + 12,
      bottom: Math.max(dimensions.topInset + 52, visibleBottom) };
    const scale = Math.min(2.4, (frame.right - frame.left) / (bounds.right - bounds.left),
      (frame.bottom - frame.top) / (bounds.bottom - bounds.top));
    animateTransform({
      x: (frame.left + frame.right) / 2 - (bounds.left + bounds.right) / 2 * scale,
      y: (frame.top + frame.bottom) / 2 - (bounds.top + bounds.bottom) / 2 * scale,
      k: scale
    }, 420);
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
      state = { ...state, ...nextState };
      updateVisualState();
      if (options.center) {
        if (state.selectedNodeId) centerNode(state.selectedNodeId);
        else if (state.selectedLinkIndex !== null) centerLink(state.selectedLinkIndex);
      }
      if (state.overviewMode && options.fit) fit();
      positionPopover();
    },
    fit,
    centerNode,
    centerLink,
    positionPopover,
    resize,
    destroy() {
      resizeObserver.disconnect();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
    }
  };
}

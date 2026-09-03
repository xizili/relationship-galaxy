import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createIcons, Map as MapIcon, Orbit, RotateCcw, Search, Telescope, X } from "lucide";
import { groups, links, nodes, relationTypes } from "./data.js";
import { initTopology } from "./topology.js";
import { initTimeline } from "./timeline.js";

createIcons({
  icons: {
    Map: MapIcon,
    Orbit,
    RotateCcw,
    Search,
    Telescope,
    X
  }
});

const sceneEl = document.querySelector("#scene");
const detailPanel = document.querySelector("#detailPanel");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const groupFilters = document.querySelector("#groupFilters");
const depthControl = document.querySelector(".depth-control");
const linkToast = document.querySelector("#linkToast");
const sourceMap = document.querySelector("#sourceMap");
const viewSwitcher = document.querySelector("#viewSwitcher");
const viewStatus = document.querySelector("#viewStatus");
const relationLegend = document.querySelector("#relationLegend");
const timelineContent = document.querySelector("#timelineContent");
const topologyPopover = document.querySelector("#topologyPopover");
const topologyPopoverContent = document.querySelector("#topologyPopoverContent");

const nodeById = new Map(nodes.map((node) => [node.id, node]));
const nodeRecords = new Map();
const linkRecords = [];
const groupKeys = Object.keys(groups);
const galaxyPositionScale = new THREE.Vector3(0.62, 1.12, 2.2);
const graphBounds = new THREE.Box3().setFromPoints(nodes.map((node) => getNodePosition(node)));
const graphCenter = graphBounds.getCenter(new THREE.Vector3());
const graphSize = graphBounds.getSize(new THREE.Vector3());

let activeGroup = "all";
let depthMode = "all";
let overviewMode = true;
let detailPanelOpen = true;
let overviewSection = "highlights";
let selectedNodeId = null;
let selectedLinkIndex = null;
let hoveredNodeId = null;
let hoveredLinkIndex = null;
let cameraGoal = null;
let targetGoal = null;
let activeView = "topology";
let topologyApi = null;
let timelineApi = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080908);
scene.fog = new THREE.FogExp2(0x080908, 0.0009);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 8000);
camera.position.set(0, 92, 560);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = "webgl-canvas";
sceneEl.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "label-layer";
sceneEl.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 140;
controls.maxDistance = 5200;
controls.autoRotateSpeed = 0.55;

const graphGroup = new THREE.Group();
scene.add(graphGroup);

const ambient = new THREE.AmbientLight(0xffffff, 1.25);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xf4d79a, 2200, 1600);
keyLight.position.set(-260, 330, 420);
scene.add(keyLight);

const coolLight = new THREE.PointLight(0x9cc7ff, 1100, 1500);
coolLight.position.set(580, -180, 300);
scene.add(coolLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function cssColor(hexNumber) {
  return `#${hexNumber.toString(16).padStart(6, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayName(node) {
  return `${node.cn} ${node.name}`;
}

function getNodePosition(nodeOrId) {
  const node = typeof nodeOrId === "string" ? nodeById.get(nodeOrId) : nodeOrId;
  return new THREE.Vector3(node.x, node.y, node.z).multiply(galaxyPositionScale);
}

function relationColor(type) {
  return relationTypes[type]?.color ?? 0xffffff;
}

function relationLabel(type) {
  return relationTypes[type]?.label ?? "关系";
}

function relationFullText(link) {
  return link.fullText?.trim() || link.note?.trim() || link.label;
}

function relationDirectionMark(link, nodeId) {
  if (!link.directed) return "↔";
  return link.source === nodeId ? "→" : "←";
}

function renderRelationLegend() {
  relationLegend.innerHTML = Object.entries(relationTypes)
    .map(
      ([key, meta]) => `
        <span style="--legend-color:${cssColor(meta.color)}" data-relation-type="${key}">
          <i></i>${escapeHtml(meta.label)}
        </span>
      `
    )
    .join("");
}

function syncSecondaryViews(options = {}) {
  topologyApi?.update(
    {
      activeGroup,
      depthMode,
      overviewMode,
      selectedNodeId,
      selectedLinkIndex
    },
    options
  );
  timelineApi?.update(
    {
      activeGroup,
      selectedNodeId
    },
    options
  );
}

function setActiveView(view, options = {}) {
  if (!['topology', 'galaxy', 'timeline'].includes(view)) return;
  activeView = view;
  document.querySelector("#app").dataset.activeView = view;
  document.querySelector("#topologyView")?.classList.toggle("is-active", view === "topology");
  sceneEl.classList.toggle("is-active", view === "galaxy");
  document.querySelector("#timelineView")?.classList.toggle("is-active", view === "timeline");

  viewSwitcher.querySelectorAll("button[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (view === "topology") {
    topologyApi?.resize({ preserveTransform: true });
    syncSecondaryViews({ center: Boolean(selectedNodeId) });
    if (selectedNodeId) renderTopologyPopover(nodeById.get(selectedNodeId));
  } else if (view === "galaxy") {
    hideTopologyPopover();
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  } else if (view === "timeline") {
    hideTopologyPopover();
    timelineApi?.update(
      { activeGroup, selectedNodeId },
      { center: Boolean(selectedNodeId) }
    );
  }

  if (options.announce !== false) {
    const label = view === "topology" ? "关系拓扑" : view === "galaxy" ? "银河模式" : "时间轴";
    viewStatus.textContent = `已切换到${label}`;
  }
}

function updateDepthButtons() {
  document.querySelectorAll(".depth-control button").forEach((button) => {
    button.classList.toggle("active", button.dataset.depth === depthMode);
  });
}

function updateOverviewButton() {
  const button = document.querySelector("#overviewToggle");
  if (!button) return;

  const overviewPanelOpen = overviewMode && detailPanelOpen;
  const label = overviewPanelOpen ? "关闭全览视角侧页" : "打开全览视角";
  button.classList.toggle("active", overviewPanelOpen);
  button.setAttribute("aria-pressed", String(overviewPanelOpen));
  button.setAttribute("aria-expanded", String(overviewPanelOpen));
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}

function setDetailPanelOpen(open) {
  detailPanelOpen = Boolean(open);
  detailPanel.classList.toggle("is-collapsed", !detailPanelOpen);
  detailPanel.setAttribute("aria-hidden", String(!detailPanelOpen));

  if (detailPanelOpen) {
    detailPanel.removeAttribute("inert");
  } else {
    detailPanel.setAttribute("inert", "");
  }

  updateOverviewButton();
  if (activeView === "topology") {
    requestAnimationFrame(() => topologyApi?.resize({ preserveTransform: true }));
  }
}

function getOverviewCameraPlacement() {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(camera.aspect || 1, 0.35);
  const paddedWidth = graphSize.x + 220;
  const paddedHeight = graphSize.y + 180;
  const fitHeight = Math.max(paddedHeight, paddedWidth / aspect);
  const fitDistance = fitHeight / (2 * Math.tan(fov / 2));
  const depthPadding = graphSize.z * 0.65 + 120;
  const distance = THREE.MathUtils.clamp(fitDistance * 1.28 + depthPadding, 760, 4800);
  const direction = new THREE.Vector3(0.08, 0.34, 1).normalize();

  return {
    position: graphCenter.clone().add(direction.multiplyScalar(distance)),
    target: graphCenter.clone()
  };
}

function moveCameraToOverview(options = {}) {
  const placement = getOverviewCameraPlacement();

  if (options.immediate) {
    camera.position.copy(placement.position);
    controls.target.copy(placement.target);
    controls.update();
    cameraGoal = null;
    targetGoal = null;
    return;
  }

  cameraGoal = placement.position;
  targetGoal = placement.target;
}

function groupStats() {
  return groupKeys
    .map((key) => ({
      key,
      label: groups[key].label,
      color: groups[key].css,
      count: nodes.filter((node) => node.group === key).length
    }))
    .filter((group) => group.count > 0);
}

function topConnectedNodes(limit = 5) {
  const counts = new Map(nodes.map((node) => [node.id, 0]));
  links.forEach((link) => {
    counts.set(link.source, (counts.get(link.source) ?? 0) + 1);
    counts.set(link.target, (counts.get(link.target) ?? 0) + 1);
  });

  return nodes
    .map((node) => ({ ...node, degree: counts.get(node.id) ?? 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, limit);
}

function renderOverviewPeople() {
  return `
    <div class="overview-section-heading">
      <strong>全部人物</strong>
      <span>${nodes.length} 位</span>
    </div>
    <div class="relation-list overview-list">
      ${nodes
        .map(
          (node) => `
            <button type="button" class="relation-row" data-focus-node="${node.id}">
              <span class="relation-dot" style="--relation-color:${groups[node.group].css}"></span>
              <span>
                <strong>${escapeHtml(node.cn)}</strong>
                <small>${escapeHtml(node.name)} · ${escapeHtml(groups[node.group].label)} · ${escapeHtml(node.role)}</small>
              </span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOverviewGroups() {
  const groupRows = groupStats()
    .map(
      (group) => `
        <div class="overview-entry">
          <span class="relation-dot" style="--relation-color:${group.color}"></span>
          <span>
            <strong>${escapeHtml(group.label)}</strong>
            <small>${group.count} 位人物</small>
          </span>
        </div>
      `
    )
    .join("");

  return `
    <div class="overview-section-heading">
      <strong>全部流派</strong>
      <span>${groupStats().length} 个</span>
    </div>
    <div class="overview-list">${groupRows}</div>
  `;
}

function renderOverviewRelationTypes() {
  const typeRows = Object.entries(relationTypes)
    .map(([key, meta]) => {
      const count = links.filter((link) => link.type === key).length;
      return `
        <div class="overview-entry">
          <span class="relation-dot" style="--relation-color:${cssColor(meta.color)}"></span>
          <span>
            <strong>${escapeHtml(meta.label)}</strong>
            <small>${count} 条关系</small>
          </span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="overview-section-heading">
      <strong>全部关系类型</strong>
      <span>${Object.keys(relationTypes).length} 类</span>
    </div>
    <div class="overview-list">${typeRows}</div>
  `;
}

function renderOverviewHighlights() {
  const clusters = groupStats()
    .map(
      (group) => `
        <span class="cluster-pill" style="--cluster-color:${group.color}">
          <i></i>${escapeHtml(group.label)} ${group.count}
        </span>
      `
    )
    .join("");
  const hubs = topConnectedNodes()
    .map(
      (node) => `
        <button type="button" class="relation-row" data-focus-node="${node.id}">
          <span class="relation-dot" style="--relation-color:${groups[node.group].css}"></span>
          <span>
            <strong>${escapeHtml(node.cn)}</strong>
            <small>${escapeHtml(node.degree)} 条关系 · ${escapeHtml(node.role)}</small>
          </span>
        </button>
      `
    )
    .join("");

  return `
    <div class="cluster-list">${clusters}</div>
    <div class="overview-section-heading">
      <strong>核心枢纽</strong>
      <span>关系数前 5 位</span>
    </div>
    <div class="relation-list overview-list">${hubs}</div>
  `;
}

function renderOverviewSection() {
  if (overviewSection === "people") return renderOverviewPeople();
  if (overviewSection === "groups") return renderOverviewGroups();
  if (overviewSection === "relation-types") return renderOverviewRelationTypes();
  return renderOverviewHighlights();
}

function renderOverviewPanel() {
  const relationTypeCount = Object.keys(relationTypes).length;
  const statButton = (section, label) => `
    <button
      type="button"
      class="overview-stat${overviewSection === section ? " is-active" : ""}"
      data-overview-section="${section}"
      aria-pressed="${overviewSection === section}"
    >${label}</button>
  `;

  detailPanel.innerHTML = `
    <div class="panel-kicker" style="--node-color:#f4b94f">
      <span></span>全局视角
    </div>
    <h2>全览视角</h2>
    <p class="latin-name">${nodes.length} nodes · ${links.length} relations</p>
    <p class="role">从精神分析核心延展到存在主义、系统论与当代神经科学。</p>
    <div class="panel-stats">
      ${statButton("people", `${nodes.length} 个人物`)}
      <span title="关系总数">${links.length} 条关系</span>
      ${statButton("groups", `${groupStats().length} 个流派`)}
      ${statButton("relation-types", `${relationTypeCount} 类关系`)}
    </div>
    ${renderOverviewSection()}
  `;
}

function makeStarField() {
  const count = 1100;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const radius = 680 + Math.random() * 1180;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    color.setHSL(0.08 + Math.random() * 0.08, 0.25, 0.58 + Math.random() * 0.32);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.82
  });

  const stars = new THREE.Points(geometry, material);
  stars.name = "stars";
  scene.add(stars);
  return stars;
}

const stars = makeStarField();

function createNode(node) {
  const group = groups[node.group];
  const color = group?.color ?? 0xffffff;
  const position = getNodePosition(node);

  const geometry = new THREE.SphereGeometry(node.size, 32, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: node.id === "freud" ? 0.42 : 0.22,
    metalness: 0.18,
    roughness: 0.46,
    transparent: true,
    opacity: 1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.userData = { type: "node", id: node.id };
  graphGroup.add(mesh);

  const glowGeometry = new THREE.SphereGeometry(node.size * 2.05, 32, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: node.id === "freud" ? 0.18 : 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(position);
  glow.userData = { type: "node-glow", id: node.id };
  graphGroup.add(glow);

  const label = document.createElement("div");
  label.className = "node-label";
  label.innerHTML = `<strong>${escapeHtml(node.cn)}</strong><span>${escapeHtml(node.role)}</span>`;
  label.style.setProperty("--node-color", cssColor(color));

  const labelObject = new CSS2DObject(label);
  labelObject.position.set(0, node.size + 13, 0);
  mesh.add(labelObject);

  nodeRecords.set(node.id, {
    node,
    mesh,
    glow,
    label,
    material,
    glowMaterial
  });
}

function makeCurve(sourceNode, targetNode) {
  const start = getNodePosition(sourceNode);
  const end = getNodePosition(targetNode);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const chord = end.clone().sub(start);
  const distance = start.distanceTo(end);
  const chordDirection = chord.normalize();
  const bendDirection = midpoint.clone().sub(graphCenter);

  // Project the outward direction onto the plane perpendicular to the link.
  // This creates a gentle bow without the overshoot of a three-point spline.
  bendDirection.addScaledVector(
    chordDirection,
    -bendDirection.dot(chordDirection)
  );

  if (bendDirection.lengthSq() < 0.001) {
    const fallbackAxis = Math.abs(chordDirection.y) < 0.82
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    bendDirection.crossVectors(chordDirection, fallbackAxis);
  }

  const bend = THREE.MathUtils.clamp(distance * 0.045, 9, 36);
  const control = midpoint.add(bendDirection.normalize().multiplyScalar(bend));

  return new THREE.QuadraticBezierCurve3(start, control, end);
}

function createLink(link, index) {
  const sourceNode = nodeById.get(link.source);
  const targetNode = nodeById.get(link.target);
  const curve = makeCurve(sourceNode, targetNode);
  const geometry = new THREE.TubeGeometry(curve, 42, 0.68 + (link.weight ?? 1) * 0.18, 8, false);
  const material = new THREE.MeshBasicMaterial({
    color: relationColor(link.type),
    transparent: true,
    opacity: 0.34,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { type: "link", index };
  graphGroup.add(mesh);

  let arrow = null;
  if (link.directed) {
    const arrowGeometry = new THREE.ConeGeometry(3.6 + (link.weight ?? 1), 11, 18);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: relationColor(link.type),
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    const point = curve.getPoint(0.68);
    const tangent = curve.getTangent(0.68).normalize();
    arrow.position.copy(point);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    arrow.userData = { type: "link", index };
    graphGroup.add(arrow);
  }

  const linkLabel = document.createElement("div");
  linkLabel.className = "link-label";
  linkLabel.textContent = link.label.length > 28 ? `${link.label.slice(0, 27)}…` : link.label;
  linkLabel.title = relationFullText(link);
  linkLabel.style.setProperty("--relation-color", cssColor(relationColor(link.type)));
  const linkLabelObject = new CSS2DObject(linkLabel);
  linkLabelObject.position.copy(curve.getPoint(0.5));
  graphGroup.add(linkLabelObject);

  linkRecords.push({
    link,
    index,
    mesh,
    arrow,
    label: linkLabel,
    labelObject: linkLabelObject,
    material,
    arrowMaterial: arrow?.material,
    curve
  });
}

nodes.forEach(createNode);
links.forEach(createLink);

function renderFilters() {
  const filters = [
    ["all", "全部"],
    ...groupKeys.map((key) => [key, groups[key].label])
  ];
  groupFilters.innerHTML = filters
    .map(([key, label]) => {
      const active = key === activeGroup ? " active" : "";
      const colorStyle = key === "all" ? "" : `style="--filter-color:${groups[key].css}"`;
      return `<button type="button" data-group="${key}" class="${active.trim()}" ${colorStyle}>${label}</button>`;
    })
    .join("");
}

function adjacentLinks(nodeId) {
  return links
    .map((link, index) => ({ ...link, index }))
    .filter((link) => link.source === nodeId || link.target === nodeId);
}

function getOtherNodeId(link, nodeId) {
  return link.source === nodeId ? link.target : link.source;
}

function getDepthSet(startId) {
  if (!startId || depthMode === "all") {
    return new Set(nodes.map((node) => node.id));
  }

  const maxDepth = depthMode === "2" ? 2 : 1;
  const visited = new Set([startId]);
  let frontier = new Set([startId]);

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next = new Set();
    links.forEach((link) => {
      if (frontier.has(link.source) && !visited.has(link.target)) {
        next.add(link.target);
      }
      if (frontier.has(link.target) && !visited.has(link.source)) {
        next.add(link.source);
      }
    });
    next.forEach((id) => visited.add(id));
    frontier = next;
  }

  return visited;
}

function isNodeInActiveGroup(node) {
  return activeGroup === "all" || node.group === activeGroup;
}

function activeNodeSet() {
  const depthSet = getDepthSet(selectedNodeId);
  const active = new Set();

  nodes.forEach((node) => {
    if (depthSet.has(node.id) && isNodeInActiveGroup(node)) {
      active.add(node.id);
    }
  });

  if (selectedNodeId) {
    active.add(selectedNodeId);
  }

  return active;
}

function updateHighlights() {
  const activeSet = activeNodeSet();
  const connected = new Set();

  if (selectedNodeId) {
    adjacentLinks(selectedNodeId).forEach((link) => {
      connected.add(link.source);
      connected.add(link.target);
    });
  }

  nodeRecords.forEach((record, id) => {
    const selected = id === selectedNodeId;
    const hovered = id === hoveredNodeId;
    const active = activeSet.has(id);
    const isConnected = connected.has(id);
    const opacity = active ? 1 : 0.14;
    const scale = selected ? 1.32 : hovered ? 1.18 : isConnected ? 1.06 : 1;

    record.material.opacity = opacity;
    record.material.emissiveIntensity = selected ? 0.62 : hovered ? 0.48 : isConnected ? 0.32 : 0.16;
    record.glowMaterial.opacity = active ? (selected ? 0.28 : hovered ? 0.22 : 0.1) : 0.035;
    record.mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.45);
    record.glow.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.45);

    record.label.classList.toggle("is-muted", !active);
    record.label.classList.toggle("is-selected", selected);
    record.label.classList.toggle("is-hovered", hovered);
  });

  linkRecords.forEach((record) => {
    const { link, index } = record;
    const endpointsActive = activeSet.has(link.source) && activeSet.has(link.target);
    const connectedToSelected = selectedNodeId && (link.source === selectedNodeId || link.target === selectedNodeId);
    const selected = index === selectedLinkIndex;
    const hovered = index === hoveredLinkIndex;
    const active = endpointsActive && (depthMode === "all" || connectedToSelected || getDepthSet(selectedNodeId).has(link.source));
    const opacity = selected ? 0.96 : hovered ? 0.82 : connectedToSelected ? 0.58 : active ? 0.28 : 0.045;

    record.material.opacity = opacity;
    if (record.arrowMaterial) {
      record.arrowMaterial.opacity = Math.min(0.88, opacity + 0.18);
    }
    record.label.classList.toggle("is-visible", selected || hovered || connectedToSelected);
  });
}

function focusCameraOnNode(nodeId) {
  const position = getNodePosition(nodeId);
  const direction = position.clone();

  if (direction.lengthSq() < 0.01) {
    direction.set(0, 0.36, 1);
  }

  direction.normalize();
  const side = new THREE.Vector3(-direction.z, 0.22, direction.x).normalize();
  const distance = nodeId === "freud" ? 430 : 265;
  const cameraPosition = position
    .clone()
    .add(direction.multiplyScalar(distance))
    .add(side.multiplyScalar(84));

  cameraGoal = cameraPosition;
  targetGoal = position;
}

function hideTopologyPopover() {
  if (!topologyPopover) return;
  topologyPopover.hidden = true;
  topologyPopover.removeAttribute("data-node-id");
}

function renderTopologyPopover(node) {
  if (!topologyPopover || !topologyPopoverContent || activeView !== "topology") {
    hideTopologyPopover();
    return;
  }

  const group = groups[node.group];
  const relations = adjacentLinks(node.id);
  const relationItems = relations
    .map((link) => {
      const otherNode = nodeById.get(getOtherNodeId(link, node.id));
      const qualifier = link.projected ? " · 经主题节点" : link.sourceAnnotated === false ? " · 原图未写文字" : "";
      return `
        <li>
          <strong>${relationDirectionMark(link, node.id)} ${escapeHtml(otherNode.cn)}${escapeHtml(qualifier)}</strong>
          <span>${escapeHtml(relationFullText(link))}</span>
        </li>
      `;
    })
    .join("");
  const works = node.works?.length
    ? `<div class="topology-popover-works">${node.works
        .slice(0, 3)
        .map((work) => `<span>${escapeHtml(work)}</span>`)
        .join("")}</div>`
    : "";

  topologyPopover.style.setProperty("--node-color", group.css);
  topologyPopover.dataset.nodeId = node.id;
  topologyPopoverContent.innerHTML = `
    <div class="topology-popover-kicker">
      <span></span>${escapeHtml(group.label)}
    </div>
    <h3 id="topologyPopoverTitle">${escapeHtml(node.cn)}</h3>
    <p class="topology-popover-latin">${escapeHtml(node.name)} · ${escapeHtml(node.years)}</p>
    <p class="topology-popover-role">${escapeHtml(node.role)}</p>
    <p class="topology-popover-summary">${escapeHtml(node.summary)}</p>
    ${works}
    <div class="topology-popover-relations">
      <p class="topology-popover-count">原图关系注释 · ${relations.length} 条</p>
      <ul>${relationItems}</ul>
    </div>
  `;
  topologyPopover.setAttribute("aria-labelledby", "topologyPopoverTitle");
  topologyPopover.hidden = false;
  requestAnimationFrame(() => topologyApi?.positionPopover(node.id));
}

function focusNode(nodeId, options = {}) {
  const node = nodeById.get(nodeId);
  if (!node) return;

  const wasOverview = overviewMode;
  overviewMode = false;
  selectedNodeId = nodeId;
  selectedLinkIndex = null;
  hoveredLinkIndex = null;

  if (wasOverview && options.preserveDepth !== true) {
    depthMode = "1";
    updateDepthButtons();
  }

  setDetailPanelOpen(true);
  renderDetailPanel(node);
  updateHighlights();
  syncSecondaryViews({ center: activeView === "topology" });

  if (activeView === "topology") {
    renderTopologyPopover(node);
  } else {
    hideTopologyPopover();
  }

  if (options.camera !== false && activeView === "galaxy") {
    focusCameraOnNode(nodeId);
  }
}

function renderRelationList(nodeId) {
  const relations = adjacentLinks(nodeId);

  if (!relations.length) {
    return `<p class="empty-state">暂无关系数据</p>`;
  }

  return `
    <div class="relation-list">
      ${relations
        .map((link) => {
          const otherId = getOtherNodeId(link, nodeId);
          const otherNode = nodeById.get(otherId);
          const color = cssColor(relationColor(link.type));
          return `
            <button type="button" class="relation-row" data-focus-node="${otherId}" data-link-index="${link.index}">
              <span class="relation-dot" style="--relation-color:${color}"></span>
              <span>
                <strong>${relationDirectionMark(link, nodeId)} ${escapeHtml(otherNode.cn)}${link.projected ? " · 经主题节点" : ""}</strong>
                <small>${escapeHtml(relationFullText(link))}</small>
              </span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDetailPanel(node) {
  const group = groups[node.group];
  const relations = adjacentLinks(node.id);
  const works = node.works?.length
    ? `<div class="work-list">${node.works.map((work) => `<span>${escapeHtml(work)}</span>`).join("")}</div>`
    : "";

  detailPanel.innerHTML = `
    <div class="panel-kicker" style="--node-color:${group.css}">
      <span></span>${escapeHtml(group.label)}
    </div>
    <h2>${escapeHtml(node.cn)}</h2>
    <p class="latin-name">${escapeHtml(node.name)} · ${escapeHtml(node.years)}</p>
    <p class="role">${escapeHtml(node.role)}</p>
    <p class="summary">${escapeHtml(node.summary)}</p>
    ${works}
    <div class="panel-stats">
      <span>${relations.length} 条关系</span>
      <span>${depthMode === "all" ? "全图" : `${depthMode} 度关系`}</span>
    </div>
    ${renderRelationList(node.id)}
  `;
}

function renderLinkDetail(linkIndex) {
  const record = linkRecords[linkIndex];
  if (!record) return;
  const { link } = record;
  const source = nodeById.get(link.source);
  const target = nodeById.get(link.target);
  overviewMode = false;
  selectedLinkIndex = linkIndex;
  selectedNodeId = null;
  hideTopologyPopover();
  setDetailPanelOpen(true);

  detailPanel.innerHTML = `
    <div class="panel-kicker" style="--node-color:${cssColor(relationColor(link.type))}">
      <span></span>${escapeHtml(relationLabel(link.type))}
    </div>
    <h2>${escapeHtml(source.cn)} ${link.directed ? "→" : "↔"} ${escapeHtml(target.cn)}</h2>
    <p class="latin-name">${escapeHtml(source.name)} / ${escapeHtml(target.name)}</p>
    <p class="role">${escapeHtml(link.label)}</p>
    <p class="summary">${escapeHtml(relationFullText(link))}</p>
    <div class="evidence-status">
      <span>${escapeHtml(relationLabel(link.type))}</span>
      <span>${link.directed ? "有方向关系" : "双向／对称关系"}</span>
      <span>${link.projected ? "经原图主题节点投影" : link.sourceAnnotated === false ? "原图直连，未写关系文字" : "原图逐字校正"}</span>
    </div>
    <div class="relation-actions">
      <button type="button" data-focus-node="${source.id}">${escapeHtml(source.cn)}</button>
      <button type="button" data-focus-node="${target.id}">${escapeHtml(target.cn)}</button>
    </div>
  `;
  updateHighlights();
  syncSecondaryViews();
}

function enterOverview(options = {}) {
  const wasOverview = overviewMode;
  overviewMode = true;
  if (!wasOverview) overviewSection = "highlights";
  activeGroup = "all";
  depthMode = "all";
  selectedNodeId = null;
  selectedLinkIndex = null;
  hoveredNodeId = null;
  hoveredLinkIndex = null;
  hideTopologyPopover();
  controls.autoRotate = false;
  document.querySelector("#orbitToggle").classList.remove("active");
  searchResults.classList.remove("is-open");
  searchInput.value = "";

  renderFilters();
  updateDepthButtons();
  renderOverviewPanel();
  setDetailPanelOpen(options.panelOpen !== false);
  updateHighlights();
  moveCameraToOverview(options);
  syncSecondaryViews({ fit: activeView === "topology" });
}

function resetView() {
  overviewMode = false;
  selectedNodeId = "freud";
  selectedLinkIndex = null;
  activeGroup = "all";
  depthMode = "1";
  controls.autoRotate = false;
  document.querySelector("#orbitToggle").classList.remove("active");
  updateDepthButtons();
  updateOverviewButton();
  renderFilters();
  focusNode("freud");
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nodeSearchText(node) {
  return normalize(
    [
      node.cn,
      node.name,
      node.years,
      node.role,
      groups[node.group]?.label,
      node.summary,
      ...(node.works ?? [])
    ].join(" ")
  );
}

function linkSearchText(link) {
  const source = nodeById.get(link.source);
  const target = nodeById.get(link.target);
  return normalize(
    [
      source.cn,
      source.name,
      target.cn,
      target.name,
      link.label,
      relationFullText(link),
      relationLabel(link.type)
    ].join(" ")
  );
}

function renderSearchResults(query) {
  const q = normalize(query.trim());
  if (!q) {
    searchResults.classList.remove("is-open");
    searchResults.innerHTML = "";
    return;
  }

  const nodeMatches = nodes
    .filter((node) => nodeSearchText(node).includes(q))
    .slice(0, 6)
    .map((node) => ({ kind: "node", node }));

  const linkMatches = links
    .map((link, index) => ({ kind: "link", link, index }))
    .filter((item) => linkSearchText(item.link).includes(q))
    .slice(0, 4);

  const matches = [...nodeMatches, ...linkMatches].slice(0, 8);

  if (!matches.length) {
    searchResults.innerHTML = `<div class="search-empty">没有匹配项</div>`;
    searchResults.classList.add("is-open");
    return;
  }

  searchResults.innerHTML = matches
    .map((item) => {
      if (item.kind === "node") {
        const node = item.node;
        return `
          <button type="button" data-search-node="${node.id}">
            <strong>${escapeHtml(node.cn)}</strong>
            <span>${escapeHtml(node.role)}</span>
          </button>
        `;
      }

      const { link, index } = item;
      const source = nodeById.get(link.source);
      const target = nodeById.get(link.target);
      return `
        <button type="button" data-search-link="${index}">
          <strong>${escapeHtml(source.cn)} → ${escapeHtml(target.cn)}</strong>
          <span>${escapeHtml(link.label)}</span>
        </button>
      `;
    })
    .join("");
  searchResults.classList.add("is-open");
}

function pointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}

function hitTest(event) {
  pointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);

  const nodeHits = raycaster.intersectObjects(
    Array.from(nodeRecords.values()).map((record) => record.mesh),
    false
  );

  if (nodeHits.length) {
    return nodeHits[0].object.userData;
  }

  const linkMeshes = linkRecords.flatMap((record) => (record.arrow ? [record.mesh, record.arrow] : [record.mesh]));
  const linkHits = raycaster.intersectObjects(linkMeshes, false);
  if (linkHits.length) {
    return linkHits[0].object.userData;
  }

  return null;
}

function showLinkToast(event, index) {
  const record = linkRecords[index];
  if (!record) return;
  const source = nodeById.get(record.link.source);
  const target = nodeById.get(record.link.target);
  linkToast.innerHTML = `
    <strong>${escapeHtml(source.cn)} ${record.link.directed ? "→" : "↔"} ${escapeHtml(target.cn)}</strong>
    <span>${escapeHtml(record.link.label)}</span>
  `;
  linkToast.style.left = `${Math.min(event.clientX + 16, window.innerWidth - 300)}px`;
  linkToast.style.top = `${Math.min(event.clientY + 16, window.innerHeight - 92)}px`;
  linkToast.classList.add("is-visible");
}

function hideLinkToast() {
  linkToast.classList.remove("is-visible");
}

renderer.domElement.addEventListener("pointermove", (event) => {
  const hit = hitTest(event);
  hoveredNodeId = null;
  hoveredLinkIndex = null;

  if (hit?.type === "node") {
    hoveredNodeId = hit.id;
    renderer.domElement.style.cursor = "pointer";
    hideLinkToast();
  } else if (hit?.type === "link") {
    hoveredLinkIndex = hit.index;
    renderer.domElement.style.cursor = "pointer";
    showLinkToast(event, hit.index);
  } else {
    renderer.domElement.style.cursor = "grab";
    hideLinkToast();
  }

  updateHighlights();
});

renderer.domElement.addEventListener("pointerleave", () => {
  hoveredNodeId = null;
  hoveredLinkIndex = null;
  renderer.domElement.style.cursor = "grab";
  hideLinkToast();
  updateHighlights();
});

renderer.domElement.addEventListener("click", (event) => {
  const hit = hitTest(event);
  if (hit?.type === "node") {
    focusNode(hit.id);
  } else if (hit?.type === "link") {
    renderLinkDetail(hit.index);
  }
});

groupFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-group]");
  if (!button) return;
  activeGroup = button.dataset.group;
  renderFilters();
  if (overviewMode) {
    renderOverviewPanel();
  }
  updateHighlights();
  syncSecondaryViews();
});

depthControl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-depth]");
  if (!button) return;
  depthMode = button.dataset.depth;
  updateDepthButtons();
  if (selectedNodeId) {
    renderDetailPanel(nodeById.get(selectedNodeId));
  } else if (overviewMode) {
    renderOverviewPanel();
  }
  updateHighlights();
  syncSecondaryViews();
});

detailPanel.addEventListener("click", (event) => {
  const overviewButton = event.target.closest("[data-overview-section]");
  if (overviewButton) {
    overviewSection = overviewButton.dataset.overviewSection;
    renderOverviewPanel();
    return;
  }

  const relationButton = event.target.closest("[data-link-index]");
  if (relationButton) {
    renderLinkDetail(Number(relationButton.dataset.linkIndex));
    return;
  }

  const focusButton = event.target.closest("[data-focus-node]");
  if (focusButton) {
    focusNode(focusButton.dataset.focusNode);
  }
});

document.querySelector("#closeTopologyPopover")?.addEventListener("click", () => {
  hideTopologyPopover();
});

viewSwitcher.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (!button) return;
  setActiveView(button.dataset.view);
});

searchInput.addEventListener("input", (event) => {
  renderSearchResults(event.target.value);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const firstResult = searchResults.querySelector("button");
  firstResult?.click();
});

searchResults.addEventListener("click", (event) => {
  const nodeButton = event.target.closest("[data-search-node]");
  const linkButton = event.target.closest("[data-search-link]");

  if (nodeButton) {
    focusNode(nodeButton.dataset.searchNode);
  } else if (linkButton) {
    renderLinkDetail(Number(linkButton.dataset.searchLink));
  }

  searchResults.classList.remove("is-open");
  searchInput.blur();
});

document.querySelector("#orbitToggle").addEventListener("click", (event) => {
  controls.autoRotate = !controls.autoRotate;
  event.currentTarget.classList.toggle("active", controls.autoRotate);
});

document.querySelector("#overviewToggle").addEventListener("click", () => {
  if (overviewMode && detailPanelOpen) {
    setDetailPanelOpen(false);
    return;
  }

  enterOverview();
});

document.querySelector("#resetView").addEventListener("click", resetView);

document.querySelector("#sourceToggle").addEventListener("click", () => {
  sourceMap.classList.toggle("is-open");
});

document.querySelector("#closeSourceMap").addEventListener("click", () => {
  sourceMap.classList.remove("is-open");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchResults.classList.remove("is-open");
    sourceMap.classList.remove("is-open");
    hideLinkToast();
    hideTopologyPopover();
  }
});

function resize() {
  const width = sceneEl.clientWidth || window.innerWidth;
  const height = sceneEl.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  if (overviewMode) {
    moveCameraToOverview({ immediate: true });
  }
}

window.addEventListener("resize", resize);

function animate() {
  requestAnimationFrame(animate);

  if (activeView !== "galaxy") return;

  stars.rotation.y += 0.00008;
  stars.rotation.x += 0.000025;

  if (cameraGoal && targetGoal) {
    camera.position.lerp(cameraGoal, 0.055);
    controls.target.lerp(targetGoal, 0.065);
    if (camera.position.distanceTo(cameraGoal) < 1.2 && controls.target.distanceTo(targetGoal) < 0.8) {
      cameraGoal = null;
      targetGoal = null;
    }
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

renderFilters();
renderRelationLegend();
topologyApi = initTopology({
  nodes,
  links,
  groups,
  relationTypes,
  onFocusNode: (nodeId) => focusNode(nodeId, { camera: false }),
  onFocusLink: renderLinkDetail,
  onOverview: () => enterOverview()
});
timelineApi = initTimeline({
  root: timelineContent,
  nodes,
  links,
  groups,
  onFocusNode: (nodeId) => focusNode(nodeId, { camera: false })
});
setActiveView("topology", { announce: false });
resize();
enterOverview({ immediate: true });
animate();

import * as THREE from "three";
import { groups } from "./taxonomy.js";

const DOMAIN_ANCHORS = Object.fromEntries(Object.entries(groups).map(([id, group]) => [id, group.anchor]));

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function birthYear(node) {
  if (node?.kind === "topic") return null;
  if (Number.isFinite(node?.birthYear)) return node.birthYear;
  const match = String(node?.years ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function hashNumber(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededVector(seed) {
  const hash = hashNumber(seed);
  const a = ((hash & 1023) / 1023) * Math.PI * 2;
  const z = (((hash >>> 10) & 1023) / 1023) * 2 - 1;
  const radius = Math.sqrt(Math.max(0, 1 - z * z));
  return new THREE.Vector3(radius * Math.cos(a), z, radius * Math.sin(a));
}

function groupAnchor(group) {
  return new THREE.Vector3(...(DOMAIN_ANCHORS[group] ?? [0.4, 0.2, 0.9])).normalize();
}

function constrainToRadius(position, radius) {
  if (position.lengthSq() < 0.0001) position.set(1, 0, 0);
  return position.normalize().multiplyScalar(radius);
}

export function clonePositionMap(positionMap) {
  return new Map([...positionMap].map(([id, position]) => [id, position.clone()]));
}

/**
 * Creates chronological ellipsoidal shells. Birth year determines depth from
 * the center; domain anchors and relationship relaxation determine direction.
 */
export function buildGalaxyLayout(nodes, links, scale = new THREE.Vector3(1, 1, 1)) {
  // Rank shells preserve chronological ordering without compressing all modern
  // people together when BCE philosophers enter the same map.
  const years = [...new Set(nodes.map(birthYear).filter(Number.isFinite))].sort((a, b) => a - b);
  const radii = new Map();
  const positions = new Map();

  nodes.forEach((node) => {
    const year = birthYear(node);
    const progress = year === null ? 0.68 : clamp01(years.indexOf(year) / Math.max(1, years.length - 1));
    const radius = THREE.MathUtils.lerp(54, 300, Math.pow(progress, 0.74));
    const anchor = groupAnchor(node.group);
    const jitter = seededVector(`${node.id}:galaxy`);
    const direction = anchor.multiplyScalar(0.84).add(jitter.multiplyScalar(0.34)).normalize();
    radii.set(node.id, radius);
    positions.set(node.id, direction.multiplyScalar(radius));
  });

  // Relax only the angular directions. Each iteration returns every person to
  // the radius fixed by their birth year, preserving chronological depth.
  for (let iteration = 0; iteration < 170; iteration += 1) {
    const forces = new Map(nodes.map((node) => [node.id, new THREE.Vector3()]));

    links.forEach((link) => {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!source || !target) return;
      const delta = target.clone().sub(source);
      const distance = Math.max(delta.length(), 0.001);
      const radialGap = Math.abs((radii.get(link.source) ?? 0) - (radii.get(link.target) ?? 0));
      const ideal = radialGap + 48 + (link.projected ? 10 : 0);
      const strength = 0.00155 * Math.min(2.1, link.weight ?? 1);
      const pull = delta.multiplyScalar(((distance - ideal) * strength) / distance);
      forces.get(link.source)?.add(pull);
      forces.get(link.target)?.sub(pull);
    });

    for (let aIndex = 0; aIndex < nodes.length; aIndex += 1) {
      const a = nodes[aIndex];
      const aPosition = positions.get(a.id);
      const anchorTarget = groupAnchor(a.group).multiplyScalar(radii.get(a.id));
      forces.get(a.id)?.add(anchorTarget.sub(aPosition).multiplyScalar(0.0042));

      for (let bIndex = aIndex + 1; bIndex < nodes.length; bIndex += 1) {
        const b = nodes[bIndex];
        const bPosition = positions.get(b.id);
        const delta = bPosition.clone().sub(aPosition);
        let distance = delta.length();
        if (distance < 0.001) {
          delta.copy(seededVector(`${a.id}:${b.id}:repel`));
          distance = 0.001;
        }
        const minDistance = 34 + ((a.size ?? 8) + (b.size ?? 8)) * 1.05;
        if (distance >= minDistance) continue;
        const push = delta.multiplyScalar(((minDistance - distance) * 0.012) / distance);
        forces.get(a.id)?.sub(push);
        forces.get(b.id)?.add(push);
      }
    }

    nodes.forEach((node) => {
      const position = positions.get(node.id);
      const force = forces.get(node.id);
      if (!position || !force) return;
      force.clampLength(0, 5.5);
      position.add(force);
      constrainToRadius(position, radii.get(node.id));
    });
  }

  return new Map(
    nodes.map((node) => [node.id, positions.get(node.id).clone().multiply(scale)])
  );
}

function fibonacciDirections(count, seed) {
  if (count <= 0) return [];
  if (count === 1) return [seededVector(`${seed}:only`).normalize()];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const phase = (hashNumber(seed) / 0xffffffff) * Math.PI * 2;
  const tilt = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(phase * 0.19, phase * 0.11, phase * 0.07)
  );

  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * goldenAngle + phase;
    return new THREE.Vector3(
      Math.cos(theta) * radius,
      y,
      Math.sin(theta) * radius
    ).applyQuaternion(tilt).normalize();
  });
}

export function focusRadiusForCount(count) {
  return THREE.MathUtils.clamp(132 + Math.sqrt(Math.max(0, count)) * 15, 146, 198);
}

/**
 * Creates a temporary inspection layout: every first-degree neighbor sits on
 * the same sphere around the focus, with directions spread by a Fibonacci set.
 */
export function buildFocusLayout(nodes, links, basePositions, focusNodeId) {
  const target = clonePositionMap(basePositions);
  const center = basePositions.get(focusNodeId)?.clone();
  if (!center) return target;

  const neighborIds = [...new Set(
    links.flatMap((link) => {
      if (link.source === focusNodeId) return [link.target];
      if (link.target === focusNodeId) return [link.source];
      return [];
    })
  )].sort((a, b) => a.localeCompare(b));

  const focusRadius = focusRadiusForCount(neighborIds.length);
  const directions = fibonacciDirections(neighborIds.length, focusNodeId);
  target.set(focusNodeId, center);

  neighborIds.forEach((id, index) => {
    target.set(id, center.clone().add(directions[index].multiplyScalar(focusRadius)));
  });

  const protectedIds = new Set([focusNodeId, ...neighborIds]);
  const clearance = focusRadius * 1.36;
  nodes.forEach((node) => {
    if (protectedIds.has(node.id)) return;
    const base = target.get(node.id);
    if (!base) return;
    const offset = base.clone().sub(center);
    const distance = offset.length();
    if (distance >= clearance) return;
    if (distance < 0.001) offset.copy(seededVector(`${focusNodeId}:${node.id}:clearance`));
    const extra = (hashNumber(node.id) % 29) - 14;
    target.set(node.id, center.clone().add(offset.normalize().multiplyScalar(clearance + extra)));
  });

  return target;
}

export function neighborDistances(links, positions, focusNodeId) {
  const center = positions.get(focusNodeId);
  if (!center) return [];
  return [...new Set(
    links.flatMap((link) => {
      if (link.source === focusNodeId) return [link.target];
      if (link.target === focusNodeId) return [link.source];
      return [];
    })
  )].map((id) => center.distanceTo(positions.get(id)));
}

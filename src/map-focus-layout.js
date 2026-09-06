// A temporary, clockwise-preserving fan. Never mutate the overview coordinates.
const TAU = Math.PI * 2;
const wrap = (angle) => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;

export function compactMapRelation(text) {
  const words = Array.from(String(text));
  return words.length > 11 ? `${words.slice(0, 10).join("")}…` : words.join("");
}

export function outwardNameOffset(direction, width, height = 22) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  const x = direction.x / length, y = direction.y / length;
  let distance = 23 + (Math.abs(x) * width + Math.abs(y) * height) / 2;
  if (direction.halfGap) {
    const angle = Math.atan2(y, x), gap = Math.min(Math.PI / 2, direction.halfGap);
    const support = Math.max(...[angle - gap, angle + gap].map((boundary) =>
      Math.abs(Math.sin(boundary)) * width / 2 + Math.abs(Math.cos(boundary)) * height / 2));
    distance = Math.max(distance, (support + 8) / Math.sin(gap));
  }
  return { x: x * distance, y: y * distance };
}

export function openSpokeDirection(center, points) {
  const angles = points.map((point) => Math.atan2(point.y - center.y, point.x - center.x)).sort((a, b) => a - b);
  if (!angles.length) return { x: 1, y: 0 };
  if (angles.every((angle) => Math.abs(wrap(angle)) >= 0.6)) return { x: 1, y: 0 };
  let largest = -1, direction = 0;
  angles.forEach((angle, i) => {
    const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? TAU : 0);
    if (next - angle > largest) { largest = next - angle; direction = (angle + next) / 2; }
  });
  return { x: Math.cos(direction), y: Math.sin(direction), halfGap: largest / 2 };
}

export function buildMapFocusLayout({ positions, nodes, links, focusId }) {
  const result = new Map([...positions].map(([id, point]) => [id, { ...point }]));
  const names = new Map();
  const center = positions.get(focusId);
  if (!center) return { positions: result, names, ids: new Set() };
  const width = (id) => Math.min(144, Math.max(52, nodes.find((node) => node.id === id).cn.length * 13 + 12));
  const neighbors = [...new Set(links.filter((link) => link.source === focusId || link.target === focusId)
    .map((link) => link.source === focusId ? link.target : link.source))];
  const ordered = neighbors.map((id) => ({ id, angle: Math.atan2(positions.get(id).y - center.y, positions.get(id).x - center.x) }))
    .sort((a, b) => a.angle - b.angle || a.id.localeCompare(b.id));
  // Reserve a quiet wedge to the right for the central person's name.
  const gap = Math.PI * 0.42;
  const step = ordered.length > 1 ? (TAU - gap) / (ordered.length - 1) : 0;
  const angles = ordered.map((_, i) => ordered.length === 1 ? Math.PI : gap / 2 + step * i);
  let bestShift = 0, bestCost = Infinity;
  for (let shift = 0; shift < ordered.length; shift += 1) {
    const cost = angles.reduce((sum, angle, i) => sum + wrap(angle - ordered[(i + shift) % ordered.length].angle) ** 2, 0);
    if (cost < bestCost) { bestCost = cost; bestShift = shift; }
  }
  const radius = Math.max(250, ordered.length * 27);
  const ids = new Set([focusId, ...neighbors]);
  names.set(focusId, { x: 28 + width(focusId) / 2, y: 0 });
  angles.forEach((angle, i) => {
    const { id } = ordered[(i + bestShift) % ordered.length];
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    result.set(id, { x: center.x + direction.x * radius, y: center.y + direction.y * radius });
    names.set(id, outwardNameOffset(direction, width(id)));
  });
  return { positions: result, names, ids };
}

// Keep captions on their own curve, readable left-to-right, instead of hiding
// them when a global collision search cannot find an empty screen rectangle.
export function mapSpokeCaption(start, end, control, slot = 0, slots = 1) {
  const t = 0.62;
  const point = {
    x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
    y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y
  };
  const dx = 2 * ((1 - t) * (control.x - start.x) + t * (end.x - control.x));
  const dy = 2 * ((1 - t) * (control.y - start.y) + t * (end.y - control.y));
  let angle = Math.atan2(dy, dx);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  const lane = slots > 1 ? (slot - (slots - 1) / 2) * 54 : -16;
  return { x: point.x - Math.sin(angle) * lane, y: point.y + Math.cos(angle) * lane, angle: angle * 180 / Math.PI };
}

// Deterministic graph-distance layout. Components never attract each other:
// whitespace denotes absence of a recorded relationship, not a new category.
export function mapComponents(nodes, links) {
  const adjacency = new Map(nodes.map(({ id }) => [id, new Set()]));
  for (const { source, target } of links) {
    adjacency.get(source)?.add(target);
    adjacency.get(target)?.add(source);
  }
  const visited = new Set();
  const components = [];
  for (const { id } of nodes) {
    if (visited.has(id)) continue;
    const ids = [id];
    visited.add(id);
    for (let i = 0; i < ids.length; i++) {
      for (const neighbor of adjacency.get(ids[i])) {
        if (!visited.has(neighbor)) { visited.add(neighbor); ids.push(neighbor); }
      }
    }
    components.push(ids);
  }
  return { adjacency, components: components.sort((a, b) => b.length - a.length) };
}

function stressLayout(ids, adjacency) {
  const n = ids.length;
  const points = ids.map((id, i) => {
    const angle = i * Math.PI * 2 / n - Math.PI / 2;
    return { id, x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
  });
  if (n === 1) return [{ id: ids[0], x: 0, y: 0 }];
  const distances = ids.map((root) => {
    const distance = new Map([[root, 0]]);
    const queue = [root];
    for (let i = 0; i < queue.length; i++) {
      for (const id of adjacency.get(queue[i])) {
        if (!distance.has(id)) { distance.set(id, distance.get(queue[i]) + 1); queue.push(id); }
      }
    }
    return ids.map((id) => distance.get(id));
  });
  for (let step = 0; step < 240; step++) {
    const forces = points.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = points[j].x - points[i].x;
        let dy = points[j].y - points[i].y;
        if (Math.hypot(dx, dy) < 0.01) { dx = 0.1; dy = (i % 2 ? 1 : -1) * 0.1; }
        const distance = Math.hypot(dx, dy);
        const hops = distances[i][j];
        const target = 90 * Math.pow(hops, 0.85);
        const strength = (distance - target) * 0.12 / (hops * hops);
        forces[i].x += dx / distance * strength; forces[i].y += dy / distance * strength;
        forces[j].x -= dx / distance * strength; forces[j].y -= dy / distance * strength;
      }
    }
    points.forEach((p, i) => {
      const length = Math.max(1, Math.hypot(forces[i].x, forces[i].y) / 7);
      p.x += forces[i].x / length;
      p.y += forces[i].y / length;
    });
  }
  return points;
}

// Balanced recursive packing avoids skinny cells and keeps every mini-network.
function pack(items, box, gap, output = []) {
  if (!items.length) return output;
  if (items.length === 1) { output.push({ ids: items[0], ...box }); return output; }
  const weight = (item) => item.length + 1.5;
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let split = 1;
  let sum = weight(items[0]);
  while (split < items.length - 1 && Math.abs(sum + weight(items[split]) - total / 2) < Math.abs(sum - total / 2)) sum += weight(items[split++]);
  const horizontal = box.width / box.height > 1.1;
  const length = (horizontal ? box.width : box.height) - gap;
  const first = length * sum / total;
  pack(items.slice(0, split), { ...box, [horizontal ? "width" : "height"]: first }, gap, output);
  pack(items.slice(split), {
    ...box,
    [horizontal ? "x" : "y"]: box[horizontal ? "x" : "y"] + first + gap,
    [horizontal ? "width" : "height"]: length - first
  }, gap, output);
  return output;
}

const constrain = (value, min, max) => max < min ? (min + max) / 2 : Math.max(min, Math.min(max, value));

export function createMapLayout(nodes, links) {
  const { adjacency, components } = mapComponents(nodes, links);
  const shapes = new Map(components.map((ids) => [ids[0], stressLayout(ids, adjacency)]));
  return function layout({ x, y, width, height, footprints = new Map() }) {
    const gap = Math.min(36, Math.max(18, Math.min(width, height) * 0.045));
    const boxes = pack(components, { x, y, width, height }, gap);
    const positions = new Map();
    const footprint = (id) => footprints.get(id) ?? { left: -13, right: 13, top: -13, bottom: 13 };
    for (const box of boxes) {
      const original = shapes.get(box.ids[0]);
      const left = Math.max(...box.ids.map((id) => -footprint(id).left));
      const right = Math.max(...box.ids.map((id) => footprint(id).right));
      const top = Math.max(...box.ids.map((id) => -footprint(id).top));
      const bottom = Math.max(...box.ids.map((id) => footprint(id).bottom));
      const w = Math.max(1, box.width - left - right - 8);
      const h = Math.max(1, box.height - top - bottom - 8);
      // Rotate, never distort, the component to use its available area.
      let best = null;
      for (let i = 0; i < 24; i++) {
        const angle = i * Math.PI / 24;
        const points = original.map((p) => ({ id: p.id, x: p.x * Math.cos(angle) - p.y * Math.sin(angle), y: p.x * Math.sin(angle) + p.y * Math.cos(angle) }));
        const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
        const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
        const scale = Math.min(w / Math.max(1, maxX - minX), h / Math.max(1, maxY - minY), 1.65);
        if (!best || scale > best.scale) best = { points, minX, maxX, minY, maxY, scale };
      }
      const centerX = box.x + left + 4 + w / 2, centerY = box.y + top + 4 + h / 2;
      for (const p of best.points) positions.set(p.id, { x: centerX + (p.x - (best.minX + best.maxX) / 2) * best.scale, y: centerY + (p.y - (best.minY + best.maxY) / 2) * best.scale });
      const anchors = new Map(box.ids.map((id) => [id, { ...positions.get(id) }]));
      // Resolve text footprints only within this island, retaining open gutters.
      for (let step = 0; step < 100; step++) {
        for (let i = 0; i < box.ids.length; i++) {
          const a = positions.get(box.ids[i]), fa = footprint(box.ids[i]);
          for (let j = i + 1; j < box.ids.length; j++) {
            const b = positions.get(box.ids[j]), fb = footprint(box.ids[j]);
            const ox = Math.min(a.x + fa.right, b.x + fb.right) - Math.max(a.x + fa.left, b.x + fb.left) + 8;
            const oy = Math.min(a.y + fa.bottom, b.y + fb.bottom) - Math.max(a.y + fa.top, b.y + fb.top) + 8;
            if (ox > 0 && oy > 0) {
              const axis = ox < oy ? "x" : "y";
              const shift = Math.min(8, (axis === "x" ? ox : oy) * 0.52) * (b[axis] >= a[axis] ? 1 : -1);
              a[axis] -= shift; b[axis] += shift;
            }
          }
        }
        for (const id of box.ids) {
          const p = positions.get(id), anchor = anchors.get(id), f = footprint(id);
          const pull = step < 75 ? 0.008 : 0;
          p.x = constrain(p.x + (anchor.x - p.x) * pull, box.x - f.left + 3, box.x + box.width - f.right - 3);
          p.y = constrain(p.y + (anchor.y - p.y) * pull, box.y - f.top + 3, box.y + box.height - f.bottom - 3);
        }
      }
      // Wall-constrained relaxation can leave a few trapped overlaps. Relocate
      // low-degree labels first into the nearest free patch, retaining hubs.
      const clearance = (id, point, otherId, other, padding = 3) => {
        const a = footprint(id), b = footprint(otherId);
        return Math.min(point.x + a.right, other.x + b.right) - Math.max(point.x + a.left, other.x + b.left) + padding > 0 &&
          Math.min(point.y + a.bottom, other.y + b.bottom) - Math.max(point.y + a.top, other.y + b.top) + padding > 0;
      };
      for (const id of [...box.ids].sort((a, b) => adjacency.get(a).size - adjacency.get(b).size)) {
        const point = positions.get(id), f = footprint(id);
        const others = box.ids.filter((other) => other !== id);
        if (!others.some((other) => clearance(id, point, other, positions.get(other)))) continue;
        let bestPoint = null, cost = Infinity;
        for (let cy = box.y - f.top + 3; cy <= box.y + box.height - f.bottom - 3; cy += 7) {
          for (let cx = box.x - f.left + 3; cx <= box.x + box.width - f.right - 3; cx += 7) {
            const candidate = { x: cx, y: cy };
            const distance = Math.hypot(cx - point.x, cy - point.y);
            if (distance >= cost || others.some((other) => clearance(id, candidate, other, positions.get(other)))) continue;
            bestPoint = candidate; cost = distance;
          }
        }
        if (bestPoint) positions.set(id, bestPoint);
      }
      // Tiny screens may not fit every annotation, but markers must remain
      // separately selectable. Use free marker space as the final constraint.
      for (let pass = 0; pass < 2; pass++) for (const id of box.ids) {
        const point = positions.get(id), others = box.ids.filter((other) => other !== id);
        if (!others.some((other) => Math.hypot(point.x - positions.get(other).x, point.y - positions.get(other).y) < 22)) continue;
        let bestPoint = null, cost = Infinity;
        for (let cy = box.y + 13; cy <= box.y + box.height - 13; cy += 4) {
          for (let cx = box.x + 13; cx <= box.x + box.width - 13; cx += 4) {
            if (others.some((other) => Math.hypot(cx - positions.get(other).x, cy - positions.get(other).y) < 22)) continue;
            const candidate = { x: cx, y: cy };
            const score = Math.hypot(cx - point.x, cy - point.y) + 30 * others.filter((other) => clearance(id, candidate, other, positions.get(other))).length;
            if (score < cost) { cost = score; bestPoint = candidate; }
          }
        }
        if (bestPoint) positions.set(id, bestPoint);
      }
      const touching = box.ids.some((id, i) => box.ids.slice(i + 1).some((other) => {
        const a = positions.get(id), b = positions.get(other);
        return Math.hypot(a.x - b.x, a.y - b.y) < 19;
      }));
      if (touching) {
        // Last-resort compact packing for very small phone cells, using the
        // same 18px markers. Assign nearest slots; never drop a small network.
        const slots = [];
        for (let row = 0, cy = box.y + 9; cy <= box.y + box.height - 9; cy += Math.sqrt(3) * 10, row++) {
          for (let cx = box.x + 9 + (row % 2) * 10; cx <= box.x + box.width - 9; cx += 20) slots.push({ x: cx, y: cy });
        }
        if (slots.length >= box.ids.length) for (const id of [...box.ids].sort((a, b) => adjacency.get(b).size - adjacency.get(a).size)) {
          const point = positions.get(id);
          slots.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y));
          positions.set(id, slots.shift());
        }
      }
    }
    return { positions, islands: boxes };
  };
}

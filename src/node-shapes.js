const UNIT_STAR_VERTICES = (() => {
  const vertices = Array.from({ length: 10 }, (_, index) => {
    const angle = Math.PI / 2 + index * Math.PI / 5;
    const r = index % 2 ? 0.45 : 1;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
  const xs = vertices.map(([x]) => x);
  const ys = vertices.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Match circle bounds on both axes and keep selection scaling centered.
  return vertices.map(([x, y]) => [
    ((x - minX) / (maxX - minX)) * 2 - 1,
    ((y - minY) / (maxY - minY)) * 2 - 1
  ]);
})();

export function starVertices(radius) {
  return UNIT_STAR_VERTICES.map(([x, y]) => [x * radius, y * radius]);
}

export function starPoints(radius) {
  return starVertices(radius).map(([x, y]) => `${x},${-y}`).join(" ");
}

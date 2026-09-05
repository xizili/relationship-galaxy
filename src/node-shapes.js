export function starVertices(radius) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = Math.PI / 2 + index * Math.PI / 5;
    const r = index % 2 ? radius * 0.45 : radius;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
}

export function starPoints(radius) {
  return starVertices(radius).map(([x, y]) => `${x},${-y}`).join(" ");
}

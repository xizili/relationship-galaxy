const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
function envelope(t, start, rise, fall, end) {
  return smooth((t - start) / (rise - start)) * (1 - smooth((t - fall) / (end - fall)));
}

/** Link.source/target are already normalized to the XMind arrow direction. */
export function relationPulse(link, elapsedMs, durationMs = 3200) {
  const t = clamp(elapsedMs / durationMs);
  const directed = link.directed && !link.bidirectional;
  const gain = envelope(t, 0, 0.12, 0.84, 1);
  return {
    directed,
    progress: clamp((t - 0.12) / 0.66),
    gain,
    // Text is a second beat: between the two names, or after a simultaneous pair.
    labelGlow: directed ? envelope(t, 0.27, 0.39, 0.59, 0.68) : envelope(t, 0.3, 0.43, 0.82, 1),
    sourceGlow: directed ? envelope(t, 0, 0.12, 0.4, 0.66) : gain,
    targetGlow: directed ? envelope(t, 0.69, 0.8, 0.86, 1) : gain
  };
}

/** Find a stable screen-space label position without covering the two names. */
export function relationLabelBox(center, width, height) {
  return { left: center.x - width / 2, right: center.x + width / 2, top: center.y - height / 2, bottom: center.y + height / 2 };
}

export function placeRelationLabel({ center, width, height, obstacles = [], viewport, normal = { x: 0, y: -1 }, start = null, end = null, previous = null }) {
  const clear = ({ x, y }) => {
    const box = { left: center.x + x - width / 2, right: center.x + x + width / 2,
      top: center.y + y - height / 2, bottom: center.y + y + height / 2 };
    return box.left >= 10 && box.right <= viewport.width - 10 && box.top >= 10 && box.bottom <= viewport.height - 10
      && obstacles.every((o) => box.right + 10 <= o.left || box.left - 10 >= o.right || box.bottom + 10 <= o.top || box.top - 10 >= o.bottom);
  };
  const preferred = start && end ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : center;
  if (start && end) normal = { x: end.y - start.y, y: start.x - end.x };
  const length = Math.hypot(normal.x, normal.y) || 1;
  const nx = normal.x / length, ny = normal.y / length;
  const candidates = [];
  for (const distance of [0, 18, -18, 32, -32, 52, -52, 82, -82, 120, -120]) {
    for (const t of start && end ? [0.5, 0.4, 0.6, 0.3, 0.7] : [0.5]) {
      const anchor = start && end ? { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t } : center;
      candidates.push({ x: anchor.x - center.x + nx * distance, y: anchor.y - center.y + ny * distance });
    }
  }
  const score = (p) => Math.hypot(center.x + p.x - preferred.x, center.y + p.y - preferred.y);
  const best = candidates.filter(clear).sort((a, b) => score(a) - score(b))[0];
  if (!best) return previous && clear(previous) ? previous : null;
  // A tiny hysteresis stops jitter, but a newly clear midpoint wins immediately.
  if (score(best) > 1 && previous && clear(previous) && score(previous) <= score(best) + 8) return previous;
  return best;
}

/** One gentle pulse every 5–6 seconds, never repeating the same edge consecutively. */
export function createRelationTour({ random = Math.random, durationMs = 3200, firstDelayMs = 1800 } = {}) {
  let current = null;
  let nextAt = firstDelayMs;
  let lastIndex = null;
  return {
    reset(now = 0) { current = null; nextAt = now + firstDelayMs; },
    step(now, indices, enabled = true) {
      if (!enabled || !indices.length) {
        current = null;
        nextAt = now + firstDelayMs;
        return null;
      }
      if (current && !indices.includes(current.index)) {
        current = null;
        nextAt = now + firstDelayMs;
      }
      if (current && now - current.startedAt >= durationMs) {
        lastIndex = current.index;
        current = null;
        nextAt = now + 1800 + random() * 1000;
      }
      if (!current && now >= nextAt) {
        const candidates = indices.length > 1 ? indices.filter((index) => index !== lastIndex) : indices;
        const offset = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
        current = { index: candidates[offset], startedAt: now };
      }
      return current ? { index: current.index, elapsedMs: now - current.startedAt, durationMs } : null;
    }
  };
}

export const pulseVertexShader = `
  varying float vAlong;
  void main() {
    vAlong = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const pulseFragmentShader = `
  varying float vAlong;
  uniform vec3 uColor;
  uniform float uProgress;
  uniform float uGain;
  uniform float uDirected;
  void main() {
    float head = 1.0 - smoothstep(0.0, 0.075, abs(vAlong - uProgress));
    float behind = uProgress - vAlong;
    float tail = step(0.0, behind) * (1.0 - smoothstep(0.0, 0.34, behind));
    float beam = mix(1.0, max(head, tail * 0.8), uDirected);
    gl_FragColor = vec4(uColor * 1.65, beam * uGain * 0.95);
  }
`;

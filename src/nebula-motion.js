// A bounded spring in logarithmic distance: identical feel near and far away.
// Small substeps make trackpads and low-frame-rate devices behave consistently.
export function createZoomSpring() {
  let value = null;
  let target = 0;
  let velocity = 0;
  let lower = 0;
  let upper = 0;
  return {
    cancel() { value = null; velocity = 0; },
    impulse(distance, delta, minDistance, maxDistance) {
      lower = Math.log(minDistance); upper = Math.log(maxDistance);
      if (value === null) value = target = Math.log(distance);
      target = Math.max(lower, Math.min(upper, target + Math.max(-0.3, Math.min(0.3, delta * 0.001))));
    },
    step(seconds, immediate = false) {
      if (value === null) return null;
      if (immediate) { const result = Math.exp(target); value = null; velocity = 0; return result; }
      const time = Math.max(0, Math.min(0.05, seconds));
      const steps = Math.max(1, Math.ceil(time / (1 / 120)));
      const dt = time / steps;
      for (let i = 0; i < steps; i += 1) {
        velocity += (110 * (target - value) - 18 * velocity) * dt;
        value += velocity * dt;
        if (value < lower || value > upper) { value = Math.max(lower, Math.min(upper, value)); velocity = 0; }
      }
      const result = Math.exp(value);
      if (Math.abs(target - value) < 0.00003 && Math.abs(velocity) < 0.0001) {
        value = null; velocity = 0; return Math.exp(target);
      }
      return result;
    }
  };
}

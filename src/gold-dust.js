import * as THREE from "three";

export const goldDustVertexShader = `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uRadii;
  varying float vLight;
  varying float vWarmth;
  void main() {
    float angle = aSeed.x * 6.2831853 + uTime * (0.032 + aSeed.w * 0.018);
    float ribbon = step(0.72, aSeed.z);
    float radius = 0.90 + pow(aSeed.y, 2.4) * 0.38;
    float x = cos(angle) * radius;
    float z = sin(angle) * radius;
    float y = (aSeed.z - 0.5) * 0.16 + sin(angle * 2.0 + aSeed.w * 6.28) * 0.035;
    float tilt = mix(0.32, -0.48, ribbon);
    vec3 p = vec3(x * cos(tilt) - y * sin(tilt), x * sin(tilt) + y * cos(tilt), z) * uRadii;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((2.0 + aSeed.w * 2.0) * uPixelRatio * 900.0 / max(240.0, -mv.z), 1.0, 3.4 * uPixelRatio);
    vLight = (0.36 + 0.64 * aSeed.y) * (0.80 + 0.20 * sin(angle * 3.0 + aSeed.z * 20.0));
    vWarmth = aSeed.w;
  }
`;
export const goldDustFragmentShader = `
  uniform float uOpacity;
  varying float vLight;
  varying float vWarmth;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float grain = exp(-r * r * 4.0) * (1.0 - smoothstep(0.70, 1.0, r));
    vec3 gold = mix(vec3(0.68, 0.49, 0.23), vec3(1.0, 0.86, 0.60), vWarmth);
    gl_FragColor = vec4(gold, grain * vLight * uOpacity);
  }
`;

// Abstract, procedural stardust: no image downloads, external textures or
// particles added to the relationship data. A single GPU draw call.
export function createGoldDust({ center, radii, compact = false, pixelRatio = 1 }) {
  const count = compact ? 1200 : 2600;
  const seeds = new Float32Array(count * 4);
  let seed = 7097;
  for (let i = 0; i < seeds.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    seeds[i] = seed / 4294967296;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.34 },
      uPixelRatio: { value: Math.min(2, pixelRatio) }, uRadii: { value: radii.clone() } },
    vertexShader: goldDustVertexShader, fragmentShader: goldDustFragmentShader,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true
  });
  const points = new THREE.Points(geometry, material);
  points.name = "gold-dust";
  points.position.copy(center);
  points.frustumCulled = false; // Position is calculated in the vertex shader.
  points.raycast = () => {}; // Atmosphere must never intercept graph selection.
  return {
    points,
    update(seconds, { active = true, focused = false, reducedMotion = false, hidden = false } = {}) {
      points.visible = active;
      if (!active || hidden) return;
      const dt = Math.max(0, Math.min(0.05, seconds));
      if (!reducedMotion) material.uniforms.uTime.value += dt;
      const target = focused ? 0.09 : 0.34;
      material.uniforms.uOpacity.value += (target - material.uniforms.uOpacity.value) * (1 - Math.exp(-dt * 5));
    },
    dispose() { geometry.dispose(); material.dispose(); }
  };
}

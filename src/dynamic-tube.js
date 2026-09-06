import * as THREE from "three";

// Fixed topology: only the vertex buffers change as a quadratic relation moves.
// The light pulse shares this geometry, including its arc-length UV coordinates.
export function createDynamicTube(curve, segments, radius, sides) {
  const geometry = new THREE.BufferGeometry();
  const count = (segments + 1) * (sides + 1);
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const uv = new Float32Array(count * 2), index = new Uint16Array(segments * sides * 6);
  const cos = new Float64Array(sides + 1), sin = new Float64Array(sides + 1);
  for (let j = 0; j <= sides; j += 1) { cos[j] = Math.cos(j / sides * Math.PI * 2); sin[j] = Math.sin(j / sides * Math.PI * 2); }
  let offset = 0;
  for (let i = 0; i <= segments; i += 1) {
    for (let j = 0; j <= sides; j += 1) {
      const vertex = i * (sides + 1) + j;
      uv[vertex * 2] = i / segments; uv[vertex * 2 + 1] = j / sides;
      if (i < segments && j < sides) {
        const a = vertex, b = vertex + sides + 1;
        index.set([a, a + 1, b, b, a + 1, b + 1], offset); offset += 6;
      }
    }
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.boundingBox = new THREE.Box3();
  geometry.boundingSphere = new THREE.Sphere();
  geometry.userData.tube = { segments, sides, radius, cos, sin, lengths: new Float64Array(201) };
  updateDynamicTube(geometry, curve);
  return geometry;
}

export function updateDynamicTube(geometry, curve) {
  const { segments, sides, radius, cos, sin, lengths } = geometry.userData.tube;
  const p = geometry.attributes.position.array, n = geometry.attributes.normal.array;
  const a = curve.v0, b = curve.v1, c = curve.v2;
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  let chordX = c.x - a.x, chordY = c.y - a.y, chordZ = c.z - a.z;
  if (Math.hypot(chordX, chordY, chordZ) < 1e-12) { chordX = 1; chordY = 0; chordZ = 0; }
  let bx = aby * chordZ - abz * chordY, by = abz * chordX - abx * chordZ, bz = abx * chordY - aby * chordX;
  let length = Math.hypot(bx, by, bz);
  if (length < 1e-10) {
    // Straight or coincident endpoints still have a finite, stable frame.
    if (Math.abs(chordY) < Math.abs(chordX) + Math.abs(chordZ)) { bx = -chordZ; by = 0; bz = chordX; }
    else { bx = 0; by = chordZ; bz = -chordY; }
    length = Math.hypot(bx, by, bz);
  }
  bx /= length; by /= length; bz /= length;
  let lastX = a.x, lastY = a.y, lastZ = a.z;
  lengths[0] = 0;
  // Same 200-step arc-length resolution as Three's default getPointAt().
  for (let i = 1; i < lengths.length; i += 1) {
    const t = i / (lengths.length - 1), s = 1 - t;
    const x = s * s * a.x + 2 * s * t * b.x + t * t * c.x;
    const y = s * s * a.y + 2 * s * t * b.y + t * t * c.y;
    const z = s * s * a.z + 2 * s * t * b.z + t * t * c.z;
    lengths[i] = lengths[i - 1] + Math.hypot(x - lastX, y - lastY, z - lastZ);
    lastX = x; lastY = y; lastZ = z;
  }
  let cursor = 1;
  for (let i = 0; i <= segments; i += 1) {
    const target = lengths.at(-1) * i / segments;
    while (cursor < lengths.length - 1 && lengths[cursor] < target) cursor += 1;
    const span = lengths[cursor] - lengths[cursor - 1];
    const t = span > 0 ? (cursor - 1 + (target - lengths[cursor - 1]) / span) / (lengths.length - 1) : i / segments;
    const s = 1 - t;
    const x = s * s * a.x + 2 * s * t * b.x + t * t * c.x;
    const y = s * s * a.y + 2 * s * t * b.y + t * t * c.y;
    const z = s * s * a.z + 2 * s * t * b.z + t * t * c.z;
    let tx = s * abx + t * (c.x - b.x), ty = s * aby + t * (c.y - b.y), tz = s * abz + t * (c.z - b.z);
    length = Math.hypot(tx, ty, tz);
    if (length < 1e-12) { tx = chordX; ty = chordY; tz = chordZ; length = Math.hypot(tx, ty, tz); }
    tx /= length; ty /= length; tz /= length;
    const nx = by * tz - bz * ty, ny = bz * tx - bx * tz, nz = bx * ty - by * tx;
    for (let j = 0; j <= sides; j += 1) {
      const k = (i * (sides + 1) + j) * 3;
      const vx = nx * cos[j] + bx * sin[j], vy = ny * cos[j] + by * sin[j], vz = nz * cos[j] + bz * sin[j];
      p[k] = x + radius * vx; p[k + 1] = y + radius * vy; p[k + 2] = z + radius * vz;
      n[k] = vx; n[k + 1] = vy; n[k + 2] = vz;
    }
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.normal.needsUpdate = true;
  const box = geometry.boundingBox;
  box.min.set(Math.min(a.x, b.x, c.x) - radius, Math.min(a.y, b.y, c.y) - radius, Math.min(a.z, b.z, c.z) - radius);
  box.max.set(Math.max(a.x, b.x, c.x) + radius, Math.max(a.y, b.y, c.y) + radius, Math.max(a.z, b.z, c.z) + radius);
  box.getCenter(geometry.boundingSphere.center);
  geometry.boundingSphere.radius = Math.max(a.distanceTo(geometry.boundingSphere.center), b.distanceTo(geometry.boundingSphere.center), c.distanceTo(geometry.boundingSphere.center)) + radius;
}

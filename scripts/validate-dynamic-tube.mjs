import assert from "node:assert/strict";
import * as THREE from "three";
import { createDynamicTube, updateDynamicTube } from "../src/dynamic-tube.js";

const curve = (i = 0) => new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(-70 + i, -20, 3), new THREE.Vector3(20, 80 + i, -40), new THREE.Vector3(200 + i, 50, 25)
);
const geometry = createDynamicTube(curve(), 42, 1.25, 8);
const stable = { position: geometry.attributes.position, normal: geometry.attributes.normal, uv: geometry.attributes.uv, index: geometry.index, box: geometry.boundingBox, sphere: geometry.boundingSphere };
const arrays = [stable.position.array, stable.normal.array, stable.uv.array, stable.index.array];
let disposals = 0;
geometry.addEventListener("dispose", () => { disposals += 1; });
function inspect(g, path) {
  const { segments, sides, radius } = g.userData.tube;
  const position = g.attributes.position, normal = g.attributes.normal;
  const vertex = new THREE.Vector3(), center = new THREE.Vector3(), norm = new THREE.Vector3();
  for (let i = 0; i <= segments; i += 1) {
    center.set(0, 0, 0);
    const expected = path.getPointAt(i / segments), t = path.getUtoTmapping(i / segments);
    const tangent = path.v1.clone().sub(path.v0).multiplyScalar(1 - t).addScaledVector(path.v2.clone().sub(path.v1), t).normalize();
    for (let j = 0; j < sides; j += 1) {
      const index = i * (sides + 1) + j;
      vertex.fromBufferAttribute(position, index); norm.fromBufferAttribute(normal, index);
      assert.ok([vertex.x, vertex.y, vertex.z, norm.x, norm.y, norm.z].every(Number.isFinite));
      assert.ok(Math.abs(norm.length() - 1) < 1e-6);
      assert.ok(Math.abs(norm.dot(tangent)) < 1e-6);
      assert.ok(Math.abs(vertex.distanceTo(expected) - radius) < 3e-5);
      assert.ok(g.boundingBox.clone().expandByScalar(1e-4).containsPoint(vertex));
      assert.ok(vertex.distanceTo(g.boundingSphere.center) <= g.boundingSphere.radius + 1e-4);
      center.add(vertex);
    }
    assert.ok(center.divideScalar(sides).distanceTo(expected) < 3e-5, "环中心保持等弧长采样，巡游速度不变");
    assert.equal(g.attributes.uv.getX(i * (sides + 1)), Math.fround(i / segments));
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < g.index.count; i += 3) {
    a.fromBufferAttribute(position, g.index.getX(i)); b.fromBufferAttribute(position, g.index.getX(i + 1)); c.fromBufferAttribute(position, g.index.getX(i + 2));
    norm.fromBufferAttribute(normal, g.index.getX(i));
    assert.ok(b.sub(a).cross(c.sub(a)).dot(norm) > 0, "三角形朝外，单面材质和点击检测一致");
  }
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  vertex.fromBufferAttribute(position, 21 * (sides + 1)); norm.fromBufferAttribute(normal, 21 * (sides + 1));
  const ray = new THREE.Raycaster(vertex.clone().addScaledVector(norm, 40), norm.clone().negate());
  assert.ok(ray.intersectObject(mesh).length, "移动后的线条仍可点击");
  mesh.material.dispose();
}
inspect(geometry, curve());
for (let frame = 0; frame < 130; frame += 1) updateDynamicTube(geometry, curve(frame / 5));
inspect(geometry, curve(129 / 5));
assert.equal(geometry.attributes.position, stable.position); assert.equal(geometry.attributes.normal, stable.normal);
assert.equal(geometry.attributes.uv, stable.uv); assert.equal(geometry.index, stable.index);
assert.equal(geometry.boundingBox, stable.box); assert.equal(geometry.boundingSphere, stable.sphere);
for (const [index, attribute] of [geometry.attributes.position, geometry.attributes.normal, geometry.attributes.uv, geometry.index].entries()) assert.equal(attribute.array, arrays[index]);
assert.equal(disposals, 0);
const straight = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(50, 0, 0), new THREE.Vector3(100, 0, 0));
updateDynamicTube(geometry, straight); inspect(geometry, straight);
updateDynamicTube(geometry, new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()));
assert.ok([...geometry.attributes.position.array, ...geometry.attributes.normal.array].every(Number.isFinite));
console.log("动态连线测试通过：130 帧复用同一几何与缓冲区；等弧长、法线、朝向、边界、点击和退化曲线均正确。");

if (process.argv.includes("--benchmark")) {
  const paths = Array.from({ length: 85 }, (_, i) => curve(i));
  const retained = paths.map((path) => [createDynamicTube(path, 42, 1.25, 8), createDynamicTube(path, 32, 4.6, 6)]);
  const old = [], current = [];
  for (let frame = 0; frame < 40; frame += 1) {
    for (const path of paths) { path.v1.z += .2; path.updateArcLengths(); }
    let start = performance.now();
    for (const path of paths) { new THREE.TubeGeometry(path, 42, 1.25, 8).dispose(); new THREE.TubeGeometry(path, 32, 4.6, 6).dispose(); }
    if (frame >= 10) old.push(performance.now() - start);
    start = performance.now();
    for (const [index, path] of paths.entries()) for (const g of retained[index]) updateDynamicTube(g, path);
    if (frame >= 10) current.push(performance.now() - start);
  }
  const stats = (values) => { values.sort((a, b) => a - b); return { median: +values[Math.floor(values.length / 2)].toFixed(2), p95: +values[Math.floor(values.length * .95)].toFixed(2) }; };
  console.log(JSON.stringify({ unit: "ms / 85 条连线与光鞘更新（不含屏幕渲染）", old: stats(old), current: stats(current) }));
}

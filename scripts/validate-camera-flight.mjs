// Real camera + OrbitControls numerical tests, without browser/screen access.
import assert from "node:assert/strict";
import { PerspectiveCamera, Spherical, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCameraFlight } from "../src/camera-flight.js";

function setup(rotate = true) {
  const camera = new PerspectiveCamera(48, 16 / 9, .1, 8000);
  camera.position.set(150, 90, 2100);
  const controls = new OrbitControls(camera, null);
  controls.enableDamping = true; controls.dampingFactor = .035;
  controls.minDistance = 140; controls.maxDistance = 5200;
  controls.autoRotate = rotate; controls.autoRotateSpeed = .55;
  return { camera, controls, flight: createCameraFlight(camera, controls) };
}
const goal = new Vector3(-220, 180, 750), target = new Vector3(-140, 0, 0);
const results = [];
for (const fps of [20, 30, 60, 120, 144]) {
  for (const rotate of [false, true]) {
    const { camera, controls, flight } = setup(rotate);
    for (let i = 0; i < fps * 3; i += 1) controls.update(1 / fps);
    const positionBefore = camera.position.clone(), targetBefore = controls.target.clone();
    flight.start(goal, target);
    assert.ok(camera.position.equals(positionBefore) && controls.target.equals(targetBefore), "启动不跳动");
    const distances = [], radii = [], thetaSteps = [];
    let finish = -1;
    let previous = camera.position.clone(), previousRadius = camera.position.distanceTo(controls.target);
    let previousAngle = new Spherical().setFromVector3(camera.position.clone().sub(controls.target)).theta;
    for (let frame = 0; frame < fps * 2; frame += 1) {
      flight.update(1 / fps);
      controls.update(1 / fps);
      const angle = new Spherical().setFromVector3(camera.position.clone().sub(controls.target)).theta;
      const angleStep = Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
      distances.push(camera.position.distanceTo(previous));
      const radius = camera.position.distanceTo(controls.target);
      radii.push(Math.abs(radius - previousRadius)); thetaSteps.push(angleStep);
      assert.ok([camera.position.x, camera.position.y, camera.position.z, radius].every(Number.isFinite));
      assert.ok(radius >= controls.minDistance - 1e-6 && radius <= controls.maxDistance + 1e-6);
      if (!flight.active && finish < 0) finish = frame;
      assert.equal(controls.autoRotate, rotate, "过渡不能改写用户的自动旋转开关");
      previous.copy(camera.position); previousRadius = radius; previousAngle = angle;
    }
    assert.ok(finish >= 0 && Math.abs((finish + 1) / fps - 1.35) <= 1 / fps + 1e-8);
    assert.ok(controls.target.distanceTo(target) < 1e-8);
    assert.ok(Math.abs(camera.position.distanceTo(controls.target) - goal.distanceTo(target)) < 1e-7);
    assert.ok(radii[finish] <= radii[finish - 1] + 1e-7, "径向移动到最后一帧仍应减速");
    assert.ok(distances[finish] < Math.max(.01, distances[finish - 1] * 1.1), "不得在结尾补一大段距离");
    assert.ok(radii[finish] / goal.distanceTo(target) < .001, "最后一步缩放小于目标距离的千分之一");
    if (rotate) {
      const steady = thetaSteps[finish + 4];
      assert.ok(Math.abs(thetaSteps[finish] - steady) < Math.abs(steady) * .12 + 1e-7, "结束时角速度应平滑接回旋转");
    }
    results.push({ fps, rotate, lastFrame: +distances[finish].toFixed(4), after: +distances[finish + 1].toFixed(4) });
  }
}

// Retargeting or user input must continue from the current visible position.
const { camera, controls, flight } = setup();
flight.start(goal, target);
for (let i = 0; i < 22; i += 1) { flight.update(1 / 60); controls.update(1 / 60); }
const beforeRetarget = camera.position.clone();
const overviewTarget = new Vector3(100, 20, -60), overviewCamera = new Vector3(300, 900, 4400);
flight.start(overviewCamera, overviewTarget);
assert.ok(camera.position.equals(beforeRetarget));
for (let i = 0; i < 110; i += 1) { flight.update(1 / 60); controls.update(1 / 60); }
assert.ok(!flight.active && controls.target.distanceTo(overviewTarget) < 1e-8);
flight.start(goal, target); flight.update(.4);
assert.ok(flight.active, "长时间掉帧或切回页面不应直接完成过渡");
flight.cancel();
const cancelledPosition = camera.position.clone();
flight.update(1 / 60);
assert.ok(camera.position.equals(cancelledPosition));
flight.start(goal, target); flight.update(0, true);
assert.equal(flight.active, false);
assert.ok(controls.target.distanceTo(target) < 1e-8, "减少动态效果偏好可即时到达");

const toggled = setup(true);
toggled.flight.start(goal, target);
for (let i = 0; i < 110; i += 1) {
  if (i === 20) toggled.controls.autoRotate = false;
  if (i === 45) toggled.controls.autoRotate = true;
  toggled.flight.update(1 / 60); toggled.controls.update(1 / 60);
  assert.equal(toggled.controls.autoRotate, !(i >= 20 && i < 45));
}
assert.ok(!toggled.flight.active && toggled.controls.target.distanceTo(target) < 1e-8);

// The camera crosses the -π/+π seam by the shortest route, not a full turn.
const seam = setup(false);
seam.camera.position.setFromSpherical(new Spherical(900, 1.3, Math.PI - .04));
seam.controls.update(0);
const seamGoal = new Vector3().setFromSpherical(new Spherical(900, 1.3, -Math.PI + .04));
seam.flight.start(seamGoal, new Vector3());
for (let i = 0; i < 100; i += 1) {
  seam.flight.update(1 / 60); seam.controls.update(1 / 60);
  assert.ok(seam.camera.position.z < -800, "不绕远路翻转镜头");
}
console.log("相机收尾测试通过：20/30/60/120/144fps、旋转衔接、连续聚焦、全览返回、手动取消、长帧与减少动态效果。");
if (process.argv.includes("--metrics")) console.log(JSON.stringify(results));

import { MathUtils, Quaternion, Spherical, Vector3 } from "three";

const shortestAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const smoothArrival = (t) => t * t * t * (10 + t * (-15 + t * 6));

// A finite, zero-velocity/zero-acceleration arrival in orbit coordinates.
// OrbitControls still runs once per frame, including throughout the flight.
export function createCameraFlight(camera, controls, duration = 1.35) {
  const fromTarget = new Vector3(), toTarget = new Vector3(), offset = new Vector3();
  const from = new Spherical(), to = new Spherical(), current = new Spherical();
  const toY = new Quaternion(), fromY = new Quaternion();
  const yAxis = new Vector3(0, 1, 0);
  let active = false, elapsed = 0, thetaDelta = 0;
  let orbitTheta = 0, orbitPhi = 0, lastTheta = 0, lastPhi = 0;
  let logFromRadius = 0, logToRadius = 0;

  function readOrbit(result) {
    return result.setFromVector3(offset.copy(camera.position).sub(controls.target).applyQuaternion(toY));
  }
  return {
    get active() { return active; },
    cancel() { active = false; },
    start(position, target) {
      toY.setFromUnitVectors(camera.up, yAxis); fromY.copy(toY).invert();
      fromTarget.copy(controls.target); toTarget.copy(target);
      readOrbit(from);
      to.setFromVector3(offset.copy(position).sub(target).applyQuaternion(toY));
      thetaDelta = shortestAngle(to.theta - from.theta);
      logFromRadius = Math.log(Math.max(1e-6, from.radius));
      logToRadius = Math.log(MathUtils.clamp(to.radius, controls.minDistance, controls.maxDistance));
      lastTheta = from.theta; lastPhi = from.phi;
      orbitTheta = 0; orbitPhi = 0; elapsed = 0; active = true;
    },
    update(seconds, immediate = false) {
      if (!active) return;
      readOrbit(current);
      // Carry the rotation applied since our last frame into both endpoints.
      // A fixed world-space destination would fight autorotation then release abruptly.
      orbitTheta += shortestAngle(current.theta - lastTheta);
      orbitPhi += current.phi - lastPhi;
      elapsed = Math.min(duration, elapsed + Math.max(0, Math.min(.05, seconds)));
      const t = immediate ? 1 : Math.min(1, elapsed / duration);
      const eased = smoothArrival(t);
      current.set(
        Math.exp(MathUtils.lerp(logFromRadius, logToRadius, eased)),
        MathUtils.clamp(MathUtils.lerp(from.phi, to.phi, eased) + orbitPhi, controls.minPolarAngle ?? 0, controls.maxPolarAngle ?? Math.PI),
        from.theta + thetaDelta * eased + orbitTheta
      ).makeSafe();
      controls.target.lerpVectors(fromTarget, toTarget, eased);
      camera.position.copy(offset.setFromSpherical(current).applyQuaternion(fromY)).add(controls.target);
      lastTheta = current.theta; lastPhi = current.phi;
      if (t === 1) active = false;
    }
  };
}

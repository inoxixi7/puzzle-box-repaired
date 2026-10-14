import * as THREE from "three";

export class BoxRotationController {
  private canvas: HTMLCanvasElement;
  private object: THREE.Object3D;

  private enabled = true;
  private dragging = false;
  private pointerId: number | null = null;

  private lastX = 0;
  private lastY = 0;

  private yawVelocity = 0;
  private pitchVelocity = 0;

  private readonly sensitivity = 0.0062;
  private readonly damping = 0.92;
  private readonly maxVelocity = 0.085;

  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly screenRight = new THREE.Vector3(1, 0, 0);

  private readonly yawQuaternion = new THREE.Quaternion();
  private readonly pitchQuaternion = new THREE.Quaternion();

  constructor(canvas: HTMLCanvasElement, object: THREE.Object3D) {
    this.canvas = canvas;
    this.object = object;

    this.canvas.style.touchAction = "none";
    this.canvas.style.cursor = "grab";

    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener(
      "lostpointercapture",
      this.handlePointerCaptureLost,
    );
  }

  public get isDragging() {
    return this.dragging;
  }

  public get isEnabled() {
    return this.enabled;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.enabled || this.dragging) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    this.dragging = true;
    this.pointerId = event.pointerId;

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this.yawVelocity = 0;
    this.pitchVelocity = 0;

    this.canvas.style.cursor = "grabbing";
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (
      !this.enabled ||
      !this.dragging ||
      event.pointerId !== this.pointerId
    ) {
      return;
    }

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    const yaw = this.clampVelocity(dx * this.sensitivity);
    const pitch = this.clampVelocity(dy * this.sensitivity);

    this.applyRotation(yaw, pitch);

    this.yawVelocity =
      this.yawVelocity * 0.48 +
      yaw * 0.52;

    this.pitchVelocity =
      this.pitchVelocity * 0.48 +
      pitch * 0.52;
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (
      !this.dragging ||
      event.pointerId !== this.pointerId
    ) {
      return;
    }

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.finishDrag();
  };

  private handlePointerCaptureLost = () => {
    if (!this.dragging) return;
    this.finishDrag();
  };

  private finishDrag() {
    this.dragging = false;
    this.pointerId = null;
    this.canvas.style.cursor = this.enabled ? "grab" : "default";
  }

  private clampVelocity(value: number) {
    return THREE.MathUtils.clamp(
      value,
      -this.maxVelocity,
      this.maxVelocity,
    );
  }

  private applyRotation(yaw: number, pitch: number) {
    this.yawQuaternion.setFromAxisAngle(
      this.worldUp,
      yaw,
    );

    this.pitchQuaternion.setFromAxisAngle(
      this.screenRight,
      pitch,
    );

    this.object.quaternion.premultiply(
      this.yawQuaternion,
    );

    this.object.quaternion.premultiply(
      this.pitchQuaternion,
    );

    this.object.quaternion.normalize();
  }

  public update(deltaSeconds: number) {
    if (!this.enabled || this.dragging) return;

    const speed =
      Math.abs(this.yawVelocity) +
      Math.abs(this.pitchVelocity);

    if (speed < 0.00002) {
      this.yawVelocity = 0;
      this.pitchVelocity = 0;
      return;
    }

    this.applyRotation(
      this.yawVelocity,
      this.pitchVelocity,
    );

    const damping = Math.pow(
      this.damping,
      deltaSeconds * 60,
    );

    this.yawVelocity *= damping;
    this.pitchVelocity *= damping;
  }

  public stopInertia() {
    this.yawVelocity = 0;
    this.pitchVelocity = 0;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.dragging = false;
      this.pointerId = null;
      this.stopInertia();
    }

    this.canvas.style.cursor = enabled ? "grab" : "default";
  }

  public dispose() {
    this.canvas.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );

    this.canvas.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );

    this.canvas.removeEventListener(
      "pointerup",
      this.handlePointerUp,
    );

    this.canvas.removeEventListener(
      "pointercancel",
      this.handlePointerUp,
    );

    this.canvas.removeEventListener(
      "lostpointercapture",
      this.handlePointerCaptureLost,
    );
  }
}

import * as THREE from "three";
import { gsap } from "gsap";

type TopPuzzleTwoOptions = {
  anchor: THREE.Group;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  onSolved?: () => void;
  onGearPickedUp?: () => void;
};

export class TopPuzzleTwo {
  private anchor: THREE.Group;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;

  private root = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private ringGroups: THREE.Group[] = [];
  private ringHitboxes: THREE.Mesh[] = [];

  private gearGroup = new THREE.Group();
  private gearHitbox: THREE.Mesh | null = null;

  private enabled = false;
  private solved = false;
  private gearAvailable = false;
  private gearPickedUp = false;

  private activeRing: number | null = null;
  private activePointerId: number | null = null;
  private startPointerAngle = 0;
  private startRotation = 0;

  private onSolved?: () => void;
  private onGearPickedUp?: () => void;

  private readonly step = Math.PI / 4;
  private readonly initialRotations = [
    Math.PI / 4,
    -Math.PI / 2,
    (3 * Math.PI) / 4,
  ];

  constructor(options: TopPuzzleTwoOptions) {
    this.anchor = options.anchor;
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.onSolved = options.onSolved;
    this.onGearPickedUp = options.onGearPickedUp;

    this.root.name = "puzzle-2-top";
    this.anchor.add(this.root);

    this.createMechanism();
    this.createReward();

    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
  }

  private createMechanism() {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.72, 1.72, 0.12, 64),
      new THREE.MeshStandardMaterial({
        color: 0x2f2118,
        roughness: 0.74,
        metalness: 0.12,
      }),
    );

    plate.rotation.x = Math.PI / 2;
    plate.position.z = 0.08;
    plate.castShadow = true;
    this.root.add(plate);

    const brass = new THREE.MeshStandardMaterial({
      color: 0xb88c4d,
      roughness: 0.33,
      metalness: 0.72,
    });

    const darkBrass = new THREE.MeshStandardMaterial({
      color: 0x6b4c29,
      roughness: 0.42,
      metalness: 0.62,
    });

    const radii = [1.28, 0.89, 0.52];

    radii.forEach((radius, index) => {
      const group = new THREE.Group();
      group.rotation.z = this.initialRotations[index];

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(
          radius - 0.095,
          radius + 0.095,
          72,
        ),
        index === 1 ? darkBrass : brass,
      );

      ring.position.z = 0.16;
      group.add(ring);

      // 每一圈只有一个刻痕，三个刻痕对齐上方固定标记即为正确。
      const notch = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.26, 0.055),
        new THREE.MeshStandardMaterial({
          color: 0xe0b66d,
          roughness: 0.26,
          metalness: 0.78,
        }),
      );

      notch.position.set(0, radius, 0.205);
      group.add(notch);

      const hitbox = new THREE.Mesh(
        new THREE.RingGeometry(
          radius - 0.17,
          radius + 0.17,
          72,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );

      hitbox.position.z = 0.24;
      hitbox.userData.ringIndex = index;

      group.add(hitbox);

      this.ringGroups.push(group);
      this.ringHitboxes.push(hitbox);
      this.root.add(group);
    });

    const fixedMark = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.34, 0.07),
      brass,
    );

    fixedMark.position.set(0, 1.58, 0.22);
    this.root.add(fixedMark);

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.29, 0.12, 48),
      brass,
    );

    centerCap.rotation.x = Math.PI / 2;
    centerCap.position.z = 0.18;
    centerCap.name = "top-center-cap";

    this.root.add(centerCap);
  }

  private createReward() {
    this.gearGroup.visible = false;
    this.gearGroup.position.set(0, 0, 0.24);
    this.gearGroup.scale.setScalar(0.8);

    const material = new THREE.MeshStandardMaterial({
      color: 0xc39551,
      roughness: 0.3,
      metalness: 0.78,
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.065, 12, 40),
      material,
    );

    this.gearGroup.add(ring);

    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.07),
        material,
      );

      const angle = (i / 8) * Math.PI * 2;
      tooth.position.set(
        Math.sin(angle) * 0.34,
        Math.cos(angle) * 0.34,
        0,
      );
      tooth.rotation.z = -angle;
      this.gearGroup.add(tooth);
    }

    const hub = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.115, 28),
      material,
    );

    hub.position.z = 0.01;
    this.gearGroup.add(hub);

    this.gearHitbox = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 40),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    this.gearHitbox.position.z = 0.08;
    this.gearGroup.add(this.gearHitbox);

    this.root.add(this.gearGroup);
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.enabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (
      this.gearAvailable &&
      !this.gearPickedUp &&
      this.gearHitbox &&
      this.pickObject(this.gearHitbox, event.clientX, event.clientY)
    ) {
      this.pickUpGear();
      return;
    }

    if (this.solved) return;

    const ringIndex = this.pickRing(event.clientX, event.clientY);
    if (ringIndex === null) return;

    this.activeRing = ringIndex;
    this.activePointerId = event.pointerId;

    const center = this.getRootScreenCenter();

    this.startPointerAngle = Math.atan2(
      event.clientY - center.y,
      event.clientX - center.x,
    );

    this.startRotation = this.ringGroups[ringIndex].rotation.z;

    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.style.cursor = "grabbing";
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.enabled) return;

    if (
      this.activeRing !== null &&
      event.pointerId === this.activePointerId
    ) {
      const center = this.getRootScreenCenter();
      const angle = Math.atan2(
        event.clientY - center.y,
        event.clientX - center.x,
      );

      // Screen Y grows downward, while Three.js positive Z rotation is
      // counter-clockwise on screen. Subtract the pointer delta so the ring
      // follows the actual mouse/finger movement.
      this.ringGroups[this.activeRing].rotation.z =
        this.startRotation - (angle - this.startPointerAngle);

      return;
    }

    if (
      this.gearAvailable &&
      !this.gearPickedUp &&
      this.gearHitbox &&
      this.pickObject(this.gearHitbox, event.clientX, event.clientY)
    ) {
      this.canvas.style.cursor = "pointer";
      return;
    }

    this.canvas.style.cursor =
      !this.solved && this.pickRing(event.clientX, event.clientY) !== null
        ? "grab"
        : "default";
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (
      this.activeRing === null ||
      event.pointerId !== this.activePointerId
    ) {
      return;
    }

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    const group = this.ringGroups[this.activeRing];
    const snapped =
      Math.round(group.rotation.z / this.step) * this.step;

    gsap.to(group.rotation, {
      z: snapped,
      duration: 0.18,
      ease: "back.out(1.5)",
      onComplete: () => this.checkSolution(),
    });

    this.activeRing = null;
    this.activePointerId = null;
    this.canvas.style.cursor = "grab";
  };

  private checkSolution() {
    const correct = this.ringGroups.every((group) => {
      const angle = Math.atan2(
        Math.sin(group.rotation.z),
        Math.cos(group.rotation.z),
      );

      return Math.abs(angle) < Math.PI / 18;
    });

    if (!correct) return;

    this.solve();
  }

  private solve() {
    if (this.solved) return;

    this.solved = true;
    this.activeRing = null;

    const cap = this.root.getObjectByName("top-center-cap");

    const timeline = gsap.timeline();

    if (cap) {
      timeline
        .to(cap.position, {
          z: 0.5,
          duration: 0.22,
          ease: "back.out(1.6)",
        })
        .to(
          cap.scale,
          {
            x: 0.05,
            y: 0.05,
            z: 0.05,
            duration: 0.18,
            ease: "power2.in",
          },
          "-=0.05",
        )
        .call(() => {
          cap.visible = false;
        });
    }

    timeline.call(() => {
      this.gearGroup.visible = true;
      this.gearAvailable = true;
      this.gearGroup.scale.setScalar(0.55);
    });

    timeline.to(this.gearGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.34,
      ease: "back.out(1.8)",
    });

    timeline.to(
      this.gearGroup.rotation,
      {
        z: Math.PI * 2,
        duration: 0.5,
        ease: "power2.out",
      },
      "<",
    );

    timeline.call(() => {
      this.onSolved?.();
    });
  }

  private pickUpGear() {
    if (!this.gearAvailable || this.gearPickedUp) return;

    this.gearPickedUp = true;
    this.gearAvailable = false;

    gsap
      .timeline()
      .to(this.gearGroup.position, {
        z: 0.55,
        duration: 0.16,
        ease: "power2.out",
      })
      .to(
        this.gearGroup.scale,
        {
          x: 0.06,
          y: 0.06,
          z: 0.06,
          duration: 0.2,
          ease: "power2.in",
        },
        "<+=0.04",
      )
      .call(() => {
        this.gearGroup.visible = false;
        this.onGearPickedUp?.();
      });
  }

  private pickRing(clientX: number, clientY: number) {
    this.setPointer(clientX, clientY);

    const intersections = this.raycaster.intersectObjects(
      this.ringHitboxes,
      false,
    );

    if (intersections.length === 0) return null;

    const value = intersections[0].object.userData.ringIndex;

    return typeof value === "number" ? value : null;
  }

  private pickObject(
    object: THREE.Object3D,
    clientX: number,
    clientY: number,
  ) {
    this.setPointer(clientX, clientY);

    return (
      this.raycaster.intersectObject(
        object,
        false,
      ).length > 0
    );
  }

  private setPointer(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();

    this.pointer.x =
      ((clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private getRootScreenCenter() {
    const world = new THREE.Vector3();
    this.root.getWorldPosition(world);
    world.project(this.camera);

    const rect = this.canvas.getBoundingClientRect();

    return {
      x: rect.left + ((world.x + 1) * 0.5) * rect.width,
      y: rect.top + ((-world.y + 1) * 0.5) * rect.height,
    };
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.activeRing = null;
      this.activePointerId = null;
    }
  }

  public dispose() {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);

    for (const group of this.ringGroups) {
      gsap.killTweensOf(group.rotation);
    }

    gsap.killTweensOf(this.gearGroup.position);
    gsap.killTweensOf(this.gearGroup.rotation);
    gsap.killTweensOf(this.gearGroup.scale);

    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.geometry.dispose();

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of materials) {
        material.dispose();
      }
    });

    this.anchor.remove(this.root);
  }
}

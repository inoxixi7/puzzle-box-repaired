import * as THREE from "three";
import { gsap } from "gsap";

import type { BoxFaceName } from "./BoxFace";
import { BoxRotationController } from "./BoxRotationController";

type BoxFaceFocusControllerOptions = {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  boxRoot: THREE.Group;
  focusMeshes: Map<BoxFaceName, THREE.Mesh>;
  rotationController: BoxRotationController;
  onFocusChange?: (face: BoxFaceName | null) => void;
};

const FACE_ROTATIONS: Record<
  BoxFaceName,
  THREE.Euler
> = {
  front: new THREE.Euler(0, 0, 0),
  right: new THREE.Euler(0, -Math.PI / 2, 0),
  back: new THREE.Euler(0, Math.PI, 0),
  left: new THREE.Euler(0, Math.PI / 2, 0),
  top: new THREE.Euler(Math.PI / 2, 0, 0),
  bottom: new THREE.Euler(-Math.PI / 2, 0, 0),
};

export class BoxFaceFocusController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private boxRoot: THREE.Group;
  private focusMeshes: Map<BoxFaceName, THREE.Mesh>;
  private rotationController: BoxRotationController;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private hoveredFace: BoxFaceName | null = null;
  private focusedFace: BoxFaceName | null = null;

  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDownId: number | null = null;

  private focusing = false;
  private onFocusChange?: (face: BoxFaceName | null) => void;

  private readonly normalCameraZ = 11.8;
  private readonly focusCameraZ = 9.6;

  constructor(options: BoxFaceFocusControllerOptions) {
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.boxRoot = options.boxRoot;
    this.focusMeshes = options.focusMeshes;
    this.rotationController = options.rotationController;
    this.onFocusChange = options.onFocusChange;

    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  public get currentFace() {
    return this.focusedFace;
  }

  public get isFocused() {
    return this.focusedFace !== null;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (this.focusedFace || this.focusing) return;

    this.pointerDownId = event.pointerId;
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (
      this.focusedFace ||
      this.focusing ||
      this.rotationController.isDragging
    ) {
      this.clearHover();
      return;
    }

    const face = this.pickFace(
      event.clientX,
      event.clientY,
    );

    this.setHoveredFace(face);
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (
      this.focusedFace ||
      this.focusing ||
      event.pointerId !== this.pointerDownId
    ) {
      this.pointerDownId = null;
      return;
    }

    const distance = Math.hypot(
      event.clientX - this.pointerDownX,
      event.clientY - this.pointerDownY,
    );

    this.pointerDownId = null;

    // 拖动是旋转盒子；只有接近“点击”才进入面操作。
    if (distance > 7) return;

    const face = this.pickFace(
      event.clientX,
      event.clientY,
    );

    if (!face) return;

    this.focus(face);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    this.exitFocus();
  };

  private pickFace(
    clientX: number,
    clientY: number,
  ): BoxFaceName | null {
    const rect =
      this.canvas.getBoundingClientRect();

    this.pointer.x =
      ((clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera,
    );

    const meshes = [
      ...this.focusMeshes.values(),
    ];

    const intersections =
      this.raycaster.intersectObjects(
        meshes,
        false,
      );

    if (intersections.length === 0) {
      return null;
    }

    return (
      intersections[0].object.userData.face ??
      null
    );
  }

  private setHoveredFace(face: BoxFaceName | null) {
    if (face === this.hoveredFace) return;

    if (this.hoveredFace) {
      this.setFaceHighlight(
        this.hoveredFace,
        false,
      );
    }

    this.hoveredFace = face;

    if (face) {
      this.setFaceHighlight(face, true);
      this.canvas.style.cursor = "pointer";
    } else {
      this.canvas.style.cursor = "grab";
    }
  }

  private clearHover() {
    if (!this.hoveredFace) return;

    this.setFaceHighlight(
      this.hoveredFace,
      false,
    );

    this.hoveredFace = null;

    if (!this.focusedFace) {
      this.canvas.style.cursor =
        this.rotationController.isEnabled
          ? "grab"
          : "default";
    }
  }

  private setFaceHighlight(
    face: BoxFaceName,
    highlighted: boolean,
  ) {
    const mesh = this.focusMeshes.get(face);

    if (!mesh) return;

    const material =
      mesh.material as THREE.MeshStandardMaterial;

    material.emissive.set(
      highlighted
        ? 0x7b5426
        : 0x000000,
    );

    material.emissiveIntensity =
      highlighted ? 0.34 : 0;
  }

  public focus(face: BoxFaceName) {
    if (this.focusedFace || this.focusing) return;

    const mesh = this.focusMeshes.get(face);

    if (!mesh) return;

    this.focusing = true;
    this.clearHover();

    this.rotationController.stopInertia();
    this.rotationController.setEnabled(false);

    const startQuaternion =
      this.boxRoot.quaternion.clone();

    const targetQuaternion =
      new THREE.Quaternion().setFromEuler(
        FACE_ROTATIONS[face],
      );

    const state = { t: 0 };

    gsap.to(state, {
      t: 1,
      duration: 0.58,
      ease: "power3.inOut",

      onUpdate: () => {
        this.boxRoot.quaternion.slerpQuaternions(
          startQuaternion,
          targetQuaternion,
          state.t,
        );
      },

      onComplete: () => {
        this.boxRoot.quaternion.copy(
          targetQuaternion,
        );

        this.focusedFace = face;
        this.focusing = false;

        this.setFaceHighlight(face, true);
        this.canvas.style.cursor = "default";

        this.onFocusChange?.(face);
      },
    });

    gsap.to(this.camera.position, {
      z: this.focusCameraZ,
      duration: 0.58,
      ease: "power3.inOut",
    });
  }

  public exitFocus() {
    if (!this.focusedFace || this.focusing) return;

    const previousFace = this.focusedFace;

    this.focusedFace = null;

    this.setFaceHighlight(
      previousFace,
      false,
    );

    gsap.to(this.camera.position, {
      z: this.normalCameraZ,
      duration: 0.38,
      ease: "power2.inOut",
      onComplete: () => {
        this.rotationController.setEnabled(true);
        this.canvas.style.cursor = "grab";
      },
    });

    this.onFocusChange?.(null);
  }

  public dispose() {
    gsap.killTweensOf(
      this.camera.position,
    );

    this.canvas.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );

    this.canvas.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );

    this.canvas.removeEventListener(
      "pointerup",
      this.handlePointerUp,
    );

    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );

    this.clearHover();
  }
}

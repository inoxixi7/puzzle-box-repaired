import * as THREE from "three";
import { gsap } from "gsap";

import type {
  InventoryItemId,
} from "../inventory/items";

type LeftPuzzleTwoOptions = {
  anchor: THREE.Group;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;

  getSelectedItem: () =>
    InventoryItemId | null;

  consumeItem: (
    item: InventoryItemId,
  ) => boolean;

  onSolved?: () => void;
};

export class LeftPuzzleTwo {
  private anchor: THREE.Group;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;

  private root = new THREE.Group();

  private frameMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x3a271b,
      roughness: 0.84,
      metalness: 0.04,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

  private basePattern =
    new THREE.Group();

  private resultGroup =
    new THREE.Group();

  private targetHitbox: THREE.Mesh;

  private sheetGroup =
    new THREE.Group();

  private sheetHitbox:
    THREE.Mesh | null = null;

  private raycaster =
    new THREE.Raycaster();

  private pointer =
    new THREE.Vector2();

  private enabled = false;
  private sheetPlaced = false;
  private solved = false;

  private rotating = false;
  private activePointerId:
    number | null = null;

  private startPointerAngle = 0;
  private startRotation = 0;

  private selectedItem:
    InventoryItemId | null =
      null;

  private getSelectedItem: () =>
    InventoryItemId | null;

  private consumeItem: (
    item: InventoryItemId,
  ) => boolean;

  private onSolved?: () => void;

  constructor(
    options:
      LeftPuzzleTwoOptions,
  ) {
    this.anchor =
      options.anchor;

    this.canvas =
      options.canvas;

    this.camera =
      options.camera;

    this.getSelectedItem =
      options.getSelectedItem;

    this.consumeItem =
      options.consumeItem;

    this.onSolved =
      options.onSolved;

    this.root.name =
      "puzzle-2-left";

    this.anchor.add(
      this.root,
    );

    this.createTarget();
    this.createResult();

    this.targetHitbox =
      this.createTargetHitbox();

    this.root.add(
      this.targetHitbox,
    );

    this.canvas.addEventListener(
      "pointerdown",
      this.handlePointerDown,
    );

    this.canvas.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );

    this.canvas.addEventListener(
      "pointerup",
      this.handlePointerUp,
    );

    this.canvas.addEventListener(
      "pointercancel",
      this.handlePointerUp,
    );
  }

  // ==================================================
  // TARGET
  // ==================================================

  private createTarget() {
    const frame =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          2.45,
          1.55,
          0.12,
        ),
        this.frameMaterial,
      );

    frame.position.set(
      0,
      0.12,
      0.08,
    );

    frame.castShadow = true;
    frame.receiveShadow = true;

    this.root.add(frame);

    const recess =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          2.18,
          1.30,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x171a19,
          roughness: 0.9,
          metalness: 0.02,
        }),
      );

    recess.position.set(
      0,
      0.12,
      0.15,
    );

    this.root.add(recess);

    this.basePattern.position.set(
      0,
      0.12,
      0.165,
    );

    const lineMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xd0bd97,
        side:
          THREE.DoubleSide,
      });

    // 参考图：左侧小圆、右侧大圆、一道斜线。
    const smallRing =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.15,
          0.176,
          36,
        ),
        lineMaterial,
      );

    smallRing.position.set(
      -0.58,
      -0.12,
      0,
    );

    const largeRing =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.26,
          0.292,
          36,
        ),
        lineMaterial,
      );

    largeRing.position.set(
      0.58,
      0.07,
      0,
    );

    const diagonal =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.42,
          0.03,
          0.01,
        ),
        lineMaterial,
      );

    diagonal.rotation.z =
      -0.46;

    diagonal.position.set(
      0.02,
      0,
      0,
    );

    this.basePattern.add(
      smallRing,
      largeRing,
      diagonal,
    );

    this.root.add(
      this.basePattern,
    );
  }

  private createTargetHitbox() {
    const hitbox =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          2.3,
          1.42,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side:
            THREE.DoubleSide,
        }),
      );

    hitbox.position.set(
      0,
      0.12,
      0.22,
    );

    return hitbox;
  }

  private updateTargetHighlight() {
    const canUseSheet =
      this.enabled &&
      !this.sheetPlaced &&
      this.selectedItem ===
        "overlay-sheet";

    this.frameMaterial.emissive.set(
      canUseSheet
        ? 0x6c4d26
        : 0x000000,
    );

    this.frameMaterial.emissiveIntensity =
      canUseSheet
        ? 0.38
        : 0;
  }

  // ==================================================
  // RESULT
  // ==================================================

  private createResult() {
    this.resultGroup.position.set(
      0,
      0.12,
      0.19,
    );

    this.resultGroup.visible =
      false;

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width = 900;
    canvas.height = 430;

    const ctx =
      canvas.getContext(
        "2d",
      );

    if (!ctx) {
      throw new Error(
        "Canvas 2D context is unavailable.",
      );
    }

    ctx.fillStyle =
      "#203338";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    ctx.strokeStyle =
      "#b7d1d4";

    ctx.lineWidth = 10;

    ctx.strokeRect(
      8,
      8,
      canvas.width - 16,
      canvas.height - 16,
    );

    const drawArrow = (
      x: number,
      y: number,
      angle: number,
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.strokeStyle =
        "#d8eff1";

      ctx.fillStyle =
        "#d8eff1";

      ctx.lineWidth = 18;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(0, 72);
      ctx.lineTo(0, -68);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -88);
      ctx.lineTo(-30, -50);
      ctx.lineTo(30, -50);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const cy =
      canvas.height / 2;

    drawArrow(
      225,
      cy,
      Math.PI / 4,
    );

    drawArrow(
      450,
      cy,
      Math.PI,
    );

    drawArrow(
      675,
      cy,
      -Math.PI / 2,
    );

    const texture =
      new THREE.CanvasTexture(
        canvas,
      );

    texture.colorSpace =
      THREE.SRGBColorSpace;

    const plane =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          2.04,
          0.98,
        ),
        new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
        }),
      );

    this.resultGroup.add(
      plane,
    );

    this.root.add(
      this.resultGroup,
    );
  }

  // ==================================================
  // SHEET
  // ==================================================

  private createPlacedSheet() {
    this.sheetGroup.position.set(
      0,
      0.12,
      0.225,
    );

    this.sheetGroup.rotation.z =
      0;

    this.sheetGroup.scale.setScalar(0.94);

    const material =
      new THREE.MeshPhysicalMaterial({
        color: 0x9bb6b7,
        transparent: true,
        opacity: 0.48,
        roughness: 0.14,
        metalness: 0,
        transmission: 0.18,
        depthWrite: false,
        side:
          THREE.DoubleSide,
      });

    const sheet =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          1.82,
          1.02,
        ),
        material,
      );

    this.sheetGroup.add(
      sheet,
    );

    // 与抽屉里看到的是同一张透明板：
    // 大圆在左、小圆在右，旋转 180° 后才会与底图重合。
    const markMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x6f9eab,
        side:
          THREE.DoubleSide,
      });

    const largeRing =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.26,
          0.292,
          36,
        ),
        markMaterial,
      );

    largeRing.position.set(
      -0.58,
      -0.07,
      0.014,
    );

    const smallRing =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.15,
          0.176,
          36,
        ),
        markMaterial,
      );

    smallRing.position.set(
      0.58,
      0.12,
      0.014,
    );

    const diagonal =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.42,
          0.03,
          0.012,
        ),
        markMaterial,
      );

    diagonal.rotation.z =
      -0.46;

    diagonal.position.set(
      0.02,
      0,
      0.012,
    );

    this.sheetGroup.add(
      largeRing,
      smallRing,
      diagonal,
    );

    this.sheetHitbox =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          2.02,
          1.18,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side:
            THREE.DoubleSide,
        }),
      );

    this.sheetHitbox.position.z =
      0.03;

    this.sheetGroup.add(
      this.sheetHitbox,
    );

    this.root.add(
      this.sheetGroup,
    );
  }

  private placeSelectedSheet() {
    if (
      this.sheetPlaced ||
      this.getSelectedItem() !==
        "overlay-sheet"
    ) {
      return;
    }

    const removed =
      this.consumeItem(
        "overlay-sheet",
      );

    if (!removed) {
      return;
    }

    this.sheetPlaced = true;
    this.selectedItem = null;

    this.updateTargetHighlight();
    this.createPlacedSheet();

    gsap.fromTo(
      this.sheetGroup.scale,
      {
        x: 0.72,
        y: 0.72,
        z: 0.72,
      },
      {
        x: 0.94,
        y: 0.94,
        z: 0.94,
        duration: 0.34,
        ease: "back.out(1.7)",
      },
    );

    gsap.fromTo(
      this.sheetGroup.rotation,
      {
        z: -0.25,
      },
      {
        z: 0,
        duration: 0.34,
        ease: "back.out(1.5)",
      },
    );
  }

  // ==================================================
  // POINTER
  // ==================================================

  private handlePointerDown = (
    event: PointerEvent,
  ) => {
    if (
      !this.enabled ||
      this.solved
    ) {
      return;
    }

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    if (
      !this.sheetPlaced &&
      this.getSelectedItem() ===
        "overlay-sheet" &&
      this.pickObject(
        this.targetHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.placeSelectedSheet();
      return;
    }

    if (
      !this.sheetPlaced ||
      !this.sheetHitbox ||
      !this.pickObject(
        this.sheetHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      return;
    }

    this.rotating = true;

    this.activePointerId =
      event.pointerId;

    const center =
      this.getSheetScreenCenter();

    this.startPointerAngle =
      Math.atan2(
        event.clientY -
          center.y,
        event.clientX -
          center.x,
      );

    this.startRotation =
      this.sheetGroup.rotation.z;

    this.canvas.setPointerCapture(
      event.pointerId,
    );

    this.canvas.style.cursor =
      "grabbing";
  };

  private handlePointerMove = (
    event: PointerEvent,
  ) => {
    if (
      !this.enabled ||
      this.solved
    ) {
      return;
    }

    if (
      this.rotating &&
      event.pointerId ===
        this.activePointerId
    ) {
      const center =
        this.getSheetScreenCenter();

      const currentAngle =
        Math.atan2(
          event.clientY -
            center.y,
          event.clientX -
            center.x,
        );

      this.sheetGroup.rotation.z =
        this.startRotation +
        (
          currentAngle -
          this.startPointerAngle
        );

      return;
    }

    if (
      !this.sheetPlaced
    ) {
      this.canvas.style.cursor =
        this.getSelectedItem() ===
          "overlay-sheet" &&
        this.pickObject(
          this.targetHitbox,
          event.clientX,
          event.clientY,
        )
          ? "pointer"
          : "default";

      return;
    }

    if (
      this.sheetHitbox
    ) {
      this.canvas.style.cursor =
        this.pickObject(
          this.sheetHitbox,
          event.clientX,
          event.clientY,
        )
          ? "grab"
          : "default";
    }
  };

  private handlePointerUp = (
    event: PointerEvent,
  ) => {
    if (
      !this.rotating ||
      event.pointerId !==
        this.activePointerId
    ) {
      return;
    }

    if (
      this.canvas.hasPointerCapture(
        event.pointerId,
      )
    ) {
      this.canvas.releasePointerCapture(
        event.pointerId,
      );
    }

    this.rotating = false;
    this.activePointerId =
      null;

    const step =
      Math.PI / 4;

    const snapped =
      Math.round(
        this.sheetGroup.rotation.z /
          step,
      ) * step;

    gsap.to(
      this.sheetGroup.rotation,
      {
        z: snapped,
        duration: 0.18,
        ease: "back.out(1.4)",
        onComplete: () => {
          this.checkSolution();
        },
      },
    );

    this.canvas.style.cursor =
      "grab";
  };

  private pickObject(
    object:
      THREE.Object3D,
    clientX: number,
    clientY: number,
  ) {
    const rect =
      this.canvas.getBoundingClientRect();

    this.pointer.x =
      (
        (clientX -
          rect.left) /
        rect.width
      ) *
        2 -
      1;

    this.pointer.y =
      -(
        (
          clientY -
          rect.top
        ) /
        rect.height
      ) *
        2 +
      1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera,
    );

    return (
      this.raycaster.intersectObject(
        object,
        false,
      ).length > 0
    );
  }

  private getSheetScreenCenter() {
    const position =
      new THREE.Vector3();

    this.sheetGroup.getWorldPosition(
      position,
    );

    position.project(
      this.camera,
    );

    const rect =
      this.canvas.getBoundingClientRect();

    return {
      x:
        rect.left +
        (position.x + 1) *
          0.5 *
          rect.width,

      y:
        rect.top +
        (-position.y + 1) *
          0.5 *
          rect.height,
    };
  }

  // ==================================================
  // SOLVE
  // ==================================================

  private checkSolution() {
    const difference =
      Math.atan2(
        Math.sin(
          this.sheetGroup.rotation.z -
            Math.PI,
        ),
        Math.cos(
          this.sheetGroup.rotation.z -
            Math.PI,
        ),
      );

    if (
      Math.abs(
        difference,
      ) >
      Math.PI / 18
    ) {
      return;
    }

    this.solve();
  }

  private solve() {
    if (this.solved) return;

    this.solved = true;
    this.enabled = false;

    const timeline =
      gsap.timeline();

    timeline
      .to(
        this.sheetGroup.scale,
        {
          x: 1.02,
          y: 1.02,
          z: 1.02,
          duration: 0.1,
        },
      )
      .to(
        this.sheetGroup.scale,
        {
          x: 0.94,
          y: 0.94,
          z: 0.94,
          duration: 0.16,
          ease: "back.out(2)",
        },
      );

    timeline.call(
      () => {
        this.sheetGroup.visible =
          false;

        this.basePattern.visible =
          false;

        this.resultGroup.visible =
          true;

        this.resultGroup.scale.setScalar(0.92);
      },
      [],
      "+=0.08",
    );

    timeline.to(
      this.resultGroup.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.3,
        ease: "back.out(1.6)",
      },
    );

    timeline.call(() => {
      this.onSolved?.();
    });
  }

  // ==================================================
  // PUBLIC
  // ==================================================

  public setEnabled(
    enabled: boolean,
  ) {
    this.enabled =
      enabled &&
      !this.solved;

    if (!this.enabled) {
      this.rotating = false;
      this.activePointerId =
        null;
    }

    this.updateTargetHighlight();
  }

  public setSelectedItem(
    item:
      InventoryItemId | null,
  ) {
    this.selectedItem =
      item;

    this.updateTargetHighlight();
  }

  public get isSolved() {
    return this.solved;
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

    gsap.killTweensOf(
      this.sheetGroup,
    );

    gsap.killTweensOf(
      this.sheetGroup.scale,
    );

    gsap.killTweensOf(
      this.sheetGroup.rotation,
    );

    gsap.killTweensOf(
      this.resultGroup.scale,
    );

    this.root.traverse(
      (object) => {
        if (
          !(
            object instanceof
            THREE.Mesh
          )
        ) {
          return;
        }

        object.geometry.dispose();

        const materials =
          Array.isArray(
            object.material,
          )
            ? object.material
            : [
                object.material,
              ];

        for (
          const material
          of materials
        ) {
          material.dispose();
        }
      },
    );

    this.anchor.remove(
      this.root,
    );
  }
}

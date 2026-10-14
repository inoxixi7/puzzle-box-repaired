import * as THREE from "three";
import { gsap } from "gsap";

import type {
  InventoryItemId,
} from "../inventory/items";

import {
  createSealMedalGroup,
  FINAL_SYMBOL_SEQUENCE,
} from "./SealMedal";

type BottomFinalPuzzleOptions = {
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

export class BottomFinalPuzzle {
  private anchor: THREE.Group;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;

  private root = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private socketMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x5b3e27,
      roughness: 0.44,
      metalness: 0.48,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

  private medalSocketHitbox:
    THREE.Mesh;

  private dialGroup =
    new THREE.Group();

  private dialHitbox:
    THREE.Mesh;

  private confirmHitbox:
    THREE.Mesh;

  private progressLights:
    THREE.Mesh[] = [];

  private hatchLeft =
    new THREE.Group();

  private hatchRight =
    new THREE.Group();

  private treasureGroup =
    new THREE.Group();

  private enabled = false;
  private medalInstalled = false;
  private solved = false;

  private rotating = false;
  private pointerId:
    number | null = null;

  private startPointerAngle = 0;
  private startRotation = 0;

  // 初始顶部就是封印メダル的第一个符号 ○。
  private currentSymbol = 1;
  private sequenceIndex = 0;

  private selectedItem:
    InventoryItemId | null =
      null;

  private getSelectedItem: () =>
    InventoryItemId | null;

  private consumeItem: (
    item: InventoryItemId,
  ) => boolean;

  private onSolved?: () => void;

  // 封印メダルの刻印順:
  // ○ → △ → ◇ → □
  private readonly correctSequence = [
    ...FINAL_SYMBOL_SEQUENCE,
  ];

  constructor(
    options:
      BottomFinalPuzzleOptions,
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
      "puzzle-6-bottom";

    this.anchor.add(
      this.root,
    );

    this.medalSocketHitbox =
      this.createMedalSocket();

    this.dialHitbox =
      this.createSymbolDial();

    this.confirmHitbox =
      this.createConfirmButton();

    this.createHatch();
    this.createTreasure();

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

    this.setDialVisible(false);
  }

  // ==================================================
  // MEDAL
  // ==================================================

  private createMedalSocket() {
    const recess =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.62,
          0.62,
          0.10,
          12,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x2a1b13,
          roughness: 0.66,
          metalness: 0.28,
        }),
      );

    recess.rotation.x =
      Math.PI / 2;

    recess.position.set(
      0,
      1.05,
      0.14,
    );

    this.root.add(
      recess,
    );

    const outerRing =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.43,
          0.54,
          12,
        ),
        this.socketMaterial,
      );

    outerRing.position.set(
      0,
      1.05,
      0.205,
    );

    outerRing.name =
      "final-medal-socket";

    this.root.add(
      outerRing,
    );

    // Four keyed recesses make the slot match the new medal.
    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const angle =
        (i / 4) *
        Math.PI *
        2;

      const notch =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.15,
            0.21,
            0.05,
          ),
          new THREE.MeshStandardMaterial({
            color: 0x6b4827,
            roughness: 0.42,
            metalness: 0.56,
          }),
        );

      notch.position.set(
        Math.sin(angle) *
          0.53,
        1.05 +
          Math.cos(angle) *
            0.53,
        0.21,
      );

      notch.rotation.z =
        -angle;

      this.root.add(
        notch,
      );
    }

    const centerDiamond =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.11,
          0.15,
          4,
        ),
        new THREE.MeshBasicMaterial({
          color: 0xaa8249,
          side:
            THREE.DoubleSide,
        }),
      );

    centerDiamond.position.set(
      0,
      1.05,
      0.22,
    );

    this.root.add(
      centerDiamond,
    );

    const hitbox =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.72,
          40,
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
      1.05,
      0.30,
    );

    this.root.add(
      hitbox,
    );

    return hitbox;
  }

  private installMedal() {
    if (
      this.medalInstalled ||
      this.getSelectedItem() !==
        "seal-medal"
    ) {
      return;
    }

    if (
      !this.consumeItem(
        "seal-medal",
      )
    ) {
      return;
    }

    this.medalInstalled =
      true;

    this.selectedItem =
      null;

    const medal =
      createSealMedalGroup(
        1.08,
      );

    medal.position.set(
      0,
      1.05,
      0.30,
    );

    medal.scale.setScalar(0.25);

    this.root.add(
      medal,
    );

    gsap
      .timeline()
      .to(
        medal.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.30,
          ease: "back.out(1.8)",
        },
      )
      .to(
        medal.rotation,
        {
          z:
            medal.rotation.z +
            Math.PI,
          duration: 0.40,
          ease: "power2.inOut",
        },
      )
      .call(() => {
        this.setDialVisible(
          true,
        );
      });

    this.updateHighlight();
  }

  // ==================================================
  // SYMBOL DIAL
  // ==================================================

  private createSymbolDial() {
    const plate =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          1.22,
          1.22,
          0.12,
          64,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x302118,
          roughness: 0.64,
          metalness: 0.16,
        }),
      );

    plate.rotation.x =
      Math.PI / 2;

    plate.position.set(
      0,
      -0.42,
      0.12,
    );

    this.root.add(plate);

    this.dialGroup.position.set(
      0,
      -0.42,
      0.25,
    );

    const ring =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.62,
          1.02,
          64,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x7f5b32,
          roughness: 0.38,
          metalness: 0.66,
        }),
      );

    this.dialGroup.add(
      ring,
    );

    // 最终顺序仍由封印メダル给出：
    // ○ → △ → ◇ → □
    //
    // 但圆盘上的物理位置故意打乱，不能再一直顺着一个方向转：
    //
    //        ○
    //
    //     ◇     □
    //
    //        △
    const symbolPositions = [
      {
        index: 1,
        x: 0,
        y: 0.82,
        type: "circle",
      },
      {
        index: 2,
        x: 0.82,
        y: 0,
        type: "square",
      },
      {
        index: 0,
        x: 0,
        y: -0.82,
        type: "triangle",
      },
      {
        index: 3,
        x: -0.82,
        y: 0,
        type: "diamond",
      },
    ] as const;

    for (
      const symbol
      of symbolPositions
    ) {
      const mesh =
        this.createSymbolMesh(
          symbol.type,
        );

      mesh.position.set(
        symbol.x,
        symbol.y,
        0.03,
      );

      this.dialGroup.add(
        mesh,
      );
    }

    this.root.add(
      this.dialGroup,
    );

    const pointer =
      new THREE.Mesh(
        new THREE.ConeGeometry(
          0.065,
          0.16,
          3,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd2aa67,
          roughness: 0.28,
          metalness: 0.74,
        }),
      );

    pointer.rotation.z =
      Math.PI;

    pointer.position.set(
      0,
      0.98,
      0.34,
    );

    this.root.add(pointer);

    const hitbox =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.45,
          1.15,
          64,
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
      -0.42,
      0.36,
    );

    this.root.add(hitbox);

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const light =
        new THREE.Mesh(
          new THREE.CircleGeometry(
            0.07,
            24,
          ),
          new THREE.MeshStandardMaterial({
            color: 0x2b211a,
            roughness: 0.5,
            metalness: 0.4,
            emissive: 0x000000,
            emissiveIntensity: 0,
          }),
        );

      light.position.set(
        -0.30 +
          i * 0.20,
        -1.80,
        0.20,
      );

      this.progressLights.push(
        light,
      );

      this.root.add(light);
    }

    return hitbox;
  }

  private createSymbolMesh(
    type:
      | "triangle"
      | "circle"
      | "square"
      | "diamond",
  ) {
    const material =
      new THREE.MeshBasicMaterial({
        color: 0xe0bd7a,
        side:
          THREE.DoubleSide,
      });

    if (
      type ===
      "circle"
    ) {
      return new THREE.Mesh(
        new THREE.RingGeometry(
          0.11,
          0.15,
          32,
        ),
        material,
      );
    }

    if (
      type ===
      "triangle"
    ) {
      const shape =
        new THREE.Shape();

      shape.moveTo(
        0,
        0.17,
      );

      shape.lineTo(
        -0.15,
        -0.12,
      );

      shape.lineTo(
        0.15,
        -0.12,
      );

      shape.closePath();

      const hole =
        new THREE.Path();

      hole.moveTo(
        0,
        0.09,
      );

      hole.lineTo(
        -0.075,
        -0.06,
      );

      hole.lineTo(
        0.075,
        -0.06,
      );

      hole.closePath();

      shape.holes.push(
        hole,
      );

      return new THREE.Mesh(
        new THREE.ShapeGeometry(
          shape,
        ),
        material,
      );
    }

    const geometry =
      new THREE.RingGeometry(
        0.12,
        0.16,
        4,
      );

    const mesh =
      new THREE.Mesh(
        geometry,
        material,
      );

    if (
      type ===
      "square"
    ) {
      mesh.rotation.z =
        Math.PI / 4;
    }

    return mesh;
  }

  private createConfirmButton() {
    const button =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.23,
          0.23,
          0.11,
          32,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xc49a59,
          roughness: 0.29,
          metalness: 0.76,
        }),
      );

    button.rotation.x =
      Math.PI / 2;

    button.position.set(
      0,
      -0.42,
      0.35,
    );

    this.root.add(button);

    const hitbox =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.29,
          32,
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
      -0.42,
      0.43,
    );

    this.root.add(hitbox);

    return hitbox;
  }

  private setDialVisible(
    visible: boolean,
  ) {
    this.dialGroup.visible =
      visible;

    this.dialHitbox.visible =
      visible;

    this.confirmHitbox.visible =
      visible;

    for (
      const light
      of this.progressLights
    ) {
      light.visible =
        visible;
    }
  }

  private confirmSymbol() {
    if (
      !this.medalInstalled ||
      this.solved
    ) {
      return;
    }

    const expected =
      this.correctSequence[
        this.sequenceIndex
      ];

    if (
      this.currentSymbol ===
      expected
    ) {
      const light =
        this.progressLights[
          this.sequenceIndex
        ];

      const material =
        light.material as
          THREE.MeshStandardMaterial;

      material.color.set(
        0xd3a45e,
      );

      material.emissive.set(
        0xc48b39,
      );

      material.emissiveIntensity =
        0.95;

      this.sequenceIndex++;

      if (
        this.sequenceIndex ===
        this.correctSequence.length
      ) {
        this.solve();
      }

      return;
    }

    this.sequenceIndex = 0;

    for (
      const light
      of this.progressLights
    ) {
      const material =
        light.material as
          THREE.MeshStandardMaterial;

      material.color.set(
        0x2b211a,
      );

      material.emissive.set(
        0x000000,
      );

      material.emissiveIntensity =
        0;
    }

    gsap
      .timeline()
      .to(
        this.dialGroup.position,
        {
          x: 0.07,
          duration: 0.04,
        },
      )
      .to(
        this.dialGroup.position,
        {
          x: -0.07,
          duration: 0.04,
        },
      )
      .to(
        this.dialGroup.position,
        {
          x: 0,
          duration: 0.05,
        },
      );
  }

  // ==================================================
  // HATCH + TREASURE
  // ==================================================

  private createHatch() {
    const material =
      new THREE.MeshStandardMaterial({
        color: 0x4a3020,
        roughness: 0.72,
        metalness: 0.08,
      });

    const left =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.65,
          1.10,
          0.10,
        ),
        material,
      );

    left.position.x =
      -0.83;

    this.hatchLeft.add(
      left,
    );

    const right =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.65,
          1.10,
          0.10,
        ),
        material.clone(),
      );

    right.position.x =
      0.83;

    this.hatchRight.add(
      right,
    );

    this.hatchLeft.position.set(
      0,
      -0.42,
      0.18,
    );

    this.hatchRight.position.set(
      0,
      -0.42,
      0.18,
    );

    this.root.add(
      this.hatchLeft,
      this.hatchRight,
    );
  }

  private createTreasure() {
    this.treasureGroup.position.set(
      0,
      -0.42,
      0.22,
    );

    this.treasureGroup.visible =
      false;

    const cavity =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.60,
          48,
        ),
        new THREE.MeshBasicMaterial({
          color: 0x070b11,
        }),
      );

    this.treasureGroup.add(
      cavity,
    );

    const gem =
      new THREE.Mesh(
        new THREE.OctahedronGeometry(
          0.32,
          1,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x1557b7,
          roughness: 0.12,
          metalness: 0.24,
          emissive: 0x0b3f98,
          emissiveIntensity: 1.2,
        }),
      );

    gem.position.z =
      0.12;

    gem.name =
      "treasure-gem";

    this.treasureGroup.add(
      gem,
    );

    const glow =
      new THREE.PointLight(
        0x2d7df0,
        18,
        6,
        2,
      );

    glow.position.z =
      0.48;

    this.treasureGroup.add(
      glow,
    );

    this.root.add(
      this.treasureGroup,
    );
  }

  private solve() {
    if (this.solved) return;

    this.solved = true;
    this.rotating = false;

    this.treasureGroup.visible =
      true;

    this.treasureGroup.scale.setScalar(0.65);

    const gem =
      this.treasureGroup.getObjectByName(
        "treasure-gem",
      );

    const timeline =
      gsap.timeline();

    timeline.to(
      this.hatchLeft.position,
      {
        x: -1.05,
        duration: 0.45,
        ease: "power3.inOut",
      },
    );

    timeline.to(
      this.hatchRight.position,
      {
        x: 1.05,
        duration: 0.45,
        ease: "power3.inOut",
      },
      "<",
    );

    timeline.to(
      this.treasureGroup.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.42,
        ease: "back.out(1.7)",
      },
      "-=0.15",
    );

    if (gem) {
      timeline.to(
        gem.position,
        {
          z: 0.52,
          duration: 0.52,
          ease: "back.out(1.6)",
        },
        "-=0.32",
      );

      timeline.to(
        gem.rotation,
        {
          y:
            gem.rotation.y +
            Math.PI * 2,
          duration: 1.1,
          ease: "power2.out",
        },
        "<",
      );
    }

    timeline.call(() => {
      this.onSolved?.();
    });
  }

  // ==================================================
  // POINTER
  // ==================================================

  private handlePointerDown = (
    event: PointerEvent,
  ) => {
    if (!this.enabled) return;

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    if (
      !this.medalInstalled &&
      this.getSelectedItem() ===
        "seal-medal" &&
      this.pickObject(
        this.medalSocketHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.installMedal();
      return;
    }

    if (
      !this.medalInstalled ||
      this.solved
    ) {
      return;
    }

    if (
      this.pickObject(
        this.confirmHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.confirmSymbol();
      return;
    }

    if (
      !this.pickObject(
        this.dialHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      return;
    }

    this.rotating = true;

    this.pointerId =
      event.pointerId;

    const center =
      this.getDialScreenCenter();

    this.startPointerAngle =
      Math.atan2(
        event.clientY -
          center.y,
        event.clientX -
          center.x,
      );

    this.startRotation =
      this.dialGroup.rotation.z;

    this.canvas.setPointerCapture(
      event.pointerId,
    );

    this.canvas.style.cursor =
      "grabbing";
  };

  private handlePointerMove = (
    event: PointerEvent,
  ) => {
    if (!this.enabled) return;

    if (
      this.rotating &&
      event.pointerId ===
        this.pointerId
    ) {
      const center =
        this.getDialScreenCenter();

      const angle =
        Math.atan2(
          event.clientY -
            center.y,
          event.clientX -
            center.x,
        );

      // Keep the symbol dial moving in the same visual direction as the drag.
      this.dialGroup.rotation.z =
        this.startRotation -
        (
          angle -
          this.startPointerAngle
        );

      return;
    }

    if (
      !this.medalInstalled &&
      this.getSelectedItem() ===
        "seal-medal" &&
      this.pickObject(
        this.medalSocketHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor =
        "pointer";

      return;
    }

    if (
      this.medalInstalled &&
      !this.solved &&
      (
        this.pickObject(
          this.dialHitbox,
          event.clientX,
          event.clientY,
        ) ||
        this.pickObject(
          this.confirmHitbox,
          event.clientX,
          event.clientY,
        )
      )
    ) {
      this.canvas.style.cursor =
        "grab";

      return;
    }

    this.canvas.style.cursor =
      "default";
  };

  private handlePointerUp = (
    event: PointerEvent,
  ) => {
    if (
      !this.rotating ||
      event.pointerId !==
        this.pointerId
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
    this.pointerId = null;

    const step =
      Math.PI / 2;

    const quarterTurns =
      (
        Math.round(
          this.dialGroup
            .rotation.z /
            step,
        ) %
          4 +
        4
      ) %
      4;

    // 打乱后的物理位置：
    // 0°: ○ / +90°: □ / 180°: △ / 270°: ◇
    //
    // 所以正确输入 ○ → △ → ◇ → □
    // 会要求玩家分别转到 0° → 180° → 270° → 90°。
    const symbolAtTop = [
      1, // ○
      2, // □
      0, // △
      3, // ◇
    ] as const;

    this.currentSymbol =
      symbolAtTop[
        quarterTurns
      ];

    gsap.to(
      this.dialGroup.rotation,
      {
        z:
          quarterTurns *
          step,
        duration: 0.18,
        ease: "back.out(1.5)",
      },
    );

    this.canvas.style.cursor =
      "grab";
  };

  // ==================================================
  // HELPERS
  // ==================================================

  private updateHighlight() {
    const active =
      this.enabled &&
      !this.medalInstalled &&
      this.selectedItem ===
        "seal-medal";

    this.socketMaterial.emissive.set(
      active
        ? 0x6f4d25
        : 0x000000,
    );

    this.socketMaterial.emissiveIntensity =
      active
        ? 0.58
        : 0;
  }

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

  private getDialScreenCenter() {
    const world =
      new THREE.Vector3();

    this.dialGroup.getWorldPosition(
      world,
    );

    world.project(
      this.camera,
    );

    const rect =
      this.canvas.getBoundingClientRect();

    return {
      x:
        rect.left +
        (world.x + 1) *
          0.5 *
          rect.width,

      y:
        rect.top +
        (-world.y + 1) *
          0.5 *
          rect.height,
    };
  }

  // ==================================================
  // PUBLIC
  // ==================================================

  public setEnabled(
    enabled: boolean,
  ) {
    this.enabled =
      enabled;

    if (!enabled) {
      this.rotating = false;
      this.pointerId = null;
    }

    this.updateHighlight();
  }

  public setSelectedItem(
    item:
      InventoryItemId | null,
  ) {
    this.selectedItem =
      item;

    this.updateHighlight();
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
      this.dialGroup.rotation,
    );

    gsap.killTweensOf(
      this.dialGroup.position,
    );

    gsap.killTweensOf(
      this.hatchLeft.position,
    );

    gsap.killTweensOf(
      this.hatchRight.position,
    );

    gsap.killTweensOf(
      this.treasureGroup.scale,
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

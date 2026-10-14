import * as THREE from "three";
import { gsap } from "gsap";

import type {
  InventoryItemId,
} from "../inventory/items";

import {
  createSealMedalGroup,
} from "./SealMedal";

type RightPuzzleFiveOptions = {
  anchor: THREE.Group;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;

  getSelectedItem: () =>
    InventoryItemId | null;

  consumeItem: (
    item: InventoryItemId,
  ) => boolean;

  onSolved?: () => void;
  onMedalPickedUp?: () => void;
};

export class RightPuzzleFive {
  private anchor: THREE.Group;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;

  private root = new THREE.Group();

  private raycaster =
    new THREE.Raycaster();

  private pointer =
    new THREE.Vector2();

  private gearSocketHitbox:
    THREE.Mesh;

  private dialHitbox:
    THREE.Mesh;

  private confirmHitbox:
    THREE.Mesh;

  private confirmButton:
    THREE.Mesh | null = null;

  private confirmHint:
    THREE.Mesh | null = null;

  private keyholeHitbox:
    THREE.Mesh;

  private medalHitbox:
    THREE.Mesh | null = null;

  private dialGroup =
    new THREE.Group();

  private installedGear =
    new THREE.Group();

  private keyholeCover =
    new THREE.Group();

  private insertedKey =
    new THREE.Group();

  private medalGroup =
    new THREE.Group();

  private progressLights:
    THREE.Mesh[] = [];

  private enabled = false;

  private gearInstalled = false;
  private directionSolved = false;
  private keyReady = false;

  private medalAvailable = false;
  private medalPickedUp = false;

  private rotatingDial = false;
  private pointerId:
    number | null = null;

  private startPointerAngle = 0;
  private startDialRotation = 0;

  private currentDirection = 0;
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
  private onMedalPickedUp?: () => void;

  private readonly correctSequence = [
    1,
    4,
    6,
  ];

  constructor(
    options:
      RightPuzzleFiveOptions,
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

    this.onMedalPickedUp =
      options.onMedalPickedUp;

    this.root.name =
      "puzzle-5-right";

    this.anchor.add(
      this.root,
    );

    this.gearSocketHitbox =
      this.createGearSocket();

    this.dialHitbox =
      this.createDirectionDial();

    this.confirmHitbox =
      this.createConfirmButton();

    this.keyholeHitbox =
      this.createKeyhole();

    this.createMedalCompartment();

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
  // GEAR SOCKET
  // ==================================================

  private createGearSocket() {
    const socket = new THREE.Mesh(
      new THREE.RingGeometry(
        0.28,
        0.47,
        40,
      ),
      new THREE.MeshStandardMaterial({
        color: 0x4a3422,
        roughness: 0.48,
        metalness: 0.42,
        emissive: 0x000000,
        emissiveIntensity: 0,
      }),
    );

    socket.position.set(
      -1.32,
      0.90,
      0.18,
    );

    socket.name =
      "gear-socket";

    this.root.add(socket);

    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(
        0.12,
        28,
      ),
      new THREE.MeshStandardMaterial({
        color: 0x1a1511,
        roughness: 0.8,
        metalness: 0.12,
      }),
    );

    hub.position.set(
      -1.32,
      0.90,
      0.19,
    );

    this.root.add(hub);

    const hitbox =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.58,
          36,
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
      -1.32,
      0.90,
      0.26,
    );

    this.root.add(hitbox);

    this.installedGear.position.set(
      -1.32,
      0.90,
      0.28,
    );

    this.installedGear.visible =
      false;

    const material =
      new THREE.MeshStandardMaterial({
        color: 0xc19452,
        roughness: 0.28,
        metalness: 0.78,
      });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.26,
        0.06,
        12,
        40,
      ),
      material,
    );

    this.installedGear.add(
      ring,
    );

    for (
      let i = 0;
      i < 8;
      i++
    ) {
      const angle =
        (i / 8) *
        Math.PI *
        2;

      const tooth =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.12,
            0.16,
            0.07,
          ),
          material,
        );

      tooth.position.set(
        Math.sin(angle) *
          0.36,
        Math.cos(angle) *
          0.36,
        0,
      );

      tooth.rotation.z =
        -angle;

      this.installedGear.add(
        tooth,
      );
    }

    this.root.add(
      this.installedGear,
    );

    return hitbox;
  }

  private installGear() {
    if (
      this.gearInstalled ||
      this.getSelectedItem() !==
        "small-gear"
    ) {
      return;
    }

    if (
      !this.consumeItem(
        "small-gear",
      )
    ) {
      return;
    }

    this.gearInstalled = true;
    this.selectedItem = null;

    this.installedGear.visible =
      true;

    this.installedGear.scale.setScalar(0.2);

    gsap
      .timeline()
      .to(
        this.installedGear.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.3,
          ease: "back.out(1.8)",
        },
      )
      .to(
        this.installedGear.rotation,
        {
          z:
            this.installedGear
              .rotation.z +
            Math.PI * 2,
          duration: 0.55,
          ease: "power2.out",
        },
        "<",
      );

    this.updateHighlights();

    gsap.delayedCall(
      0.45,
      () => {
        this.playConfirmHint();
      },
    );
  }

  // ==================================================
  // DIRECTION DIAL
  // ==================================================

  private createDirectionDial() {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.98,
        0.98,
        0.12,
        64,
      ),
      new THREE.MeshStandardMaterial({
        color: 0x33251c,
        roughness: 0.64,
        metalness: 0.2,
      }),
    );

    plate.rotation.x =
      Math.PI / 2;

    plate.position.set(
      0,
      -0.02,
      0.11,
    );

    plate.castShadow = true;

    this.root.add(plate);

    const tickMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xb58a4b,
        roughness: 0.34,
        metalness: 0.70,
      });

    for (
      let i = 0;
      i < 8;
      i++
    ) {
      const angle =
        (i / 8) *
        Math.PI *
        2;

      const tick =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.05,
            0.18,
            0.05,
          ),
          tickMaterial,
        );

      tick.position.set(
        Math.sin(angle) *
          0.80,
        Math.cos(angle) *
          0.80 -
          0.02,
        0.20,
      );

      tick.rotation.z =
        -angle;

      this.root.add(tick);
    }

    this.dialGroup.position.set(
      0,
      -0.02,
      0.23,
    );

    // Slim brass needle: clearer direction and visually closer to a
    // mechanical instrument than the previous thick stem + cone.
    const needleShape =
      new THREE.Shape();

    needleShape.moveTo(
      -0.045,
      -0.14,
    );

    needleShape.lineTo(
      -0.035,
      0.39,
    );

    needleShape.lineTo(
      -0.10,
      0.39,
    );

    needleShape.lineTo(
      0,
      0.68,
    );

    needleShape.lineTo(
      0.10,
      0.39,
    );

    needleShape.lineTo(
      0.035,
      0.39,
    );

    needleShape.lineTo(
      0.045,
      -0.14,
    );

    needleShape.closePath();

    const needle =
      new THREE.Mesh(
        new THREE.ShapeGeometry(
          needleShape,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd0a35d,
          roughness: 0.24,
          metalness: 0.78,
        }),
      );

    needle.position.z =
      0.035;

    const counterWeight =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.13,
          32,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x8e6535,
          roughness: 0.30,
          metalness: 0.70,
        }),
      );

    counterWeight.position.set(
      0,
      -0.16,
      0.025,
    );

    const hubOuter =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.18,
          36,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x5b3d21,
          roughness: 0.34,
          metalness: 0.64,
        }),
      );

    hubOuter.position.z =
      0.055;

    const hubInner =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.09,
          32,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd0a35d,
          roughness: 0.24,
          metalness: 0.78,
        }),
      );

    hubInner.position.z =
      0.065;

    this.dialGroup.add(
      counterWeight,
      needle,
      hubOuter,
      hubInner,
    );

    this.root.add(
      this.dialGroup,
    );

    const hitbox =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.28,
          0.92,
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
      -0.02,
      0.30,
    );

    this.root.add(hitbox);

    // 3 个输入进度灯
    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const light =
        new THREE.Mesh(
          new THREE.CircleGeometry(
            0.08,
            24,
          ),
          new THREE.MeshStandardMaterial({
            color: 0x2d2118,
            roughness: 0.52,
            metalness: 0.38,
            emissive: 0x000000,
            emissiveIntensity: 0,
          }),
        );

      light.position.set(
        -0.22 +
          i * 0.22,
        -1.20,
        0.20,
      );

      this.progressLights.push(
        light,
      );

      this.root.add(light);
    }

    return hitbox;
  }

  private createConfirmButton() {
    const socket =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.22,
          0.29,
          40,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x55391f,
          roughness: 0.38,
          metalness: 0.62,
        }),
      );

    socket.position.set(
      0,
      -0.02,
      0.295,
    );

    this.root.add(socket);

    const button =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.18,
          0.18,
          0.11,
          36,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xd0a35d,
          roughness: 0.25,
          metalness: 0.80,
        }),
      );

    button.rotation.x =
      Math.PI / 2;

    button.position.set(
      0,
      -0.02,
      0.33,
    );

    this.confirmButton =
      button;

    this.root.add(button);

    const centerDot =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.052,
          28,
        ),
        new THREE.MeshBasicMaterial({
          color: 0x3a2415,
        }),
      );

    centerDot.position.set(
      0,
      -0.02,
      0.392,
    );

    this.root.add(
      centerDot,
    );

    // 操作提示：每次圆盘吸附到一个方向后，
    // 这圈会扩散一次，提示玩家按下中央按钮确认。
    const hintMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xe2bc76,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side:
          THREE.DoubleSide,
      });

    this.confirmHint =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.31,
          0.345,
          44,
        ),
        hintMaterial,
      );

    this.confirmHint.position.set(
      0,
      -0.02,
      0.40,
    );

    this.root.add(
      this.confirmHint,
    );

    const hitbox =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.31,
          36,
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
      -0.02,
      0.43,
    );

    this.root.add(hitbox);

    return hitbox;
  }

  private playConfirmHint() {
    if (
      !this.confirmHint ||
      !this.gearInstalled ||
      this.directionSolved
    ) {
      return;
    }

    const material =
      this.confirmHint
        .material as
        THREE.MeshBasicMaterial;

    gsap.killTweensOf(
      this.confirmHint.scale,
    );

    gsap.killTweensOf(
      material,
    );

    this.confirmHint.scale.setScalar(
      0.82,
    );

    material.opacity =
      0.82;

    gsap.to(
      this.confirmHint.scale,
      {
        x: 1.34,
        y: 1.34,
        z: 1.34,
        duration: 0.48,
        ease: "power2.out",
      },
    );

    gsap.to(
      material,
      {
        opacity: 0,
        duration: 0.48,
        ease: "power2.out",
      },
    );
  }

  private confirmDirection() {
    if (
      !this.gearInstalled ||
      this.directionSolved
    ) {
      return;
    }

    if (this.confirmButton) {
      gsap
        .timeline()
        .to(
          this.confirmButton.scale,
          {
            x: 0.80,
            y: 0.80,
            z: 0.80,
            duration: 0.06,
          },
        )
        .to(
          this.confirmButton.scale,
          {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.12,
            ease: "back.out(2)",
          },
        );
    }

    const expected =
      this.correctSequence[
        this.sequenceIndex
      ];

    if (
      this.currentDirection ===
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
        0xd2a45e,
      );

      material.emissive.set(
        0xc68a35,
      );

      material.emissiveIntensity =
        0.9;

      gsap
        .timeline()
        .to(light.scale, {
          x: 1.28,
          y: 1.28,
          z: 1.28,
          duration: 0.08,
        })
        .to(light.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.13,
          ease: "back.out(2)",
        });

      this.sequenceIndex++;

      if (
        this.sequenceIndex ===
        this.correctSequence.length
      ) {
        this.directionSolved =
          true;

        this.openKeyhole();

        return;
      }
    } else {
      this.sequenceIndex = 0;

      for (
        const light
        of this.progressLights
      ) {
        const material =
          light.material as
            THREE.MeshStandardMaterial;

        material.color.set(
          0x2d2118,
        );

        material.emissive.set(
          0x000000,
        );

        material.emissiveIntensity =
          0;
      }

      gsap
        .timeline()
        .to(this.dialGroup.position, {
          x: 0.07,
          duration: 0.04,
        })
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
  }

  // ==================================================
  // KEY
  // ==================================================

  private createKeyhole() {
    this.keyholeCover.position.set(
      1.34,
      0.82,
      0.18,
    );

    const cover =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.72,
          0.70,
          0.10,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x5b3b24,
          roughness: 0.72,
          metalness: 0.08,
        }),
      );

    this.keyholeCover.add(
      cover,
    );

    this.root.add(
      this.keyholeCover,
    );

    const keyholePlate =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.27,
          32,
        ),
        new THREE.MeshStandardMaterial({
          color: 0xb2894c,
          roughness: 0.32,
          metalness: 0.72,
          emissive: 0x000000,
          emissiveIntensity: 0,
        }),
      );

    keyholePlate.position.set(
      1.34,
      0.82,
      0.16,
    );

    this.root.add(
      keyholePlate,
    );

    const slot =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.08,
          0.28,
          0.03,
        ),
        new THREE.MeshBasicMaterial({
          color: 0x18120f,
        }),
      );

    slot.position.set(
      1.34,
      0.82,
      0.19,
    );

    this.root.add(slot);

    const hitbox =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.38,
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
      1.34,
      0.82,
      0.28,
    );

    this.root.add(hitbox);

    this.insertedKey.position.set(
      1.34,
      0.82,
      0.34,
    );

    this.insertedKey.visible =
      false;

    const keyMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xc39a59,
        roughness: 0.28,
        metalness: 0.76,
      });

    const keyStem =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.10,
          0.65,
          0.07,
        ),
        keyMaterial,
      );

    keyStem.position.y =
      -0.18;

    const keyRing =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          0.18,
          0.045,
          12,
          32,
        ),
        keyMaterial,
      );

    keyRing.position.y =
      -0.55;

    this.insertedKey.add(
      keyStem,
      keyRing,
    );

    this.root.add(
      this.insertedKey,
    );

    return hitbox;
  }

  private openKeyhole() {
    this.keyReady = true;

    gsap.to(
      this.keyholeCover.position,
      {
        x:
          this.keyholeCover
            .position.x +
          0.58,
        duration: 0.32,
        ease: "power3.out",
      },
    );

    this.updateHighlights();
  }

  private useKey() {
    if (
      !this.keyReady ||
      this.getSelectedItem() !==
        "brass-key"
    ) {
      return;
    }

    if (
      !this.consumeItem(
        "brass-key",
      )
    ) {
      return;
    }

    this.selectedItem = null;
    this.keyReady = false;

    this.insertedKey.visible =
      true;

    this.insertedKey.scale.setScalar(0.55);

    gsap
      .timeline()
      .to(
        this.insertedKey.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.24,
          ease: "back.out(1.7)",
        },
      )
      .to(
        this.insertedKey.rotation,
        {
          z:
            this.insertedKey
              .rotation.z -
            Math.PI / 2,
          duration: 0.34,
          ease: "power2.inOut",
        },
      )
      .call(() => {
        this.openMedalCompartment();
      });
  }

  // ==================================================
  // MEDAL
  // ==================================================

  private createMedalCompartment() {
    const cavity =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.20,
          1.02,
          0.10,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x17120f,
          roughness: 0.92,
          metalness: 0.04,
        }),
      );

    cavity.position.set(
      1.30,
      -1.02,
      0.09,
    );

    this.root.add(
      cavity,
    );

    const frame =
      new THREE.Mesh(
        new THREE.RingGeometry(
          0.43,
          0.51,
          12,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x74502b,
          roughness: 0.40,
          metalness: 0.62,
        }),
      );

    frame.position.set(
      1.30,
      -1.02,
      0.16,
    );

    this.root.add(
      frame,
    );

    this.medalGroup.position.set(
      1.30,
      -1.02,
      0.24,
    );

    this.medalGroup.visible =
      false;

    this.medalGroup.add(
      createSealMedalGroup(
        1.08,
      ),
    );

    this.medalHitbox =
      new THREE.Mesh(
        new THREE.CircleGeometry(
          0.54,
          36,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side:
            THREE.DoubleSide,
        }),
      );

    this.medalHitbox.position.z =
      0.11;

    this.medalGroup.add(
      this.medalHitbox,
    );

    this.root.add(
      this.medalGroup,
    );
  }

  private openMedalCompartment() {
    this.medalAvailable =
      true;

    this.medalGroup.visible =
      true;

    this.medalGroup.scale.setScalar(
      0.45,
    );

    gsap
      .timeline()
      .to(
        this.medalGroup.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.34,
          ease: "back.out(1.8)",
        },
      )
      .call(() => {
        this.onSolved?.();
      });
  }

  private pickUpMedal() {
    if (
      !this.medalAvailable ||
      this.medalPickedUp
    ) {
      return;
    }

    this.medalAvailable =
      false;

    this.medalPickedUp =
      true;

    gsap
      .timeline()
      .to(
        this.medalGroup.position,
        {
          z: 0.58,
          duration: 0.16,
        },
      )
      .to(
        this.medalGroup.scale,
        {
          x: 0.05,
          y: 0.05,
          z: 0.05,
          duration: 0.20,
          ease: "power2.in",
        },
        "<+=0.03",
      )
      .call(() => {
        this.medalGroup.visible =
          false;

        this.onMedalPickedUp?.();
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
      this.medalAvailable &&
      !this.medalPickedUp &&
      this.medalHitbox &&
      this.pickObject(
        this.medalHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.pickUpMedal();
      return;
    }

    if (
      !this.gearInstalled &&
      this.getSelectedItem() ===
        "small-gear" &&
      this.pickObject(
        this.gearSocketHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.installGear();
      return;
    }

    if (
      this.keyReady &&
      this.getSelectedItem() ===
        "brass-key" &&
      this.pickObject(
        this.keyholeHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.useKey();
      return;
    }

    if (
      this.gearInstalled &&
      !this.directionSolved &&
      this.pickObject(
        this.confirmHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.confirmDirection();
      return;
    }

    if (
      this.gearInstalled &&
      !this.directionSolved &&
      this.pickObject(
        this.dialHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.rotatingDial =
        true;

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

      this.startDialRotation =
        this.dialGroup.rotation.z;

      this.canvas.setPointerCapture(
        event.pointerId,
      );

      this.canvas.style.cursor =
        "grabbing";
    }
  };

  private handlePointerMove = (
    event: PointerEvent,
  ) => {
    if (!this.enabled) return;

    if (
      this.rotatingDial &&
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

      // Keep the dial moving in the same visual direction as the drag.
      this.dialGroup.rotation.z =
        this.startDialRotation -
        (
          angle -
          this.startPointerAngle
        );

      return;
    }

    if (
      this.medalAvailable &&
      this.medalHitbox &&
      this.pickObject(
        this.medalHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor =
        "pointer";

      return;
    }

    if (
      !this.gearInstalled &&
      this.getSelectedItem() ===
        "small-gear" &&
      this.pickObject(
        this.gearSocketHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor =
        "pointer";

      return;
    }

    if (
      this.keyReady &&
      this.getSelectedItem() ===
        "brass-key" &&
      this.pickObject(
        this.keyholeHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor =
        "pointer";

      return;
    }

    if (
      this.gearInstalled &&
      !this.directionSolved &&
      this.pickObject(
        this.confirmHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor =
        "pointer";

      return;
    }

    if (
      this.gearInstalled &&
      !this.directionSolved &&
      this.pickObject(
        this.dialHitbox,
        event.clientX,
        event.clientY,
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
      !this.rotatingDial ||
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

    this.rotatingDial =
      false;

    this.pointerId =
      null;

    const step =
      Math.PI / 4;

    const direction =
      (
        Math.round(
          -this.dialGroup
            .rotation.z /
            step,
        ) %
          8 +
        8
      ) %
      8;

    this.currentDirection =
      direction;

    gsap.to(
      this.dialGroup.rotation,
      {
        z:
          -direction *
          step,
        duration: 0.18,
        ease: "back.out(1.5)",
        onComplete: () => {
          this.playConfirmHint();
        },
      },
    );

    this.canvas.style.cursor =
      "grab";
  };

  // ==================================================
  // HELPERS
  // ==================================================

  private updateHighlights() {
    const socket =
      this.root.getObjectByName(
        "gear-socket",
      ) as
        | THREE.Mesh
        | undefined;

    if (socket) {
      const material =
        socket.material as
          THREE.MeshStandardMaterial;

      const active =
        this.enabled &&
        !this.gearInstalled &&
        this.selectedItem ===
          "small-gear";

      material.emissive.set(
        active
          ? 0x714b22
          : 0x000000,
      );

      material.emissiveIntensity =
        active
          ? 0.55
          : 0;
    }
  }

  private pickObject(
    object:
      THREE.Object3D,
    clientX: number,
    clientY: number,
  ) {
    this.setPointer(
      clientX,
      clientY,
    );

    return (
      this.raycaster.intersectObject(
        object,
        false,
      ).length > 0
    );
  }

  private setPointer(
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
      this.rotatingDial =
        false;

      this.pointerId =
        null;
    }

    this.updateHighlights();
  }

  public setSelectedItem(
    item:
      InventoryItemId | null,
  ) {
    this.selectedItem =
      item;

    this.updateHighlights();
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
      this.installedGear.scale,
    );

    gsap.killTweensOf(
      this.installedGear.rotation,
    );

    gsap.killTweensOf(
      this.dialGroup.rotation,
    );

    gsap.killTweensOf(
      this.dialGroup.position,
    );

    if (this.confirmButton) {
      gsap.killTweensOf(
        this.confirmButton.scale,
      );
    }

    if (this.confirmHint) {
      gsap.killTweensOf(
        this.confirmHint.scale,
      );

      gsap.killTweensOf(
        this.confirmHint.material,
      );
    }

    gsap.killTweensOf(
      this.keyholeCover.position,
    );

    gsap.killTweensOf(
      this.insertedKey.scale,
    );

    gsap.killTweensOf(
      this.insertedKey.rotation,
    );

    gsap.killTweensOf(
      this.medalGroup.position,
    );

    gsap.killTweensOf(
      this.medalGroup.scale,
    );

    for (
      const light
      of this.progressLights
    ) {
      gsap.killTweensOf(
        light.scale,
      );
    }

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

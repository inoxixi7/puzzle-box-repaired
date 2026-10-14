import * as THREE from "three";
import { gsap } from "gsap";

type BackPuzzleThreeOptions = {
  anchor: THREE.Group;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  onSolved?: () => void;
  onKeyPickedUp?: () => void;
};

type RailNode = {
  x: number;
  y: number;
  checkpoint?: number;
  exit?: boolean;
};

type RailEdge = [
  number,
  number,
];

export class BackPuzzleThree {
  private anchor: THREE.Group;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;

  private root =
    new THREE.Group();

  private raycaster =
    new THREE.Raycaster();

  private pointer =
    new THREE.Vector2();

  private interactionPlane:
    THREE.Mesh;

  private knob =
    new THREE.Group();

  private knobHitbox:
    THREE.Mesh;

  private checkpointLights:
    THREE.Mesh[] = [];

  private exitLight:
    THREE.Mesh | null = null;

  private keyGroup =
    new THREE.Group();

  private keyHitbox:
    THREE.Mesh | null = null;

  private enabled = false;
  private solved = false;
  private dragging = false;

  private pointerId:
    number | null = null;

  private currentEdge = 0;
  private edgeT = 0;

  private visitedCheckpoints =
    new Set<number>();

  private keyAvailable = false;
  private keyPickedUp = false;

  private onSolved?: () => void;
  private onKeyPickedUp?: () => void;

  private readonly nodes:
    RailNode[] = [
      // Main route
      {
        x: -1.70,
        y: 1.00,
      },
      {
        x: -0.92,
        y: 1.00,
      },
      {
        x: -0.92,
        y: 0.34,
      },
      {
        x: -0.14,
        y: 0.34,
      },
      {
        x: -0.14,
        y: -0.46,
      },
      {
        x: 0.70,
        y: -0.46,
      },
      {
        x: 0.70,
        y: 0.30,
      },
      {
        x: 1.56,
        y: 0.30,
        exit: true,
      },

      // Branch A - required checkpoint
      {
        x: -1.56,
        y: 0.34,
      },
      {
        x: -1.56,
        y: -0.34,
        checkpoint: 0,
      },

      // Upper dead end
      {
        x: -0.14,
        y: 1.02,
      },
      {
        x: 0.48,
        y: 1.02,
      },

      // Branch B - required checkpoint
      {
        x: -0.72,
        y: -0.46,
      },
      {
        x: -0.72,
        y: -1.03,
        checkpoint: 1,
      },

      // Lower dead end
      {
        x: 0.70,
        y: -1.03,
      },
      {
        x: 1.30,
        y: -1.03,
      },

      // Branch C - required checkpoint
      {
        x: 0.70,
        y: 0.94,
      },
      {
        x: 1.28,
        y: 0.94,
        checkpoint: 2,
      },
    ];

  private readonly edges:
    RailEdge[] = [
      // Main route
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],

      // Required branches
      [2, 8],
      [8, 9],

      [4, 12],
      [12, 13],

      [6, 16],
      [16, 17],

      // Dead ends
      [3, 10],
      [10, 11],

      [5, 14],
      [14, 15],
    ];

  constructor(
    options:
      BackPuzzleThreeOptions,
  ) {
    this.anchor =
      options.anchor;

    this.canvas =
      options.canvas;

    this.camera =
      options.camera;

    this.onSolved =
      options.onSolved;

    this.onKeyPickedUp =
      options.onKeyPickedUp;

    this.root.name =
      "puzzle-3-back";

    this.anchor.add(
      this.root,
    );

    this.createRail();
    this.createKnob();
    this.createReward();

    this.interactionPlane =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          4.5,
          3.25,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side:
            THREE.DoubleSide,
        }),
      );

    this.interactionPlane.position.z =
      0.24;

    this.root.add(
      this.interactionPlane,
    );

    this.knobHitbox =
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

    this.knobHitbox.position.z =
      0.08;

    this.knob.add(
      this.knobHitbox,
    );

    this.updateKnob();

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
  // VISUALS
  // ==================================================

  private createRail() {
    const plate =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          4.25,
          3.0,
          0.12,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x302219,
          roughness: 0.82,
          metalness: 0.06,
        }),
      );

    plate.position.z =
      0.08;

    plate.castShadow =
      true;

    this.root.add(
      plate,
    );

    const railMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x8f673c,
        roughness: 0.40,
        metalness: 0.64,
      });

    for (
      const [
        startIndex,
        endIndex,
      ] of this.edges
    ) {
      const a =
        this.nodes[
          startIndex
        ];

      const b =
        this.nodes[
          endIndex
        ];

      const dx =
        b.x - a.x;

      const dy =
        b.y - a.y;

      const length =
        Math.hypot(
          dx,
          dy,
        );

      const rail =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            length,
            0.09,
            0.055,
          ),
          railMaterial,
        );

      rail.position.set(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        0.18,
      );

      rail.rotation.z =
        Math.atan2(
          dy,
          dx,
        );

      rail.castShadow =
        true;

      this.root.add(
        rail,
      );
    }

    const checkpointMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xd7ad65,
        roughness: 0.30,
        metalness: 0.72,
        emissive: 0x000000,
        emissiveIntensity: 0,
      });

    for (
      let checkpoint = 0;
      checkpoint < 3;
      checkpoint++
    ) {
      const node =
        this.nodes.find(
          (candidate) =>
            candidate
              .checkpoint ===
            checkpoint,
        );

      if (!node) continue;

      const light =
        new THREE.Mesh(
          new THREE.CircleGeometry(
            0.12,
            28,
          ),
          checkpointMaterial.clone(),
        );

      light.position.set(
        node.x,
        node.y,
        0.23,
      );

      this.checkpointLights[
        checkpoint
      ] = light;

      this.root.add(
        light,
      );
    }

    const exit =
      this.nodes.find(
        (node) =>
          node.exit,
      );

    if (exit) {
      this.exitLight =
        new THREE.Mesh(
          new THREE.RingGeometry(
            0.15,
            0.23,
            28,
          ),
          new THREE.MeshStandardMaterial({
            color: 0x6a4929,
            roughness: 0.38,
            metalness: 0.62,
            emissive: 0x000000,
            emissiveIntensity: 0,
          }),
        );

      this.exitLight.position.set(
        exit.x,
        exit.y,
        0.23,
      );

      this.root.add(
        this.exitLight,
      );
    }
  }

  private createKnob() {
    const brass =
      new THREE.MeshStandardMaterial({
        color: 0xc19452,
        roughness: 0.28,
        metalness: 0.78,
      });

    const base =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.18,
          0.18,
          0.10,
          32,
        ),
        brass,
      );

    base.rotation.x =
      Math.PI / 2;

    base.castShadow =
      true;

    const center =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.07,
          0.07,
          0.14,
          24,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x4f361f,
          roughness: 0.36,
          metalness: 0.62,
        }),
      );

    center.rotation.x =
      Math.PI / 2;

    center.position.z =
      0.055;

    this.knob.add(
      base,
      center,
    );

    this.root.add(
      this.knob,
    );
  }

  private createReward() {
    this.keyGroup.visible =
      false;

    this.keyGroup.position.set(
      0.15,
      -1.24,
      0.27,
    );

    const brass =
      new THREE.MeshStandardMaterial({
        color: 0xc49a58,
        roughness: 0.28,
        metalness: 0.76,
      });

    const ring =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          0.18,
          0.045,
          12,
          36,
        ),
        brass,
      );

    ring.position.x =
      -0.38;

    const stem =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.72,
          0.09,
          0.07,
        ),
        brass,
      );

    stem.position.x =
      0.03;

    const tooth1 =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.10,
          0.22,
          0.07,
        ),
        brass,
      );

    tooth1.position.set(
      0.33,
      -0.08,
      0,
    );

    const tooth2 =
      tooth1.clone();

    tooth2.position.x =
      0.47;

    tooth2.scale.y =
      0.72;

    this.keyGroup.add(
      ring,
      stem,
      tooth1,
      tooth2,
    );

    this.keyHitbox =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          1.15,
          0.60,
        ),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side:
            THREE.DoubleSide,
        }),
      );

    this.keyHitbox.position.z =
      0.06;

    this.keyGroup.add(
      this.keyHitbox,
    );

    this.root.add(
      this.keyGroup,
    );
  }

  // ==================================================
  // INTERACTION
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
      this.keyAvailable &&
      !this.keyPickedUp &&
      this.keyHitbox &&
      this.pickObject(
        this.keyHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.pickUpKey();
      return;
    }

    if (this.solved) return;

    if (
      !this.pickObject(
        this.knobHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      return;
    }

    this.dragging = true;

    this.pointerId =
      event.pointerId;

    this.canvas.setPointerCapture(
      event.pointerId,
    );

    this.canvas.style.cursor =
      "grabbing";

    gsap.to(
      this.knob.scale,
      {
        x: 1.12,
        y: 1.12,
        z: 1.12,
        duration: 0.08,
      },
    );
  };

  private handlePointerMove = (
    event: PointerEvent,
  ) => {
    if (!this.enabled) return;

    if (
      this.dragging &&
      event.pointerId ===
        this.pointerId
    ) {
      const local =
        this.getPointerLocal(
          event.clientX,
          event.clientY,
        );

      if (!local) return;

      this.moveAlongRail(
        local.x,
        local.y,
      );

      return;
    }

    if (
      this.keyAvailable &&
      !this.keyPickedUp &&
      this.keyHitbox &&
      this.pickObject(
        this.keyHitbox,
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor =
        "pointer";

      return;
    }

    this.canvas.style.cursor =
      !this.solved &&
      this.pickObject(
        this.knobHitbox,
        event.clientX,
        event.clientY,
      )
        ? "grab"
        : "default";
  };

  private handlePointerUp = (
    event: PointerEvent,
  ) => {
    if (
      !this.dragging ||
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

    this.dragging = false;
    this.pointerId = null;

    gsap.to(
      this.knob.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.12,
        ease: "back.out(2)",
      },
    );

    this.canvas.style.cursor =
      "grab";
  };

  private moveAlongRail(
    x: number,
    y: number,
  ) {
    const candidates =
      new Set<number>([
        this.currentEdge,
      ]);

    const current =
      this.edges[
        this.currentEdge
      ];

    if (this.edgeT <= 0.22) {
      for (
        let i = 0;
        i <
        this.edges.length;
        i++
      ) {
        if (
          i ===
          this.currentEdge
        ) {
          continue;
        }

        if (
          this.edges[i][0] ===
            current[0] ||
          this.edges[i][1] ===
            current[0]
        ) {
          candidates.add(i);
        }
      }
    }

    if (this.edgeT >= 0.78) {
      for (
        let i = 0;
        i <
        this.edges.length;
        i++
      ) {
        if (
          i ===
          this.currentEdge
        ) {
          continue;
        }

        if (
          this.edges[i][0] ===
            current[1] ||
          this.edges[i][1] ===
            current[1]
        ) {
          candidates.add(i);
        }
      }
    }

    let bestEdge =
      this.currentEdge;

    let bestT =
      this.edgeT;

    let bestDistance =
      Infinity;

    for (
      const edgeIndex
      of candidates
    ) {
      const projection =
        this.projectToEdge(
          edgeIndex,
          x,
          y,
        );

      if (
        projection.distance <
        bestDistance
      ) {
        bestDistance =
          projection.distance;

        bestEdge =
          edgeIndex;

        bestT =
          projection.t;
      }
    }

    // The knob must stay close to the rail.
    if (
      bestDistance >
      0.32
    ) {
      return;
    }

    this.currentEdge =
      bestEdge;

    this.edgeT =
      THREE.MathUtils.clamp(
        bestT,
        0,
        1,
      );

    if (
      this.edgeT <
      0.055
    ) {
      this.edgeT = 0;
    }

    if (
      this.edgeT >
      0.945
    ) {
      this.edgeT = 1;
    }

    this.updateKnob();
    this.checkCurrentNode();
  }

  private projectToEdge(
    edgeIndex: number,
    x: number,
    y: number,
  ) {
    const [
      startIndex,
      endIndex,
    ] =
      this.edges[
        edgeIndex
      ];

    const a =
      this.nodes[
        startIndex
      ];

    const b =
      this.nodes[
        endIndex
      ];

    const vx =
      b.x - a.x;

    const vy =
      b.y - a.y;

    const lengthSquared =
      vx * vx +
      vy * vy;

    const t =
      THREE.MathUtils.clamp(
        (
          (x - a.x) *
            vx +
          (y - a.y) *
            vy
        ) /
          lengthSquared,
        0,
        1,
      );

    const px =
      a.x +
      vx * t;

    const py =
      a.y +
      vy * t;

    return {
      t,
      distance:
        Math.hypot(
          x - px,
          y - py,
        ),
    };
  }

  private updateKnob() {
    const [
      startIndex,
      endIndex,
    ] =
      this.edges[
        this.currentEdge
      ];

    const a =
      this.nodes[
        startIndex
      ];

    const b =
      this.nodes[
        endIndex
      ];

    this.knob.position.set(
      THREE.MathUtils.lerp(
        a.x,
        b.x,
        this.edgeT,
      ),
      THREE.MathUtils.lerp(
        a.y,
        b.y,
        this.edgeT,
      ),
      0.25,
    );
  }

  private checkCurrentNode() {
    let nodeIndex:
      number | null = null;

    const [
      startIndex,
      endIndex,
    ] =
      this.edges[
        this.currentEdge
      ];

    if (this.edgeT === 0) {
      nodeIndex =
        startIndex;
    } else if (
      this.edgeT === 1
    ) {
      nodeIndex =
        endIndex;
    }

    if (
      nodeIndex === null
    ) {
      return;
    }

    const node =
      this.nodes[
        nodeIndex
      ];

    if (
      node.checkpoint !==
      undefined
    ) {
      this.activateCheckpoint(
        node.checkpoint,
      );
    }

    if (!node.exit) return;

    if (
      this.visitedCheckpoints
        .size === 3
    ) {
      this.solve();
      return;
    }

    this.pulseLockedExit();
  }

  private activateCheckpoint(
    checkpoint: number,
  ) {
    if (
      this.visitedCheckpoints.has(
        checkpoint,
      )
    ) {
      return;
    }

    this.visitedCheckpoints.add(
      checkpoint,
    );

    const light =
      this.checkpointLights[
        checkpoint
      ];

    const material =
      light.material as
        THREE.MeshStandardMaterial;

    material.color.set(
      0xe0ba70,
    );

    material.emissive.set(
      0xc58b35,
    );

    material.emissiveIntensity =
      0.95;

    gsap
      .timeline()
      .to(light.scale, {
        x: 1.35,
        y: 1.35,
        z: 1.35,
        duration: 0.09,
      })
      .to(light.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.16,
        ease: "back.out(2)",
      });

    if (
      this.visitedCheckpoints
        .size === 3 &&
      this.exitLight
    ) {
      const exitMaterial =
        this.exitLight
          .material as
          THREE.MeshStandardMaterial;

      exitMaterial.color.set(
        0xc99d57,
      );

      exitMaterial.emissive.set(
        0x9e692c,
      );

      exitMaterial.emissiveIntensity =
        0.72;
    }
  }

  private pulseLockedExit() {
    if (!this.exitLight) return;

    gsap
      .timeline()
      .to(
        this.exitLight.scale,
        {
          x: 1.24,
          y: 1.24,
          z: 1.24,
          duration: 0.08,
        },
      )
      .to(
        this.exitLight.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.14,
          ease: "back.out(2)",
        },
      );
  }

  // ==================================================
  // SOLVED / REWARD
  // ==================================================

  private solve() {
    if (this.solved) return;

    this.solved = true;
    this.dragging = false;

    gsap
      .timeline()
      .to(
        this.knob.scale,
        {
          x: 1.16,
          y: 1.16,
          z: 1.16,
          duration: 0.10,
        },
      )
      .to(
        this.knob.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.14,
          ease: "back.out(2)",
        },
      )
      .call(() => {
        this.keyGroup.visible =
          true;

        this.keyAvailable =
          true;

        this.keyGroup.scale.setScalar(0.55);
      })
      .to(
        this.keyGroup.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.32,
          ease: "back.out(1.8)",
        },
      )
      .call(() => {
        this.onSolved?.();
      });
  }

  private pickUpKey() {
    if (
      !this.keyAvailable ||
      this.keyPickedUp
    ) {
      return;
    }

    this.keyPickedUp =
      true;

    this.keyAvailable =
      false;

    gsap
      .timeline()
      .to(
        this.keyGroup.position,
        {
          z: 0.60,
          duration: 0.16,
          ease: "power2.out",
        },
      )
      .to(
        this.keyGroup.scale,
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
        this.keyGroup.visible =
          false;

        this.onKeyPickedUp?.();
      });
  }

  // ==================================================
  // HELPERS
  // ==================================================

  private getPointerLocal(
    clientX: number,
    clientY: number,
  ) {
    this.setPointer(
      clientX,
      clientY,
    );

    const hit =
      this.raycaster.intersectObject(
        this.interactionPlane,
        false,
      )[0];

    if (!hit) return null;

    return this.root.worldToLocal(
      hit.point.clone(),
    );
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

  // ==================================================
  // PUBLIC
  // ==================================================

  public setEnabled(
    enabled: boolean,
  ) {
    this.enabled =
      enabled;

    if (!enabled) {
      this.dragging =
        false;

      this.pointerId =
        null;
    }
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
      this.knob.scale,
    );

    gsap.killTweensOf(
      this.keyGroup.position,
    );

    gsap.killTweensOf(
      this.keyGroup.scale,
    );

    if (
      this.exitLight
    ) {
      gsap.killTweensOf(
        this.exitLight.scale,
      );
    }

    for (
      const light
      of this.checkpointLights
    ) {
      if (!light) continue;

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

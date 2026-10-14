import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  export type AssemblyPieceKind =
    | "stem"
    | "upperArc"
    | "lowerArc";
  
  type InteractionMode = "drag" | "rotate" | null;
  
  type AssemblyPieceOptions = {
    stage: Container;
  
    kind: AssemblyPieceKind;
  
    targetX: number;
    targetY: number;
    targetRotation?: number;
  
    positionTolerance?: number;
    rotationTolerance?: number;
  
    onPlaced?: () => void;
  };
  
  // ==================================================
  // 拼片本体
  // ==================================================
  
  export function createAssemblyPieceGraphic(
    kind: AssemblyPieceKind,
    color = 0xb0854d,
    edgeColor = 0xd0a765,
  ) {
    const graphic = new Graphics();
  
    if (kind === "stem") {
      graphic
        .roundRect(-5, -34, 10, 68, 3)
        .fill(color)
        .stroke({
          width: 2,
          color: edgeColor,
        });
  
      return graphic;
    }
  
    // upperArc / lowerArc 使用同一种弧形拼片，
    // 最终位置不同。
    graphic
      .moveTo(-12, -16)
      .bezierCurveTo(
        20, -16,
        20, 16,
        -12, 16,
      )
      .stroke({
        width: 9,
        color,
        cap: "round",
        join: "round",
      });
  
    return graphic;
  }
  
  // ==================================================
  // INTERACTIVE PIECE
  // ==================================================
  
  export class AssemblyPiece extends Container {
    private stage: Container;
  
    private rotateHandle: Container;
  
    private mode: InteractionMode = null;
  
    private enabled = false;
    private placed = false;
  
    private dragOffset = new Point();
  
    private startPointerAngle = 0;
    private startRotation = 0;
  
    private targetX: number;
    private targetY: number;
    private targetRotation: number;
  
    private positionTolerance: number;
    private rotationTolerance: number;
  
    private onPlaced?: () => void;
  
    constructor(options: AssemblyPieceOptions) {
      super();
  
      this.stage = options.stage;
  
      this.targetX = options.targetX;
      this.targetY = options.targetY;
      this.targetRotation = options.targetRotation ?? 0;
  
      this.positionTolerance =
        options.positionTolerance ?? 45;
  
      this.rotationTolerance =
        options.rotationTolerance ?? Math.PI / 18;
  
      this.onPlaced = options.onPlaced;
  
      this.createVisual(options.kind);
  
      this.rotateHandle = this.createRotateHandle();
      this.addChild(this.rotateHandle);
  
      this.on(
        "pointerdown",
        this.handleDragStart,
      );
  
      this.rotateHandle.on(
        "pointerdown",
        this.handleRotateStart,
      );
  
      this.stage.on(
        "pointermove",
        this.handlePointerMove,
      );
  
      this.stage.on(
        "pointerup",
        this.handlePointerUp,
      );
  
      this.stage.on(
        "pointerupoutside",
        this.handlePointerUp,
      );
  
      this.setEnabled(false);
    }
  
    private createVisual(
      kind: AssemblyPieceKind,
    ) {
      // 扩大可抓取范围
      const hit = new Graphics();
  
      if (kind === "stem") {
        hit
          .rect(-17, -42, 34, 84)
          .fill({
            color: 0xffffff,
            alpha: 0.001,
          });
      } else {
        hit
          .rect(-27, -27, 54, 54)
          .fill({
            color: 0xffffff,
            alpha: 0.001,
          });
      }
  
      this.addChild(hit);
  
      // 阴影
      const shadow =
        createAssemblyPieceGraphic(
          kind,
          0x21170f,
          0x21170f,
        );
  
      shadow.position.set(3, 4);
      shadow.alpha = 0.35;
  
      this.addChild(shadow);
  
      // 真正金属片
      const body =
        createAssemblyPieceGraphic(kind);
  
      this.addChild(body);
    }
  
    private createRotateHandle() {
      const handle = new Container();
  
      handle.position.set(22, -25);
  
      // 连杆
      const arm = new Graphics();
  
      arm
        .moveTo(-8, 8)
        .lineTo(-1, 1)
        .stroke({
          width: 2,
          color: 0x88643c,
        });
  
      handle.addChild(arm);
  
      // 旋转钮
      const knob = new Graphics();
  
      knob
        .circle(0, 0, 9)
        .fill(0xc29453)
        .stroke({
          width: 2,
          color: 0xe0b870,
        });
  
      knob
        .circle(0, 0, 3)
        .fill(0x4b3420);
  
      handle.addChild(knob);
  
      return handle;
    }
  
    // ==================================================
    // DRAG
    // ==================================================
  
    private handleDragStart = (
      event: FederatedPointerEvent,
    ) => {
      if (!this.enabled || this.placed) return;
  
      gsap.killTweensOf(this);
  
      this.bringToFront();
  
      this.mode = "drag";
      this.cursor = "grabbing";
  
      const pointer =
        this.parent.toLocal(event.global);
  
      this.dragOffset.set(
        pointer.x - this.x,
        pointer.y - this.y,
      );
    };
  
    // ==================================================
    // ROTATE
    // ==================================================
  
    private handleRotateStart = (
      event: FederatedPointerEvent,
    ) => {
      if (!this.enabled || this.placed) return;
  
      event.stopPropagation();
  
      gsap.killTweensOf(this);
  
      this.bringToFront();
  
      this.mode = "rotate";
  
      this.startPointerAngle =
        this.getPointerAngle(event);
  
      this.startRotation =
        this.rotation;
    };
  
    private handlePointerMove = (
      event: FederatedPointerEvent,
    ) => {
      if (!this.enabled || !this.mode || this.placed) {
        return;
      }
  
      const pointer =
        this.parent.toLocal(event.global);
  
      if (this.mode === "drag") {
        this.position.set(
          pointer.x - this.dragOffset.x,
          pointer.y - this.dragOffset.y,
        );
  
        return;
      }
  
      const currentAngle =
        this.getPointerAngle(event);
  
      const delta =
        this.normalizeAngle(
          currentAngle -
          this.startPointerAngle,
        );
  
      this.rotation =
        this.startRotation + delta;
    };
  
    private handlePointerUp = () => {
      if (!this.enabled || !this.mode || this.placed) {
        return;
      }
  
      const finishedMode = this.mode;
  
      this.mode = null;
      this.cursor = "grab";
  
      if (finishedMode === "drag") {
        this.trySnapPosition();
      } else {
        this.snapRotation();
      }
    };
  
    // ==================================================
    // POSITION SNAP
    // ==================================================
  
    private trySnapPosition() {
      const distance =
        Math.hypot(
          this.x - this.targetX,
          this.y - this.targetY,
        );
  
      if (distance > this.positionTolerance) {
        return;
      }
  
      gsap.to(this, {
        x: this.targetX,
        y: this.targetY,
  
        duration: 0.2,
  
        ease: "back.out(1.4)",
  
        onComplete: () => {
          this.checkPlaced();
        },
      });
    }
  
    // ==================================================
    // ROTATION SNAP
    // ==================================================
  
    private snapRotation() {
      const step = Math.PI / 4;
  
      const snappedRotation =
        Math.round(
          this.rotation / step,
        ) * step;
  
      gsap.to(this, {
        rotation: snappedRotation,
  
        duration: 0.18,
  
        ease: "back.out(1.4)",
  
        onComplete: () => {
          this.checkPlaced();
        },
      });
    }
  
    // ==================================================
    // CHECK
    // ==================================================
  
    private checkPlaced() {
      if (this.placed) return;
  
      const distance =
        Math.hypot(
          this.x - this.targetX,
          this.y - this.targetY,
        );
  
      const rotationDifference =
        Math.abs(
          this.normalizeAngle(
            this.rotation -
            this.targetRotation,
          ),
        );
  
      const positionCorrect =
        distance <= 3;
  
      const rotationCorrect =
        rotationDifference <=
        this.rotationTolerance;
  
      if (
        !positionCorrect ||
        !rotationCorrect
      ) {
        return;
      }
  
      this.finishPlacement();
    }
  
    // ==================================================
    // PIECE PLACED
    // ==================================================
  
    private finishPlacement() {
      this.placed = true;
      this.enabled = false;
  
      this.eventMode = "none";
      this.rotateHandle.eventMode = "none";
  
      const timeline = gsap.timeline();
  
      timeline.to(this.rotateHandle, {
        alpha: 0,
        duration: 0.12,
      });
  
      timeline
        .to(
          this.scale,
          {
            x: 1.06,
            y: 1.06,
            duration: 0.08,
          },
          "<",
        )
        .to(this.scale, {
          x: 1,
          y: 1,
  
          duration: 0.16,
  
          ease: "back.out(2)",
  
          onComplete: () => {
            this.onPlaced?.();
          },
        });
    }
  
    private getPointerAngle(
      event: FederatedPointerEvent,
    ) {
      const pointer =
        this.parent.toLocal(event.global);
  
      return Math.atan2(
        pointer.y - this.y,
        pointer.x - this.x,
      );
    }
  
    private normalizeAngle(
      angle: number,
    ) {
      return Math.atan2(
        Math.sin(angle),
        Math.cos(angle),
      );
    }
  
    private bringToFront() {
      if (!this.parent) return;
  
      this.parent.setChildIndex(
        this,
        this.parent.children.length - 1,
      );
    }
  
    public setEnabled(
      enabled: boolean,
    ) {
      if (this.placed) return;
  
      this.enabled = enabled;
  
      this.eventMode =
        enabled
          ? "static"
          : "none";
  
      this.rotateHandle.eventMode =
        enabled
          ? "static"
          : "none";
  
      this.cursor =
        enabled
          ? "grab"
          : "default";
  
      this.rotateHandle.cursor =
        enabled
          ? "grab"
          : "default";
    }
  
    public dispose() {
      gsap.killTweensOf(this);
      gsap.killTweensOf(this.scale);
      gsap.killTweensOf(this.rotateHandle);
  
      this.off(
        "pointerdown",
        this.handleDragStart,
      );
  
      this.rotateHandle.off(
        "pointerdown",
        this.handleRotateStart,
      );
  
      this.stage.off(
        "pointermove",
        this.handlePointerMove,
      );
  
      this.stage.off(
        "pointerup",
        this.handlePointerUp,
      );
  
      this.stage.off(
        "pointerupoutside",
        this.handlePointerUp,
      );
    }
  }
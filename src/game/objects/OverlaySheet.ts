import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
    Rectangle,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  type InteractionMode = "drag" | "rotate" | null;
  
  type OverlaySheetOptions = {
    stage: Container;
  
    targetX: number;
    targetY: number;
    targetRotation: number;
  
    positionTolerance?: number;
    rotationTolerance?: number;
  
    onSolved?: () => void;
  };
  
  export class OverlaySheet extends Container {
    private stage: Container;
    private rotateHandle: Container;
  
    private mode: InteractionMode = null;
    private enabled = false;
    private solved = false;
  
    private dragOffset = new Point();
  
    private startPointerAngle = 0;
    private startRotation = 0;
  
    private targetX: number;
    private targetY: number;
    private targetRotation: number;
  
    private positionTolerance: number;
    private rotationTolerance: number;
  
    private onSolved?: () => void;
  
    private readonly sheetWidth = 160;
    private readonly sheetHeight = 90;
  
    constructor(options: OverlaySheetOptions) {
      super();
  
      this.stage = options.stage;
  
      this.targetX = options.targetX;
      this.targetY = options.targetY;
      this.targetRotation = options.targetRotation;
  
      this.positionTolerance = options.positionTolerance ?? 70;
      this.rotationTolerance = options.rotationTolerance ?? Math.PI / 18;
  
      this.onSolved = options.onSolved;
  
      this.hitArea = new Rectangle(
        -this.sheetWidth / 2,
        -this.sheetHeight / 2,
        this.sheetWidth,
        this.sheetHeight,
      );
  
      // 阴影
      const shadow = new Graphics();
  
      shadow
        .roundRect(
          -this.sheetWidth / 2 + 5,
          -this.sheetHeight / 2 + 6,
          this.sheetWidth,
          this.sheetHeight,
          7,
        )
        .fill({ color: 0x000000, alpha: 0.25 });
  
      this.addChild(shadow);
  
      // 半透明片
      const body = new Graphics();
  
      body
        .roundRect(
          -this.sheetWidth / 2,
          -this.sheetHeight / 2,
          this.sheetWidth,
          this.sheetHeight,
          7,
        )
        .fill({ color: 0xc7e0e3, alpha: 0.24 })
        .stroke({ width: 2, color: 0xa6c8cc });
  
      this.addChild(body);
  
      // 不对称图案
      const pattern = new Graphics();
  
      pattern
        .circle(-45, 0, 18)
        .stroke({ width: 2, color: 0x9fc2c6 });
  
      pattern
        .circle(45, 0, 9)
        .stroke({ width: 2, color: 0x9fc2c6 });
  
      pattern
        .moveTo(-60, -30)
        .lineTo(60, 30)
        .stroke({ width: 2, color: 0x9fc2c6 });
  
      this.addChild(pattern);
  
      // 右上角旋转把手
      this.rotateHandle = new Container();
      this.rotateHandle.position.set(
        this.sheetWidth / 2 - 13,
        -this.sheetHeight / 2 + 13,
      );
  
      const knob = new Graphics();
  
      knob
        .circle(0, 0, 11)
        .fill(0xc29a5b)
        .stroke({ width: 2, color: 0x594226 });
  
      // 一个小箭头，暗示这里可以旋转
      knob
        .poly([2, -7, 8, -5, 5, 1])
        .fill(0x49351f);
  
      this.rotateHandle.addChild(knob);
      this.addChild(this.rotateHandle);
  
      this.on("pointerdown", this.handleDragStart);
      this.rotateHandle.on("pointerdown", this.handleRotateStart);
  
      this.stage.on("pointermove", this.handlePointerMove);
      this.stage.on("pointerup", this.handlePointerUp);
      this.stage.on("pointerupoutside", this.handlePointerUp);
  
      this.setEnabled(false);
    }
  
    private handleDragStart = (event: FederatedPointerEvent) => {
      if (!this.enabled || this.solved) return;
  
      gsap.killTweensOf(this);
  
      this.mode = "drag";
      this.cursor = "grabbing";
  
      const pointer = this.parent.toLocal(event.global);
  
      this.dragOffset.set(
        pointer.x - this.x,
        pointer.y - this.y,
      );
    };
  
    private handleRotateStart = (event: FederatedPointerEvent) => {
      if (!this.enabled || this.solved) return;
  
      event.stopPropagation();
  
      gsap.killTweensOf(this);
  
      this.mode = "rotate";
      this.cursor = "grabbing";
  
      this.startPointerAngle = this.getPointerAngle(event);
      this.startRotation = this.rotation;
    };
  
    private handlePointerMove = (event: FederatedPointerEvent) => {
      if (!this.enabled || !this.mode) return;
  
      const pointer = this.parent.toLocal(event.global);
  
      if (this.mode === "drag") {
        this.position.set(
          pointer.x - this.dragOffset.x,
          pointer.y - this.dragOffset.y,
        );
  
        return;
      }
  
      const currentAngle = this.getPointerAngle(event);
      const delta = this.normalizeAngle(
        currentAngle - this.startPointerAngle,
      );
  
      this.rotation = this.startRotation + delta;
    };
  
    private handlePointerUp = () => {
      if (!this.enabled || !this.mode) return;
  
      const finishedMode = this.mode;
  
      this.mode = null;
      this.cursor = "grab";
  
      if (finishedMode === "rotate") {
        this.snapRotation();
      } else {
        this.snapPosition();
      }
    };
  
    private getPointerAngle(event: FederatedPointerEvent) {
      const pointer = this.parent.toLocal(event.global);
  
      return Math.atan2(
        pointer.y - this.y,
        pointer.x - this.x,
      );
    }
  
    // 拖到目标附近时自动吸附中心
    private snapPosition() {
      const distance = Math.hypot(
        this.x - this.targetX,
        this.y - this.targetY,
      );
  
      if (distance > this.positionTolerance) return;
  
      gsap.to(this, {
        x: this.targetX,
        y: this.targetY,
        duration: 0.22,
        ease: "back.out(1.4)",
        onComplete: () => this.checkSolved(),
      });
    }
  
    // 旋转松手后吸附到最近 45°
    private snapRotation() {
      const step = Math.PI / 4;
      const snappedRotation = Math.round(this.rotation / step) * step;
  
      gsap.to(this, {
        rotation: snappedRotation,
        duration: 0.18,
        ease: "back.out(1.4)",
        onComplete: () => this.checkSolved(),
      });
    }
  
    private checkSolved() {
      if (this.solved) return;
  
      const distance = Math.hypot(
        this.x - this.targetX,
        this.y - this.targetY,
      );
  
      const rotationDifference = Math.abs(
        this.normalizeAngle(this.rotation - this.targetRotation),
      );
  
      const positionCorrect = distance <= 4;
      const rotationCorrect = rotationDifference <= this.rotationTolerance;
  
      if (!positionCorrect || !rotationCorrect) return;
  
      this.solve();
    }
  
    private solve() {
      this.solved = true;
      this.setEnabled(false);
  
      gsap.to(this, {
        x: this.targetX,
        y: this.targetY,
        rotation: this.targetRotation,
        duration: 0.2,
        ease: "power2.out",
      });
  
      gsap
        .timeline()
        .to(this.scale, {
          x: 1.05,
          y: 1.05,
          duration: 0.1,
        })
        .to(this.scale, {
          x: 1,
          y: 1,
          duration: 0.18,
          ease: "back.out(2)",
          onComplete: () => this.onSolved?.(),
        });
    }
  
    private normalizeAngle(angle: number) {
      return Math.atan2(Math.sin(angle), Math.cos(angle));
    }
  
    public setEnabled(enabled: boolean) {
      if (this.solved) return;
  
      this.enabled = enabled;
  
      this.eventMode = enabled ? "static" : "none";
      this.rotateHandle.eventMode = enabled ? "static" : "none";
  
      this.cursor = enabled ? "grab" : "default";
      this.rotateHandle.cursor = enabled ? "grab" : "default";
    }
  
    public dispose() {
      gsap.killTweensOf(this);
      gsap.killTweensOf(this.scale);
  
      this.off("pointerdown", this.handleDragStart);
      this.rotateHandle.off("pointerdown", this.handleRotateStart);
  
      this.stage.off("pointermove", this.handlePointerMove);
      this.stage.off("pointerup", this.handlePointerUp);
      this.stage.off("pointerupoutside", this.handlePointerUp);
    }
  }
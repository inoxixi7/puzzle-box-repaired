import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Rectangle,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  type MechanicalLeverOptions = {
    stage: Container;
    initialPosition?: number;
    onChange?: (position: number) => void;
  };
  
  export class MechanicalLever extends Container {
    private stage: Container;
    private handle: Container;
  
    private enabled = false;
    private dragging = false;
  
    private dragOffsetY = 0;
  
    private currentPosition: number;
    private onChange?: (position: number) => void;
  
    // 0 = 上
    // 1 = 中
    // 2 = 下
    private readonly positions = [-27, 0, 27];
  
    constructor(options: MechanicalLeverOptions) {
      super();
  
      this.stage = options.stage;
      this.currentPosition = options.initialPosition ?? 1;
      this.onChange = options.onChange;
  
      this.createTrack();
  
      this.handle = this.createHandle();
      this.handle.y = this.positions[this.currentPosition];
  
      this.addChild(this.handle);
  
      // ==================================================
      // 整根推杆都可以响应拖动
      //
      // 不再只让那个很小的金色把手接收 Pointer。
      // 对桌面和手机都会更容易操作。
      // ==================================================
  
      this.hitArea = new Rectangle(-24, -47, 48, 94);
  
      this.on("pointerdown", this.handlePointerDown);
  
      // 使用 stage 继续追踪拖动。
      // 即使鼠标离开推杆本身，也不会中断。
      this.stage.on("pointermove", this.handlePointerMove);
      this.stage.on("pointerup", this.handlePointerUp);
      this.stage.on("pointerupoutside", this.handlePointerUp);
  
      this.setEnabled(false);
    }
  
    // ==================================================
    // TRACK
    // ==================================================
  
    private createTrack() {
      const outer = new Graphics();
  
      outer
        .roundRect(-14, -42, 28, 84, 8)
        .fill(0x20170f)
        .stroke({
          width: 2,
          color: 0x8a653d,
        });
  
      this.addChild(outer);
  
      const slot = new Graphics();
  
      slot
        .roundRect(-5, -34, 10, 68, 4)
        .fill(0x0f0c09)
        .stroke({
          width: 1,
          color: 0x4c3826,
        });
  
      this.addChild(slot);
  
      // 三个档位点
      const detents = new Graphics();
  
      for (const y of this.positions) {
        detents
          .circle(0, y, 3.5)
          .fill(0x8f6a3f)
          .stroke({
            width: 1,
            color: 0x2d2016,
          });
      }
  
      this.addChild(detents);
    }
  
    // ==================================================
    // HANDLE
    // ==================================================
  
    private createHandle() {
      const handle = new Container();
  
      const shadow = new Graphics();
  
      shadow
        .roundRect(-20, -8, 42, 20, 6)
        .fill({
          color: 0x000000,
          alpha: 0.32,
        });
  
      shadow.position.y = 2;
  
      const knob = new Graphics();
  
      knob
        .roundRect(-21, -10, 42, 20, 6)
        .fill(0xb4864b)
        .stroke({
          width: 2,
          color: 0xd3a966,
        });
  
      // 中央螺丝
      const screw = new Graphics();
  
      screw
        .circle(0, 0, 4)
        .fill(0x49331f)
        .stroke({
          width: 1,
          color: 0xd0a05c,
        });
  
      screw
        .moveTo(-2.5, 0)
        .lineTo(2.5, 0)
        .stroke({
          width: 1,
          color: 0x1e160f,
        });
  
      handle.addChild(shadow, knob, screw);
  
      return handle;
    }
  
    // ==================================================
    // POINTER DOWN
    // ==================================================
  
    private handlePointerDown = (event: FederatedPointerEvent) => {
      if (!this.enabled) return;
  
      event.stopPropagation();
  
      gsap.killTweensOf(this.handle);
  
      this.dragging = true;
      this.cursor = "grabbing";
  
      // 点击以后稍微放大，明确告诉玩家：
      // 这个东西正在被抓住。
      gsap.to(this.handle.scale, {
        x: 1.08,
        y: 1.08,
        duration: 0.08,
        ease: "power2.out",
      });
  
      const pointer = this.toLocal(event.global);
  
      this.dragOffsetY = pointer.y - this.handle.y;
    };
  
    // ==================================================
    // POINTER MOVE
    // ==================================================
  
    private handlePointerMove = (event: FederatedPointerEvent) => {
      if (!this.enabled || !this.dragging) return;
  
      const pointer = this.toLocal(event.global);
  
      const minY = this.positions[0];
      const maxY = this.positions[this.positions.length - 1];
  
      const requestedY = pointer.y - this.dragOffsetY;
  
      // 限制在轨道内部
      this.handle.y = Math.max(
        minY,
        Math.min(maxY, requestedY),
      );
    };
  
    // ==================================================
    // POINTER UP
    // ==================================================
  
    private handlePointerUp = () => {
      if (!this.enabled || !this.dragging) return;
  
      this.dragging = false;
      this.cursor = "ns-resize";
  
      gsap.to(this.handle.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        ease: "power2.out",
      });
  
      this.snapToNearestPosition();
    };
  
    // ==================================================
    // SNAP
    // ==================================================
  
    private snapToNearestPosition() {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
  
      this.positions.forEach((position, index) => {
        const distance = Math.abs(
          this.handle.y - position,
        );
  
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
  
      const targetY = this.positions[nearestIndex];
  
      gsap.to(this.handle, {
        y: targetY,
        duration: 0.16,
        ease: "back.out(1.7)",
  
        onComplete: () => {
          const changed =
            nearestIndex !== this.currentPosition;
  
          this.currentPosition = nearestIndex;
  
          if (changed) {
            this.playDetentFeedback();
            this.onChange?.(nearestIndex);
          }
        },
      });
    }
  
    // ==================================================
    // 档位机械反馈
    // ==================================================
  
    private playDetentFeedback() {
      gsap
        .timeline()
        .to(this.handle.scale, {
          x: 1.05,
          y: 0.94,
          duration: 0.05,
        })
        .to(this.handle.scale, {
          x: 1,
          y: 1,
          duration: 0.1,
          ease: "back.out(2)",
        });
    }
  
    // ==================================================
    // PUBLIC
    // ==================================================
  
    public getPosition() {
      return this.currentPosition;
    }
  
    public setEnabled(enabled: boolean) {
      this.enabled = enabled;
  
      // 非常重要：
      // 事件挂在整个 MechanicalLever 上，
      // 不是只挂小把手。
      this.eventMode = enabled
        ? "static"
        : "none";
  
      this.cursor = enabled
        ? "ns-resize"
        : "default";
  
      this.alpha = enabled
        ? 1
        : 0.82;
    }
  
    public dispose() {
      gsap.killTweensOf(this);
      gsap.killTweensOf(this.handle);
      gsap.killTweensOf(this.handle.scale);
  
      this.off(
        "pointerdown",
        this.handlePointerDown,
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
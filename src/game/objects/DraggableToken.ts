import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  type DraggableTokenOptions = {
    stage: Container;
  
    targetX: number;
    targetY: number;
  
    snapDistance?: number;
  
    onSnap?: () => void;
  };
  
  export class DraggableToken extends Container {
    private stage: Container;
  
    private dragging = false;
  
    private dragOffset = new Point();
  
    // ==========================================
    // 吸附目标
    // ==========================================
  
    private targetX: number;
    private targetY: number;
  
    private snapDistance: number;
  
    // ==========================================
    // 是否已经锁定
    // ==========================================
  
    private snapped = false;
  
    private onSnap?: () => void;
  
    constructor(options: DraggableTokenOptions) {
      super();
  
      this.stage = options.stage;
  
      this.targetX = options.targetX;
      this.targetY = options.targetY;
  
      this.snapDistance =
        options.snapDistance ?? 90;
  
      this.onSnap = options.onSnap;
  
      // ==========================================
      // 外圈
      // ==========================================
  
      const outer = new Graphics();
  
      outer
        .circle(0, 0, 50)
        .fill(0x5b4528);
  
      this.addChild(outer);
  
      // ==========================================
      // 黄铜圆片
      // ==========================================
  
      const body = new Graphics();
  
      body
        .circle(0, 0, 42)
        .fill(0xc29a5b)
        .stroke({
          width: 3,
          color: 0xe0bd7c,
        });
  
      this.addChild(body);
  
      // ==========================================
      // 中央标记
      // ==========================================
  
      const mark = new Graphics();
  
      mark
        .circle(0, 0, 8)
        .fill(0x5b4528);
  
      this.addChild(mark);
  
      // ==========================================
      // 交互
      // ==========================================
  
      this.eventMode = "static";
  
      this.cursor = "grab";
  
      this.on(
        "pointerdown",
        this.handlePointerDown,
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
    }
  
    // ==========================================
    // 开始拖动
    // ==========================================
  
    private handlePointerDown = (
      event: FederatedPointerEvent,
    ) => {
      // 已经放进机关以后不能再拖
      if (this.snapped) {
        return;
      }
  
      // 如果前一个动画还没结束，先停止
      gsap.killTweensOf(this);
      gsap.killTweensOf(this.scale);
  
      this.dragging = true;
  
      this.cursor = "grabbing";
  
      this.alpha = 0.88;
  
      const localPosition =
        this.parent.toLocal(event.global);
  
      // 防止点圆片边缘时，
      // 圆片突然跳到鼠标中心
      this.dragOffset.set(
        localPosition.x - this.x,
        localPosition.y - this.y,
      );
    };
  
    // ==========================================
    // 拖动中
    // ==========================================
  
    private handlePointerMove = (
      event: FederatedPointerEvent,
    ) => {
      if (!this.dragging) {
        return;
      }
  
      const localPosition =
        this.parent.toLocal(event.global);
  
      this.position.set(
        localPosition.x - this.dragOffset.x,
        localPosition.y - this.dragOffset.y,
      );
    };
  
    // ==========================================
    // 松手
    // ==========================================
  
    private handlePointerUp = () => {
      if (!this.dragging) {
        return;
      }
  
      this.dragging = false;
  
      this.cursor = "grab";
  
      this.alpha = 1;
  
      // 判断是否足够接近目标
      if (this.isNearTarget()) {
        this.snapToTarget();
      }
    };
  
    // ==========================================
    // 检查离目标有多远
    // ==========================================
  
    private isNearTarget() {
      const dx =
        this.x - this.targetX;
  
      const dy =
        this.y - this.targetY;
  
      const distance =
        Math.sqrt(
          dx * dx + dy * dy,
        );
  
      return (
        distance <=
        this.snapDistance
      );
    }
  
    // ==========================================
    // 自动吸附
    // ==========================================
  
    private snapToTarget() {
      if (this.snapped) {
        return;
      }
  
      this.snapped = true;
  
      this.cursor = "default";
  
      // ==========================================
      // 第一段：
      // 滑入目标中心
      // ==========================================
  
      gsap.to(this, {
        x: this.targetX,
        y: this.targetY,
  
        duration: 0.28,
  
        ease: "back.out(1.7)",
  
        onComplete: () => {
          this.playLockAnimation();
  
          this.onSnap?.();
        },
      });
    }
  
    // ==========================================
    // 锁定后的轻微机械反馈
    // ==========================================
  
    private playLockAnimation() {
      const timeline =
        gsap.timeline();
  
      timeline
        .to(this.scale, {
          x: 1.08,
          y: 1.08,
  
          duration: 0.08,
  
          ease: "power2.out",
        })
        .to(this.scale, {
          x: 0.97,
          y: 0.97,
  
          duration: 0.07,
  
          ease: "power2.inOut",
        })
        .to(this.scale, {
          x: 1,
          y: 1,
  
          duration: 0.12,
  
          ease: "back.out(2)",
        });
    }
  
    // ==========================================
    // 清理
    // ==========================================
  
    public dispose() {
      gsap.killTweensOf(this);
      gsap.killTweensOf(this.scale);
  
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
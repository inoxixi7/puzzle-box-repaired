import {
    Circle,
    Container,
    FederatedPointerEvent,
    Graphics,
    Text,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  type RotatableDialOptions = {
    stage: Container;
  
    segments?: number;
  
    onSnap?: (index: number) => void;
  };
  
  export class RotatableDial extends Container {
    private stage: Container;
  
    // 真正旋转的是 wheel，
    // 外面的固定指针不会跟着转
    private wheel: Container;
  
    private rotating = false;
  
    private lastPointerAngle = 0;
  
    private segments: number;
  
    private onSnap?: (
      index: number,
    ) => void;
  
    constructor(
      options: RotatableDialOptions,
    ) {
      super();
  
      this.stage =
        options.stage;
  
      this.segments =
        options.segments ?? 8;
  
      this.onSnap =
        options.onSnap;
  
      // ==========================================
      // 整个圆盘的可点击区域
      // ==========================================
  
      this.eventMode =
        "static";
  
      this.cursor =
        "grab";
  
      this.hitArea =
        new Circle(
          0,
          0,
          82,
        );
  
      // ==========================================
      // 底座
      // ==========================================
  
      const base =
        new Graphics();
  
      base
        .circle(
          0,
          0,
          82,
        )
        .fill(
          0x2d2117,
        )
        .stroke({
          width: 5,
          color: 0x17110c,
        });
  
      this.addChild(base);
  
      // ==========================================
      // 可旋转部分
      // ==========================================
  
      this.wheel =
        new Container();
  
      this.addChild(
        this.wheel,
      );
  
      // ==========================================
      // 黄铜圆盘
      // ==========================================
  
      const dialBody =
        new Graphics();
  
      dialBody
        .circle(
          0,
          0,
          70,
        )
        .fill(
          0xa97f45,
        )
        .stroke({
          width: 4,
          color: 0xd0a867,
        });
  
      this.wheel.addChild(
        dialBody,
      );
  
      // ==========================================
      // 8 个位置
      // ==========================================
  
      this.createNumbers();
  
      // ==========================================
      // 中心轴
      // ==========================================
  
      const hub =
        new Graphics();
  
      hub
        .circle(
          0,
          0,
          16,
        )
        .fill(
          0x45321e,
        )
        .stroke({
          width: 3,
          color: 0xe0bd7c,
        });
  
      this.wheel.addChild(
        hub,
      );
  
      // ==========================================
      // 顶部固定指针
      // ==========================================
  
      const pointer =
        new Graphics();
  
      pointer
        .poly([
          -10,
          -96,
  
          10,
          -96,
  
          0,
          -80,
        ])
        .fill(
          0xe7c77e,
        );
  
      this.addChild(
        pointer,
      );
  
      // ==========================================
      // Events
      // ==========================================
  
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
    // 创建圆盘上的数字
    // ==========================================
  
    private createNumbers() {
      const radius = 48;
  
      const step =
        (Math.PI * 2) /
        this.segments;
  
      for (
        let i = 0;
        i < this.segments;
        i++
      ) {
        // 从正上方开始
        const angle =
          -Math.PI / 2 +
          i * step;
  
        // ------------------------------
        // 小刻度点
        // ------------------------------
  
        const tick =
          new Graphics();
  
        const tickX =
          Math.cos(angle) *
          62;
  
        const tickY =
          Math.sin(angle) *
          62;
  
        tick
          .circle(
            tickX,
            tickY,
            3,
          )
          .fill(
            0x4d371f,
          );
  
        this.wheel.addChild(
          tick,
        );
  
        // ------------------------------
        // 数字
        // ------------------------------
  
        const number =
          new Text({
            text:
              String(i),
  
            style: {
              fontFamily:
                "Arial",
  
              fontSize: 18,
  
              fill:
                0x2d2117,
  
              fontWeight:
                "bold",
            },
          });
  
        number.anchor.set(
          0.5,
        );
  
        number.position.set(
          Math.cos(angle) *
            radius,
  
          Math.sin(angle) *
            radius,
        );
  
        this.wheel.addChild(
          number,
        );
      }
    }
  
    // ==========================================
    // 开始旋转
    // ==========================================
  
    private handlePointerDown = (
      event: FederatedPointerEvent,
    ) => {
      gsap.killTweensOf(
        this.wheel,
      );
  
      this.rotating = true;
  
      this.cursor =
        "grabbing";
  
      this.lastPointerAngle =
        this.getPointerAngle(
          event,
        );
    };
  
    // ==========================================
    // 旋转中
    // ==========================================
  
    private handlePointerMove = (
      event: FederatedPointerEvent,
    ) => {
      if (!this.rotating) {
        return;
      }
  
      const currentAngle =
        this.getPointerAngle(
          event,
        );
  
      let delta =
        currentAngle -
        this.lastPointerAngle;
  
      // ==========================================
      // 处理跨越 -180° / +180° 的情况
      // ==========================================
  
      if (
        delta >
        Math.PI
      ) {
        delta -=
          Math.PI * 2;
      }
  
      if (
        delta <
        -Math.PI
      ) {
        delta +=
          Math.PI * 2;
      }
  
      // ==========================================
      // 应用旋转
      // ==========================================
  
      this.wheel.rotation +=
        delta;
  
      this.lastPointerAngle =
        currentAngle;
    };
  
    // ==========================================
    // 松手
    // ==========================================
  
    private handlePointerUp =
      () => {
        if (
          !this.rotating
        ) {
          return;
        }
  
        this.rotating =
          false;
  
        this.cursor =
          "grab";
  
        this.snapToNearestStep();
      };
  
    // ==========================================
    // 获取鼠标相对于圆盘中心的角度
    // ==========================================
  
    private getPointerAngle(
      event: FederatedPointerEvent,
    ) {
      const pointer =
        this.parent.toLocal(
          event.global,
        );
  
      const dx =
        pointer.x -
        this.x;
  
      const dy =
        pointer.y -
        this.y;
  
      return Math.atan2(
        dy,
        dx,
      );
    }
  
    // ==========================================
    // 吸附到最近刻度
    // ==========================================
  
    private snapToNearestStep() {
      const fullCircle =
        Math.PI * 2;
  
      const step =
        fullCircle /
        this.segments;
  
      // 找出最近的刻度
      const nearestStep =
        Math.round(
          this.wheel.rotation /
            step,
        );
  
      const targetRotation =
        nearestStep *
        step;
  
      // ==========================================
      // 计算当前位置代表哪个 index
      // ==========================================
  
      let index =
        -nearestStep;
  
      index =
        index %
        this.segments;
  
      if (
        index < 0
      ) {
        index +=
          this.segments;
      }
  
      // ==========================================
      // GSAP 自动吸附
      // ==========================================
  
      gsap.to(
        this.wheel,
        {
          rotation:
            targetRotation,
  
          duration:
            0.22,
  
          ease:
            "back.out(1.8)",
  
          onComplete:
            () => {
              this.onSnap?.(
                index,
              );
            },
        },
      );
    }
  
    // ==========================================
    // 清理
    // ==========================================
  
    public dispose() {
      gsap.killTweensOf(
        this.wheel,
      );
  
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
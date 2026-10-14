import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Rectangle,
    Text,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  type NumberWheelOptions = {
    stage: Container;
    initialValue?: number;
    width?: number;
    height?: number;
    onChange?: (value: number) => void;
  };
  
  export class NumberWheel extends Container {
    private stage: Container;
    private strip: Container;
  
    private dragging = false;
    private enabled = true;
  
    private startPointerY = 0;
    private startStripY = 0;
  
    private readonly rowHeight = 42;
    private readonly wheelWidth: number;
    private readonly wheelHeight: number;
  
    private value: number;
    private onChange?: (value: number) => void;
  
    constructor(options: NumberWheelOptions) {
      super();
  
      this.stage = options.stage;
      this.value = options.initialValue ?? 0;
      this.wheelWidth = options.width ?? 56;
      this.wheelHeight = options.height ?? 92;
      this.onChange = options.onChange;
  
      this.eventMode = "static";
      this.cursor = "ns-resize";
      this.hitArea = new Rectangle(
        -this.wheelWidth / 2,
        -this.wheelHeight / 2,
        this.wheelWidth,
        this.wheelHeight,
      );
  
      // 背景
      const background = new Graphics();
      background
        .roundRect(
          -this.wheelWidth / 2,
          -this.wheelHeight / 2,
          this.wheelWidth,
          this.wheelHeight,
          8,
        )
        .fill(0x151515)
        .stroke({ width: 2, color: 0x5b4932 });
  
      this.addChild(background);
  
      // 数字容器
      this.strip = new Container();
      this.addChild(this.strip);
  
      this.createDigits();
  
      // 中间选择区域
      const selection = new Graphics();
      selection
        .roundRect(
          -this.wheelWidth / 2 + 3,
          -this.rowHeight / 2,
          this.wheelWidth - 6,
          this.rowHeight,
          5,
        )
        .fill({ color: 0xc39a5b, alpha: 0.14 })
        .stroke({ width: 1, color: 0xb68c4d });
  
      this.addChild(selection);
  
      // 上下遮罩
      const mask = new Graphics();
      mask.rect(
        -this.wheelWidth / 2,
        -this.wheelHeight / 2,
        this.wheelWidth,
        this.wheelHeight,
      ).fill(0xffffff);
  
      this.addChild(mask);
      this.strip.mask = mask;
  
      this.strip.y = -this.value * this.rowHeight;
  
      this.on("pointerdown", this.handlePointerDown);
      this.stage.on("pointermove", this.handlePointerMove);
      this.stage.on("pointerup", this.handlePointerUp);
      this.stage.on("pointerupoutside", this.handlePointerUp);
    }
  
    private createDigits() {
      // 多画几轮 0~9，让数字能够循环滚动
      for (let index = -30; index <= 39; index++) {
        const value = this.mod10(index);
  
        const text = new Text({
          text: String(value),
          style: {
            fontFamily: "Arial",
            fontSize: 26,
            fill: 0xf2e4cb,
            fontWeight: "bold",
          },
        });
  
        text.anchor.set(0.5);
        text.position.set(0, index * this.rowHeight);
        this.strip.addChild(text);
      }
    }
  
    private handlePointerDown = (event: FederatedPointerEvent) => {
      if (!this.enabled) return;
  
      gsap.killTweensOf(this.strip);
  
      this.dragging = true;
      this.cursor = "grabbing";
  
      const pointer = this.parent.toLocal(event.global);
      this.startPointerY = pointer.y;
      this.startStripY = this.strip.y;
    };
  
    private handlePointerMove = (event: FederatedPointerEvent) => {
      if (!this.dragging || !this.enabled) return;
  
      const pointer = this.parent.toLocal(event.global);
      const deltaY = pointer.y - this.startPointerY;
  
      this.strip.y = this.startStripY + deltaY;
    };
  
    private handlePointerUp = () => {
      if (!this.dragging || !this.enabled) return;
  
      this.dragging = false;
      this.cursor = "ns-resize";
  
      this.snapToNearestNumber();
    };
  
    private snapToNearestNumber() {
      const targetIndex = Math.round(-this.strip.y / this.rowHeight);
      const targetY = -targetIndex * this.rowHeight;
      const newValue = this.mod10(targetIndex);
  
      gsap.to(this.strip, {
        y: targetY,
        duration: 0.18,
        ease: "back.out(1.4)",
  
        onComplete: () => {
          this.value = newValue;
  
          // 重置到中间的一组 0~9，避免一直滚动最终超出数字范围
          this.strip.y = -newValue * this.rowHeight;
  
          this.onChange?.(newValue);
        },
      });
    }
  
    private mod10(value: number) {
      return ((value % 10) + 10) % 10;
    }
  
    public getValue() {
      return this.value;
    }
  
    public setEnabled(enabled: boolean) {
      this.enabled = enabled;
      this.eventMode = enabled ? "static" : "none";
      this.cursor = enabled ? "ns-resize" : "default";
    }
  
    public dispose() {
      gsap.killTweensOf(this.strip);
  
      this.off("pointerdown", this.handlePointerDown);
      this.stage.off("pointermove", this.handlePointerMove);
      this.stage.off("pointerup", this.handlePointerUp);
      this.stage.off("pointerupoutside", this.handlePointerUp);
    }
  }
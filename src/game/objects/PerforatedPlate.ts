import {
    Container,
    FederatedPointerEvent,
    Graphics,
    Point,
  } from "pixi.js";
  
  import { gsap } from "gsap";
  
  export const PLATE_COLUMN_X = [-24, -8, 8, 24] as const;
  export const PLATE_ROW_Y = [-24, 0, 24] as const;
  
  // 第1列：下
  // 第2列：上
  // 第3列：中
  // 第4列：下
  export const PLATE_HOLE_ROWS = [2, 0, 1, 2] as const;
  
  type PerforatedPlateOptions = {
    stage: Container;
  
    targetX: number;
    targetY: number;
  
    snapDistance?: number;
  
    onInserted?: () => void;
  };
  
  export class PerforatedPlate extends Container {
    private stage: Container;
  
    private targetX: number;
    private targetY: number;
    private snapDistance: number;
  
    private dragging = false;
    private enabled = false;
    private inserted = false;
  
    private dragOffset = new Point();
  
    private holeGlows: Graphics[] = [];
  
    private onInserted?: () => void;
  
    constructor(options: PerforatedPlateOptions) {
      super();
  
      this.stage = options.stage;
  
      this.targetX = options.targetX;
      this.targetY = options.targetY;
  
      this.snapDistance = options.snapDistance ?? 75;
      this.onInserted = options.onInserted;
  
      this.createVisual();
  
      this.eventMode = "none";
      this.cursor = "default";
  
      this.on("pointerdown", this.handlePointerDown);
  
      this.stage.on("pointermove", this.handlePointerMove);
      this.stage.on("pointerup", this.handlePointerUp);
      this.stage.on("pointerupoutside", this.handlePointerUp);
    }
  
    private createVisual() {
      // 阴影
      const shadow = new Graphics();
  
      shadow
        .roundRect(-33, -40, 72, 88, 6)
        .fill({ color: 0x000000, alpha: 0.3 });
  
      this.addChild(shadow);
  
      // 黄铜金属板
      const body = new Graphics();
  
      body
        .roundRect(-36, -44, 72, 88, 6)
        .fill(0x9a713f)
        .stroke({ width: 3, color: 0xc69a59 });
  
      this.addChild(body);
  
      // 四角铆钉
      const rivets = new Graphics();
  
      for (const [x, y] of [
        [-27, -35],
        [27, -35],
        [-27, 35],
        [27, 35],
      ]) {
        rivets
          .circle(x, y, 2.5)
          .fill(0x49331f);
      }
  
      this.addChild(rivets);
  
      // 四个孔洞
      PLATE_HOLE_ROWS.forEach((row, column) => {
        const x = PLATE_COLUMN_X[column];
        const y = PLATE_ROW_Y[row];
  
        const hole = new Graphics();
  
        hole
          .circle(x, y, 6)
          .fill(0x1b1510)
          .stroke({ width: 2, color: 0x503820 });
  
        this.addChild(hole);
  
        // 插入机关以后从孔里亮起来
        const glow = new Graphics();
  
        glow
          .circle(x, y, 4.5)
          .fill(0xe0bd72);
  
        glow.alpha = 0;
  
        this.holeGlows.push(glow);
        this.addChild(glow);
      });
    }
  
    private handlePointerDown = (event: FederatedPointerEvent) => {
      if (!this.enabled || this.inserted) return;
  
      gsap.killTweensOf(this);
  
      this.dragging = true;
      this.cursor = "grabbing";
  
      const pointer = this.parent.toLocal(event.global);
  
      this.dragOffset.set(
        pointer.x - this.x,
        pointer.y - this.y,
      );
    };
  
    private handlePointerMove = (event: FederatedPointerEvent) => {
      if (!this.dragging || !this.enabled || this.inserted) return;
  
      const pointer = this.parent.toLocal(event.global);
  
      this.position.set(
        pointer.x - this.dragOffset.x,
        pointer.y - this.dragOffset.y,
      );
    };
  
    private handlePointerUp = () => {
      if (!this.dragging || !this.enabled || this.inserted) return;
  
      this.dragging = false;
      this.cursor = "grab";
  
      this.tryInsert();
    };
  
    private tryInsert() {
      const distance = Math.hypot(
        this.x - this.targetX,
        this.y - this.targetY,
      );
  
      if (distance > this.snapDistance) return;
  
      this.inserted = true;
      this.enabled = false;
  
      this.eventMode = "none";
      this.cursor = "default";
  
      gsap.to(this, {
        x: this.targetX,
        y: this.targetY,
        duration: 0.3,
        ease: "back.out(1.4)",
        onComplete: () => this.playInsertedAnimation(),
      });
    }
  
    private playInsertedAnimation() {
      const timeline = gsap.timeline();
  
      timeline
        .to(this.scale, {
          x: 1.035,
          y: 1.035,
          duration: 0.08,
        })
        .to(this.scale, {
          x: 1,
          y: 1,
          duration: 0.14,
          ease: "back.out(2)",
        });
  
      this.holeGlows.forEach((glow, index) => {
        timeline.fromTo(
          glow,
          { alpha: 0 },
          {
            alpha: 1,
            duration: 0.12,
          },
          index * 0.08,
        );
  
        timeline.fromTo(
          glow.scale,
          {
            x: 0.5,
            y: 0.5,
          },
          {
            x: 1,
            y: 1,
            duration: 0.16,
            ease: "back.out(2)",
          },
          index * 0.08,
        );
      });
  
      timeline.call(() => {
        this.onInserted?.();
      });
    }
  
    public setEnabled(enabled: boolean) {
      if (this.inserted) return;
  
      this.enabled = enabled;
  
      this.eventMode = enabled ? "static" : "none";
      this.cursor = enabled ? "grab" : "default";
    }
  
    public dispose() {
      gsap.killTweensOf(this);
      gsap.killTweensOf(this.scale);
  
      for (const glow of this.holeGlows) {
        gsap.killTweensOf(glow);
        gsap.killTweensOf(glow.scale);
      }
  
      this.off("pointerdown", this.handlePointerDown);
  
      this.stage.off("pointermove", this.handlePointerMove);
      this.stage.off("pointerup", this.handlePointerUp);
      this.stage.off("pointerupoutside", this.handlePointerUp);
    }
  }
import {
    Circle,
    Container,
    FederatedPointerEvent,
    Graphics,
} from "pixi.js";

import { gsap } from "gsap";

import { createDirectionArrow } from "../utils/directions";

type DirectionSequenceDialOptions = {
    stage: Container;
    correctSequence: number[];
    onSolved?: () => void;
};

export class DirectionSequenceDial extends Container {
    private stage: Container;

    private wheel: Container;
    private centerButton: Container;
    private buttonHint: Graphics;

    private correctSequence: number[];
    private progressLights: Graphics[] = [];

    private enabled = false;
    private rotating = false;
    private snapping = false;
    private solved = false;

    private startPointerAngle = 0;
    private startRotation = 0;

    private currentIndex = 0;
    private progress = 0;

    private onSolved?: () => void;

    constructor(options: DirectionSequenceDialOptions) {
        super();

        this.stage = options.stage;
        this.correctSequence = options.correctSequence;
        this.onSolved = options.onSolved;

        // ========================================
        // 外圈底座
        // ========================================

        const base = new Graphics();

        base
            .circle(0, 0, 94)
            .fill(0x2c1d14)
            .stroke({ width: 5, color: 0x1c120d });

        base
            .circle(0, 0, 84)
            .stroke({ width: 3, color: 0x9c7444 });

        this.addChild(base);

        // ========================================
        // 八个固定方向刻度
        // ========================================

        const ticks = new Graphics();

        for (let i = 0; i < 8; i++) {
            const angle = -Math.PI / 2 + i * (Math.PI / 4);

            const x1 = Math.cos(angle) * 76;
            const y1 = Math.sin(angle) * 76;

            const x2 = Math.cos(angle) * 87;
            const y2 = Math.sin(angle) * 87;

            ticks
                .moveTo(x1, y1)
                .lineTo(x2, y2)
                .stroke({
                    width: i % 2 === 0 ? 4 : 2.5,
                    color: 0xc39a5b,
                });
        }

        this.addChild(ticks);

        // ========================================
        // 可旋转内盘
        // ========================================

        this.wheel = new Container();

        const disc = new Graphics();

        disc
            .circle(0, 0, 70)
            .fill(0x876237)
            .stroke({ width: 3, color: 0xb78b50 });

        this.wheel.addChild(disc);

        // 圆盘上的方向指针
        const arrow = createDirectionArrow(0, 70, 0x3b291b, 5);
        arrow.position.y = -4;

        this.wheel.addChild(arrow);

        this.wheel.eventMode = "static";
        this.wheel.cursor = "grab";
        this.wheel.hitArea = new Circle(0, 0, 70);

        this.addChild(this.wheel);

        // ========================================
        // 中央确认按钮
        // ========================================

        this.centerButton = new Container();

        // 最外侧凹槽
        const socket = new Graphics();

        socket
            .circle(0, 0, 28)
            .fill(0x261a12)
            .stroke({ width: 2, color: 0x6e5130 });

        this.centerButton.addChild(socket);

        // 金属按钮外圈
        const buttonOuter = new Graphics();

        buttonOuter
            .circle(0, 0, 22)
            .fill(0x4b3521)
            .stroke({ width: 3, color: 0xc09657 });

        this.centerButton.addChild(buttonOuter);

        // 按钮主体
        const buttonInner = new Graphics();

        buttonInner
            .circle(0, 0, 14)
            .fill(0xc99a55)
            .stroke({ width: 2, color: 0xe0ba77 });

        this.centerButton.addChild(buttonInner);

        // 中间的小凹点，增强实体感
        const centerDot = new Graphics();

        centerDot
            .circle(0, 0, 4)
            .fill(0x5a4027);

        this.centerButton.addChild(centerDot);

        this.centerButton.eventMode = "static";
        this.centerButton.cursor = "pointer";

        this.addChild(this.centerButton);
        // ========================================
        // 按钮提示光环
        // ========================================

        this.buttonHint = new Graphics();

        this.buttonHint
            .circle(0, 0, 34)
            .stroke({
                width: 2,
                color: 0xe0ba77,
                alpha: 0.8,
            });

        this.buttonHint.alpha = 0;
        this.buttonHint.scale.set(0.8);

        this.addChild(this.buttonHint);

        // ========================================
        // 三个输入进度灯
        // ========================================

        const totalWidth = (this.correctSequence.length - 1) * 24;

        for (let i = 0; i < this.correctSequence.length; i++) {
            const light = new Graphics();

            light.position.set(i * 24 - totalWidth / 2, 112);

            this.progressLights.push(light);
            this.addChild(light);
        }

        this.updateProgressLights();

        // ========================================
        // Events
        // ========================================

        this.wheel.on("pointerdown", this.handleRotateStart);
        this.centerButton.on("pointerdown", this.handleConfirm);
        this.centerButton.on("pointerover", this.handleButtonOver);
        this.centerButton.on("pointerout", this.handleButtonOut);

        this.stage.on("pointermove", this.handlePointerMove);
        this.stage.on("pointerup", this.handlePointerUp);
        this.stage.on("pointerupoutside", this.handlePointerUp);

        this.setEnabled(false);
    }

    // ========================================
    // 开始旋转
    // ========================================

    private handleRotateStart = (event: FederatedPointerEvent) => {
        if (!this.enabled || this.solved) return;

        gsap.killTweensOf(this.wheel);

        this.rotating = true;
        this.wheel.cursor = "grabbing";

        this.startPointerAngle = this.getPointerAngle(event);
        this.startRotation = this.wheel.rotation;
    };

    // ========================================
    // 转动
    // ========================================

    private handlePointerMove = (event: FederatedPointerEvent) => {
        if (!this.enabled || !this.rotating) return;

        const currentAngle = this.getPointerAngle(event);

        const delta = this.normalizeAngle(
            currentAngle - this.startPointerAngle,
        );

        this.wheel.rotation = this.startRotation + delta;
    };

    // ========================================
    // 松手
    // ========================================

    private handlePointerUp = () => {
        if (!this.rotating) return;

        this.rotating = false;
        this.wheel.cursor = "grab";

        this.snapToDirection();
    };

    // ========================================
    // 吸附到八方向
    // ========================================

    private snapToDirection() {
        const step = Math.PI / 4;

        const nearestStep = Math.round(
            this.wheel.rotation / step,
        );

        const targetRotation = nearestStep * step;

        this.currentIndex =
            ((nearestStep % 8) + 8) % 8;

        this.snapping = true;

        gsap.to(this.wheel, {
            rotation: targetRotation,
            duration: 0.2,
            ease: "back.out(1.5)",

            onComplete: () => {
                this.snapping = false;
                this.playButtonHint();
            },
        });
    }

    private playButtonHint() {
        if (!this.enabled || this.solved) return;

        gsap.killTweensOf(this.buttonHint);
        gsap.killTweensOf(this.buttonHint.scale);

        this.buttonHint.alpha = 0;
        this.buttonHint.scale.set(0.72);

        const timeline = gsap.timeline();

        timeline
            .to(this.buttonHint, {
                alpha: 0.85,
                duration: 0.12,
            })
            .to(
                this.buttonHint.scale,
                {
                    x: 1.2,
                    y: 1.2,
                    duration: 0.55,
                    ease: "power2.out",
                },
                "<",
            )
            .to(
                this.buttonHint,
                {
                    alpha: 0,
                    duration: 0.35,
                },
                "-=0.22",
            );
    }


    private handleButtonOver = () => {
        if (!this.enabled || this.solved) return;

        gsap.to(this.centerButton.scale, {
            x: 1.08,
            y: 1.08,
            duration: 0.12,
            ease: "power2.out",
        });
    };

    private handleButtonOut = () => {
        if (!this.enabled || this.solved) return;

        gsap.to(this.centerButton.scale, {
            x: 1,
            y: 1,
            duration: 0.12,
            ease: "power2.out",
        });
    };

    // ========================================
    // 按下中央按钮确认当前方向
    // ========================================

    private handleConfirm = (event: FederatedPointerEvent) => {
        event.stopPropagation();

        if (
            !this.enabled ||
            this.solved ||
            this.rotating ||
            this.snapping
        ) {
            return;
        }

        this.playButtonPress();

        const expected = this.correctSequence[this.progress];

        if (this.currentIndex === expected) {
            this.progress++;
            this.updateProgressLights();

            if (this.progress === this.correctSequence.length) {
                this.finishSequence();
            }

            return;
        }

        this.handleWrongDirection();
    };

    // ========================================
    // 正确输入完成
    // ========================================

    private finishSequence() {
        this.solved = true;
        this.enabled = false;

        this.wheel.eventMode = "none";
        this.centerButton.eventMode = "none";

        const timeline = gsap.timeline();

        timeline
            .to(this.scale, {
                x: 1.04,
                y: 1.04,
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

    // ========================================
    // 输入错误
    // ========================================

    private handleWrongDirection() {
        this.progress = 0;
        this.updateProgressLights();

        const timeline = gsap.timeline();

        timeline
            .to(this.wheel, { x: 4, duration: 0.04 })
            .to(this.wheel, { x: -4, duration: 0.04 })
            .to(this.wheel, { x: 3, duration: 0.04 })
            .to(this.wheel, { x: 0, duration: 0.05 });
    }

    // ========================================
    // 中央按钮反馈
    // ========================================

    private playButtonPress() {
        gsap.killTweensOf(this.buttonHint);
        gsap.killTweensOf(this.buttonHint.scale);
      
        this.buttonHint.alpha = 0;
      
        gsap
          .timeline()
          .to(this.centerButton.scale, {
            x: 0.82,
            y: 0.82,
            duration: 0.07,
            ease: "power2.in",
          })
          .to(this.centerButton.scale, {
            x: 1.08,
            y: 1.08,
            duration: 0.09,
            ease: "power2.out",
          })
          .to(this.centerButton.scale, {
            x: 1,
            y: 1,
            duration: 0.12,
            ease: "back.out(2)",
          });
      }

    // ========================================
    // 三个小灯
    // ========================================

    private updateProgressLights() {
        this.progressLights.forEach((light, index) => {
            light.clear();

            const completed = index < this.progress;

            light
                .circle(0, 0, 6)
                .fill(completed ? 0xd1aa66 : 0x35271c)
                .stroke({
                    width: 2,
                    color: completed ? 0xefcf8b : 0x876541,
                });
        });
    }

    private getPointerAngle(event: FederatedPointerEvent) {
        const pointer = this.parent.toLocal(event.global);

        return Math.atan2(
            pointer.y - this.y,
            pointer.x - this.x,
        );
    }

    private normalizeAngle(angle: number) {
        return Math.atan2(
            Math.sin(angle),
            Math.cos(angle),
        );
    }

    public setEnabled(enabled: boolean) {
        if (this.solved) return;

        this.enabled = enabled;

        this.wheel.eventMode = enabled ? "static" : "none";
        this.centerButton.eventMode = enabled ? "static" : "none";

        this.wheel.cursor = enabled ? "grab" : "default";
        this.centerButton.cursor = enabled ? "pointer" : "default";

        gsap.to(this, {
            alpha: enabled ? 1 : 0.72,
            duration: 0.25,
        });

        if (enabled) {
            gsap.delayedCall(0.45, () => {
              if (this.enabled && !this.solved) {
                gsap.fromTo(
                  this.wheel.scale,
                  { x: 1, y: 1 },
                  {
                    x: 1.035,
                    y: 1.035,
                    duration: 0.22,
                    yoyo: true,
                    repeat: 1,
                    ease: "power2.inOut",
                  },
                );
              }
            });
          }
    }

    public dispose() {
        gsap.killTweensOf(this);
        gsap.killTweensOf(this.scale);
        gsap.killTweensOf(this.wheel);
        gsap.killTweensOf(this.wheel.scale);
        gsap.killTweensOf(this.centerButton.scale);
        gsap.killTweensOf(this.buttonHint);
        gsap.killTweensOf(this.buttonHint.scale);
      
        this.wheel.off("pointerdown", this.handleRotateStart);
      
        this.centerButton.off("pointerdown", this.handleConfirm);
        this.centerButton.off("pointerover", this.handleButtonOver);
        this.centerButton.off("pointerout", this.handleButtonOut);
      
        this.stage.off("pointermove", this.handlePointerMove);
        this.stage.off("pointerup", this.handlePointerUp);
        this.stage.off("pointerupoutside", this.handlePointerUp);
      }
}
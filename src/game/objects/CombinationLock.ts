import { Container, Graphics } from "pixi.js";
import { gsap } from "gsap";

import { NumberWheel } from "./NumberWheel";

type CombinationLockOptions = {
  stage: Container;
  digits?: number;
  initialCode?: number[];
  correctCode?: number[];
  onChange?: (code: number[]) => void;
  onUnlock?: () => void;
};

export class CombinationLock extends Container {
  private wheels: NumberWheel[] = [];
  private values: number[];

  private correctCode?: number[];
  private unlocked = false;

  private shackle: Container;
  private onChange?: (code: number[]) => void;
  private onUnlock?: () => void;

  constructor(options: CombinationLockOptions) {
    super();

    const digits = options.digits ?? 4;

    this.values = Array.from(
      { length: digits },
      (_, index) => options.initialCode?.[index] ?? 0,
    );

    this.correctCode = options.correctCode;
    this.onChange = options.onChange;
    this.onUnlock = options.onUnlock;

    // ========================================
    // 锁扣
    // ========================================

    this.shackle = new Container();

    const leftBar = new Graphics();
    leftBar.roundRect(-72, -94, 15, 70, 7).fill(0xa8834f);

    const rightBar = new Graphics();
    rightBar.roundRect(57, -94, 15, 70, 7).fill(0xa8834f);

    const topBar = new Graphics();
    topBar.roundRect(-72, -105, 144, 22, 11).fill(0xb58e55);

    this.shackle.addChild(leftBar, rightBar, topBar);
    this.addChild(this.shackle);

    // ========================================
    // 锁体
    // ========================================

    const bodyWidth = digits * 64 + 36;
    const body = new Graphics();

    body
      .roundRect(-bodyWidth / 2, -58, bodyWidth, 126, 14)
      .fill(0x30271f)
      .stroke({ width: 4, color: 0x17130f });

    this.addChild(body);

    // ========================================
    // 数字轮
    // ========================================

    const spacing = 64;
    const totalWidth = (digits - 1) * spacing;

    for (let index = 0; index < digits; index++) {
      const wheel = new NumberWheel({
        stage: options.stage,
        initialValue: this.values[index],
        onChange: (value) => this.handleWheelChange(index, value),
      });

      wheel.position.set(-totalWidth / 2 + index * spacing, 4);

      this.wheels.push(wheel);
      this.addChild(wheel);
    }

    // ========================================
    // 底部金属条
    // ========================================

    const bottom = new Graphics();

    bottom
      .roundRect(-bodyWidth / 2 + 12, 54, bodyWidth - 24, 7, 3)
      .fill(0x8c6c43);

    this.addChild(bottom);
  }

  private handleWheelChange(index: number, value: number) {
    if (this.unlocked) return;

    this.values[index] = value;
    this.onChange?.([...this.values]);

    if (this.isCorrect()) {
      this.unlock();
    }
  }

  private isCorrect() {
    if (!this.correctCode || this.correctCode.length !== this.values.length) {
      return false;
    }

    return this.values.every((value, index) => value === this.correctCode![index]);
  }

  private unlock() {
    if (this.unlocked) return;

    this.unlocked = true;

    for (const wheel of this.wheels) {
      wheel.setEnabled(false);
    }

    const timeline = gsap.timeline();

    timeline
      .to(this, {
        x: this.x + 3,
        duration: 0.04,
      })
      .to(this, {
        x: this.x - 3,
        duration: 0.04,
      })
      .to(this, {
        x: this.x,
        duration: 0.04,
      })
      .to(this.shackle, {
        y: -20,
        duration: 0.22,
        ease: "power2.out",
      })
      .to(this.shackle, {
        x: 22,
        rotation: 0.08,
        duration: 0.2,
        ease: "back.out(1.5)",
        onComplete: () => this.onUnlock?.(),
      });
  }

  public getCode() {
    return [...this.values];
  }

  public dispose() {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.shackle);

    for (const wheel of this.wheels) {
      wheel.dispose();
    }
  }
}
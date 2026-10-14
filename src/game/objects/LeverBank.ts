import { Container, Graphics } from "pixi.js";
import { gsap } from "gsap";

import { MechanicalLever } from "./MechanicalLever";

type LeverBankOptions = {
  stage: Container;

  correctPositions: number[];

  onSolved?: () => void;
};

export class LeverBank extends Container {
  private levers: MechanicalLever[] = [];

  private values: number[];
  private correctPositions: number[];

  private enabled = false;
  private solved = false;

  private statusLights: Graphics[] = [];

  private onSolved?: () => void;

  constructor(options: LeverBankOptions) {
    super();

    this.correctPositions = [
      ...options.correctPositions,
    ];

    // 初始全部为中档
    this.values = Array(
      this.correctPositions.length,
    ).fill(1);

    this.onSolved = options.onSolved;

    this.createPanel();
    this.createLevers(options.stage);

    this.setEnabled(false);
  }

  // ==================================================
  // PANEL
  // ==================================================

  private createPanel() {
    const shadow = new Graphics();

    shadow
      .roundRect(
        -101,
        -51,
        204,
        106,
        9,
      )
      .fill({
        color: 0x000000,
        alpha: 0.28,
      });

    shadow.position.set(3, 4);

    this.addChild(shadow);

    const body = new Graphics();

    body
      .roundRect(
        -100,
        -54,
        200,
        108,
        9,
      )
      .fill(0x3b2a1d)
      .stroke({
        width: 3,
        color: 0x9b7446,
      });

    body
      .roundRect(
        -91,
        -45,
        182,
        90,
        6,
      )
      .stroke({
        width: 2,
        color: 0x65482e,
      });

    this.addChild(body);

    // 四角固定螺丝
    const screws = new Graphics();

    const screwPositions = [
      [-87, -40],
      [87, -40],
      [-87, 40],
      [87, 40],
    ];

    for (const [x, y] of screwPositions) {
      screws
        .circle(x, y, 4)
        .fill(0xa47c49)
        .stroke({
          width: 1,
          color: 0x3a281a,
        });

      screws
        .moveTo(x - 2, y)
        .lineTo(x + 2, y)
        .stroke({
          width: 1,
          color: 0x3a281a,
        });
    }

    this.addChild(screws);
  }

  // ==================================================
  // LEVERS
  // ==================================================

  private createLevers(stage: Container) {
    const spacing = 43;

    const totalWidth =
      (this.correctPositions.length - 1) *
      spacing;

    for (
      let index = 0;
      index < this.correctPositions.length;
      index++
    ) {
      const lever =
        new MechanicalLever({
          stage,

          initialPosition: 1,

          onChange: (position) => {
            this.handleLeverChange(
              index,
              position,
            );
          },
        });

      lever.position.set(
        index * spacing -
          totalWidth / 2,
        0,
      );

      this.levers.push(lever);
      this.addChild(lever);

      // 每根杆上方一个小状态灯
      const light = new Graphics();

      light
        .circle(
          index * spacing -
            totalWidth / 2,
          -43,
          4,
        )
        .fill(0x241b14)
        .stroke({
          width: 1.5,
          color: 0x80603d,
        });

      this.statusLights.push(light);
      this.addChild(light);
    }
  }

  // ==================================================
  // CHANGE
  // ==================================================

  private handleLeverChange(
    index: number,
    position: number,
  ) {
    if (!this.enabled || this.solved) {
      return;
    }

    this.values[index] = position;

    // 开发阶段可以临时打开：
    //
    // console.log("Lever:", this.values);
    //
    // 正式版本不需要。

    this.checkSolution();
  }

  // ==================================================
  // CHECK ANSWER
  // ==================================================

  private checkSolution() {
    const correct =
      this.values.every(
        (value, index) =>
          value ===
          this.correctPositions[index],
      );

    if (!correct) return;

    this.solve();
  }

  // ==================================================
  // SOLVED
  // ==================================================

  private solve() {
    if (this.solved) return;

    this.solved = true;
    this.enabled = false;

    for (const lever of this.levers) {
      lever.setEnabled(false);
    }

    const timeline = gsap.timeline();

    // 四个灯依次亮起
    this.statusLights.forEach(
      (light, index) => {
        timeline.call(
          () => {
            light.clear();

            light
              .circle(0, 0, 4)
              .fill(0xe0b667)
              .stroke({
                width: 1.5,
                color: 0xffd991,
              });
          },
          [],
          index * 0.08,
        );

        timeline.fromTo(
          light.scale,
          {
            x: 0.5,
            y: 0.5,
          },
          {
            x: 1.2,
            y: 1.2,
            duration: 0.08,
          },
          index * 0.08,
        );

        timeline.to(
          light.scale,
          {
            x: 1,
            y: 1,
            duration: 0.12,
            ease: "back.out(2)",
          },
          index * 0.08 + 0.08,
        );
      },
    );

    // 整个面板确认反馈
    timeline
      .to(this.scale, {
        x: 1.025,
        y: 1.025,
        duration: 0.08,
      })
      .to(this.scale, {
        x: 1,
        y: 1,
        duration: 0.16,
        ease: "back.out(2)",
      })
      .call(() => {
        this.onSolved?.();
      });
  }

  // ==================================================
  // PUBLIC
  // ==================================================

  public setEnabled(enabled: boolean) {
    if (this.solved) return;

    this.enabled = enabled;

    for (const lever of this.levers) {
      lever.setEnabled(enabled);
    }

    this.alpha = enabled
      ? 1
      : 0.86;
  }

  public getValues() {
    return [...this.values];
  }

  public dispose() {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);

    for (const lever of this.levers) {
      lever.dispose();
    }

    for (const light of this.statusLights) {
      gsap.killTweensOf(light);
      gsap.killTweensOf(light.scale);
    }
  }
}
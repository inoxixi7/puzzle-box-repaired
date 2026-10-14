import { Application, Container, Graphics } from "pixi.js";

import { PuzzleBoxScene } from "./scenes/PuzzleBoxScene";

const DESIGN_WIDTH = 1200;
const DESIGN_HEIGHT = 760;

export class Game {
  private app: Application;

  private background: Graphics;
  private world: Container;
  private puzzleBoxScene: PuzzleBoxScene;

  private resizeFrame: number | null = null;

  constructor(app: Application) {
    this.app = app;

    // 浏览器背景
    this.background = new Graphics();
    this.app.stage.addChild(this.background);

    // 固定 1200 × 760 的游戏世界
    this.world = new Container();
    this.app.stage.addChild(this.world);

    // Puzzle Box
    this.puzzleBoxScene = new PuzzleBoxScene(this.app.stage);
    this.world.addChild(this.puzzleBoxScene);

    this.app.stage.eventMode = "static";

    this.layout();

    window.addEventListener("resize", this.handleResize);
  }

  // ========================================
  // 浏览器尺寸变化
  // ========================================

  private handleResize = () => {
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
    }

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.layout();
    });
  };

  // ========================================
  // 世界缩放
  // ========================================

  private layout() {
    const { width, height } = this.app.screen;

    // 页面背景始终铺满浏览器
    this.background
      .clear()
      .rect(0, 0, width, height)
      .fill(0x171411);

    // 保持 1200 × 760 比例
    const scale = Math.min(
      width / DESIGN_WIDTH,
      height / DESIGN_HEIGHT,
    );

    this.world.scale.set(scale);

    // 居中
    this.world.position.set(
      (width - DESIGN_WIDTH * scale) / 2,
      (height - DESIGN_HEIGHT * scale) / 2,
    );

    // Pointer Events 仍然覆盖整个 Canvas
    this.app.stage.hitArea = this.app.screen;
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);
  
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
    }
  
    this.puzzleBoxScene.dispose();
  
    this.world.destroy({ children: true });
    this.background.destroy();
  }
}
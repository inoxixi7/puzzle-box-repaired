import { useEffect, useRef } from "react";
import { Application } from "pixi.js";

import { Game } from "./Game";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: Application | null = null;
    let game: Game | null = null;
    let cancelled = false;

    async function start() {
      if (!containerRef.current) {
        return;
      }

      const pixiApp = new Application();

      await pixiApp.init({
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (cancelled) {
        pixiApp.destroy();
        return;
      }

      app = pixiApp;

      containerRef.current.appendChild(
        pixiApp.canvas,
      );

      game = new Game(pixiApp);
    }

    start();

    return () => {
      cancelled = true;

      game?.destroy();

      app?.destroy(
        true,
        {
          children: true,
          texture: true,
        },
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
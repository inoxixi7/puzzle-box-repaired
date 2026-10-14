import { Container, Graphics } from "pixi.js";

export type PuzzleSymbol = "circle" | "triangle" | "square" | "diamond";

export function createSymbol(
  symbol: PuzzleSymbol,
  size = 24,
  color = 0xc9a267,
  strokeWidth = 3,
) {
  const graphic = new Graphics();
  const half = size / 2;

  switch (symbol) {
    case "circle":
      graphic.circle(0, 0, half).stroke({ width: strokeWidth, color });
      break;

    case "triangle":
      graphic
        .poly([0, -half, half, half, -half, half])
        .stroke({ width: strokeWidth, color });
      break;

    case "square":
      graphic
        .rect(-half, -half, size, size)
        .stroke({ width: strokeWidth, color });
      break;

    case "diamond":
      graphic
        .poly([0, -half, half, 0, 0, half, -half, 0])
        .stroke({ width: strokeWidth, color });
      break;
  }

  return graphic;
}

export function createSymbolRow(
  symbol: PuzzleSymbol,
  count: number,
  size = 20,
  spacing = 30,
  color = 0xc9a267,
) {
  const container = new Container();
  const totalWidth = (count - 1) * spacing;

  for (let i = 0; i < count; i++) {
    const graphic = createSymbol(symbol, size, color);
    graphic.x = i * spacing - totalWidth / 2;
    container.addChild(graphic);
  }

  return container;
}
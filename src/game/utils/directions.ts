import { Container, Graphics } from "pixi.js";

export function createDirectionArrow(
  direction: number,
  length = 30,
  color = 0xc9a267,
  strokeWidth = 3,
) {
  const container = new Container();

  const shaft = new Graphics();

  shaft
    .moveTo(0, length * 0.35)
    .lineTo(0, -length * 0.3)
    .stroke({
      width: strokeWidth,
      color,
      cap: "round",
    });

  const head = new Graphics();

  const headY = -length * 0.5;
  const headSize = length * 0.22;

  head
    .poly([
      0, headY,
      -headSize, headY + headSize,
      headSize, headY + headSize,
    ])
    .fill(color);

  container.addChild(shaft, head);

  // 0 = ↑
  // 1 = ↗
  // 2 = →
  // 3 = ↘
  // 4 = ↓
  // 5 = ↙
  // 6 = ←
  // 7 = ↖
  container.rotation = direction * (Math.PI / 4);

  return container;
}
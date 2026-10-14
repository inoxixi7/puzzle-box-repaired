import * as THREE from "three";

export const FINAL_SYMBOL_SEQUENCE = [
  1, // ○
  0, // △
  3, // ◇
  2, // □
] as const;

type SealSymbol =
  | "triangle"
  | "circle"
  | "square"
  | "diamond";

function createSymbolMesh(
  type: SealSymbol,
  size: number,
  color: number,
) {
  const material =
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
    });

  if (type === "circle") {
    return new THREE.Mesh(
      new THREE.RingGeometry(
        size * 0.62,
        size,
        28,
      ),
      material,
    );
  }

  if (type === "triangle") {
    const shape =
      new THREE.Shape();

    shape.moveTo(
      0,
      size,
    );

    shape.lineTo(
      -size * 0.86,
      -size * 0.70,
    );

    shape.lineTo(
      size * 0.86,
      -size * 0.70,
    );

    shape.closePath();

    const hole =
      new THREE.Path();

    hole.moveTo(
      0,
      size * 0.46,
    );

    hole.lineTo(
      -size * 0.40,
      -size * 0.32,
    );

    hole.lineTo(
      size * 0.40,
      -size * 0.32,
    );

    hole.closePath();

    shape.holes.push(
      hole,
    );

    return new THREE.Mesh(
      new THREE.ShapeGeometry(
        shape,
      ),
      material,
    );
  }

  const mesh =
    new THREE.Mesh(
      new THREE.RingGeometry(
        size * 0.62,
        size,
        4,
      ),
      material,
    );

  if (type === "square") {
    mesh.rotation.z =
      Math.PI / 4;
  }

  return mesh;
}

export function createSealMedalGroup(
  scale = 1,
) {
  const group =
    new THREE.Group();

  group.scale.setScalar(scale);

  const bronze =
    new THREE.MeshStandardMaterial({
      color: 0xb78345,
      roughness: 0.28,
      metalness: 0.78,
    });

  const darkBronze =
    new THREE.MeshStandardMaterial({
      color: 0x5a3a20,
      roughness: 0.38,
      metalness: 0.68,
    });

  const cream = 0xead3a0;

  const body =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.39,
        0.39,
        0.085,
        12,
      ),
      bronze,
    );

  body.rotation.x =
    Math.PI / 2;

  group.add(body);

  const outerRing =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        0.31,
        0.035,
        10,
        40,
      ),
      darkBronze,
    );

  outerRing.position.z =
    0.055;

  group.add(outerRing);

  // Four mechanical tabs make the seal look like a keyed medallion,
  // not a plain coin.
  for (
    let i = 0;
    i < 4;
    i++
  ) {
    const angle =
      (i / 4) *
      Math.PI *
      2;

    const tab =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.13,
          0.18,
          0.07,
        ),
        bronze,
      );

    tab.position.set(
      Math.sin(angle) *
        0.39,
      Math.cos(angle) *
        0.39,
      0.04,
    );

    tab.rotation.z =
      -angle;

    group.add(tab);
  }

  const centerRing =
    new THREE.Mesh(
      new THREE.RingGeometry(
        0.075,
        0.11,
        4,
      ),
      new THREE.MeshBasicMaterial({
        color: cream,
        side: THREE.DoubleSide,
      }),
    );

  centerRing.position.z =
    0.07;

  group.add(centerRing);

  const centerDot =
    new THREE.Mesh(
      new THREE.CircleGeometry(
        0.028,
        24,
      ),
      new THREE.MeshBasicMaterial({
        color: 0x2a1a11,
      }),
    );

  centerDot.position.z =
    0.075;

  group.add(centerDot);

  // Final-order clue engraved on the medal:
  // 1 dot = ○, 2 dots = △, 3 dots = ◇, 4 dots = □.
  const clues = [
    {
      type: "circle" as const,
      x: 0,
      y: 0.225,
      dots: 1,
    },
    {
      type: "triangle" as const,
      x: 0.225,
      y: 0,
      dots: 2,
    },
    {
      type: "diamond" as const,
      x: 0,
      y: -0.225,
      dots: 3,
    },
    {
      type: "square" as const,
      x: -0.225,
      y: 0,
      dots: 4,
    },
  ];

  for (const clue of clues) {
    const symbol =
      createSymbolMesh(
        clue.type,
        0.055,
        cream,
      );

    symbol.position.set(
      clue.x,
      clue.y,
      0.078,
    );

    group.add(symbol);

    // Dots sit between the symbol and the medal center (like the ○ clue),
    // laid out perpendicular to that direction. Placing them on the outer
    // side let the raised rim hide them (◇ / □ lost their dots).
    const distance =
      Math.hypot(
        clue.x,
        clue.y,
      );

    const inwardX =
      -clue.x / distance;

    const inwardY =
      -clue.y / distance;

    const dotSpacing = 0.03;
    const dotInset = 0.075;

    for (
      let i = 0;
      i < clue.dots;
      i++
    ) {
      const dot =
        new THREE.Mesh(
          new THREE.CircleGeometry(
            0.011,
            18,
          ),
          new THREE.MeshBasicMaterial({
            color: cream,
          }),
        );

      const offset =
        (i - (clue.dots - 1) / 2) *
        dotSpacing;

      dot.position.set(
        clue.x +
          inwardX * dotInset -
          inwardY * offset,
        clue.y +
          inwardY * dotInset +
          inwardX * offset,
        0.079,
      );

      group.add(dot);
    }
  }

  return group;
}

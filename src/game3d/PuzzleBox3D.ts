import * as THREE from "three";

import {
  BOX_FACE_NAMES,
  createFaceAnchors,
  type BoxDimensions,
  type BoxFaceName,
} from "./BoxFace";

import {
  createBoxMaterials,
  type BoxMaterials,
} from "./BoxMaterials";

import { BoxRotationController } from "./BoxRotationController";
import { BoxFaceFocusController } from "./BoxFaceFocusController";
import { FrontPuzzleOne } from "./puzzles/FrontPuzzleOne";
import { LeftPuzzleFour } from "./puzzles/LeftPuzzleFour";
import { TopPuzzleTwo } from "./puzzles/TopPuzzleTwo";
import { BackPuzzleThree } from "./puzzles/BackPuzzleThree";
import { RightPuzzleFive } from "./puzzles/RightPuzzleFive";
import { BottomFinalPuzzle } from "./puzzles/BottomFinalPuzzle";
import type { InventoryItemId } from "./inventory/items";

type PuzzleBox3DOptions = {
  onFocusChange?: (
    face: BoxFaceName | null,
  ) => void;

  onPuzzleOneSolved?: () => void;
  onPuzzleTwoSolved?: () => void;
  onPuzzleThreeSolved?: () => void;
  onPuzzleFourSolved?: () => void;
  onPuzzleFiveSolved?: () => void;
  onFinalSolved?: () => void;

  onSheetPickedUp?: () => void;
  onGearPickedUp?: () => void;
  onKeyPickedUp?: () => void;
  onMedalPickedUp?: () => void;

  getSelectedInventoryItem?: () =>
    InventoryItemId | null;

  consumeInventoryItem?: (
    item: InventoryItemId,
  ) => boolean;
};

export class PuzzleBox3D {
  private host: HTMLElement;

  private scene = new THREE.Scene();

  private camera = new THREE.PerspectiveCamera(
    36,
    1,
    0.1,
    100,
  );

  private renderer: THREE.WebGLRenderer;

  private boxRoot = new THREE.Group();
  private materials: BoxMaterials;

  private rotationController: BoxRotationController;
  private focusController: BoxFaceFocusController;

  private puzzleOne: FrontPuzzleOne;
  private puzzleTwo: TopPuzzleTwo;
  private puzzleThree: BackPuzzleThree;
  private puzzleFour: LeftPuzzleFour;
  private puzzleFive: RightPuzzleFive;
  private finalPuzzle: BottomFinalPuzzle;


  private focusMeshes =
    new Map<BoxFaceName, THREE.Mesh>();

  private resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private clock = new THREE.Clock();

  public readonly dimensions: BoxDimensions = {
    width: 6.4,
    height: 4.2,
    depth: 4.8,
  };

  public readonly faceAnchors =
    createFaceAnchors(
      this.dimensions,
    );

  constructor(
    host: HTMLElement,
    options: PuzzleBox3DOptions = {},
  ) {
    this.host = host;

    this.renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference:
          "high-performance",
      });

    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2,
      ),
    );

    this.renderer.shadowMap.enabled =
      true;

    this.renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    this.renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    this.renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    this.renderer.toneMappingExposure =
      1.08;

    this.renderer.domElement.style.display =
      "block";

    this.renderer.domElement.style.width =
      "100%";

    this.renderer.domElement.style.height =
      "100%";

    this.host.appendChild(
      this.renderer.domElement,
    );

    this.materials =
      createBoxMaterials();

    this.createScene();
    this.createPuzzleBox();

    this.scene.add(this.boxRoot);

    this.boxRoot.rotation.set(
      -0.28,
      0.52,
      0.04,
    );

    this.rotationController =
      new BoxRotationController(
        this.renderer.domElement,
        this.boxRoot,
      );

    this.puzzleOne =
      new FrontPuzzleOne({
        anchor:
          this.faceAnchors.front,
        canvas:
          this.renderer.domElement,
        camera: this.camera,

        onSolved:
          options.onPuzzleOneSolved,

        onSheetPickedUp: () => {
          options.onSheetPickedUp?.();
        },
      });

    this.puzzleTwo =
      new TopPuzzleTwo({
        anchor:
          this.faceAnchors.top,
        canvas:
          this.renderer.domElement,
        camera: this.camera,

        onSolved:
          options.onPuzzleTwoSolved,

        onGearPickedUp: () => {
          options.onGearPickedUp?.();
        },
      });

    this.puzzleThree =
      new BackPuzzleThree({
        anchor:
          this.faceAnchors.back,
        canvas:
          this.renderer.domElement,
        camera: this.camera,

        onSolved:
          options.onPuzzleThreeSolved,

        onKeyPickedUp: () => {
          options.onKeyPickedUp?.();
        },
      });

    this.puzzleFour =
      new LeftPuzzleFour({
        anchor:
          this.faceAnchors.left,
        canvas:
          this.renderer.domElement,
        camera: this.camera,

        getSelectedItem: () =>
          options.getSelectedInventoryItem?.() ??
          null,

        consumeItem: (
          item,
        ) =>
          options.consumeInventoryItem?.(
            item,
          ) ??
          false,

        onSolved:
          options.onPuzzleFourSolved,
      });

    this.puzzleFive =
      new RightPuzzleFive({
        anchor:
          this.faceAnchors.right,
        canvas:
          this.renderer.domElement,
        camera: this.camera,

        getSelectedItem: () =>
          options.getSelectedInventoryItem?.() ??
          null,

        consumeItem: (
          item,
        ) =>
          options.consumeInventoryItem?.(
            item,
          ) ??
          false,

        onSolved:
          options.onPuzzleFiveSolved,

        onMedalPickedUp: () => {
          options.onMedalPickedUp?.();
        },
      });

    this.finalPuzzle =
      new BottomFinalPuzzle({
        anchor:
          this.faceAnchors.bottom,
        canvas:
          this.renderer.domElement,
        camera: this.camera,

        getSelectedItem: () =>
          options.getSelectedInventoryItem?.() ??
          null,

        consumeItem: (
          item,
        ) =>
          options.consumeInventoryItem?.(
            item,
          ) ??
          false,

        onSolved:
          options.onFinalSolved,
      });

    this.focusController =
      new BoxFaceFocusController({
        canvas:
          this.renderer.domElement,
        camera: this.camera,
        boxRoot: this.boxRoot,
        focusMeshes:
          this.focusMeshes,
        rotationController:
          this.rotationController,

        onFocusChange: (face) => {
          this.puzzleOne.setEnabled(
            face === "front",
          );

          this.puzzleTwo.setEnabled(
            face === "top",
          );

          this.puzzleThree.setEnabled(
            face === "back",
          );

          this.puzzleFour.setEnabled(
            face === "left",
          );

          this.puzzleFive.setEnabled(
            face === "right",
          );

          this.finalPuzzle.setEnabled(
            face === "bottom",
          );

          options.onFocusChange?.(
            face,
          );
        },
      });

    this.resizeObserver =
      new ResizeObserver(
        () => this.resize(),
      );

    this.resizeObserver.observe(
      this.host,
    );

    this.resize();
    this.animate();
  }

  private createScene() {
    this.scene.background =
      new THREE.Color(0x0b0d10);

    this.camera.position.set(
      0,
      0.35,
      11.8,
    );

    this.camera.lookAt(
      0,
      0,
      0,
    );

    const hemisphere =
      new THREE.HemisphereLight(
        0xc9d7e7,
        0x291a12,
        1.25,
      );

    this.scene.add(hemisphere);

    const keyLight =
      new THREE.DirectionalLight(
        0xffe0b8,
        3.2,
      );

    keyLight.position.set(
      5.5,
      7,
      8,
    );

    keyLight.castShadow = true;

    keyLight.shadow.mapSize.set(
      2048,
      2048,
    );

    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;

    this.scene.add(keyLight);

    const fillLight =
      new THREE.DirectionalLight(
        0x89a6c7,
        1.15,
      );

    fillLight.position.set(
      -6,
      1,
      4,
    );

    this.scene.add(fillLight);

    const rimLight =
      new THREE.PointLight(
        0xd7a76b,
        18,
        18,
        2,
      );

    rimLight.position.set(
      3,
      -3,
      -5,
    );

    this.scene.add(rimLight);

    const ground =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          30,
          30,
        ),
        new THREE.MeshStandardMaterial({
          color: 0x111317,
          roughness: 0.96,
          metalness: 0,
        }),
      );

    ground.rotation.x =
      -Math.PI / 2;

    ground.position.y = -5.1;
    ground.receiveShadow = true;

    this.scene.add(ground);
  }

  private createPuzzleBox() {
    const {
      width,
      height,
      depth,
    } = this.dimensions;

    const body =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          width,
          height,
          depth,
        ),
        this.materials.wood,
      );

    body.castShadow = true;
    body.receiveShadow = true;

    this.boxRoot.add(body);

    for (
      const name
      of BOX_FACE_NAMES
    ) {
      const anchor =
        this.faceAnchors[name];

      this.boxRoot.add(anchor);

      const size =
        this.getFaceSize(name);

      this.createFacePanel(
        anchor,
        size.width,
        size.height,
        name,
      );
    }

    this.createBrassEdgeTrim();
  }

  private getFaceSize(
    face: BoxFaceName,
  ) {
    const {
      width,
      height,
      depth,
    } = this.dimensions;

    if (
      face === "front" ||
      face === "back"
    ) {
      return {
        width,
        height,
      };
    }

    if (
      face === "left" ||
      face === "right"
    ) {
      return {
        width: depth,
        height,
      };
    }

    return {
      width,
      height: depth,
    };
  }

  private createFacePanel(
    anchor: THREE.Group,
    width: number,
    height: number,
    face: BoxFaceName,
  ) {
    const panelWidth =
      width - 0.32;

    const panelHeight =
      height - 0.32;

    const panelMaterial =
      this.materials.woodInset.clone();

    panelMaterial.emissive.set(
      0x000000,
    );

    panelMaterial.emissiveIntensity =
      0;

    const panel =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          panelWidth,
          panelHeight,
        ),
        panelMaterial,
      );

    panel.position.z = 0.018;
    panel.receiveShadow = true;

    panel.name =
      `panel-${face}`;

    panel.userData.face =
      face;

    anchor.add(panel);

    this.focusMeshes.set(
      face,
      panel,
    );

    const railThickness =
      0.085;

    const railDepth =
      0.07;

    const topRail =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          panelWidth,
          railThickness,
          railDepth,
        ),
        this.materials.brassDark,
      );

    topRail.position.set(
      0,
      panelHeight / 2,
      0.07,
    );

    const bottomRail =
      topRail.clone();

    bottomRail.position.y =
      -panelHeight / 2;

    const leftRail =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          railThickness,
          panelHeight,
          railDepth,
        ),
        this.materials.brassDark,
      );

    leftRail.position.set(
      -panelWidth / 2,
      0,
      0.07,
    );

    const rightRail =
      leftRail.clone();

    rightRail.position.x =
      panelWidth / 2;

    for (const rail of [
      topRail,
      bottomRail,
      leftRail,
      rightRail,
    ]) {
      rail.castShadow = true;
      rail.receiveShadow = true;
      anchor.add(rail);
    }

    const screwGeometry =
      new THREE.CylinderGeometry(
        0.055,
        0.055,
        0.035,
        16,
      );

    const screwPositions = [
      [
        -panelWidth / 2 + 0.16,
        panelHeight / 2 - 0.16,
      ],
      [
        panelWidth / 2 - 0.16,
        panelHeight / 2 - 0.16,
      ],
      [
        -panelWidth / 2 + 0.16,
        -panelHeight / 2 + 0.16,
      ],
      [
        panelWidth / 2 - 0.16,
        -panelHeight / 2 + 0.16,
      ],
    ];

    for (
      const [x, y]
      of screwPositions
    ) {
      const screw =
        new THREE.Mesh(
          screwGeometry,
          this.materials.brass,
        );

      screw.rotation.x =
        Math.PI / 2;

      screw.position.set(
        x,
        y,
        0.105,
      );

      screw.castShadow = true;

      anchor.add(screw);
    }
  }

  private createBrassEdgeTrim() {
    const {
      width,
      height,
      depth,
    } = this.dimensions;

    const t = 0.075;

    const addTrim = (
      geometry: THREE.BoxGeometry,
      x: number,
      y: number,
      z: number,
    ) => {
      const trim =
        new THREE.Mesh(
          geometry,
          this.materials.brassDark,
        );

      trim.position.set(
        x,
        y,
        z,
      );

      trim.castShadow = true;

      this.boxRoot.add(trim);
    };

    for (
      const y
      of [
        -height / 2,
        height / 2,
      ]
    ) {
      for (
        const z
        of [
          -depth / 2,
          depth / 2,
        ]
      ) {
        addTrim(
          new THREE.BoxGeometry(
            width + t,
            t,
            t,
          ),
          0,
          y,
          z,
        );
      }
    }

    for (
      const x
      of [
        -width / 2,
        width / 2,
      ]
    ) {
      for (
        const z
        of [
          -depth / 2,
          depth / 2,
        ]
      ) {
        addTrim(
          new THREE.BoxGeometry(
            t,
            height + t,
            t,
          ),
          x,
          0,
          z,
        );
      }
    }

    for (
      const x
      of [
        -width / 2,
        width / 2,
      ]
    ) {
      for (
        const y
        of [
          -height / 2,
          height / 2,
        ]
      ) {
        addTrim(
          new THREE.BoxGeometry(
            t,
            t,
            depth + t,
          ),
          x,
          y,
          0,
        );
      }
    }
  }

  private resize() {
    const rect =
      this.host.getBoundingClientRect();

    const width =
      Math.max(
        1,
        rect.width,
      );

    const height =
      Math.max(
        1,
        rect.height,
      );

    this.renderer.setSize(
      width,
      height,
      false,
    );

    this.camera.aspect =
      width / height;

    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.animationFrame =
      requestAnimationFrame(
        this.animate,
      );

    const delta =
      Math.min(
        this.clock.getDelta(),
        0.05,
      );

    this.rotationController.update(
      delta,
    );

    this.renderer.render(
      this.scene,
      this.camera,
    );
  };

  public getRoot() {
    return this.boxRoot;
  }

  public getFaceAnchor(
    face: BoxFaceName,
  ) {
    return this.faceAnchors[
      face
    ];
  }

  public focusFace(
    face: BoxFaceName,
  ) {
    this.focusController.focus(
      face,
    );
  }

  public exitFocus() {
    this.focusController.exitFocus();
  }

  public setSelectedInventoryItem(
    item:
      InventoryItemId | null,
  ) {
    this.puzzleFour.setSelectedItem(
      item,
    );

    this.puzzleFive.setSelectedItem(
      item,
    );

    this.finalPuzzle.setSelectedItem(
      item,
    );
  }

  public dispose() {
    cancelAnimationFrame(
      this.animationFrame,
    );

    this.resizeObserver.disconnect();

    this.puzzleOne.dispose();
    this.puzzleTwo.dispose();
    this.puzzleThree.dispose();
    this.puzzleFour.dispose();
    this.puzzleFive.dispose();
    this.finalPuzzle.dispose();

    this.focusController.dispose();
    this.rotationController.dispose();

    this.scene.traverse(
      (object) => {
        if (
          !(
            object
            instanceof
            THREE.Mesh
          )
        ) {
          return;
        }

        object.geometry.dispose();
      },
    );

    const materialSet =
      new Set<
        THREE.Material
      >();

    for (
      const material
      of Object.values(
        this.materials,
      )
    ) {
      materialSet.add(
        material,
      );
    }

    this.scene.traverse(
      (object) => {
        if (
          !(
            object
            instanceof
            THREE.Mesh
          )
        ) {
          return;
        }

        const materials =
          Array.isArray(
            object.material,
          )
            ? object.material
            : [object.material];

        for (
          const material
          of materials
        ) {
          materialSet.add(
            material,
          );
        }
      },
    );

    for (
      const material
      of materialSet
    ) {
      material.dispose();
    }

    this.renderer.dispose();

    if (
      this.renderer.domElement
        .parentElement ===
      this.host
    ) {
      this.host.removeChild(
        this.renderer.domElement,
      );
    }
  }
}

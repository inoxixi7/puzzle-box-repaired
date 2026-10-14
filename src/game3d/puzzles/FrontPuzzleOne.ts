import * as THREE from "three";
import { gsap } from "gsap";

type FrontPuzzleOneOptions = {
  anchor: THREE.Group;
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  onSolved?: () => void;
  onSheetPickedUp?: () => void;
};

type DigitWheel = {
  value: number;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  hitbox: THREE.Mesh;
};

const CORRECT_CODE = [3, 1, 4, 2] as const;

export class FrontPuzzleOne {
  private anchor: THREE.Group;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;

  private root = new THREE.Group();
  private drawerGroup = new THREE.Group();
  private drawerContents = new THREE.Group();

  private sheetGroup = new THREE.Group();
  private sheetHitbox: THREE.Mesh | null = null;
  private sheetAvailable = false;
  private sheetPickedUp = false;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private wheels: DigitWheel[] = [];
  private wheelHitboxes: THREE.Mesh[] = [];

  private shackle = new THREE.Group();

  private enabled = false;
  private solved = false;

  private activeWheelIndex: number | null = null;
  private activePointerId: number | null = null;
  private dragAccumulator = 0;
  private lastPointerY = 0;

  private onSolved?: () => void;
  private onSheetPickedUp?: () => void;

  private woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b2f1c,
    roughness: 0.8,
    metalness: 0.02,
  });

  private darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x17120f,
    roughness: 0.9,
    metalness: 0.02,
  });

  private brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xb78b4d,
    roughness: 0.35,
    metalness: 0.68,
  });

  private brassDarkMaterial = new THREE.MeshStandardMaterial({
    color: 0x654722,
    roughness: 0.42,
    metalness: 0.62,
  });

  constructor(options: FrontPuzzleOneOptions) {
    this.anchor = options.anchor;
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.onSolved = options.onSolved;
    this.onSheetPickedUp = options.onSheetPickedUp;

    this.root.name = "puzzle-1-front";
    this.anchor.add(this.root);

    this.createMysticSigil();
    this.createDrawer();
    this.createCombinationLock();

    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);

    this.setEnabled(false);
  }

  // ==================================================
  // MYSTIC SIGIL
  // ==================================================

  private createMysticSigil() {
    const width = 3.75;
    const height = 1.62;

    const texture = this.createMysticSigilTexture(
      width / height,
    );

    const sigil = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );

    sigil.position.set(-0.18, 0.92, 0.082);

    this.root.add(sigil);
  }

  private createMysticSigilTexture(aspectRatio: number) {
    const canvas = document.createElement("canvas");

    canvas.height = 420;
    canvas.width = Math.round(
      canvas.height * aspectRatio,
    );

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const drawSigil = (
      color: string,
      lineWidth: number,
      alpha: number,
      offsetY: number,
    ) => {
      ctx.save();

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const y0 = cy + offsetY;

      ctx.beginPath();
      ctx.moveTo(cx - 210, y0 + 92);
      ctx.quadraticCurveTo(
        cx,
        y0 + 156,
        cx + 210,
        y0 + 92,
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 185, y0 - 105);
      ctx.quadraticCurveTo(
        cx,
        y0 - 164,
        cx + 185,
        y0 - 105,
      );
      ctx.stroke();

      // 1 × circle
      ctx.beginPath();
      ctx.arc(cx, y0 - 2, 34, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, y0 - 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // 3 × triangle
      const triXs = [cx - 78, cx, cx + 78];
      const triY = y0 - 100;

      for (const x of triXs) {
        const size = 27;

        ctx.beginPath();
        ctx.moveTo(x, triY - size);
        ctx.lineTo(
          x - size * 0.9,
          triY + size * 0.72,
        );
        ctx.lineTo(
          x + size * 0.9,
          triY + size * 0.72,
        );
        ctx.closePath();
        ctx.stroke();
      }

      // 2 × diamond
      for (const x of [cx - 132, cx + 132]) {
        const size = 24;

        ctx.beginPath();
        ctx.moveTo(x, y0 - size);
        ctx.lineTo(x + size, y0);
        ctx.lineTo(x, y0 + size);
        ctx.lineTo(x - size, y0);
        ctx.closePath();
        ctx.stroke();
      }

      // 4 × square
      const sqY = y0 + 104;

      for (const x of [
        cx - 102,
        cx - 34,
        cx + 34,
        cx + 102,
      ]) {
        const size = 20;

        ctx.strokeRect(
          x - size,
          sqY - size,
          size * 2,
          size * 2,
        );
      }

      // Connector lines make the four clue groups read as one seal/logo.
      ctx.beginPath();
      ctx.moveTo(cx, y0 - 62);
      ctx.lineTo(cx, y0 - 40);

      ctx.moveTo(cx - 97, y0);
      ctx.lineTo(cx - 44, y0);

      ctx.moveTo(cx + 44, y0);
      ctx.lineTo(cx + 97, y0);

      ctx.moveTo(cx, y0 + 39);
      ctx.lineTo(cx, y0 + 73);

      ctx.stroke();

      ctx.globalAlpha *= 0.52;

      for (const angle of [-0.78, -0.28, 0.28, 0.78]) {
        const inner = 48;
        const outer = 78;

        ctx.beginPath();
        ctx.moveTo(
          cx + Math.sin(angle) * inner,
          y0 - Math.cos(angle) * inner,
        );
        ctx.lineTo(
          cx + Math.sin(angle) * outer,
          y0 - Math.cos(angle) * outer,
        );
        ctx.stroke();
      }

      ctx.restore();
    };

    drawSigil("#26150c", 13, 0.55, 4);
    drawSigil("#c79a58", 7, 0.94, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    return texture;
  }

  // ==================================================
  // DRAWER
  // ==================================================
  // DRAWER
  // ==================================================

  private createDrawer() {
    const cavity = new THREE.Mesh(
      new THREE.PlaneGeometry(4.18, 1.38),
      new THREE.MeshStandardMaterial({
        color: 0x100d0b,
        roughness: 0.96,
        metalness: 0,
      }),
    );

    cavity.position.set(0, -1.15, 0.055);
    this.root.add(cavity);

    // 整个抽屉，包括正面、侧壁、底板、内容物，
    // 都属于同一个 Group。旋转盒子时不会再出现“面板和内容分家”。
    this.drawerGroup.position.set(0, -1.15, 0.14);

    const drawerFront = new THREE.Mesh(
      new THREE.BoxGeometry(4.05, 1.25, 0.18),
      this.woodMaterial,
    );

    drawerFront.position.z = 0;
    drawerFront.castShadow = true;
    drawerFront.receiveShadow = true;

    this.drawerGroup.add(drawerFront);

    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(3.65, 0.92, 0.05),
      this.brassDarkMaterial,
    );

    inset.position.z = 0.116;
    this.drawerGroup.add(inset);

    const insetInner = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 0.82, 0.055),
      this.woodMaterial,
    );

    insetInner.position.z = 0.145;
    this.drawerGroup.add(insetInner);

    this.createDrawerContents();

    this.root.add(this.drawerGroup);
  }

  private createDrawerContents() {
    this.drawerContents.position.set(0, 0, 0);

    // 抽屉底板：沿 Z 方向伸入盒体。
    const drawerDepth = 1.18;

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 0.08, drawerDepth),
      this.darkMaterial,
    );

    floor.position.set(0, -0.47, -0.53);
    floor.castShadow = true;
    floor.receiveShadow = true;

    // 左右侧壁。
    const sideGeometry = new THREE.BoxGeometry(
      0.09,
      0.88,
      drawerDepth,
    );

    const leftWall = new THREE.Mesh(
      sideGeometry,
      this.woodMaterial,
    );

    leftWall.position.set(-1.78, -0.02, -0.53);
    leftWall.castShadow = true;

    const rightWall = leftWall.clone();
    rightWall.position.x = 1.78;

    // 后壁。
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 0.88, 0.09),
      this.woodMaterial,
    );

    backWall.position.set(0, -0.02, -1.08);
    backWall.castShadow = true;

    this.drawerContents.add(
      floor,
      leftWall,
      rightWall,
      backWall,
    );

    // Puzzle 2 的透明片先平放在真正的抽屉底板上。
    const sheetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9bb6b7,
      transparent: true,
      opacity: 0.54,
      roughness: 0.16,
      metalness: 0,
      transmission: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(1.82, 1.02),
      sheetMaterial,
    );

    // 初始时透明板平躺在抽屉内部。
    // 抽屉完全打开后再自动弹起，避免正面视角看不见。
    this.sheetGroup.rotation.set(
      -Math.PI / 2,
      0,
      -0.09,
    );

    this.sheetGroup.position.set(
      0.05,
      -0.41,
      -0.52,
    );

    this.sheetGroup.add(sheet);

    // Puzzle 2 底图的 180° 对应图形。
    // 初始看起来不重合，旋转 180° 后大圆/小圆会与底图完全对齐。
    const overlayMaterial = new THREE.MeshBasicMaterial({
      color: 0x6f9eab,
      side: THREE.DoubleSide,
    });

    const largeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.292, 36),
      overlayMaterial,
    );

    largeRing.position.set(
      -0.58,
      -0.07,
      0.014,
    );

    const smallRing = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.176, 36),
      overlayMaterial,
    );

    smallRing.position.set(
      0.58,
      0.12,
      0.014,
    );

    const diagonal = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.03, 0.012),
      overlayMaterial,
    );

    diagonal.rotation.z = -0.46;
    diagonal.position.set(
      0.02,
      0,
      0.012,
    );

    this.sheetGroup.add(
      largeRing,
      smallRing,
      diagonal,
    );

    this.sheetHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(
        2.02,
        1.18,
        0.16,
      ),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );

    this.sheetHitbox.position.set(
      0,
      0,
      0.025,
    );

    this.sheetHitbox.userData.kind = "overlaySheet";

    this.sheetGroup.add(this.sheetHitbox);
    this.drawerContents.add(this.sheetGroup);

    // 关键：内容物是 drawerGroup 的子对象，不再直接挂到 root。
    this.drawerGroup.add(this.drawerContents);
  }

  // ==================================================
  // COMBINATION LOCK
  // ==================================================

  private createCombinationLock() {
    const lockGroup = new THREE.Group();
    lockGroup.position.set(0, 0.02, 0.24);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(2.12, 0.58, 0.18),
      this.darkMaterial,
    );

    housing.castShadow = true;
    lockGroup.add(housing);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.49, 0.04),
      this.brassDarkMaterial,
    );

    frame.position.z = 0.111;
    lockGroup.add(frame);

    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.41, 0.045),
      this.darkMaterial,
    );

    inner.position.z = 0.137;
    lockGroup.add(inner);

    const wheelXs = [-0.69, -0.23, 0.23, 0.69];

    for (let index = 0; index < wheelXs.length; index++) {
      const wheel = this.createDigitWheel(index);
      wheel.mesh.position.set(wheelXs[index], 0.015, 0.17);
      wheel.hitbox.position.set(wheelXs[index], 0.015, 0.205);

      lockGroup.add(wheel.mesh, wheel.hitbox);

      this.wheels.push(wheel);
      this.wheelHitboxes.push(wheel.hitbox);
    }

    const symbolTexture = this.createSymbolOrderTexture();

    const symbolPlane = new THREE.Mesh(
      // 560:90 与 CanvasTexture 的宽高比一致，避免最后一排符号再被轻微拉伸。
      new THREE.PlaneGeometry(1.38, 1.38 * (90 / 560)),
      new THREE.MeshBasicMaterial({
        map: symbolTexture,
        transparent: true,
        depthWrite: false,
      }),
    );

    symbolPlane.position.set(0, -0.39, 0.13);
    lockGroup.add(symbolPlane);

    this.createShackle(lockGroup);

    this.drawerGroup.add(lockGroup);
  }

  private createDigitWheel(index: number): DigitWheel {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 200;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
    });

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.39),
      material,
    );

    const hitbox = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.52),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );

    hitbox.userData.wheelIndex = index;

    const wheel: DigitWheel = {
      value: 0,
      canvas,
      context,
      texture,
      mesh,
      hitbox,
    };

    this.redrawDigitWheel(wheel);

    return wheel;
  }

  private redrawDigitWheel(wheel: DigitWheel) {
    const { canvas, context: ctx, value } = wheel;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#2c251e");
    gradient.addColorStop(0.5, "#0e0d0b");
    gradient.addColorStop(1, "#2c251e");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#8d6b3d";
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 94px Georgia, serif";
    ctx.fillStyle = "#e6c27e";

    ctx.fillText(
      String(value),
      canvas.width / 2,
      canvas.height / 2 + 4,
    );

    ctx.fillStyle = "#6e5b40";
    ctx.font = "34px sans-serif";
    ctx.fillText(
      "⌃",
      canvas.width / 2,
      22,
    );
    ctx.fillText(
      "⌄",
      canvas.width / 2,
      canvas.height - 16,
    );

    wheel.texture.needsUpdate = true;
  }

  private createSymbolOrderTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 90;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#d7aa64";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";

    const centers = [70, 210, 350, 490];
    const cy = 45;
    const size = 24;

    // △
    ctx.beginPath();
    ctx.moveTo(centers[0], cy - size);
    ctx.lineTo(centers[0] - size, cy + size * 0.78);
    ctx.lineTo(centers[0] + size, cy + size * 0.78);
    ctx.closePath();
    ctx.stroke();

    // ○
    ctx.beginPath();
    ctx.arc(centers[1], cy, size, 0, Math.PI * 2);
    ctx.stroke();

    // □
    ctx.strokeRect(
      centers[2] - size,
      cy - size,
      size * 2,
      size * 2,
    );

    // ◇
    ctx.beginPath();
    ctx.moveTo(centers[3], cy - size);
    ctx.lineTo(centers[3] + size, cy);
    ctx.lineTo(centers[3], cy + size);
    ctx.lineTo(centers[3] - size, cy);
    ctx.closePath();
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }

  private createShackle(lockGroup: THREE.Group) {
    this.shackle.position.set(0, 0.3, 0.02);

    const leftPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16),
      this.brassMaterial,
    );

    leftPost.position.set(-0.3, 0.12, 0.02);

    const rightPost = leftPost.clone();
    rightPost.position.x = 0.3;

    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.3,
        0.045,
        12,
        36,
        Math.PI,
      ),
      this.brassMaterial,
    );

    arc.position.set(0, 0.27, 0.02);

    this.shackle.add(leftPost, rightPost, arc);
    lockGroup.add(this.shackle);
  }

  // ==================================================
  // INTERACTION
  // ==================================================

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.enabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (
      this.sheetAvailable &&
      !this.sheetPickedUp &&
      this.pickSheet(
        event.clientX,
        event.clientY,
      )
    ) {
      this.pickUpSheet();
      return;
    }

    if (this.solved) return;

    const wheelIndex = this.pickWheel(
      event.clientX,
      event.clientY,
    );

    if (wheelIndex === null) return;

    this.activeWheelIndex = wheelIndex;
    this.activePointerId = event.pointerId;
    this.dragAccumulator = 0;
    this.lastPointerY = event.clientY;

    this.canvas.style.cursor = "grabbing";
    this.canvas.setPointerCapture(event.pointerId);

    const wheel = this.wheels[wheelIndex];

    gsap.to(wheel.mesh.scale, {
      x: 1.08,
      y: 1.08,
      duration: 0.08,
      ease: "power2.out",
    });
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.enabled) return;

    if (
      this.sheetAvailable &&
      !this.sheetPickedUp &&
      this.pickSheet(
        event.clientX,
        event.clientY,
      )
    ) {
      this.canvas.style.cursor = "pointer";

      gsap.to(
        this.sheetGroup.scale,
        {
          x: 1.06,
          y: 1.06,
          z: 1.06,
          duration: 0.12,
          overwrite: "auto",
        },
      );

      return;
    }

    if (
      this.sheetAvailable &&
      !this.sheetPickedUp
    ) {
      gsap.to(
        this.sheetGroup.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.12,
          overwrite: "auto",
        },
      );
    }

    if (this.solved) {
      this.canvas.style.cursor = "default";
      return;
    }

    if (
      this.activeWheelIndex !== null &&
      event.pointerId === this.activePointerId
    ) {
      const dy = event.clientY - this.lastPointerY;
      this.lastPointerY = event.clientY;

      this.dragAccumulator += dy;

      while (Math.abs(this.dragAccumulator) >= 24) {
        const direction = this.dragAccumulator < 0 ? 1 : -1;

        this.changeWheel(
          this.activeWheelIndex,
          direction,
        );

        this.dragAccumulator +=
          direction > 0 ? 24 : -24;
      }

      return;
    }

    const wheelIndex = this.pickWheel(
      event.clientX,
      event.clientY,
    );

    this.canvas.style.cursor =
      wheelIndex === null
        ? "default"
        : "ns-resize";
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (
      this.activeWheelIndex === null ||
      event.pointerId !== this.activePointerId
    ) {
      return;
    }

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    const wheel = this.wheels[this.activeWheelIndex];

    gsap.to(wheel.mesh.scale, {
      x: 1,
      y: 1,
      duration: 0.12,
      ease: "back.out(2)",
    });

    this.activeWheelIndex = null;
    this.activePointerId = null;
    this.dragAccumulator = 0;

    this.canvas.style.cursor = "default";
  };

  private pickWheel(
    clientX: number,
    clientY: number,
  ) {
    const rect = this.canvas.getBoundingClientRect();

    this.pointer.x =
      ((clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera,
    );

    const intersections =
      this.raycaster.intersectObjects(
        this.wheelHitboxes,
        false,
      );

    if (intersections.length === 0) {
      return null;
    }

    const index =
      intersections[0].object.userData.wheelIndex;

    return typeof index === "number"
      ? index
      : null;
  }

  private pickSheet(
    clientX: number,
    clientY: number,
  ) {
    if (!this.sheetHitbox) return false;

    const rect = this.canvas.getBoundingClientRect();

    this.pointer.x =
      ((clientX - rect.left) / rect.width) * 2 - 1;

    this.pointer.y =
      -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(
      this.pointer,
      this.camera,
    );

    return (
      this.raycaster.intersectObject(
        this.sheetHitbox,
        false,
      ).length > 0
    );
  }

  private pickUpSheet() {
    if (
      !this.sheetAvailable ||
      this.sheetPickedUp
    ) {
      return;
    }

    this.sheetPickedUp = true;
    this.sheetAvailable = false;

    gsap.killTweensOf(this.sheetGroup);
    gsap.killTweensOf(this.sheetGroup.position);
    gsap.killTweensOf(this.sheetGroup.rotation);
    gsap.killTweensOf(this.sheetGroup.scale);

    this.sheetGroup.scale.setScalar(1);

    gsap
      .timeline()
      .to(this.sheetGroup.position, {
        y: this.sheetGroup.position.y + 0.18,
        z: this.sheetGroup.position.z + 0.16,
        duration: 0.18,
        ease: "power2.out",
      })
      .to(
        this.sheetGroup.scale,
        {
          x: 1.12,
          y: 1.12,
          z: 1.12,
          duration: 0.14,
          ease: "back.out(1.6)",
        },
        "<",
      )
      .to(this.sheetGroup.scale, {
        x: 0.04,
        y: 0.04,
        z: 0.04,
        duration: 0.18,
        ease: "power2.in",
      })
      .call(() => {
        this.sheetGroup.visible = false;
        this.onSheetPickedUp?.();
      });

    this.canvas.style.cursor = "default";
  }

  private changeWheel(index: number, direction: number) {
    const wheel = this.wheels[index];

    wheel.value =
      (wheel.value + direction + 10) % 10;

    this.redrawDigitWheel(wheel);

    gsap
      .timeline()
      .to(wheel.mesh.position, {
        y: wheel.mesh.position.y + (direction > 0 ? 0.025 : -0.025),
        duration: 0.045,
      })
      .to(wheel.mesh.position, {
        y: 0.015,
        duration: 0.065,
        ease: "back.out(2)",
      });

    this.checkCode();
  }

  private checkCode() {
    if (this.solved) return;

    const correct = this.wheels.every(
      (wheel, index) =>
        wheel.value === CORRECT_CODE[index],
    );

    if (!correct) return;

    this.unlock();
  }

  // ==================================================
  // SOLVED
  // ==================================================

  private unlock() {
    if (this.solved) return;

    this.solved = true;

    // 密码锁已经解开，但正面仍然要保持可交互：
    // 玩家还需要点击抽屉里的透明板，把它收进「持ち物」。
    // 数字轮会因为 solved=true 自动停止响应。
    this.canvas.style.cursor = "default";

    const timeline = gsap.timeline();

    timeline.to(this.shackle.position, {
      y: this.shackle.position.y + 0.18,
      duration: 0.22,
      ease: "back.out(1.8)",
    });

    timeline.to(
      this.shackle.rotation,
      {
        z: -0.26,
        duration: 0.25,
        ease: "power2.out",
      },
      "-=0.06",
    );

    // 抽屉只沿当前盒面法线方向滑出。
    // 不再下沉或倾斜，因此盒子旋转后仍然是一个完整的实体抽屉。
    timeline.to(this.drawerGroup.position, {
      z: 1.22,
      duration: 0.56,
      ease: "power3.out",
    });

    timeline.fromTo(
      this.drawerContents.scale,
      {
        x: 0.96,
        y: 0.96,
        z: 0.96,
      },
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.24,
        ease: "back.out(1.5)",
      },
      "-=0.18",
    );

    // 抽屉完全拉出后，透明板从内部自动弹起。
    // 玩家在正面操作模式下就能清楚看见并点击。
    timeline.to(
      this.sheetGroup.position,
      {
        // 弹到锁具上方，并明显悬浮在抽屉前方。
        y: 0.92,
        z: 0.58,
        duration: 0.42,
        ease: "back.out(1.65)",
      },
      "+=0.08",
    );

    timeline.to(
      this.sheetGroup.rotation,
      {
        // 基本正对玩家，确保整张卡都能看到。
        x: 0,
        z: -0.06,
        duration: 0.42,
        ease: "back.out(1.65)",
      },
      "<",
    );

    timeline.to(
      this.sheetGroup.scale,
      {
        x: 1.06,
        y: 1.06,
        z: 1.06,
        duration: 0.12,
        ease: "power2.out",
      },
      "-=0.08",
    );

    timeline.to(
      this.sheetGroup.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.16,
        ease: "back.out(2)",
      },
    );

    timeline.call(() => {
      this.sheetAvailable = true;
      this.onSolved?.();
    });
  }

  // ==================================================
  // PUBLIC
  // ==================================================

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.activeWheelIndex = null;
      this.activePointerId = null;
      this.dragAccumulator = 0;
    }
  }

  public get isSolved() {
    return this.solved;
  }

  public dispose() {
    this.canvas.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );

    this.canvas.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );

    this.canvas.removeEventListener(
      "pointerup",
      this.handlePointerUp,
    );

    this.canvas.removeEventListener(
      "pointercancel",
      this.handlePointerUp,
    );

    for (const wheel of this.wheels) {
      wheel.texture.dispose();
      gsap.killTweensOf(wheel.mesh.scale);
      gsap.killTweensOf(wheel.mesh.position);
    }

    gsap.killTweensOf(this.shackle.position);
    gsap.killTweensOf(this.shackle.rotation);
    gsap.killTweensOf(this.drawerGroup.position);
    gsap.killTweensOf(this.drawerGroup.rotation);
    gsap.killTweensOf(this.sheetGroup);
    gsap.killTweensOf(this.sheetGroup.position);
    gsap.killTweensOf(this.sheetGroup.rotation);
    gsap.killTweensOf(this.sheetGroup.scale);

    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.geometry.dispose();

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of materials) {
        material.dispose();
      }
    });

    this.anchor.remove(this.root);
  }
}

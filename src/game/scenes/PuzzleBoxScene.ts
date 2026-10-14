import { Container, Graphics } from "pixi.js";
import { gsap } from "gsap";
import { CombinationLock } from "../objects/CombinationLock";
import { OverlaySheet } from "../objects/OverlaySheet";
import { DirectionSequenceDial } from "../objects/DirectionSequenceDial";
import { createSymbol, createSymbolRow } from "../utils/symbols";
import { createDirectionArrow } from "../utils/directions";
import type { PuzzleSymbol } from "../utils/symbols";
import { PerforatedPlate, PLATE_COLUMN_X, PLATE_HOLE_ROWS, PLATE_ROW_Y, } from "../objects/PerforatedPlate";
import { LeverBank } from "../objects/LeverBank";
import { AssemblyPiece, createAssemblyPieceGraphic, } from "../objects/AssemblyPiece";
import type { AssemblyPieceKind, } from "../objects/AssemblyPiece";
export class PuzzleBoxScene extends Container {
    private stageRef: Container;
    private drawerFront: Container;
    private drawerContents: Container;
    private combinationLock: CombinationLock | null = null;
    private overlaySheet: OverlaySheet | null = null;
    private overlayTarget: Container | null = null;
    private overlayBasePattern: Graphics | null = null;
    private directionDial: DirectionSequenceDial | null = null;
    private sequenceClue: Container | null = null;
    private sideDoor: Container | null = null;
    private perforatedPlate: PerforatedPlate | null = null;
    private contactPanel: Container | null = null;
    private contactHighlights: Graphics[] = [];
    private leverBank: LeverBank | null = null;
    private puzzleFiveSolved = false;
    private puzzleFourSolved = false;
    private drawerOpened = false;
    private sideDoorOpened = false;
    private assemblyTray: Container | null = null;
    private assemblyPieces: AssemblyPiece[] = [];
    private assemblySuccessGlow: Graphics | null = null;
    private placedAssemblyPieces = 0;
    private puzzleSixSolved = false;
    constructor(stage: Container) {
        super();
        this.stageRef = stage;
        this.drawerFront = new Container();
        this.drawerContents = new Container();
        this.buildScene();
    }
    private buildScene() {
        this.createTableShadow();
        this.createBoxBody();
        this.createMainDialArea();
        this.createPuzzleTwoTarget();
        this.createPuzzleOneClues();
        this.createPuzzleFourTarget();
        this.createPuzzleFivePanel();
        this.createPuzzleSixAssemblyArea();
        this.createSideDoor();
        this.createDrawer();
        this.createDetails();
    }
    // ==================================================
    // BOX SHADOW
    // ==================================================
    private createTableShadow() {
        const shadow = new Graphics();
        shadow
            .ellipse(605, 635, 400, 42)
            .fill({ color: 0x000000, alpha: 0.28 });
        this.addChild(shadow);
    }
    // ==================================================
    // BOX BODY
    // ==================================================
    private createBoxBody() {
        const top = new Graphics();
        top
            .poly([
            270, 155,
            900, 155,
            970, 205,
            340, 205,
        ])
            .fill(0x51331e)
            .stroke({ width: 4, color: 0x2b1a10 });
        this.addChild(top);
        const side = new Graphics();
        side
            .poly([
            900, 155,
            970, 205,
            970, 595,
            900, 625,
        ])
            .fill(0x442a19)
            .stroke({ width: 4, color: 0x26170e });
        this.addChild(side);
        const front = new Graphics();
        front
            .roundRect(270, 155, 630, 470, 14)
            .fill(0x684326)
            .stroke({ width: 7, color: 0x321f13 });
        this.addChild(front);
        const inset = new Graphics();
        inset
            .roundRect(290, 175, 590, 430, 9)
            .stroke({ width: 3, color: 0x8b6038 });
        this.addChild(inset);
    }
    // ==================================================
    // PUZZLE 3 DIRECTION DIAL
    // ==================================================
    private createMainDialArea() {
        this.directionDial = new DirectionSequenceDial({
            stage: this.stageRef,
            // ↗ ↓ ←
            correctSequence: [1, 4, 6],
            onSolved: () => this.openSideDoor(),
        });
        this.directionDial.position.set(600, 285);
        this.directionDial.setEnabled(false);
        this.addChild(this.directionDial);
    }
    // ==================================================
    // PUZZLE 1 CLUES
    // ==================================================
    private createPuzzleOneClues() {
        this.createCluePlate(360, 215, "triangle", 3);
        this.createCluePlate(820, 215, "circle", 1);
        this.createCluePlate(350, 410, "square", 4);
        this.createCluePlate(520, 410, "diamond", 2);
    }
    private createCluePlate(x: number, y: number, symbol: PuzzleSymbol, count: number) {
        const plate = new Container();
        const width = Math.max(70, count * 30 + 28);
        const height = 52;
        const background = new Graphics();
        background
            .roundRect(-width / 2, -height / 2, width, height, 6)
            .fill(0x553720)
            .stroke({ width: 2, color: 0x8f673c });
        plate.addChild(background);
        const symbols = createSymbolRow(symbol, count, 16, 25, 0xd0aa6b);
        plate.addChild(symbols);
        plate.position.set(x, y);
        this.addChild(plate);
    }
    // ==================================================
    // PUZZLE 2 TARGET
    // ==================================================
    private createPuzzleTwoTarget() {
        const target = new Container();
        target.position.set(395, 315);
        // 基础凹槽
        const plate = new Graphics();
        plate
            .roundRect(-90, -55, 180, 110, 8)
            .fill(0x4a301e)
            .stroke({ width: 3, color: 0x916b40 });
        target.addChild(plate);
        // ========================================
        // Puzzle 2 初始底图
        // ========================================
        this.overlayBasePattern = new Graphics();
        this.overlayBasePattern
            .circle(-45, 0, 9)
            .stroke({ width: 2, color: 0x9b7548 });
        this.overlayBasePattern
            .circle(45, 0, 18)
            .stroke({ width: 2, color: 0x9b7548 });
        this.overlayBasePattern
            .moveTo(-60, -30)
            .lineTo(60, 30)
            .stroke({ width: 2, color: 0x9b7548 });
        target.addChild(this.overlayBasePattern);
        // ========================================
        // Puzzle 2 完成后出现的结果板
        //
        //     1      2      3
        //     ↗      ↓      ←
        // ========================================
        this.sequenceClue = new Container();
        this.sequenceClue.alpha = 0;
        // 接近不透明的结果板
        // 会完全遮住旧的圆圈和斜线
        const cluePanel = new Graphics();
        cluePanel
            .roundRect(-84, -37, 168, 74, 8)
            .fill({ color: 0x203338, alpha: 0.98 })
            .stroke({ width: 2, color: 0xb7d1d4 });
        this.sequenceClue.addChild(cluePanel);
        const clueData = [
            { x: -52, direction: 1 }, // ↗
            { x: 0, direction: 4 }, // ↓
            { x: 52, direction: 6 }, // ←
        ];
        for (const clue of clueData) {
            const arrow = createDirectionArrow(clue.direction, 26, 0xd8eff1, 2.5);
            arrow.position.set(clue.x, 0);
            this.sequenceClue.addChild(arrow);
        }
        target.addChild(this.sequenceClue);
        this.overlayTarget = target;
        this.addChild(target);
    }
    // ==================================================
    // PUZZLE 2 SOLVED
    // ==================================================
    private handleOverlaySolved() {
        if (!this.overlayTarget || !this.sequenceClue)
            return;
        const timeline = gsap.timeline();
        // 整块面板先产生轻微机械反馈
        timeline
            .to(this.overlayTarget.scale, {
            x: 1.035,
            y: 1.035,
            duration: 0.1,
        })
            .to(this.overlayTarget.scale, {
            x: 1,
            y: 1,
            duration: 0.18,
            ease: "back.out(2)",
        });
        // 原来的透明片完全消失
        // 避免和最终结果重叠
        if (this.overlaySheet) {
            timeline.to(this.overlaySheet, {
                alpha: 0,
                duration: 0.22,
                ease: "power2.out",
            }, "-=0.03");
        }
        // 底部旧圆圈和斜线也完全消失
        if (this.overlayBasePattern) {
            timeline.to(this.overlayBasePattern, {
                alpha: 0,
                duration: 0.22,
                ease: "power2.out",
            }, "<");
        }
        // 接近不透明的新结果板出现
        timeline.fromTo(this.sequenceClue, {
            alpha: 0,
            scaleX: 0.96,
            scaleY: 0.96,
        }, {
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 0.35,
            ease: "back.out(1.5)",
        }, "-=0.05");
        // 最后启用 Puzzle 3 的顶部圆盘
        timeline.call(() => {
            this.directionDial?.setEnabled(true);
        });
    }
    // ==================================================
    // RIGHT SIDE DOOR
    // ==================================================
    private createSideDoor() {
        // ========================================
        // 门后面的凹槽
        // ========================================
        const cavity = new Graphics();
        cavity
            .roundRect(770, 255, 85, 170, 7)
            .fill(0x17120f)
            .stroke({ width: 3, color: 0x2a1a10 });
        this.addChild(cavity);
        // Puzzle 6 拼片
        this.createPuzzleSixPieces();
        // ========================================
        // Puzzle 4 金属孔板
        // ========================================
        this.perforatedPlate = new PerforatedPlate({
            stage: this.stageRef,
            targetX: 700,
            targetY: 405,
            snapDistance: 80,
            onInserted: () => this.handlePlateInserted(),
        });
        this.perforatedPlate.position.set(812, 340);
        this.perforatedPlate.alpha = 0;
        this.perforatedPlate.scale.set(0.78);
        this.perforatedPlate.setEnabled(false);
        this.addChild(this.perforatedPlate);
        // ========================================
        // 右侧门
        // ========================================
        this.sideDoor = new Container();
        this.sideDoor.position.set(855, 255);
        const doorPanel = new Graphics();
        doorPanel
            .roundRect(-85, 0, 85, 170, 7)
            .fill(0x4b301d)
            .stroke({ width: 3, color: 0x2a1a10 });
        const handle = new Graphics();
        handle
            .circle(-63, 85, 8)
            .fill(0xbe965c);
        this.sideDoor.addChild(doorPanel, handle);
        this.addChild(this.sideDoor);
        this.createHinge(850, 295);
        this.createHinge(850, 385);
    }
    private createHinge(x: number, y: number) {
        const hinge = new Container();
        hinge.position.set(x, y);
        // 门侧叶片
        const doorLeaf = new Graphics();
        doorLeaf
            .roundRect(-22, -20, 22, 40, 3)
            .fill(0xa67d48)
            .stroke({ width: 2, color: 0x51391f });
        doorLeaf.circle(-14, -10, 2.5).fill(0x4d361f);
        doorLeaf.circle(-14, 10, 2.5).fill(0x4d361f);
        // 箱体侧叶片
        const frameLeaf = new Graphics();
        frameLeaf
            .roundRect(0, -20, 16, 40, 3)
            .fill(0xb18850)
            .stroke({ width: 2, color: 0x51391f });
        frameLeaf.circle(9, -10, 2).fill(0x4d361f);
        frameLeaf.circle(9, 10, 2).fill(0x4d361f);
        // 中间转轴
        const barrel = new Graphics();
        barrel.roundRect(-4, -24, 9, 14, 4).fill(0xc39a5b);
        barrel.roundRect(-4, -7, 9, 14, 4).fill(0xc39a5b);
        barrel.roundRect(-4, 10, 9, 14, 4).fill(0xc39a5b);
        barrel.circle(0.5, -24, 4.5).fill(0xd0aa6c);
        barrel.circle(0.5, 24, 4.5).fill(0xd0aa6c);
        hinge.addChild(doorLeaf, frameLeaf, barrel);
        this.addChild(hinge);
    }
    // ==================================================
    // OPEN SIDE DOOR
    // ==================================================
    private openSideDoor() {
        if (this.sideDoorOpened ||
            !this.sideDoor ||
            !this.perforatedPlate) {
            return;
        }
        this.sideDoorOpened = true;
        const timeline = gsap.timeline();
        // ========================================
        // 解锁震动
        // ========================================
        timeline
            .to(this.sideDoor, {
            x: this.sideDoor.x + 3,
            duration: 0.05,
        })
            .to(this.sideDoor, {
            x: this.sideDoor.x - 3,
            duration: 0.05,
        })
            .to(this.sideDoor, {
            x: 855,
            duration: 0.05,
        });
        // ========================================
        // 门打开
        // ========================================
        timeline.to(this.sideDoor.scale, {
            x: 0.1,
            duration: 0.55,
            ease: "power3.inOut",
        });
        // ========================================
        // 金属孔板出现
        // ========================================
        timeline.to(this.perforatedPlate, {
            alpha: 1,
            duration: 0.3,
            ease: "power2.out",
        }, "-=0.18");
        // 从门里的缩小状态恢复正常尺寸
        timeline.to(this.perforatedPlate.scale, {
            x: 1,
            y: 1,
            duration: 0.28,
            ease: "back.out(1.5)",
        }, "-=0.12");
        // 现在玩家可以拿走
        timeline.call(() => {
            this.perforatedPlate?.setEnabled(true);
        });
    }
    // ==================================================
    // DRAWER
    // ==================================================
    private createDrawer() {
        this.createDrawerCavity();
        this.createDrawerContents();
        this.createDrawerFront();
        this.addChild(this.drawerContents);
        this.addChild(this.drawerFront);
    }
    private createDrawerCavity() {
        const cavity = new Graphics();
        cavity
            .roundRect(405, 450, 390, 135, 9)
            .fill(0x1d1611)
            .stroke({ width: 4, color: 0x29190f });
        this.addChild(cavity);
    }
    // ==================================================
    // DRAWER CONTENTS
    // Puzzle 2 透明片
    // ==================================================
    private createDrawerContents() {
        this.drawerContents.alpha = 0;
        const tray = new Graphics();
        tray
            .roundRect(510, 465, 180, 100, 8)
            .fill(0x17120f)
            .stroke({ width: 2, color: 0x493421 });
        this.drawerContents.addChild(tray);
        this.overlaySheet = new OverlaySheet({
            stage: this.stageRef,
            targetX: 395,
            targetY: 315,
            // 需要旋转 180°
            targetRotation: Math.PI,
            positionTolerance: 75,
            rotationTolerance: Math.PI / 18,
            onSolved: () => this.handleOverlaySolved(),
        });
        this.overlaySheet.position.set(600, 515);
        this.overlaySheet.setEnabled(false);
        this.drawerContents.addChild(this.overlaySheet);
    }
    // ==================================================
    // DRAWER FRONT
    // ==================================================
    private createDrawerFront() {
        const front = new Graphics();
        front
            .roundRect(410, 455, 380, 125, 8)
            .fill(0x56361f)
            .stroke({ width: 4, color: 0x29190f });
        front
            .roundRect(430, 475, 340, 86, 5)
            .stroke({ width: 2, color: 0x805534 });
        this.drawerFront.addChild(front);
        this.createCombinationLock();
        this.createLockSymbolOrder();
    }
    // ==================================================
    // COMBINATION LOCK
    // ==================================================
    private createCombinationLock() {
        this.combinationLock = new CombinationLock({
            stage: this.stageRef,
            digits: 4,
            initialCode: [0, 0, 0, 0],
            correctCode: [3, 1, 4, 2],
            onUnlock: () => this.openDrawer(),
        });
        this.combinationLock.position.set(600, 515);
        this.combinationLock.scale.set(0.52);
        this.drawerFront.addChild(this.combinationLock);
    }
    // ==================================================
    // △ ○ □ ◇
    // ==================================================
    private createLockSymbolOrder() {
        const symbols: PuzzleSymbol[] = [
            "triangle",
            "circle",
            "square",
            "diamond",
        ];
        const container = new Container();
        const spacing = 42;
        const totalWidth = (symbols.length - 1) * spacing;
        symbols.forEach((symbol, index) => {
            const graphic = createSymbol(symbol, 13, 0xcba466, 2);
            graphic.position.set(index * spacing - totalWidth / 2, 0);
            container.addChild(graphic);
        });
        container.position.set(600, 568);
        this.drawerFront.addChild(container);
    }
    // ==================================================
    // OPEN DRAWER
    // ==================================================
    private openDrawer() {
        if (this.drawerOpened)
            return;
        this.drawerOpened = true;
        const timeline = gsap.timeline();
        // 震动
        timeline
            .to(this.drawerFront, {
            x: 3,
            duration: 0.05,
        })
            .to(this.drawerFront, {
            x: -3,
            duration: 0.05,
        })
            .to(this.drawerFront, {
            x: 0,
            duration: 0.05,
        });
        // 抽屉滑出
        timeline.to(this.drawerFront, {
            y: 76,
            scaleX: 1.025,
            scaleY: 1.025,
            duration: 0.55,
            ease: "power3.out",
        });
        // 内容显现
        timeline.to(this.drawerContents, {
            alpha: 1,
            duration: 0.35,
            ease: "power2.out",
        }, "-=0.32");
        // 透明片可以操作
        timeline.call(() => {
            this.overlaySheet?.setEnabled(true);
        });
    }
    // ==================================================
    // DETAILS
    // ==================================================
    private createDetails() {
        const screws = [
            [305, 190],
            [865, 190],
            [305, 590],
            [865, 590],
        ];
        for (const [x, y] of screws) {
            const screw = new Graphics();
            screw
                .circle(x, y, 7)
                .fill(0xa27a49)
                .stroke({ width: 2, color: 0x3b291b });
            screw
                .moveTo(x - 4, y)
                .lineTo(x + 4, y)
                .stroke({ width: 1.5, color: 0x4b3422 });
            this.addChild(screw);
        }
    }
    private createPuzzleFourTarget() {
        this.contactPanel = new Container();
        this.contactPanel.position.set(700, 405);
        // ========================================
        // 外部金属凹槽
        // ========================================
        const recess = new Graphics();
        recess
            .roundRect(-47, -55, 94, 110, 7)
            .fill(0x2b2018)
            .stroke({ width: 3, color: 0x88643b });
        this.contactPanel.addChild(recess);
        // ========================================
        // 插入板对应的内部区域
        // ========================================
        const slot = new Graphics();
        slot
            .roundRect(-38, -46, 76, 92, 6)
            .fill(0x17120f)
            .stroke({ width: 2, color: 0x4e3825 });
        this.contactPanel.addChild(slot);
        // ========================================
        // 3 行 × 4 列触点
        // ========================================
        for (let row = 0; row < 3; row++) {
            for (let column = 0; column < 4; column++) {
                const x = PLATE_COLUMN_X[column];
                const y = PLATE_ROW_Y[row];
                const contact = new Graphics();
                contact
                    .circle(x, y, 4)
                    .fill(0x443222)
                    .stroke({ width: 1.5, color: 0x87633b });
                this.contactPanel.addChild(contact);
            }
        }
        // ========================================
        // 左侧三条横线，暗示三个高度
        // ========================================
        const rowMarks = new Graphics();
        for (const y of PLATE_ROW_Y) {
            rowMarks
                .moveTo(-44, y)
                .lineTo(-39, y)
                .stroke({ width: 2, color: 0xae824b });
        }
        this.contactPanel.addChild(rowMarks);
        // ========================================
        // 插入后四个真正亮起的触点
        // ========================================
        PLATE_HOLE_ROWS.forEach((row, column) => {
            const light = new Graphics();
            light
                .circle(PLATE_COLUMN_X[column], PLATE_ROW_Y[row], 5)
                .fill(0xe4bd70);
            light.alpha = 0;
            this.contactHighlights.push(light);
            this.contactPanel!.addChild(light);
        });
        this.addChild(this.contactPanel);
    }
    private handlePlateInserted() {
        if (this.puzzleFourSolved)
            return;
        this.puzzleFourSolved = true;
        const timeline = gsap.timeline();
        if (this.contactPanel) {
            timeline
                .to(this.contactPanel.scale, {
                x: 1.035,
                y: 1.035,
                duration: 0.08,
            })
                .to(this.contactPanel.scale, {
                x: 1,
                y: 1,
                duration: 0.16,
                ease: "back.out(2)",
            });
        }
        // 四个触点依次亮起
        this.contactHighlights.forEach((light, index) => {
            timeline.to(light, {
                alpha: 1,
                duration: 0.1,
            }, index * 0.08);
        });
        // 稍停一下，再弹出新的机关
        timeline.call(() => {
            this.revealLeverBank();
        }, [], "+=0.18");
    }
    private createPuzzleFivePanel() {
        this.leverBank = new LeverBank({
            stage: this.stageRef,
            // 下 / 上 / 中 / 下
            correctPositions: [2, 0, 1, 2],
            onSolved: () => this.handleLeverBankSolved(),
        });
        // Puzzle 4 完成之前隐藏
        this.leverBank.position.set(535, 455);
        this.leverBank.alpha = 0;
        this.leverBank.setEnabled(false);
        this.addChild(this.leverBank);
    }
    private revealLeverBank() {
        if (!this.leverBank)
            return;
        // ==================================================
        // 确保推杆机关位于当前可交互层最上面
        //
        // 后面创建的 drawer / assembly tray 等对象
        // 不应该挡住它的 Pointer Event。
        // ==================================================
        this.setChildIndex(this.leverBank, this.children.length - 1);
        const timeline = gsap.timeline();
        timeline.fromTo(this.leverBank, {
            alpha: 0,
            y: 455,
        }, {
            alpha: 1,
            y: 430,
            duration: 0.42,
            ease: "back.out(1.4)",
        });
        timeline.call(() => {
            if (!this.leverBank)
                return;
            this.leverBank.setEnabled(true);
            // 激活时轻微跳一下，
            // 让玩家知道这是新出现的可操作机关。
            gsap
                .timeline()
                .to(this.leverBank.scale, {
                x: 1.025,
                y: 1.025,
                duration: 0.1,
            })
                .to(this.leverBank.scale, {
                x: 1,
                y: 1,
                duration: 0.16,
                ease: "back.out(2)",
            });
        });
    }
    private handleLeverBankSolved() {
        if (this.puzzleFiveSolved ||
            !this.leverBank ||
            !this.assemblyTray) {
            return;
        }
        this.puzzleFiveSolved = true;
        const timeline = gsap.timeline();
        // ========================================
        // 推杆机关确认
        // ========================================
        timeline
            .to(this.leverBank, {
            x: this.leverBank.x + 3,
            duration: 0.05,
        })
            .to(this.leverBank, {
            x: this.leverBank.x - 3,
            duration: 0.05,
        })
            .to(this.leverBank, {
            x: 535,
            duration: 0.05,
        });
        // ========================================
        // 推杆机关退回
        // ========================================
        timeline.to(this.leverBank, {
            alpha: 0,
            y: 455,
            duration: 0.35,
            ease: "power2.in",
        });
        // ========================================
        // Puzzle 6 机关升到最前面
        // ========================================
        this.setChildIndex(this.assemblyTray, this.children.length - 1);
        for (const piece of this.assemblyPieces) {
            this.setChildIndex(piece, this.children.length - 1);
        }
        // ========================================
        // 新拼装槽升起来
        // ========================================
        timeline.to(this.assemblyTray, {
            alpha: 1,
            y: 430,
            duration: 0.42,
            ease: "back.out(1.4)",
        }, "-=0.08");
        // ========================================
        // 右边三块拼片依次出现
        // ========================================
        this.assemblyPieces.forEach((piece, index) => {
            timeline.fromTo(piece, {
                alpha: 0,
            }, {
                alpha: 1,
                duration: 0.2,
                ease: "power2.out",
            }, index * 0.1);
            timeline.fromTo(piece.scale, {
                x: 0.75,
                y: 0.75,
            }, {
                x: 1,
                y: 1,
                duration: 0.25,
                ease: "back.out(1.8)",
            }, index * 0.1);
        });
        // 最后开启操作
        timeline.call(() => {
            for (const piece of this.assemblyPieces) {
                piece.setEnabled(true);
            }
        });
    }
    private createPuzzleSixAssemblyArea() {
        this.assemblyTray = new Container();
        // 一开始藏在稍微偏下的位置
        this.assemblyTray.position.set(535, 455);
        this.assemblyTray.alpha = 0;
        // ========================================
        // 外框
        // ========================================
        const panel = new Graphics();
        panel
            .roundRect(-100, -55, 200, 110, 9)
            .fill(0x34251a)
            .stroke({
            width: 3,
            color: 0x916b41,
        });
        panel
            .roundRect(-90, -45, 180, 90, 6)
            .fill(0x211811)
            .stroke({
            width: 2,
            color: 0x55402c,
        });
        this.assemblyTray.addChild(panel);
        // ========================================
        // B 的三个凹槽
        // ========================================
        const stemSlot = createAssemblyPieceGraphic("stem", 0x0f0c09, 0x60452d);
        stemSlot.position.set(-20, 0);
        const upperSlot = createAssemblyPieceGraphic("upperArc", 0x17100c, 0x60452d);
        upperSlot.position.set(-8, -18);
        const lowerSlot = createAssemblyPieceGraphic("lowerArc", 0x17100c, 0x60452d);
        lowerSlot.position.set(-8, 18);
        this.assemblyTray.addChild(stemSlot, upperSlot, lowerSlot);
        // ========================================
        // 完成后的外框亮光
        // ========================================
        this.assemblySuccessGlow =
            new Graphics();
        this.assemblySuccessGlow
            .roundRect(-92, -47, 184, 94, 7)
            .stroke({
            width: 3,
            color: 0xe2ba70,
        });
        this.assemblySuccessGlow.alpha = 0;
        this.assemblyTray.addChild(this.assemblySuccessGlow);
        this.addChild(this.assemblyTray);
    }
    private createPuzzleSixPieces() {
        const pieces: {
            kind: AssemblyPieceKind;
            x: number;
            y: number;
            rotation: number;
            targetX: number;
            targetY: number;
        }[] = [
            {
                kind: "stem",
                // 在右侧柜中横着放
                x: 812,
                y: 290,
                rotation: Math.PI / 2,
                targetX: 515,
                targetY: 430,
            },
            {
                kind: "upperArc",
                x: 805,
                y: 342,
                rotation: Math.PI,
                targetX: 527,
                targetY: 412,
            },
            {
                kind: "lowerArc",
                x: 815,
                y: 395,
                rotation: -Math.PI / 2,
                targetX: 527,
                targetY: 448,
            },
        ];
        for (const config of pieces) {
            const piece = new AssemblyPiece({
                stage: this.stageRef,
                kind: config.kind,
                targetX: config.targetX,
                targetY: config.targetY,
                targetRotation: 0,
                positionTolerance: 45,
                rotationTolerance: Math.PI / 18,
                onPlaced: () => {
                    this.handleAssemblyPiecePlaced();
                },
            });
            piece.position.set(config.x, config.y);
            piece.rotation =
                config.rotation;
            piece.alpha = 0;
            piece.setEnabled(false);
            this.assemblyPieces.push(piece);
            this.addChild(piece);
        }
    }
    private handleAssemblyPiecePlaced() {
        if (this.puzzleSixSolved)
            return;
        this.placedAssemblyPieces++;
        if (this.placedAssemblyPieces <
            this.assemblyPieces.length) {
            return;
        }
        this.solvePuzzleSix();
    }
    private solvePuzzleSix() {
        if (this.puzzleSixSolved || !this.assemblyTray)
            return;
        this.puzzleSixSolved = true;
        const timeline = gsap.timeline();
        // B 完成确认
        timeline
            .to(this.assemblyTray.scale, {
            x: 1.035,
            y: 1.035,
            duration: 0.1,
        })
            .to(this.assemblyTray.scale, {
            x: 1,
            y: 1,
            duration: 0.18,
            ease: "back.out(2)",
        });
        if (this.assemblySuccessGlow) {
            timeline.to(this.assemblySuccessGlow, {
                alpha: 1,
                duration: 0.3,
                ease: "power2.out",
            }, "-=0.05");
        }
        // 这里暂时结束。Puzzle 7 将重新设计。
        // B 会保留在箱体上，供后续谜题继续使用。
    }
    // ==================================================
    // CLEANUP
    // ==================================================
    public dispose() {
        this.combinationLock?.dispose();
        this.overlaySheet?.dispose();
        this.directionDial?.dispose();
        this.perforatedPlate?.dispose();
        this.leverBank?.dispose();
        for (const piece of this.assemblyPieces) {
            piece.dispose();
        }
        gsap.killTweensOf(this.drawerFront);
        gsap.killTweensOf(this.drawerContents);
        gsap.killTweensOf(this.overlaySheet);
        gsap.killTweensOf(this.overlayBasePattern);
        gsap.killTweensOf(this.overlayTarget?.scale);
        gsap.killTweensOf(this.sequenceClue);
        gsap.killTweensOf(this.sequenceClue?.scale);
        gsap.killTweensOf(this.sideDoor);
        gsap.killTweensOf(this.sideDoor?.scale);
        gsap.killTweensOf(this.contactPanel);
        gsap.killTweensOf(this.contactPanel?.scale);
        gsap.killTweensOf(this.leverBank);
        gsap.killTweensOf(this.assemblyTray);
        gsap.killTweensOf(this.assemblyTray?.scale);
        gsap.killTweensOf(this.assemblySuccessGlow);
        for (const light of this.contactHighlights) {
            gsap.killTweensOf(light);
            gsap.killTweensOf(light.scale);
        }
    }
}

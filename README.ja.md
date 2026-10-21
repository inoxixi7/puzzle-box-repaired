# Puzzle Box

[中文](README.md) | 日本語

ブラウザで遊べる 3D の仕掛け箱パズルゲームです。

## すぐに遊ぶ（インストール不要）

- Web 版：https://inoxixi7.github.io/puzzle-box-repaired/
- オフライン版（1 ファイル）：https://inoxixi7.github.io/puzzle-box-repaired/puzzle-box-offline.html
  右クリック →「名前を付けてリンク先を保存」でダウンロードし、ダブルクリックして Chrome / Edge で開くだけで遊べます。

## ZIP をダウンロードして自分の PC で動かす

### 1. 必要なもの

- [Node.js](https://nodejs.org/ja) 22 以上（LTS 版を推奨。npm も一緒にインストールされます）
- Chrome / Edge などの最新ブラウザ

インストール後、ターミナル（Windows は PowerShell）で次のコマンドを実行し、バージョンが表示されれば OK です。

```bash
node -v
npm -v
```

### 2. ZIP をダウンロードして解凍する

1. https://github.com/inoxixi7/puzzle-box-repaired を開く
2. 緑色の「Code」ボタン →「Download ZIP」をクリック
3. ダウンロードした `puzzle-box-repaired-main.zip` を右クリック →「すべて展開」（Mac はダブルクリック）
4. 展開された `puzzle-box-repaired-main` フォルダの中に `package.json` があることを確認

Git を使う場合は ZIP の代わりに次のコマンドでも取得できます。

```bash
git clone https://github.com/inoxixi7/puzzle-box-repaired.git
```

### 3. 依存パッケージをインストールする

ターミナルで解凍したフォルダに移動し、インストールします。

```bash
cd puzzle-box-repaired-main
npm ci
```

> **Windows で「このシステムではスクリプトの実行が無効になっているため…」と表示された場合**
> PowerShell で次のコマンドを実行してから、もう一度 `npm ci` を実行してください（この PowerShell ウィンドウの間だけ有効です）。
>
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
> ```

### 4. 起動する

```bash
npm run dev
```

ターミナルに表示される URL（通常は http://localhost:5173/ ）をブラウザで開くと遊べます。
終了するときはターミナルで `Ctrl + C` を押します。

## ビルド（配布用ファイルを作る）

```bash
npm run build          # dist/ に出力。Web サーバーに置いて公開する用
npm run preview        # ビルド結果をローカルで確認（http://localhost:4173/）
npm run build:single   # dist-single/index.html に 1 ファイルで出力。ダブルクリックで開ける
```

`dist/index.html` はダブルクリックでは動きません（Web サーバーが必要です）。
サーバーなしで配りたい場合は `npm run build:single` で作ったファイルを使ってください。

`main` ブランチにプッシュすると、GitHub Actions が自動でビルドして上記の Web 版を更新します（`.github/workflows/deploy-pages.yml`）。

## 遊び方

- ドラッグで箱を回転
- 面をクリック（タップ）するとその面を調べる
- 手に入れた道具は画面右下の「持ち物」から選んで使う
- 「観察に戻る」ボタンまたは Esc キーで全体表示に戻る

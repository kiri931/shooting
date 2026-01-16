# shooting

Canvas（HTML5）と JavaScript（ES Modules）で作る、シンプルな 2D シューティング教材＋完成版サンプルです。

- 学習用（Step1〜13）: `docs/learning/`
- 完成版ゲーム: `game/`

## すぐ動かす（重要: ローカルサーバーが必要）

`type="module"` を使っているため、`file://` 直開きだと動かない（または一部機能が制限される）ことがあります。
リポジトリ直下でローカルサーバーを起動して、ブラウザでアクセスしてください。

### 方法A: Python（おすすめ）

```bash
python -m http.server 8000
```

- 学習トップ: http://localhost:8000/docs/learning/
- 完成版ゲーム: http://localhost:8000/game/

### 方法B: VS Code の Live Server

Live Server 拡張を入れて、`docs/learning/index.html` または `game/index.html` を「Open with Live Server」で開きます。

### 方法C: Node.js

```bash
npx serve .
```

## 学習（Step1〜13）

`docs/learning/index.html` からステップ一覧へ入れます。

特徴:
- 左にサンプル実行、右に自分のコードを置いて比較しながら進められます
- Stepが進むにつれて、Canvas描画 → 自機操作 → 弾 → 敵 → モジュール化 → 当たり判定 → HUD → ゲームオーバー → 仕上げ、の順に積み上げます

最終ステップ（Step13）では、敵タイプ追加（直進/追尾）や武器強化などを含む「完成版」になります。

## 完成版ゲーム

`game/index.html` がエントリポイントです。

学習Stepと同様に Canvas 上で動作します。

操作（完成版）:
- ← / →: 移動
- Space: 発射
- U: 武器強化

## ディレクトリ構成（ざっくり）

- `docs/`
	- 学習ページ一式（学習トップ、playground、各stepのコード、ガイド）
	- `docs/learning/step*/` にステップごとの `index.html` / `main.js` / `style.css` など
- `game/`
	- 完成版（`game/js/` 以下に分割されたモジュール）
- `shared/`
	- 共通スタイル等

## よくあるトラブル

- 画面が真っ白 / Console に CORS や import エラーが出る
	- `file://` で開いている可能性が高いです。上の手順でローカルサーバー経由で開いてください。

## 変更・追加したいとき

- 学習内容をいじりたい: `docs/learning/step*/` を編集
- 完成版をいじりたい: `game/js/` を編集

## ライセンス

未記載です。必要なら追加します。
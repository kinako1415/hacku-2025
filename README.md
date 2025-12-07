# AI リハビリテーションアプリ

MediaPipe AIを使った手首可動域測定アプリケーション

## 概要

このアプリは、Webカメラを使って手首の可動域を自動測定し、リハビリの進捗を記録・可視化します。
特別な機器は不要で、ブラウザだけで動作します。

## 主な機能

- リアルタイム角度測定(掌屈・背屈・尺屈・橈屈)
- 測定データの自動保存(ブラウザローカル)
- 経過グラフ表示
- オフライン対応(PWA)
- プライバシー保護(データは外部に送信されません)

## 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Sass
- **状態管理**: Jotai
- **AI/ML**: MediaPipe Hands & Pose
- **データベース**: Dexie.js (IndexedDB)
- **グラフ**: Recharts

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで開く
# http://localhost:3000
```

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── measurement/        # 測定ページ
│   ├── progress/           # 進捗確認ページ
│   └── calendar/           # カレンダー表示
├── components/             # UIコンポーネント
│   ├── camera/             # カメラプレビュー
│   ├── measurement/        # 測定UI
│   └── progress/           # グラフ表示
├── core/                   # クリーンアーキテクチャ
│   ├── domain/             # ビジネスロジック・型
│   ├── application/        # ユースケース
│   └── infrastructure/     # 外部ライブラリ連携
├── lib/                    # ライブラリ層
│   └── mediapipe/          # MediaPipe統合
└── stores/                 # グローバル状態管理
```

## ハッカソン展示用ドキュメント

展示時の技術質問に備えて、以下のドキュメントを用意しています:

### 📘 [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md)

技術的な詳細解説

- 角度測定の仕組み(ベクトル計算、内積・外積)
- 各方向の測定アルゴリズム
- 精度向上の工夫
- コアモジュールの説明
- デモ用スクリプト(30秒/1分/技術者向け)

### 📗 [HOW_IT_WORKS.md](./HOW_IT_WORKS.md)

わかりやすい図解付き解説

- 3ステップで理解する仕組み
- 具体的な測定例
- 技術用語の解説
- よくある質問への回答

### 📙 [HACKATHON_QA.md](./HACKATHON_QA.md)

想定Q&A集(25問以上)

- 技術的な質問(角度計算、MediaPipe、精度など)
- アプリケーション全般の質問
- 開発に関する質問
- トラブルシューティング

## クイックリファレンス

### 角度測定の仕組み(30秒版)

1. **MediaPipe Hands**が手を21個の3D座標点として検出
2. **ベクトル計算**で点間の関係を数値化
3. **三角関数**(arccos, arctan2)で角度に変換

### コアファイル

- [角度計算](src/core/infrastructure/mediapipe/angle-calculator.ts) - ベクトル・角度計算のコアロジック
- [手検出](src/lib/mediapipe/hands-detector.ts) - MediaPipe Hands統合
- [測定サービス](src/hooks/useMeasurementService.ts) - 測定データ保存

## デモ時の注意点

### カメラ配置

- 小指側から手の側面を撮影
- カメラとの距離: 30-50cm
- 十分な照明を確保

### 測定のコツ

- 手を画面中央に配置
- 信頼度スコア0.8以上を目指す
- 測定中は手を動かさない(10秒間)

### トラブルシューティング

- カメラが映らない → ブラウザの権限確認
- 角度が不正確 → 照明と距離を調整
- 動作が重い → 他のタブを閉じる

## ライセンス

MIT License (予定)

## 開発者向け

### テスト実行

```bash
npm run test
```

### ビルド

```bash
pnpm build
```

### 型チェック

```bash
pnpm type-check
```

## 参考リンク

- [MediaPipe公式](https://developers.google.com/mediapipe)
- [Next.js公式](https://nextjs.org/)
- [Dexie.js公式](https://dexie.org/)

---

**ハッカソンでの展示、応援しています！**

技術的な質問があれば、上記のドキュメントを参照してください。

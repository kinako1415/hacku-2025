# 技術スタック詳細

## フロントエンド技術
- **Next.js**: 14.2.32 (App Router使用)
- **React**: 18.3.1
- **TypeScript**: 5.4.0 (strict mode有効)

## AI・機械学習
- **@mediapipe/hands**: 0.4.1675469240 - 手の検出・追跡
- **@mediapipe/pose**: 0.5.1646424915 - 姿勢検出・追跡
- **@mediapipe/drawing_utils**: 0.3.1620248257 - 描画ユーティリティ

## 状態管理・データ
- **Jotai**: 2.14.0 - 原子的状態管理
- **Dexie**: 3.2.4 - IndexedDBのORM
- **LocalStorage**: 設定データ永続化

## UI・スタイリング
- **CSS Modules**: SCSS形式 (.module.scss)
- **CSS変数**: カスタムプロパティ使用
- **レスポンシブデザイン**: モバイルファースト

## 開発・テスト
- **Jest**: 29.7.0 - ユニット・統合テスト
- **@testing-library/react**: 16.0.1
- **@testing-library/jest-dom**: 6.4.8
- **Playwright**: 1.47.2 - E2Eテスト
- **ESLint**: 8.57.1 - リンティング
- **Prettier**: 3.3.3 - コード整形

## ビルド・デプロイ
- **Next.js**: 内蔵bundler
- **TypeScript**: tsconfig.json設定
- **pnpm**: パッケージマネージャー

## PWA対応
- **Manifest**: public/manifest.json
- **Service Worker**: public/sw.js
- **オフライン対応**: pages/offline.tsx

## 医療データ配慮
- **ローカルストレージ**: 個人情報の外部送信なし
- **データ暗号化**: IndexedDB内で実装
- **プライバシー重視**: GDPR・HIPAA準拠設計
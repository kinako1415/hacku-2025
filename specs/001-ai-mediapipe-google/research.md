<!-- @format -->

# Research: AI 駆動手首・母指可動域リハビリテーションアプリ

## MediaPipe Hands/Pose 統合

**Decision**: MediaPipe Hands + MediaPipe Pose の組み合わせ使用
**Rationale**:

- MediaPipe Hands で手指・母指の詳細な関節点取得
- MediaPipe Pose で手首関節の安定した追跡
- JavaScript 版で直接ブラウザ実行、サーバー不要
- リアルタイム性能（30fps）達成可能

**Alternatives considered**:

- TensorFlow.js 単体: 精度不足、モデル開発コスト高
- OpenPose: ブラウザ対応困難、重い
- 独自 AI 開発: 開発期間・精度の観点で不適切

## 可動域角度計算手法

**Decision**: 3 点ベクトル角度計算法
**Rationale**:

- 手首: 前腕-手首-手掌の 3 点でベクトル角度
- 母指: 手根中手-中手指節-指節間の 3 点角度
- 数学的に安定、MediaPipe ランドマークと親和性高
- ±5° 精度達成可能

**Alternatives considered**:

- 2 点直線角度: 精度不足
- 複雑な 3D 回転行列: 計算コスト過大、ブラウザ負荷

## データ永続化戦略

**Decision**: IndexedDB (Dexie.js) + LocalStorage
**Rationale**:

- IndexedDB: 測定データの構造化保存、容量制限緩い
- LocalStorage: 設定・ユーザー情報の軽量保存
- オフライン完全対応
- プライバシー保護（ローカル完結）

**Alternatives considered**:

- CloudFirestore: プライバシー懸念、オフライン制限
- SQLite WASM: ブラウザサポート不安定
- File System Access API: サポートブラウザ限定

## リアルタイム描画・可視化

**Decision**: HTML5 Canvas + 2D Context
**Rationale**:

- MediaPipe との統合容易
- 角度表示、ガイドライン描画に最適
- 全ブラウザサポート安定
- パフォーマンス要件（30fps）満足

**Alternatives considered**:

- WebGL/Three.js: 機能過剰、複雑性増大
- SVG: アニメーション性能不足
- CSS Transform: 精密描画困難

## 状態管理・アーキテクチャ

**Decision**: Jotai (原子的状態管理)
**Rationale**:

- 測定状態、カレンダー状態の分離管理
- React 18 Concurrent Mode 対応
- 学習コスト低、軽量
- TypeScript 親和性高

**Alternatives considered**:

- Redux Toolkit: 過剰な複雑性
- Zustand: 型安全性で劣る
- React Context: パフォーマンス懸念

## PWA・オフライン対応

**Decision**: Next.js PWA + Service Worker
**Rationale**:

- モバイル体験向上必須
- オフライン測定・記録対応
- アプリライクな UX
- インストール可能

**Alternatives considered**:

- Capacitor: Web 技術活用するもネイティブ複雑性
- PWA 無し: モバイル体験劣化

## テスト戦略詳細

**Decision**:

- Unit: Jest + React Testing Library
- Integration: MSW (API mocking)
- E2E: Playwright (クロスブラウザ)
- Visual: Chromatic/percy (UI 回帰)

**Rationale**:

- TDD 準拠、RED-GREEN-Refactor
- MediaPipe 部分のモック戦略確立
- 測定精度の自動検証体制

**Alternatives considered**:

- Cypress: Playwright より重い
- Testing Library 単体: E2E 不足

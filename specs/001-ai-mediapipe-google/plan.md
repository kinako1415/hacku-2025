<!-- @format -->

<!# 実装計画: AI 駆動手首・母指可動域リハビリテーションアプリ

**ブランチ**: `001-ai-mediapipe-google` | **日付**: 2025 年 9 月 14 日 | **仕様書**: [spec.md](./spec.md)
**入力**: `/specs/001-ai-mediapipe-google/spec.md`からの機能仕様書 format -->

# Implementation Plan: AI 駆動手首・母指可動域リハビリテーションアプリ

**Branch**: `001-ai-mediapipe-google` | **Date**: 2025 年 9 月 14 日 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-mediapipe-google/spec.md`

## 実行フロー (/plan コマンドの範囲)

```
1. 入力パスから機能仕様書を読み込み
   → 見つからない場合: ERROR "No feature spec at {path}"
2. 技術コンテキストを記入（NEEDS CLARIFICATIONをスキャン）
   → コンテキストからプロジェクトタイプを検出（web=frontend+backend, mobile=app+api）
   → プロジェクトタイプに基づいて構造決定を設定
3. 以下の憲法チェックセクションを評価
   → 違反が存在する場合: 複雑性追跡に文書化
   → 正当化不可能な場合: ERROR "Simplify approach first"
   → 進捗追跡を更新: 初期憲法チェック
4. Phase 0実行 → research.md
   → NEEDS CLARIFICATIONが残っている場合: ERROR "Resolve unknowns"
5. Phase 1実行 → contracts, data-model.md, quickstart.md, エージェント固有テンプレートファイル
6. 憲法チェックセクションを再評価
   → 新しい違反がある場合: 設計をリファクタリング、Phase 1に戻る
   → 進捗追跡を更新: 設計後憲法チェック
7. Phase 2を計画 → タスク生成アプローチを記述（tasks.mdは作成しない）
8. 停止 - /tasksコマンドの準備完了
```

**重要**: /plan コマンドはステップ 7 で停止します。Phase 2-4 は他のコマンドで実行されます：

- Phase 2: /tasks コマンドが tasks.md を作成
- Phase 3-4: 実装実行（手動またはツール経由）

## 概要

手首・母指の可動域をカメラと AI 骨格推定で自動測定し、毎日の記録をカレンダー形式で管理するリハビリテーション支援 Web アプリケーション。Next.js、TypeScript、MediaPipe Hands を使用して、±5° 精度での可動域測定と進捗追跡を実現。

## 技術コンテキスト

**言語/バージョン**: TypeScript, Node.js 18+, React 18+  
**主要依存関係**: Next.js (App Router), MediaPipe Hands/Pose (JS), jotai, module.scss  
**ストレージ**: IndexedDB, Web Storage (LocalStorage/SessionStorage)  
**テスト**: Jest, React Testing Library, Playwright (E2E)  
**対象プラットフォーム**: Web (Chrome/Safari/Firefox, モバイル対応)
**プロジェクトタイプ**: web (frontend + backend API routes)  
**パフォーマンス目標**: リアルタイム動作追跡 (30fps), 測定精度 ±5°, 応答時間<200ms  
**制約**: カメラアクセス必須, オフライン対応, PWA 対応推奨  
**規模/範囲**: 個人利用アプリ, 長期データ保存対応, 医療データプライバシー準拠

## 憲法チェック

_ゲート: Phase 0 調査前に合格必須。Phase 1 設計後に再チェック。_

**Language/Version**: TypeScript, Node.js 18+, React 18+  
**Primary Dependencies**: Next.js (App Router), MediaPipe Hands/Pose (JS), jotai, module.scss  
**Storage**: IndexedDB, Web Storage (LocalStorage/SessionStorage)  
**Testing**: Jest, React Testing Library, Playwright (E2E)  
**Target Platform**: Web (Chrome/Safari/Firefox, モバイル対応)
**Project Type**: web (frontend + backend API routes)  
**Performance Goals**: リアルタイム動作追跡 (30fps), 測定精度 ±5°, 応答時間<200ms  
**Constraints**: カメラアクセス必須, オフライン対応, PWA 対応推奨  
**Scale/Scope**: 個人利用アプリ, 長期データ保存対応, 医療データプライバシー準拠

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**シンプルさ**:

- プロジェクト数: 1 (API ルート付き Next.js アプリ)
- フレームワーク直接使用?: Yes (Next.js App Router 直接使用)
- 単一データモデル?: Yes (測定データ統一モデル)
- パターンを避ける?: Yes (複雑な抽象化を避ける)

**アーキテクチャ**:

- すべての機能をライブラリ化?: Yes
- ライブラリ一覧:
  - mediapipe-motion-capture (動作測定)
  - motion-data-manager (データ管理)
  - calendar-tracker (カレンダー記録)
- ライブラリ毎の CLI: Yes (--help/--version/--format 対応)
- ライブラリドキュメント: llms.txt 形式計画済み? Yes

**テスト (交渉不可)**:

- RED-GREEN-Refactor サイクル強制?: Yes
- Git コミットで実装前にテスト?: Yes
- 順序: Contract→Integration→E2E→Unit 厳密遵守? Yes
- 実際の依存関係使用?: Yes (実際の IndexedDB 使用)
- 統合テスト対象: 新ライブラリ、契約変更、共有スキーマ? Yes

**可観測性**:

- 構造化ログ含む?: Yes (console 構造化ログ)
- フロントエンドログ → バックエンド?: Yes (統一ログストリーム)
- エラーコンテキスト十分?: Yes

**バージョニング**:

- バージョン番号割り当て?: 1.0.0
- 変更毎に BUILD 増分?: Yes
- 破壊的変更処理?: Yes (並行テスト、移行計画)

## プロジェクト構造

### ドキュメント (この機能)

```
specs/[###-feature]/
├── plan.md              # このファイル (/planコマンド出力)
├── research.md          # Phase 0出力 (/planコマンド)
├── data-model.md        # Phase 1出力 (/planコマンド)
├── quickstart.md        # Phase 1出力 (/planコマンド)
├── contracts/           # Phase 1出力 (/planコマンド)
└── tasks.md             # Phase 2出力 (/tasksコマンド - /planでは作成されない)
```

### ソースコード (リポジトリルート)

### Source Code (repository root)

```
# オプション1: 単一プロジェクト (デフォルト)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# オプション2: Webアプリケーション ("frontend" + "backend"検出時)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# オプション3: モバイル + API ("iOS/Android"検出時)
api/
└── [上記backendと同じ]

ios/ or android/
└── [プラットフォーム固有構造]
```

**構造決定**: オプション 2 (Web アプリケーション) - frontend + backend API ルート

## Phase 0: 概要・調査

1. **上記技術コンテキストから不明点を抽出**:

   - NEEDS CLARIFICATION 毎 → 調査タスク
   - 依存関係毎 → ベストプラクティスタスク
   - 統合毎 → パターンタスク

2. **調査エージェント生成・派遣**:

   ```
   技術コンテキストの不明点毎:
     タスク: "{機能コンテキスト}用の{不明点}を調査"
   技術選択毎:
     タスク: "{ドメイン}での{技術}ベストプラクティスを見つける"
   ```

3. **調査結果を統合** `research.md`に以下形式で:
   - 決定: [選択された内容]
   - 根拠: [選択理由]
   - 検討した代替案: [評価した他の選択肢]

**出力**: NEEDS CLARIFICATION 全て解決済みの research.md

## Phase 1: 設計・契約

_前提条件: research.md 完了_

1. **機能仕様からエンティティ抽出** → `data-model.md`:

   - エンティティ名、フィールド、関係性
   - 要件からのバリデーションルール
   - 該当する場合は状態遷移

2. **機能要件から API 契約生成**:

   - ユーザーアクション毎 → エンドポイント
   - 標準 REST/GraphQL パターン使用
   - OpenAPI/GraphQL スキーマを`/contracts/`に出力

3. **契約からコントラクトテスト生成**:

   - エンドポイント毎に 1 テストファイル
   - リクエスト/レスポンススキーマをアサート
   - テストは失敗必須（まだ実装なし）

4. **ユーザーストーリーからテストシナリオ抽出**:

   - ストーリー毎 → 統合テストシナリオ
   - クイックスタートテスト = ストーリー検証ステップ

5. **エージェントファイルを増分更新** (O(1)操作):
   - AI アシスタント用に`/scripts/bash/update-agent-context.sh copilot`実行
   - 存在する場合: 現在の計画から新技術のみ追加
   - マーカー間の手動追加を保持
   - 最近の変更を更新（最新 3 つ保持）
   - トークン効率のため 150 行以下に維持
   - リポジトリルートに出力

**出力**: data-model.md, /contracts/\*, 失敗テスト, quickstart.md, エージェント固有ファイル

## Phase 2: タスク計画アプローチ

_このセクションは/tasks コマンドが実行する内容を記述 - /plan では実行しない_

**タスク生成戦略**:

- `/templates/tasks-template.md`をベーステンプレートとして読み込み
- Phase 1 成果物から生成: API 契約、データモデル、クイックスタートシナリオ
- API エンドポイント毎 → コントラクトテストタスク [P]
- エンティティ毎（User, MotionMeasurement, CalendarRecord, ProgressData） → モデル作成タスク [P]
- クイックスタートからのユーザーストーリー毎 → 統合テストタスク
- MediaPipe 統合 → カメラ、ポーズ検出、角度計算用専門タスク
- テストを通すための実装タスクを順序付け（TDD アプローチ）

**順序戦略**:

- **Phase 1 タスク**: インフラ・契約
  1. プロジェクトセットアップ（Next.js, TypeScript, 依存関係）
  2. コントラクトテスト作成（API 仕様検証）
  3. データモデル実装（TypeScript 型 + Dexie スキーマ）
- **Phase 2 タスク**: コアライブラリ [P] 4. MediaPipe 統合ライブラリ（カメラ、hands/pose デテクション） 5. 動作計算ライブラリ（角度計算、検証） 6. データ管理ライブラリ（IndexedDB 操作、CRUD） 7. カレンダー追跡ライブラリ（日付操作、メモ管理）
- **Phase 3 タスク**: 統合・UI 8. 統合テスト（MediaPipe + データフロー） 9. React コンポーネント（測定 UI、カレンダー UI、進捗 UI） 10. 状態管理（測定・カレンダー状態用 Jotai アトム）
- **Phase 4 タスク**: E2E・仕上げ 11. エンドツーエンドテスト（クイックスタートシナリオ自動化） 12. エラーハンドリング・エッジケース 13. PWA セットアップ・最適化 14. ドキュメント・デプロイ準備

**並列実行マーカー [P]**:

- 独立ライブラリは並列開発可能
- コンポーネント開発はライブラリ実装と並行可能
- コントラクトテストは独立実行可能

**推定出力**: TDD 原則に従った 30-35 の番号付き依存関係順タスクを tasks.md に

**重要**: この Phase は/tasks コマンドで実行、/plan では実行しない

## Phase 3+: 今後の実装

_/plan コマンドの範囲を超えた Phase_

**Phase 3**: タスク実行（/tasks コマンドが tasks.md 作成）  
**Phase 4**: 実装（憲法原則に従って tasks.md 実行）  
**Phase 5**: 検証（テスト実行、quickstart.md 実行、パフォーマンス検証）

## 複雑性追跡

_憲法チェックに正当化が必要な違反がある場合のみ記入_

| 違反                       | 必要な理由     | 却下されたシンプルな代替案とその理由 |
| -------------------------- | -------------- | ------------------------------------ |
| [例: 4 番目のプロジェクト] | [現在のニーズ] | [3 プロジェクトが不十分な理由]       |
| [例: Repository パターン]  | [具体的問題]   | [直接 DB アクセスが不十分な理由]     |

## 進捗追跡

_このチェックリストは実行フロー中に更新される_

**Phase 状況**:

- [x] Phase 0: 調査完了（/plan コマンド）
- [x] Phase 1: 設計完了（/plan コマンド）
- [x] Phase 2: タスク計画完了（/plan コマンド - アプローチ記述のみ）
- [ ] Phase 3: タスク生成完了（/tasks コマンド）
- [ ] Phase 4: 実装完了
- [ ] Phase 5: 検証合格

**ゲート状況**:

- [x] 初期憲法チェック: 合格
- [x] 設計後憲法チェック: 合格
- [x] 全 NEEDS CLARIFICATION 解決済み
- [x] 複雑性逸脱文書化済み（要求なし）

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_

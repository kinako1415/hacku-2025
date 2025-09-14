<!-- @format -->

# タスク: AI 駆動手首・母指可動域リハビリテーションアプリ

**入力**: `/specs/001-ai-mediapipe-google/`からの設計ドキュメント
**前提条件**: plan.md (必須), research.md, data-model.md, contracts/

## 実行フロー (main)

```
1. 機能ディレクトリからplan.mdを読み込み
   → 技術スタック: Next.js 14, TypeScript, MediaPipe Hands/Pose, Jotai, CSS Modules
   → ライブラリ: mediapipe-motion-capture, motion-data-manager, calendar-tracker
2. 設計ドキュメントを読み込み:
   → data-model.md: User, MotionMeasurement, CalendarRecord, ProgressDataエンティティ
   → contracts/api-spec.yaml: 測定、カレンダー、進捗のAPIエンドポイント
   → research.md: MediaPipe統合、3点ベクトル角度計算
   → quickstart.md: 6ステップ検証シナリオ
3. カテゴリ別にタスクを生成:
   → セットアップ: Next.jsプロジェクト、TypeScript、依存関係
   → テスト: コントラクトテスト、MediaPipe + データフローの統合テスト
   → コア: エンティティモデル、MediaPipeライブラリ、データ管理
   → 統合: Reactコンポーネント、状態管理、APIルート
   → 仕上げ: E2Eテスト、PWAセットアップ、パフォーマンス最適化
4. TDD順序: 実装前にテスト
5. 並列タスクに[P]マーク（異なるファイル、依存関係なし）
```

## 形式: `[ID] [P?] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明に正確なファイルパスを含める

## パス規則

- **Web アプリ**: `src/`, `src/app/`, `src/lib/`, `src/components/`, `tests/`
- スタイリング用 module.scss を含む TypeScript ファイル
- Next.js App Router 構造

## Phase 3.1: セットアップ

- [ ] T001 TypeScript と App Router で Next.js 14 プロジェクト構造を作成
- [ ] T002 依存関係をインストール: MediaPipe, Jotai, Dexie.js, CSS Modules, Jest, Playwright
- [ ] T003 [P] ESLint、Prettier、TypeScript strict モードを設定

## Phase 3.2: テストファースト (TDD) ⚠️ 3.3 の前に完了必須

**重要: これらのテストは実装前に作成し、失敗する必要があります**

- [ ] T004 [P] tests/contract/test_measurements_post.ts で POST /api/measurements のコントラクトテスト
- [ ] T005 [P] tests/contract/test_measurements_get.ts で GET /api/measurements のコントラクトテスト
- [ ] T006 [P] tests/contract/test_calendar_get.ts で GET /api/calendar のコントラクトテスト
- [ ] T007 [P] tests/contract/test_calendar_post.ts で POST /api/calendar のコントラクトテスト
- [ ] T008 [P] tests/contract/test_progress_get.ts で GET /api/progress/{userId}のコントラクトテスト
- [ ] T009 [P] tests/integration/test_mediapipe_hands.ts で MediaPipe hands 検出の統合テスト
- [ ] T010 [P] tests/integration/test_angle_calculation.ts で角度計算の統合テスト
- [ ] T011 [P] tests/integration/test_data_storage.ts でデータ保存フローの統合テスト
- [ ] T012 [P] tests/integration/test_camera_workflow.ts でカメラ測定ワークフローの統合テスト

## Phase 3.3: コア実装 (テスト失敗後のみ)

- [ ] T013 [P] src/lib/data-manager/models/user.ts で User エンティティモデル
- [ ] T014 [P] src/lib/data-manager/models/motion-measurement.ts で MotionMeasurement エンティティモデル
- [ ] T015 [P] src/lib/data-manager/models/calendar-record.ts で CalendarRecord エンティティモデル
- [ ] T016 [P] src/lib/data-manager/models/progress-data.ts で ProgressData エンティティモデル
- [ ] T017 [P] src/lib/data-manager/database.ts で Dexie を使用した IndexedDB スキーマセットアップ
- [ ] T018 [P] src/lib/mediapipe/hands-detector.ts で MediaPipe Hands 初期化
- [ ] T019 [P] src/lib/mediapipe/pose-detector.ts で MediaPipe Pose 初期化
- [ ] T020 [P] src/lib/motion-capture/angle-calculator.ts で 3 点ベクトル角度計算
- [ ] T021 [P] src/lib/motion-capture/camera-service.ts でカメラキャプチャサービス
- [ ] T022 [P] src/lib/motion-capture/measurement-service.ts で動作測定サービス
- [ ] T023 src/lib/data-manager/data-service.ts でデータ管理 CRUD 操作
- [ ] T024 src/lib/calendar-tracker/calendar-service.ts でカレンダー追跡サービス
- [ ] T025 src/lib/data-manager/progress-service.ts で進捗計算サービス

## Phase 3.4: API ルート実装

- [ ] T026 src/app/api/measurements/route.ts で POST /api/measurements エンドポイント
- [ ] T027 src/app/api/measurements/route.ts で GET /api/measurements エンドポイント
- [ ] T028 src/app/api/measurements/[id]/route.ts で GET /api/measurements/[id]エンドポイント
- [ ] T029 src/app/api/calendar/route.ts で GET /api/calendar エンドポイント
- [ ] T030 src/app/api/calendar/route.ts で POST /api/calendar エンドポイント
- [ ] T031 src/app/api/progress/[userId]/route.ts で GET /api/progress/[userId]エンドポイント

## Phase 3.5: 状態管理 (Jotai)

- [ ] T032 [P] src/stores/measurement-atoms.ts で測定状態アトム
- [ ] T033 [P] src/stores/camera-atoms.ts でカメラ状態アトム
- [ ] T034 [P] src/stores/calendar-atoms.ts でカレンダー状態アトム
- [ ] T035 [P] src/stores/user-atoms.ts でユーザー状態アトム

## Phase 3.6: React コンポーネント

- [ ] T036 [P] src/components/camera/CameraPreview.tsx でカメラプレビューコンポーネント
- [ ] T037 [P] src/components/measurement/AngleOverlay.tsx で角度表示オーバーレイ
- [ ] T038 [P] src/components/measurement/MeasurementControls.tsx で測定コントロール
- [ ] T039 [P] src/components/calendar/CalendarGrid.tsx でカレンダーグリッドコンポーネント
- [ ] T040 [P] src/components/calendar/RecordDetail.tsx でカレンダー記録詳細
- [ ] T041 [P] src/components/progress/ProgressCharts.tsx で進捗チャートコンポーネント
- [ ] T042 src/app/measurement/page.tsx でメイン測定ページ
- [ ] T043 src/app/calendar/page.tsx でカレンダーページ
- [ ] T044 src/app/progress/page.tsx で進捗ページ
- [ ] T045 src/app/setup/page.tsx でユーザーセットアップページ

## Phase 3.7: スタイリング

- [ ] T046 [P] src/components/camera/CameraPreview.module.scss でカメラコンポーネントスタイル
- [ ] T047 [P] src/components/measurement/MeasurementControls.module.scss で測定コンポーネントスタイル
- [ ] T048 [P] src/components/calendar/CalendarGrid.module.scss でカレンダーコンポーネントスタイル
- [ ] T049 [P] src/components/progress/ProgressCharts.module.scss で進捗コンポーネントスタイル
- [ ] T050 [P] src/app/globals.scss でグローバルアプリスタイル

## Phase 3.8: 統合

- [ ] T051 測定コンポーネントを MediaPipe サービスに接続
- [ ] T052 カレンダーコンポーネントをデータストレージに接続
- [ ] T053 進捗コンポーネントを計算サービスに接続
- [ ] T054 エラーハンドリングとユーザーフィードバック実装
- [ ] T055 サービスワーカーでオフライン機能セットアップ

## Phase 3.9: 仕上げ

- [ ] T056 [P] tests/e2e/measurement-workflow.spec.ts で完全な測定ワークフローの E2E テスト
- [ ] T057 [P] tests/e2e/calendar-functionality.spec.ts でカレンダー機能の E2E テスト
- [ ] T058 [P] tests/unit/angle-calculator.test.ts で角度計算精度のユニットテスト
- [ ] T059 [P] tests/unit/data-validation.test.ts でデータ検証のユニットテスト
- [ ] T060 [P] MediaPipe 処理のパフォーマンス最適化
- [ ] T061 [P] PWA マニフェストとサービスワーカーセットアップ
- [ ] T062 [P] docs/api.md のドキュメント更新
- [ ] T063 quickstart.md の検証シナリオ実行
- [ ] T064 クロスブラウザ互換性テスト

## 依存関係

- セットアップ (T001-T003) を他のすべてのタスクの前に
- テスト (T004-T012) を実装 (T013-T025) の前に
- モデル (T013-T017) をサービス (T018-T025) の前に
- サービスを API ルート (T026-T031) の前に
- 状態管理 (T032-T035) を React コンポーネント (T036-T045) の前に
- コンポーネントを統合 (T051-T055) の前に
- コア機能を仕上げ (T056-T064) の前に

## 並列実行例

```
# Phase 3.2: コントラクトテストを同時に起動:
Task: "tests/contract/test_measurements_post.tsでPOST /api/measurementsのコントラクトテスト"
Task: "tests/contract/test_measurements_get.tsでGET /api/measurementsのコントラクトテスト"
Task: "tests/contract/test_calendar_get.tsでGET /api/calendarのコントラクトテスト"
Task: "tests/contract/test_calendar_post.tsでPOST /api/calendarのコントラクトテスト"
Task: "tests/contract/test_progress_get.tsでGET /api/progress/{userId}のコントラクトテスト"

# Phase 3.3: モデル作成を並列で起動:
Task: "src/lib/data-manager/models/user.tsでUserエンティティモデル"
Task: "src/lib/data-manager/models/motion-measurement.tsでMotionMeasurementエンティティモデル"
Task: "src/lib/data-manager/models/calendar-record.tsでCalendarRecordエンティティモデル"
Task: "src/lib/data-manager/models/progress-data.tsでProgressDataエンティティモデル"
```

## 注意事項

- [P] タスク = 異なるファイル、依存関係なし
- 実装前にテストが失敗することを確認
- 各タスク後にコミット
- TDD に従う: RED-GREEN-Refactor サイクル
- MediaPipe 統合は慎重なパフォーマンスチューニングが必要
- IndexedDB 操作は try-catch でラップするべき
- すべてのコンポーネントはレスポンシブデザインをサポートするべき

## タスク生成ルール

_main()実行時に適用_

1. **コントラクトから**: 各エンドポイント → コントラクトテスト [P] + 実装タスク
2. **データモデルから**: 各エンティティ → モデル作成 [P] + サービス層タスク
3. **ユーザーストーリーから**: 各クイックスタートシナリオ → 統合テスト [P]
4. **順序**: セットアップ → テスト → モデル → サービス → API → コンポーネント → 統合 → 仕上げ
5. **依存関係**: 実装前にテスト、サービス前にモデル

## 検証チェックリスト

_main()が戻る前に GATE でチェック_

- [x] すべてのコントラクトに対応するテストがある (T004-T008)
- [x] すべてのエンティティにモデルタスクがある (T013-T016)
- [x] すべてのテストが実装前に来る (T004-T012 が T013+の前)
- [x] 並列タスクは真に独立している（異なるファイル）
- [x] 各タスクが正確なファイルパスを指定している
- [x] 同じファイルを変更する他の[P]タスクがない

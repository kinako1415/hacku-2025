# 開発・テスト環境詳細

## TypeScript設定 (tsconfig.json)
- **strict**: true - 厳密な型チェック有効
- **noUncheckedIndexedAccess**: true - インデックスアクセスの安全性向上
- **exactOptionalPropertyTypes**: true - オプショナルプロパティの厳密な型チェック
- **baseUrl**: "." - 相対パス解決のベース
- **paths**: エイリアス設定（@/src/*）

## パッケージスクリプト
- **開発**: `pnpm dev` - Next.js開発サーバー起動
- **ビルド**: `pnpm build` - 本番用ビルド
- **テスト**: `pnpm test` - Jest実行
- **E2Eテスト**: `pnpm test:e2e` - Playwright実行
- **型チェック**: `pnpm type-check` - TypeScript検証
- **リント**: `pnpm lint` - ESLint実行

## テスト戦略

### Unit Tests (tests/unit/)
- **angle-calculator.test.ts**: 角度計算ロジックのテスト
- **data-validation.test.ts**: データ検証ロジックのテスト

### Integration Tests (tests/integration/)
- **test_angle_calculation.ts**: 角度計算の統合テスト
- **test_camera_workflow.ts**: カメラワークフローテスト
- **test_data_storage.ts**: データ保存テスト
- **test_mediapipe_hands.ts**: MediaPipe統合テスト

### Contract Tests (tests/contract/)
- **test_calendar_get.ts**: カレンダーAPI GETテスト
- **test_calendar_post.ts**: カレンダーAPI POSTテスト
- **test_measurements_get.ts**: 測定データAPI GETテスト
- **test_measurements_post.ts**: 測定データAPI POSTテスト
- **test_progress_get.ts**: 進捗データAPI GETテスト

### E2E Tests (tests/e2e/)
- **measurement-workflow.spec.ts**: 測定フロー全体のテスト
- **calendar-functionality.spec.ts**: カレンダー機能テスト
- **cross-browser-compatibility.spec.ts**: ブラウザ互換性テスト
- **quickstart-validation.spec.ts**: クイックスタート検証

## コード品質管理
- **ESLint**: Next.js推奨設定 + TypeScript
- **Prettier**: コード整形
- **Jest**: カバレッジレポート生成
- **Playwright**: 複数ブラウザでのE2Eテスト

## ドキュメント
- **docs/API.md**: API仕様書
- **docs/PHASE_3_9_COMPLETION_REPORT.md**: 完了レポート
- **specs/**: 詳細仕様書
  - **001-ai-mediapipe-google/**: MediaPipe統合仕様

## 開発ワークフロー
1. **型安全性**: TypeScript strict mode
2. **テストファースト**: TDD/BDD アプローチ
3. **継続的統合**: 自動テスト実行
4. **コード品質**: ESLint + Prettier
5. **医療基準**: 精度・安全性重視の開発
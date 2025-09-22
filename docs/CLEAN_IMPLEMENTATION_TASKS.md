# AI駆動リハビリアプリ - クリーン実装タスク

## 📋 プロジェクト概要

現在のコードベースを新しく綺麗な実装で置き換える包括的なリファクタリング計画です。
機能とUIは完全に同等で、アーキテクチャとコード品質を大幅に向上させます。

## 🎯 実装目標

- **機能100%維持**: 既存の測定・進捗・カレンダー機能をすべて保持
- **UI完全同等**: 現在のユーザー体験を維持
- **アーキテクチャ刷新**: モジュール化、型安全性、テスタビリティ向上
- **パフォーマンス最適化**: MediaPipe処理効率化、メモリ管理改善
- **保守性向上**: Clean Architecture、SOLID原則準拠

## 📊 現在の技術債務分析

### 🔍 発見された問題

1. **複数の測定ページ**: `page.tsx`, `page_fixed.tsx`, `page_old.tsx`の重複
2. **一貫性のないアーキテクチャ**: コンポーネント設計の不統一
3. **型安全性不足**: `any`型の多用、型定義の不備
4. **テスト不備**: カバレッジ不足、統合テスト未実装
5. **パフォーマンス課題**: MediaPipe処理の非効率性
6. **状態管理複雑化**: Jotai使用の不統一

## 🏗️ 新アーキテクチャ設計

### レイヤー構造

```
├── Presentation Layer (UI/Components)
├── Application Layer (Use Cases/Services)
├── Domain Layer (Business Logic/Entities)
└── Infrastructure Layer (External APIs/Storage)
```

### モジュール構成

```
src/
├── core/                          # コアドメイン
│   ├── domain/                    # ドメイン層
│   ├── application/               # アプリケーション層
│   └── infrastructure/            # インフラ層
├── features/                      # 機能別モジュール
│   ├── measurement/               # 測定機能
│   ├── progress/                  # 進捗管理
│   ├── calendar/                  # カレンダー
│   └── setup/                     # セットアップ
├── shared/                        # 共通モジュール
│   ├── components/                # 共通コンポーネント
│   ├── hooks/                     # 共通フック
│   ├── utils/                     # ユーティリティ
│   └── types/                     # 型定義
└── app/                          # Next.js App Router
```

## 📝 実装タスク一覧

### Phase 1: 基盤設計・共通モジュール (1-2週間)

#### T001: プロジェクト構造再構築

- **優先度**: 🔴 Critical
- **期間**: 2日
- **内容**:
  - 新しいフォルダ構造作成
  - モジュール境界定義
  - 依存関係整理

#### T002: コア型定義システム設計

- **優先度**: 🔴 Critical
- **期間**: 1日
- **内容**:
  - 厳密型定義 (`Point3D`, `AngleData`, `MeasurementResult`)
  - Domain Entities設計
  - Value Objects実装

#### T003: エラーハンドリング・ログシステム

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - カスタムError classes
  - 構造化ログシステム
  - エラー境界コンポーネント

#### T004: 設定管理システム

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - 環境別設定
  - MediaPipe設定管理
  - アプリ設定centralization

#### T005: ユーティリティライブラリ

- **優先度**: 🟢 Medium
- **期間**: 2日
- **内容**:
  - 数学計算ライブラリ
  - 日付・時刻ユーティリティ
  - バリデーション関数

### Phase 2: ドメイン層実装 (1週間)

#### T006: 測定ドメインエンティティ

- **優先度**: 🔴 Critical
- **期間**: 2日
- **内容**:
  - `MeasurementSession` Entity
  - `AngleCalculation` Value Object
  - `HandLandmark` Value Object
  - ドメインルール実装

#### T007: 進捗管理ドメイン

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - `ProgressData` Entity
  - `StatisticsCalculation` Service
  - 改善率計算ロジック

#### T008: カレンダードメイン

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - `CalendarEntry` Entity
  - `RecordDate` Value Object
  - メモ管理ロジック

#### T009: ユーザードメイン

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - `User` Entity
  - `HandPreference` Value Object
  - ユーザー設定管理

### Phase 3: インフラ層実装 (1週間)

#### T010: MediaPipe統合基盤

- **優先度**: 🔴 Critical
- **期間**: 3日
- **内容**:
  - `MediaPipeService` クラス設計
  - WebWorker統合
  - パフォーマンス最適化
  - メモリリーク対策

#### T011: データベース抽象化層

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - Repository Pattern実装
  - Dexie.js統合
  - トランザクション管理
  - データマイグレーション

#### T012: カメラサービス

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - `CameraService` クラス
  - ストリーム管理
  - エラーハンドリング
  - デバイス検出

#### T013: 外部API統合

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - REST API クライアント
  - レスポンス型定義
  - エラーレスポンス処理

### Phase 4: アプリケーション層実装 (1週間)

#### T014: 測定ユースケース

- **優先度**: 🔴 Critical
- **期間**: 2日
- **内容**:
  - `StartMeasurementUseCase`
  - `ProcessMeasurementUseCase`
  - `CompleteMeasurementUseCase`
  - データフロー最適化

#### T015: 進捗管理ユースケース

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - `GetProgressDataUseCase`
  - `CalculateStatisticsUseCase`
  - トレンド分析ロジック

#### T016: データ永続化ユースケース

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - `SaveMeasurementUseCase`
  - `ExportDataUseCase`
  - `ImportDataUseCase`

#### T017: カレンダーユースケース

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - `GetCalendarDataUseCase`
  - `SaveMemoUseCase`
  - 月間統計計算

### Phase 5: プレゼンテーション層実装 (2週間)

#### T018: 共通コンポーネントライブラリ

- **優先度**: 🟡 High
- **期間**: 3日
- **内容**:
  - `Button`, `Input`, `Modal`コンポーネント
  - レスポンシブデザイン
  - アクセシビリティ対応
  - Storybook統合

#### T019: 測定UI刷新

- **優先度**: 🔴 Critical
- **期間**: 4日
- **内容**:
  - `MeasurementPage` コンポーネント
  - `CameraPreview` コンポーネント
  - `AngleDisplay` コンポーネント
  - リアルタイム更新最適化

#### T020: 進捗表示UI

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - `ProgressDashboard` コンポーネント
  - `StatisticsChart` コンポーネント
  - インタラクティブグラフ

#### T021: カレンダーUI

- **優先度**: 🟢 Medium
- **期間**: 2日
- **内容**:
  - `CalendarView` コンポーネント
  - `DayDetail` コンポーネント
  - メモ編集機能

#### T022: セットアップ・設定UI

- **優先度**: 🟢 Medium
- **期間**: 2日
- **内容**:
  - `SetupWizard` コンポーネント
  - `SettingsPanel` コンポーネント
  - チュートリアル機能

### Phase 6: 状態管理最適化 (3日)

#### T023: Jotai状態アーキテクチャ設計

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - Atom設計パターン策定
  - 状態正規化
  - パフォーマンス最適化

#### T024: 測定状態管理

- **優先度**: 🔴 Critical
- **期間**: 1日
- **内容**:
  - `measurementAtoms`
  - `cameraAtoms`
  - `mediaPipeAtoms`

#### T025: アプリ全体状態管理

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - `userAtoms`
  - `settingsAtoms`
  - `navigationAtoms`

### Phase 7: API・ルーティング実装 (3日)

#### T026: Next.js App Router整理

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - ルート構造最適化
  - Layout コンポーネント
  - メタデータ管理

#### T027: API Routes実装

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - `/api/measurements` エンドポイント
  - `/api/progress` エンドポイント
  - `/api/calendar` エンドポイント
  - OpenAPI仕様準拠

### Phase 8: テスト実装 (1週間)

#### T028: ユニットテスト

- **優先度**: 🟡 High
- **期間**: 3日
- **内容**:
  - ドメインロジックテスト
  - ユーティリティテスト
  - コンポーネントテスト
  - 90%+カバレッジ達成

#### T029: 統合テスト

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - MediaPipe統合テスト
  - データベース統合テスト
  - API統合テスト

#### T030: E2Eテスト

- **優先度**: 🟢 Medium
- **期間**: 2日
- **内容**:
  - Playwright E2Eシナリオ
  - クロスブラウザテスト
  - パフォーマンステスト

### Phase 9: パフォーマンス最適化 (5日)

#### T031: MediaPipe最適化

- **優先度**: 🔴 Critical
- **期間**: 2日
- **内容**:
  - WebWorker実装
  - フレームレート最適化
  - メモリプール実装

#### T032: レンダリング最適化

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - React.memo活用
  - useMemo/useCallback最適化
  - バーチャルスクロール

#### T033: バンドル最適化

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - 動的インポート
  - Tree shaking最適化
  - CDN活用

### Phase 10: 品質保証・デプロイ準備 (3日)

#### T034: コード品質チェック

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - ESLint/Prettier設定最適化
  - 型チェック強化
  - コードレビュー

#### T035: セキュリティ監査

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - 依存関係脆弱性チェック
  - CSPヘッダー設定
  - データ暗号化確認

#### T036: デプロイメント準備

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - 本番環境設定
  - CI/CD設定更新
  - モニタリング設定

## 🚀 実装手順

### Step 1: 準備作業

```bash
# 現在のコードベースをバックアップ
git checkout -b backup/current-implementation
git push origin backup/current-implementation

# 新しい実装ブランチ作成
git checkout main
git checkout -b feature/clean-implementation
```

### Step 2: 段階的実装

1. **Phase 1-2**: ドメイン・インフラ基盤構築
2. **Phase 3-4**: ビジネスロジック実装
3. **Phase 5**: UI実装（既存UIと並行稼働）
4. **Phase 6-7**: 統合・API実装
5. **Phase 8**: テスト実装
6. **Phase 9**: 最適化
7. **Phase 10**: QA・リリース準備

### Step 3: 移行戦略

- **Feature Flag**: 新旧実装の切り替え機能
- **A/B Testing**: ユーザビリティ比較
- **段階的移行**: ページ単位での置き換え

## 📊 品質指標

### 目標KPI

- **TypeScript型安全性**: 100% (no any types)
- **テストカバレッジ**: 90%+
- **バンドルサイズ**: 30%削減
- **初期読み込み時間**: 40%改善
- **MediaPipe処理速度**: 50%向上
- **メモリ使用量**: 30%削減

### パフォーマンスベンチマーク

- **Time to Interactive**: < 3秒
- **Largest Contentful Paint**: < 2.5秒
- **Cumulative Layout Shift**: < 0.1
- **Frame Rate**: 安定60fps

## 🔧 開発ツール・環境

### 必須ツール

- **TypeScript**: 5.4.0 (strict mode)
- **ESLint**: 厳格なルール設定
- **Prettier**: コードフォーマット統一
- **Husky**: Pre-commit hooks
- **Jest**: ユニットテスト
- **Playwright**: E2Eテスト

### 開発効率化

- **Storybook**: コンポーネント開発
- **MSW**: APIモック
- **Plop**: コード自動生成
- **Bundle Analyzer**: パフォーマンス分析

## 📅 実装スケジュール

| Phase      | 期間    | 累積期間 | 主要成果物           |
| ---------- | ------- | -------- | -------------------- |
| Phase 1-2  | 1-2週間 | 2週間    | ドメイン・基盤実装   |
| Phase 3-4  | 2週間   | 4週間    | ビジネスロジック完成 |
| Phase 5    | 2週間   | 6週間    | UI実装完成           |
| Phase 6-7  | 1週間   | 7週間    | 統合・API完成        |
| Phase 8    | 1週間   | 8週間    | テスト完成           |
| Phase 9-10 | 1週間   | 9週間    | 最適化・リリース準備 |

**総期間**: 約9週間（2.25ヶ月）

## 🎯 成功基準

### 機能要件

- ✅ 既存機能100%再実装
- ✅ UI/UX完全同等
- ✅ 測定精度維持
- ✅ データ互換性保証

### 非機能要件

- ✅ パフォーマンス向上達成
- ✅ コード品質指標達成
- ✅ テストカバレッジ達成
- ✅ セキュリティ基準準拠

### 保守性要件

- ✅ Clean Architecture実装
- ✅ SOLID原則準拠
- ✅ 型安全性100%
- ✅ ドキュメント完備

## 🔐 セキュリティ・プライバシー強化タスク

### Phase 11: 医療データセキュリティ実装 (1週間)

#### T037: データ暗号化・プライバシー保護

- **優先度**: 🔴 Critical
- **期間**: 3日
- **内容**:
  - WebCrypto API活用のAES-256暗号化
  - 個人データ最小化
  - GDPR/HIPAA準拠設計
  - データ匿名化機能

```typescript
// 暗号化サービス実装例
interface DataEncryptionService {
  encrypt(data: any, userKey: string): Promise<EncryptedData>;
  decrypt(encryptedData: EncryptedData, userKey: string): Promise<any>;
  generateUserKey(): Promise<string>;
  exportEncryptedBackup(userId: string): Promise<Blob>;
}
```

#### T038: 認証・認可システム

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - JWT認証実装
  - 多要素認証対応
  - セッション管理
  - 医療機関別アクセス制御

#### T039: 監査・コンプライアンス

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - 操作ログ記録
  - アクセス履歴管理
  - データ利用同意管理
  - 規制準拠レポート生成

### Phase 12: エラーハンドリング・復旧システム (5日)

#### T040: 包括的エラーハンドリング

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - グローバルエラーバウンダリ
  - MediaPipeエラー回復
  - カメラアクセス失敗対応
  - ネットワーク障害処理

```typescript
// エラー回復戦略
interface ErrorRecoveryStrategy {
  mediaPipeFailure(): Promise<void>;
  cameraAccessDenied(): Promise<void>;
  lowMemoryWarning(): Promise<void>;
  networkTimeout(): Promise<void>;
}
```

#### T041: データ復旧・バックアップ

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - 自動バックアップシステム
  - データ破損検出・修復
  - 測定データ復元機能
  - クラウド同期（オプション）

#### T042: ユーザー向け障害対応

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - エラーメッセージ改善
  - 自己診断機能
  - ヘルプ・トラブルシューティング
  - サポート連絡機能

### Phase 13: アクセシビリティ・ユーザビリティ (1週間)

#### T043: WCAG 2.1 AA準拠実装

- **優先度**: 🟡 High
- **期間**: 3日
- **内容**:
  - スクリーンリーダー対応
  - キーボードナビゲーション
  - 色覚異常対応
  - 音声ガイダンス機能

```typescript
// アクセシビリティ機能
interface AccessibilityService {
  announceToScreenReader(message: string): void;
  provideTactileFeedback(): void;
  adjustForColorBlindness(type: ColorBlindnessType): void;
  enableVoiceInstructions(): void;
}
```

#### T044: 多言語・国際化対応

- **優先度**: 🟢 Medium
- **期間**: 2日
- **内容**:
  - i18next実装
  - 日本語・英語UI
  - 地域別設定
  - 文化的配慮設計

#### T045: 高齢者・障害者配慮

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - 大きな文字・ボタン
  - 簡素化UI
  - 振動フィードバック
  - 家族・介護者サポート機能

### Phase 14: モバイル・デバイス最適化 (5日)

#### T046: タッチ・ジェスチャー最適化

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - タッチターゲット最適化
  - スワイプナビゲーション
  - ピンチズーム対応
  - 片手操作配慮

#### T047: デバイス固有機能活用

- **優先度**: 🟢 Medium
- **期間**: 2日
- **内容**:
  - 加速度センサー利用
  - 振動フィードバック
  - デバイス向き対応
  - バッテリー最適化

#### T048: パフォーマンス最適化

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - メモリ使用量削減
  - バッテリー消費最適化
  - 低スペック端末対応
  - ネットワーク使用量最小化

### Phase 15: データ管理・移行システム (5日)

#### T049: スキーマ変更・マイグレーション

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - データベースバージョン管理
  - スキーマ移行スクリプト
  - 下位互換性保証
  - ロールバック機能

```typescript
// データ移行システム
interface MigrationService {
  getCurrentVersion(): Promise<string>;
  migrateToVersion(targetVersion: string): Promise<void>;
  rollbackToVersion(previousVersion: string): Promise<void>;
  validateDataIntegrity(): Promise<boolean>;
}
```

#### T050: バックアップ・復元機能

- **優先度**: 🟡 High
- **期間**: 2日
- **内容**:
  - 自動バックアップ設定
  - 暗号化エクスポート
  - データインポート機能
  - 復元時整合性チェック

#### T051: データクリーンアップ・アーカイブ

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - 古いデータ自動削除
  - データアーカイブ機能
  - ストレージ使用量管理
  - データ重複除去

### Phase 16: 監査・ログ・分析システム (3日)

#### T052: 操作ログ・トラッキング

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - ユーザー操作記録
  - パフォーマンス計測
  - エラー発生追跡
  - 使用パターン分析

#### T053: システム監査機能

- **優先度**: 🟡 High
- **期間**: 1日
- **内容**:
  - セキュリティ監査ログ
  - データアクセス記録
  - システム変更履歴
  - コンプライアンスレポート

#### T054: 分析・レポート機能

- **優先度**: 🟢 Medium
- **期間**: 1日
- **内容**:
  - 利用統計分析
  - パフォーマンスレポート
  - セキュリティ分析
  - 医療効果測定支援

## 📊 拡張実装指標

### セキュリティ指標

- **暗号化率**: 100% (全医療データ)
- **監査ログ**: 100% (全操作記録)
- **GDPR準拠**: 完全対応
- **セキュリティスキャン**: 脆弱性ゼロ

### アクセシビリティ指標

- **WCAG 2.1 AA**: 100%準拠
- **スクリーンリーダー**: 完全対応
- **キーボード操作**: 全機能対応
- **多言語対応**: 日本語・英語完備

### パフォーマンス指標

- **モバイル最適化**: Core Web Vitals 90+
- **バッテリー効率**: 30%改善
- **メモリ使用量**: 40%削減
- **起動時間**: 50%短縮

## 🔄 実装フェーズ更新

### 拡張スケジュール

| Phase      | 期間  | 累積期間 | 主要成果物             |
| ---------- | ----- | -------- | ---------------------- |
| Phase 1-10 | 9週間 | 9週間    | 基本実装完成           |
| Phase 11   | 1週間 | 10週間   | セキュリティ強化完成   |
| Phase 12   | 5日   | 11週間   | エラーハンドリング完成 |
| Phase 13   | 1週間 | 12週間   | アクセシビリティ完成   |
| Phase 14   | 5日   | 13週間   | モバイル最適化完成     |
| Phase 15   | 5日   | 14週間   | データ管理システム完成 |
| Phase 16   | 3日   | 14.5週間 | 監査・分析システム完成 |

**総期間**: 約14.5週間（3.6ヶ月）

この包括的な実装計画により、現在のアプリケーションを医療機器級の品質・セキュリティ・ユーザビリティを持つシステムに完全刷新できます。

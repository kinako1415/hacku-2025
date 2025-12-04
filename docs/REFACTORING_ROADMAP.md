# 🔄 AI駆動リハビリアプリ - リファクタリングロードマップ

> **目的**: 現在のコードベースを段階的にクリーンアーキテクチャに基づいて再構築し、保守性・拡張性・テスタビリティを向上させる

---

## 📊 現状分析

### 🚨 重大な技術的課題

1. **ファイル重複**: 測定ページに複数バージョン存在
   - `page.tsx`, `page_fixed.tsx`, `page_old.tsx`, `page-backup.tsx`, `page-new.tsx`
2. **アーキテクチャの不統一**: レイヤー分離が不明確
   - ビジネスロジックがコンポーネント内に散在
   - 状態管理の一貫性欠如
3. **型安全性の不足**: TypeScript活用不十分
   - `any`型の多用
   - 型定義の不完全性
4. **テストカバレッジ**: 重要機能の統合テスト不足
5. **パフォーマンス**: MediaPipe処理の最適化余地

---

## 🎯 リファクタリング目標

### ✅ 達成基準

- [ ] **機能維持**: 既存機能100%動作保証
- [ ] **型安全性**: `strict: true`完全準拠
- [ ] **テストカバレッジ**: 80%以上
- [ ] **パフォーマンス**: MediaPipe処理30%高速化
- [ ] **コード削減**: 重複コード50%削減
- [ ] **ドキュメント**: 全モジュールドキュメント完備

---

## 📅 段階的実装計画

### Phase 1: 基盤整備 (Week 1-2)

#### 🎯 目標

クリーンアーキテクチャの基盤を構築し、既存コードとの共存を可能にする

#### 📋 タスクリスト

- [ ] **1.1 プロジェクト構造設計**

  ```
  src/
  ├── core/                    # 新アーキテクチャ
  │   ├── domain/             # ドメインロジック
  │   ├── application/        # ユースケース
  │   └── infrastructure/     # 外部依存
  └── legacy/                 # 既存コード（段階的移行）
  ```

- [ ] **1.2 型定義の整理**
  - [ ] 共通型定義の集約 (`src/core/domain/types/`)
  - [ ] MediaPipe型の厳密化
  - [ ] 測定データモデルの統一
  - [ ] API型定義の完全化

- [ ] **1.3 ドメインモデル設計**
  - [ ] `Measurement` エンティティ
  - [ ] `MotionAngle` 値オブジェクト
  - [ ] `HandLandmark` 値オブジェクト
  - [ ] `CalendarRecord` エンティティ
  - [ ] `ProgressData` 集約

- [ ] **1.4 テスト環境整備**
  - [ ] Jest設定最適化
  - [ ] テストユーティリティ作成
  - [ ] モックデータ生成器実装

**検証方法**: 既存機能が完全に動作することを確認

---

### Phase 2: データ層リファクタリング (Week 3-4)

#### 🎯 目標

データアクセス層を整理し、永続化ロジックを抽象化

#### 📋 タスクリスト

- [ ] **2.1 リポジトリパターン実装**

  ```typescript
  // src/core/domain/repositories/measurement-repository.ts
  interface MeasurementRepository {
    save(measurement: Measurement): Promise<void>;
    findById(id: string): Promise<Measurement | null>;
    findByDateRange(start: Date, end: Date): Promise<Measurement[]>;
  }
  ```

- [ ] **2.2 Dexie.js実装の整理**
  - [ ] データベーススキーマ統一
  - [ ] トランザクション管理改善
  - [ ] インデックス最適化
  - [ ] マイグレーション戦略実装

- [ ] **2.3 データ検証層**
  - [ ] Zodスキーマ定義
  - [ ] バリデーションミドルウェア
  - [ ] エラーハンドリング統一

- [ ] **2.4 統合テスト**
  - [ ] リポジトリテスト実装
  - [ ] データ永続化テスト
  - [ ] 並行アクセステスト

**検証方法**: データ保存・読み込みの完全性テスト

---

### Phase 3: MediaPipe統合リファクタリング (Week 5-6)

#### 🎯 目標

MediaPipe処理を最適化し、測定精度とパフォーマンスを向上

#### 📋 タスクリスト

- [ ] **3.1 検出器クラスの再設計**

  ```typescript
  // src/core/infrastructure/mediapipe/hand-detector.ts
  class HandDetector {
    private hands: Hands;
    private config: DetectorConfig;

    async detect(imageData: ImageData): Promise<HandLandmarks>;
    updateConfig(config: Partial<DetectorConfig>): void;
    dispose(): void;
  }
  ```

- [ ] **3.2 角度計算ロジック統合**
  - [ ] 3つの`angle-calculator.ts`を統一
  - [ ] アルゴリズム精度検証
  - [ ] パフォーマンステスト実装

- [ ] **3.3 Web Worker実装**
  - [ ] MediaPipe処理をWorkerに移行
  - [ ] メインスレッド負荷軽減
  - [ ] 非同期処理最適化

- [ ] **3.4 パフォーマンス最適化**
  - [ ] フレームレート制御
  - [ ] メモリリーク対策
  - [ ] Canvas描画最適化

**検証方法**: 測定精度とフレームレート測定

---

### Phase 4: UI/コンポーネントリファクタリング (Week 7-8)

#### 🎯 目標

コンポーネント設計を統一し、再利用性を向上

#### 📋 タスクリスト

- [ ] **4.1 測定ページの統合**
  - [ ] `page.tsx`を正式版として確定
  - [ ] 重複ファイル削除 (`page_old.tsx`, `page_fixed.tsx`等)
  - [ ] コンポーネント責務分離

- [ ] **4.2 Atomic Design適用**

  ```
  src/features/measurement/
  ├── atoms/           # ボタン、アイコン
  ├── molecules/       # カード、フォーム
  ├── organisms/       # カメラビュー、角度表示
  └── templates/       # ページレイアウト
  ```

- [ ] **4.3 状態管理の整理**
  - [ ] Jotai Atom設計統一
  - [ ] 派生状態の明確化
  - [ ] 状態更新ロジックの分離

- [ ] **4.4 スタイル統一**
  - [ ] CSS Modules命名規則統一
  - [ ] 共通スタイル変数整理
  - [ ] レスポンシブ対応強化

**検証方法**: ビジュアルリグレッションテスト

---

### Phase 5: ビジネスロジック層構築 (Week 9-10)

#### 🎯 目標

ユースケースを明確化し、ビジネスロジックを独立させる

#### 📋 タスクリスト

- [ ] **5.1 ユースケース実装**

  ```typescript
  // src/core/application/use-cases/measure-motion.ts
  class MeasureMotionUseCase {
    constructor(
      private detector: HandDetector,
      private calculator: AngleCalculator,
      private repository: MeasurementRepository
    ) {}

    async execute(input: MeasureMotionInput): Promise<MeasureMotionOutput>;
  }
  ```

- [ ] **5.2 主要ユースケース実装**
  - [ ] 測定開始/停止
  - [ ] 角度計算・記録
  - [ ] 進捗データ取得
  - [ ] カレンダー記録更新

- [ ] **5.3 エラーハンドリング統一**
  - [ ] カスタムエラークラス定義
  - [ ] エラーバウンダリ実装
  - [ ] ユーザーフィードバック改善

- [ ] **5.4 統合テスト**
  - [ ] ユースケースE2Eテスト
  - [ ] エラーシナリオテスト
  - [ ] パフォーマンステスト

**検証方法**: ビジネスロジック単体実行テスト

---

### Phase 6: API層リファクタリング (Week 11)

#### 🎯 目標

APIルートを整理し、型安全なエンドポイントを構築

#### 📋 タスクリスト

- [ ] **6.1 APIルート設計統一**
  - [ ] RESTful設計原則適用
  - [ ] リクエスト/レスポンス型定義
  - [ ] バリデーション実装

- [ ] **6.2 エンドポイント実装**
  - [ ] `/api/measurements` - 測定データCRUD
  - [ ] `/api/progress` - 進捗データ取得
  - [ ] `/api/calendar` - カレンダー記録
  - [ ] `/api/users` - ユーザー情報

- [ ] **6.3 エラーハンドリング**
  - [ ] HTTPステータスコード統一
  - [ ] エラーレスポンス形式統一
  - [ ] ロギング実装

- [ ] **6.4 Contract Testing**
  - [ ] OpenAPI仕様書作成
  - [ ] Contract Tests実装
  - [ ] APIドキュメント自動生成

**検証方法**: API契約テスト全件パス

---

### Phase 7: テスト完全実装 (Week 12)

#### 🎯 目標

テストカバレッジ80%以上を達成

#### 📋 タスクリスト

- [ ] **7.1 単体テスト**
  - [ ] ドメインロジックテスト
  - [ ] ユーティリティ関数テスト
  - [ ] 角度計算精度テスト

- [ ] **7.2 統合テスト**
  - [ ] MediaPipe統合テスト
  - [ ] データベース統合テスト
  - [ ] コンポーネント統合テスト

- [ ] **7.3 E2Eテスト**
  - [ ] 測定フロー完全テスト
  - [ ] 進捗表示テスト
  - [ ] カレンダー機能テスト

- [ ] **7.4 パフォーマンステスト**
  - [ ] MediaPipe処理速度測定
  - [ ] メモリ使用量監視
  - [ ] レンダリング性能測定

**検証方法**: カバレッジレポート80%以上

---

### Phase 8: ドキュメント整備 & 最終確認 (Week 13-14)

#### 🎯 目標

完全なドキュメントと移行ガイド作成

#### 📋 タスクリスト

- [ ] **8.1 コードドキュメント**
  - [ ] TSDoc全モジュール完備
  - [ ] アーキテクチャ図作成
  - [ ] データフロー図作成

- [ ] **8.2 開発者ガイド**
  - [ ] セットアップ手順
  - [ ] 開発ワークフロー
  - [ ] トラブルシューティング

- [ ] **8.3 移行ガイド**
  - [ ] レガシーコード削除手順
  - [ ] データマイグレーション
  - [ ] ロールバック計画

- [ ] **8.4 最終検証**
  - [ ] 全機能動作確認
  - [ ] パフォーマンス測定
  - [ ] アクセシビリティ監査

**検証方法**: ステークホルダーレビュー

---

## 🛠️ 技術スタック（リファクタリング後）

### コアライブラリ

- **Framework**: Next.js 14.2+ (App Router)
- **Language**: TypeScript 5.4+ (strict mode)
- **State**: Jotai 2.14+ (Atomic pattern)
- **Database**: Dexie.js 3.2+ (IndexedDB ORM)

### AI/ML

- **Detection**: MediaPipe Hands 0.4+
- **Processing**: Web Worker実装
- **Optimization**: Canvas最適化

### テスト

- **Unit**: Jest 29+ / Vitest
- **Integration**: Testing Library
- **E2E**: Playwright
- **Contract**: Pact

### コード品質

- **Linter**: ESLint (strict config)
- **Formatter**: Prettier
- **Type Check**: TypeScript compiler
- **Coverage**: Istanbul

---

## 📊 進捗管理

### チェックポイント

- [ ] **Week 2**: Phase 1完了 - 基盤構築
- [ ] **Week 4**: Phase 2完了 - データ層リファクタリング
- [ ] **Week 6**: Phase 3完了 - MediaPipe最適化
- [ ] **Week 8**: Phase 4完了 - UIコンポーネント統一
- [ ] **Week 10**: Phase 5完了 - ビジネスロジック独立
- [ ] **Week 11**: Phase 6完了 - API整理
- [ ] **Week 12**: Phase 7完了 - テスト実装
- [ ] **Week 14**: Phase 8完了 - ドキュメント & 最終確認

### 成功指標

| 指標             | 現在 | 目標    |
| ---------------- | ---- | ------- |
| 型安全性         | 70%  | 100%    |
| テストカバレッジ | 45%  | 80%+    |
| 重複コード       | 多数 | 50%削減 |
| MediaPipe速度    | 基準 | 30%向上 |
| ファイル数       | 過剰 | 最適化  |

---

## 🚀 実装開始コマンド

```bash
# 1. 新ブランチ作成
git checkout -b refactoring/phase-1-foundation

# 2. 基盤ディレクトリ作成
mkdir -p src/core/{domain,application,infrastructure}
mkdir -p src/core/domain/{entities,repositories,types}

# 3. 型定義開始
touch src/core/domain/types/measurement.ts
touch src/core/domain/types/hand-landmark.ts

# 4. テスト環境確認
pnpm test
```

---

## 📝 注意事項

### ⚠️ リスク管理

1. **機能劣化防止**: 各フェーズで既存機能テスト必須
2. **データ保全**: データベース変更時は必ずバックアップ
3. **段階的移行**: 一度に全コード変更せず段階的実施
4. **レビュー徹底**: 各フェーズ完了時にコードレビュー実施

### ✅ ベストプラクティス

- **型ファースト**: 型定義から実装開始
- **テスト駆動**: テスト記述後に実装
- **小さなコミット**: 機能単位でコミット
- **ドキュメント同期**: コード変更とドキュメント更新を同時実施

---

## 📚 参考資料

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Next.js Best Practices](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**作成日**: 2025年10月15日  
**最終更新**: 2025年10月15日  
**ステータス**: 📋 計画段階

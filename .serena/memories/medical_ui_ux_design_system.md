# 医療UI/UXデザイン設計詳細（実装済み状況）

## 🎨 デザインシステム・実装状況

### 1. 実際のカラーパレット（globals.scss + variables.css）

```scss
// 実装済みCSS Variables
:root {
  // Primary Colors - 現在の実装
  --primary-color: #667eea; // 実際のプライマリ色（紫系）
  --primary-dark: #5a67d8; // ダーク版
  --secondary-color: #764ba2; // セカンダリ色
  --accent-color: #4299e1; // アクセント色

  // 測定関連カラー - 実装済み
  --measurement-success: #38a169; // 成功色（緑）
  --measurement-warning: #d69e2e; // 警告色（黄）
  --measurement-error: #e53e3e; // エラー色（赤）
  --measurement-info: #3182ce; // 情報色（青）

  // 進捗関連カラー - 実装済み
  --progress-excellent: #38a169; // 優秀
  --progress-good: #68d391; // 良好
  --progress-average: #fbb040; // 平均
  --progress-poor: #fc8181; // 要改善

  // グレースケール - 実装済み
  --text-primary: #2d3748; // メインテキスト
  --text-secondary: #4a5568; // サブテキスト
  --text-muted: #718096; // ミュートテキスト
  --background-primary: #ffffff; // 背景プライマリ
  --background-secondary: #f7fafc; // 背景セカンダリ
  --border-color: #e2e8f0; // ボーダー色

  // variables.cssの追加色
  --success-color: #4caf50; // 基本成功色
  --error-color: #f44336; // 基本エラー色
  --warning-color: #ff9800; // 基本警告色
}

// ダークモード対応 - 実装済み
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #f7fafc;
    --text-secondary: #e2e8f0;
    --text-muted: #a0aec0;
    --background-primary: #2d3748;
    --background-secondary: #1a202c;
    --border-color: #4a5568;
  }
}
```

### 2. 実装されているタイポグラフィ

```scss
// 実際のフォント設定（globals.scss）
body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
}

// 見出しスタイル - 実装済み
h1 {
  font-size: 2.25rem;
  font-weight: 600;
} // 36px
h2 {
  font-size: 1.875rem;
  font-weight: 600;
} // 30px
h3 {
  font-size: 1.5rem;
  font-weight: 600;
} // 24px
h4 {
  font-size: 1.25rem;
  font-weight: 600;
} // 20px
h5 {
  font-size: 1.125rem;
  font-weight: 600;
} // 18px
h6 {
  font-size: 1rem;
  font-weight: 600;
} // 16px

// 数値表示用（一部のみmonospace）
.patient-id {
  font-family: monospace; // 医療データ表示で使用
  font-size: 0.875rem;
}
```

### 3. 実装されているコンポーネントスタイル例

#### 測定表示（measurement/page.module.scss）

```scss
.angleDisplay {
  font-size: 6rem; // 96px - 大きな角度表示
  font-weight: bold;
  text-align: center;
  margin-bottom: 0.5rem;
}

.angleLabel {
  font-size: 1.125rem; // 18px
  font-weight: 600;
  text-align: center;
}

.statusIndicator {
  font-size: 1rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;

  &--success {
    background: #4caf50; // 実際の成功色
    color: white;
  }

  &--warning {
    background: #ff9800; // 実際の警告色
    color: white;
  }
}
```

#### カメラプレビュー（camera/CameraPreview.module.scss）

```scss
.cameraContainer {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 4/3;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.statusMessage {
  font-size: 1.3rem;
  font-weight: 600;
  text-align: center;
}

.instructionText {
  font-size: 0.9rem;
  color: var(--text-secondary);
}
```

## 📱 実装されているレスポンシブデザイン

### 実際のブレークポイント使用例

```scss
// measurement/page.module.scss
.measurementContainer {
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
  }

  @media (min-width: 1024px) {
    max-width: 1200px;
    margin: 0 auto;
  }
}

// レスポンシブフォントサイズ調整
@media (max-width: 768px) {
  .angleDisplay {
    font-size: 4rem; // モバイルでは小さく
  }

  .statusMessage {
    font-size: 1rem;
  }
}
```

## 🎯 実装されているボタンスタイル

### globals.scssの実際のボタン実装

```scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem; // 14px
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--primary-color); // #667eea
  color: white;

  &:hover:not(:disabled) {
    background: var(--primary-dark); // #5a67d8
    transform: translateY(-1px);
  }
}

.btn-success {
  background: var(--measurement-success); // #38a169
  color: white;

  &:hover:not(:disabled) {
    background: #2f855a;
    transform: translateY(-1px);
  }
}
```

## 📊 実装状況サマリー

### ✅ 実装済み要素

- 基本カラーシステム（紫系プライマリ）
- ダークモード対応
- レスポンシブデザイン
- 基本タイポグラフィ
- ボタンコンポーネント
- グリッドレイアウト

### 🔶 部分実装要素

- 医療データ表示（一部monospace使用）
- アクセシビリティ対応（基本レベル）
- 測定値表示（大きなフォント使用）

### ❌ 未実装要素

- 医療機器準拠カラー（#2E86AB等）
- WCAG AAA準拠システム
- 専用医療データフォント
- 高コントラストモード完全対応
- キーボードナビゲーション完全対応
- 印刷最適化スタイル

## 🎨 現在の実装に基づくデザイン指針

現在のプロジェクトは**基本的なモダンWebアプリケーション**として実装されており、医療機器特化というよりは**ユーザーフレンドリーなリハビリ支援アプリ**として設計されています。

### 実際の色彩設計

- **プライマリ**: 紫系（#667eea）- 親しみやすさ重視
- **成功**: 緑系（#4caf50）- 一般的なUI慣例
- **警告**: オレンジ系（#ff9800）- 視認性確保
- **背景**: 淡色系（#f7fafc）- 清潔感表現

この実装状況は、**医療現場での厳格な要件**よりも**患者の自宅使用での使いやすさ**を優先した設計思想を反映しています。

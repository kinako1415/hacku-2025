# 開発環境セットアップガイド

## 前提条件

### システム要件

| 項目       | 最小要件                              | 推奨要件                             |
| ---------- | ------------------------------------- | ------------------------------------ |
| OS         | Windows 10, macOS 10.15, Ubuntu 18.04 | Windows 11, macOS 12+, Ubuntu 20.04+ |
| Node.js    | 18.0.0+                               | 20.0.0+                              |
| npm        | 8.0.0+                                | 9.0.0+                               |
| RAM        | 8GB                                   | 16GB+                                |
| ストレージ | 5GB 空き容量                          | 10GB+ 空き容量                       |

### 必要なソフトウェア

- **Git**: バージョン管理
- **VS Code**: 推奨エディタ
- **Google Chrome**: 開発・テスト用ブラウザ（MediaPipe対応）

## インストール手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/kinako1415/hacku-2025.git
cd hacku-2025
```

### 2. 適切なブランチに切り替え

```bash
# 開発用ブランチ
git checkout refactoring

# または最新のメインブランチ
git checkout 001-ai-mediapipe-google
```

### 3. 依存関係のインストール

```bash
# npm使用の場合
npm install

# またはyarn使用の場合
yarn install

# またはpnpm使用の場合（推奨）
pnpm install
```

### 4. 環境変数の設定

`.env.local` ファイルを作成：

```bash
# 開発環境用設定
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_VERSION=0.1.0

# MediaPipe設定
NEXT_PUBLIC_MEDIAPIPE_CDN=https://cdn.jsdelivr.net/npm/@mediapipe/hands

# データベース設定（将来的な拡張用）
# DATABASE_URL=postgresql://username:password@localhost:5432/rehabilitation_db

# 認証設定（将来的な拡張用）
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=http://localhost:3000
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスして動作確認。

## VS Code 設定

### 推奨拡張機能

以下の拡張機能をインストール：

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest",
    "ms-playwright.playwright",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "syler.sass-indented"
  ]
}
```

### VS Code設定ファイル (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.scss": "scss"
  }
}
```

## ブラウザ設定

### Chrome設定（開発用）

MediaPipe使用のため、以下の設定を有効化：

1. **カメラ許可**: `chrome://settings/content/camera`
2. **HTTPS不要設定**: localhost では自動的に許可
3. **開発者ツール**: F12 でコンソール確認

### 推奨Chrome拡張機能

- **React Developer Tools**: Reactコンポーネント検査
- **Redux DevTools**: 状態管理デバッグ（Jotai対応）

## トラブルシューティング

### よくある問題と解決方法

#### 1. MediaPipe読み込みエラー

**症状**: `Failed to load MediaPipe` エラー

**解決方法**:

```bash
# キャッシュクリア
rm -rf .next
npm run dev
```

#### 2. カメラアクセス拒否

**症状**: カメラにアクセスできない

**解決方法**:

1. ブラウザのカメラ許可設定を確認
2. HTTPS または localhost で実行しているか確認
3. 他のアプリケーションがカメラを使用していないか確認

#### 3. TypeScript型エラー

**症状**: MediaPipe関連の型エラー

**解決方法**:

```bash
# 型定義を再インストール
npm install --save-dev @types/node
npm run type-check
```

#### 4. SCSS コンパイルエラー

**症状**: スタイルが適用されない

**解決方法**:

```bash
# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 5. IndexedDB エラー

**症状**: データベース初期化失敗

**解決方法**:

1. ブラウザのIndexedDBを手動クリア：
   - 開発者ツール → Application → Storage → IndexedDB
2. プライベートブラウジングモードでは無効なことを確認

### デバッグ手法

#### 1. MediaPipe デバッグ

```typescript
// コンソールでMediaPipe状態確認
console.log('MediaPipe状態:', {
  isLoaded: !!handsRef.current,
  lastResults: lastResults,
  frameCount: frameCount,
});
```

#### 2. 角度計算デバッグ

```typescript
// 角度計算の詳細ログ
console.log('角度計算:', {
  landmarks: landmarks.slice(0, 5), // 最初の5個のランドマーク
  calculatedAngle: angle,
  stepId: currentStep.id,
});
```

#### 3. データベースデバッグ

```typescript
// IndexedDB状態確認
const sessions = await db.sessions.toArray();
console.log('保存済みセッション:', sessions);
```

## テスト環境

### ユニットテスト実行

```bash
# 全テスト実行
npm run test

# 監視モード
npm run test:watch

# カバレッジ付き
npm run test -- --coverage
```

### E2Eテスト実行

```bash
# Playwright セットアップ（初回のみ）
npx playwright install

# E2Eテスト実行
npm run test:e2e

# 特定ブラウザのみ
npx playwright test --project=chromium
```

### テストデータ作成

```bash
# テスト用のサンプルデータ作成
npm run dev
# ブラウザで http://localhost:3000/debug にアクセス
```

## パフォーマンス監視

### 開発時のパフォーマンス確認

```bash
# ビルド解析
npm run build
npm run analyze

# Lighthouse監査
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

### メモリ使用量監視

Chrome DevTools の Performance タブを使用：

1. 測定開始前に「Record」をクリック
2. 手の測定を数分間実行
3. 記録停止してメモリリークを確認

## 本番環境準備

### ビルド確認

```bash
# 本番ビルド
npm run build

# 本番サーバー起動
npm run start
```

### 環境変数（本番用）

```bash
# .env.production.local
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_MEDIAPIPE_CDN=https://cdn.jsdelivr.net/npm/@mediapipe/hands
```

## 開発ワークフロー

### Git ワークフロー

```bash
# 新機能開発
git checkout -b feature/new-feature
git add .
git commit -m "feat: 新機能を追加"
git push origin feature/new-feature

# プルリクエスト作成後、レビュー・マージ
```

### コード品質チェック

```bash
# リント実行
npm run lint

# フォーマット確認
npm run prettier:check

# 型チェック
npm run type-check
```

### 継続的インテグレーション

GitHub Actions が以下を自動実行：

- リント・型チェック
- ユニットテスト
- E2Eテスト
- ビルド確認

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [MediaPipe Hands Guide](https://google.github.io/mediapipe/solutions/hands.html)
- [Jotai Documentation](https://jotai.org/)
- [Dexie.js Documentation](https://dexie.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)

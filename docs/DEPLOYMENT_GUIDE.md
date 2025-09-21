# デプロイメントガイド

## デプロイメント概要

本アプリケーションは、医療機器として求められる高い安全性と可用性を確保するため、段階的なデプロイメント戦略を採用しています。

## デプロイメント戦略

### デプロイメント環境

```
Production (本番環境)
    ↑
Staging (ステージング環境)
    ↑
Development (開発環境)
    ↑
Local (ローカル開発)
```

### 環境別設定

| 環境        | 用途             | デプロイタイミング | URL                                  |
| ----------- | ---------------- | ------------------ | ------------------------------------ |
| Local       | 開発・デバッグ   | 常時               | http://localhost:3000                |
| Development | 開発版統合テスト | 毎回プッシュ       | https://dev-rehab-app.vercel.app     |
| Staging     | QA・受入テスト   | タグ付きリリース   | https://staging-rehab-app.vercel.app |
| Production  | 本番運用         | 手動承認後         | https://rehab-app.com                |

## Vercel デプロイメント

### プロジェクト設定

```json
{
  "vercel": {
    "github": {
      "enabled": true,
      "autoJobCancelation": true
    },
    "builds": [
      {
        "src": "package.json",
        "use": "@vercel/next"
      }
    ],
    "routes": [
      {
        "src": "/manifest.json",
        "headers": { "content-type": "application/manifest+json" }
      },
      {
        "src": "/sw.js",
        "headers": { "cache-control": "no-cache" }
      }
    ]
  }
}
```

### 環境変数設定

```bash
# Vercel Dashboard環境変数設定
# Production Environment
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.rehab-app.com
NEXT_PUBLIC_MEDIAPIPE_CDN=https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240

# Staging Environment
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_API_BASE_URL=https://staging-api.rehab-app.com
NEXT_PUBLIC_MEDIAPIPE_CDN=https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240

# Development Environment
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_BASE_URL=https://dev-api.rehab-app.com
NEXT_PUBLIC_MEDIAPIPE_CDN=https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240
```

### ビルド設定

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,

  // PWA最適化
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // MediaPipe CDN最適化
  async rewrites() {
    return [
      {
        source: '/mediapipe/:path*',
        destination:
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/:path*',
      },
    ];
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## CI/CDパイプライン

### GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test -- --coverage

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: [test, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prebuilt'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-development:
    if: github.ref == 'refs/heads/develop'
    needs: [test, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prebuilt --prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [test, build]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prebuilt --prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 段階的デプロイメント

```yaml
# .github/workflows/staged-deployment.yml
name: Staged Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy-staging:
    if: github.event.inputs.environment == 'staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: echo "Deploying to staging..."
        # Vercel CLI deployment

  health-check:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Health Check
        run: |
          curl -f https://staging-rehab-app.vercel.app/api/health || exit 1

      - name: E2E Test on Staging
        run: npm run test:e2e:staging

  deploy-production:
    if: github.event.inputs.environment == 'production'
    needs: health-check
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: echo "Deploying to production..."
```

## PWA デプロイメント設定

### Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'rehab-app-v1.0.0';
const urlsToCache = [
  '/',
  '/measurement',
  '/calendar',
  '/progress',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
  '/mediapipe/hands.js',
  '/mediapipe/hands_solution_packed_assets.data',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // MediaPipe ファイルは常にキャッシュから配信
  if (event.request.url.includes('mediapipe')) {
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => response || fetch(event.request))
    );
    return;
  }

  // Network First戦略
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

### PWAマニフェスト

```json
{
  "name": "AI駆動手首・母指可動域リハビリテーション",
  "short_name": "Rehab App",
  "description": "MediaPipe Handsを使用したカメラベース可動域測定システム",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0070f3",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "375x667",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-desktop.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

## モニタリング・ログ設定

### Vercel Analytics

```javascript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### エラー監視

```javascript
// src/lib/monitoring/error-tracking.ts
export class ErrorTracker {
  static reportError(error: Error, context: string) {
    if (process.env.NODE_ENV === 'production') {
      // Sentry, Bugsnag等への送信
      console.error(`[${context}] ${error.message}`, error);

      // Vercel Analytics カスタムイベント
      track('error', {
        message: error.message,
        context,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  static reportMeasurementEvent(data: {
    success: boolean;
    hand: 'left' | 'right';
    duration: number;
  }) {
    track('measurement_completed', data);
  }
}
```

### パフォーマンス監視

```javascript
// src/lib/monitoring/performance.ts
export const trackPerformanceMetrics = () => {
  // Core Web Vitals
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);

  // MediaPipe読み込み時間
  const mediaPipeLoadStart = performance.now();

  return {
    markMediaPipeLoaded: () => {
      const loadTime = performance.now() - mediaPipeLoadStart;
      track('mediapipe_load_time', { duration: loadTime });
    },
  };
};
```

## セキュリティ設定

### セキュリティヘッダー

```javascript
// next.config.js - セキュリティヘッダー設定
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      media-src 'self' blob:;
      connect-src 'self' https://cdn.jsdelivr.net;
      worker-src 'self' blob:;
    `
      .replace(/\s{2,}/g, ' ')
      .trim(),
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];
```

### 環境別設定管理

```typescript
// src/config/environment.ts
export const getConfig = () => {
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'development';

  const configs = {
    development: {
      apiBaseUrl: 'http://localhost:3001',
      mediapipeCdn:
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
      enableDebugMode: true,
      enableAnalytics: false,
    },
    staging: {
      apiBaseUrl: 'https://staging-api.rehab-app.com',
      mediapipeCdn:
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
      enableDebugMode: true,
      enableAnalytics: true,
    },
    production: {
      apiBaseUrl: 'https://api.rehab-app.com',
      mediapipeCdn:
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
      enableDebugMode: false,
      enableAnalytics: true,
    },
  };

  return configs[env] || configs.development;
};
```

## 災害復旧・バックアップ

### データバックアップ戦略

```javascript
// IndexedDBデータのエクスポート
export const backupUserData = async () => {
  const data = {
    sessions: await db.sessions.toArray(),
    results: await db.results.toArray(),
    userSettings: localStorage.getItem('userSettings'),
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `rehab-data-backup-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
};

// データのインポート
export const restoreUserData = async (file: File) => {
  const text = await file.text();
  const data = JSON.parse(text);

  await db.transaction('rw', [db.sessions, db.results], async () => {
    await db.sessions.clear();
    await db.results.clear();
    await db.sessions.bulkAdd(data.sessions);
    await db.results.bulkAdd(data.results);
  });

  if (data.userSettings) {
    localStorage.setItem('userSettings', data.userSettings);
  }
};
```

### ロールバック手順

```bash
# Vercel CLI を使った緊急ロールバック
vercel --token=$VERCEL_TOKEN rollback $DEPLOYMENT_URL

# 特定のコミットへのロールバック
git revert HEAD
git push origin main

# 環境別ロールバック
vercel --token=$VERCEL_TOKEN rollback https://staging-rehab-app.vercel.app
```

## パフォーマンス最適化

### バンドルサイズ最適化

```javascript
// next.config.js - バンドル最適化
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },

  webpack: (config) => {
    // MediaPipe の動的インポート最適化
    config.optimization.splitChunks.chunks = 'all';
    config.optimization.splitChunks.cacheGroups = {
      mediapipe: {
        test: /[\\/]node_modules[\\/]@mediapipe[\\/]/,
        name: 'mediapipe',
        chunks: 'all',
      },
    };

    return config;
  },
});
```

### CDN・キャッシュ戦略

```javascript
// MediaPipe ファイルのキャッシュ戦略
const MEDIAPIPE_CACHE_DURATION = 365 * 24 * 60 * 60; // 1年

// Vercel Edge Cache設定
export const config = {
  unstable_cache: ['/mediapipe/**', '/_next/static/**'],
  unstable_cacheMaxAge: MEDIAPIPE_CACHE_DURATION,
};
```

このデプロイメントガイドにより、開発から本番運用まで安全で効率的なリリースプロセスを確立できます。

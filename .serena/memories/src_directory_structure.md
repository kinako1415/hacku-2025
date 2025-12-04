# /src ディレクトリ構造詳細

## /src/app (Next.js App Router)
```
app/
├── globals.scss                 # グローバルスタイル
├── layout.tsx                   # ルートレイアウト
├── page.tsx                     # ホームページ
├── page.module.scss            # ホームページスタイル
├── api/                        # API Routes
├── calendar/                   # カレンダー機能
├── debug/                      # デバッグページ
├── measurement/                # 測定機能
│   ├── page.tsx               # メイン測定ページ
│   ├── page_fixed.tsx         # 修正版
│   ├── page_old.tsx           # 旧版
│   └── page-backup.tsx        # バックアップ版
├── progress/                   # 進捗確認機能
└── setup/                      # セットアップ機能
```

## /src/components (Reactコンポーネント)
```
components/
├── calendar/                   # カレンダー関連コンポーネント
│   ├── CalendarGrid.tsx       # カレンダー表示
│   ├── CalendarView.tsx       # カレンダービュー
│   └── MeasurementSummary.tsx # 測定サマリー
├── camera/                     # カメラ関連コンポーネント
│   ├── CameraPreview.tsx      # カメラプレビュー
│   ├── CameraSetup.tsx        # カメラセットアップ
│   └── CameraView.tsx         # カメラビュー
├── common/                     # 共通コンポーネント
│   ├── ErrorBoundary.tsx      # エラーバウンダリー
│   ├── LoadingSpinner.tsx     # ローディング表示
│   └── NavigationTabs.tsx     # ナビゲーションタブ
├── layout/                     # レイアウトコンポーネント
│   ├── Header.tsx             # ヘッダー
│   └── Navigation.tsx         # ナビゲーション
├── measurement/                # 測定関連コンポーネント
│   ├── AngleDisplay.tsx       # 角度表示
│   ├── AngleOverlay.tsx       # 角度オーバーレイ
│   ├── MeasurementControls.tsx # 測定コントロール
│   ├── MeasurementResults.tsx  # 測定結果表示
│   └── MeasurementSession.tsx  # 測定セッション
└── progress/                   # 進捗関連コンポーネント
    ├── ProgressChart.tsx      # 進捗グラフ
    ├── ProgressStats.tsx      # 進捗統計
    └── ProgressView.tsx       # 進捗ビュー
```

## /src/lib (ライブラリ・ビジネスロジック)
```
lib/
├── data-manager/              # データ管理ライブラリ
│   ├── index.ts              # エクスポート
│   ├── measurement-storage.ts # 測定データ保存
│   └── types.ts              # データ型定義
├── database/                  # データベース設定
│   └── schema.ts             # Dexieスキーマ
├── integrations/             # 外部サービス統合
│   └── mediapipe-config.ts   # MediaPipe設定
├── mediapipe/                # MediaPipe統合
│   ├── angle-calculator.ts   # 角度計算
│   ├── hand-detector.ts      # 手検出
│   ├── hand-landmarks.ts     # 手ランドマーク
│   ├── index.ts             # エクスポート
│   └── types.ts             # MediaPipe型
├── motion-capture/           # 動作キャプチャライブラリ
│   ├── angle-measurement.ts  # 角度測定
│   ├── calibration.ts       # キャリブレーション
│   ├── index.ts             # エクスポート
│   ├── measurement-session.ts # 測定セッション
│   ├── motion-types.ts      # 動作型定義
│   └── validation.ts        # データ検証
├── pwa/                      # PWA機能
│   └── service-worker.ts     # Service Worker
└── utils/                    # ユーティリティ
    ├── date-utils.ts         # 日付ユーティリティ
    ├── format-utils.ts       # フォーマット関数
    └── math-utils.ts         # 数学計算
```

## /src/hooks (カスタムReact Hooks)
```
hooks/
├── useMeasurementService.ts   # 測定サービスフック
└── useMediaPipeHands.ts       # MediaPipe Handsフック
```

## /src/stores (Jotai状態管理)
```
stores/
├── camera-atoms.ts            # カメラ状態管理
└── measurement-atoms.ts       # 測定状態管理
```

## /src/types (TypeScript型定義)
```
types/
└── (各ライブラリ内に分散配置)
```

## /src/styles (スタイル設定)
```
styles/
└── variables.css              # CSS変数定義
```

## /src/pages (レガシーページ)
```
pages/
└── offline.tsx                # オフラインページ
```